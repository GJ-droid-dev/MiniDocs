# Architecture Note — MiniDocs

> **Scope anchor.** Every decision in this document serves the core-slice golden path defined in [`problemstatement_core.md`](file:///c:/Users/jangr/Documents/AJAIA/Docs/problemstatement_core.md). Nothing here is speculative; if a capability isn't needed for that path, it isn't designed.

---

## 1. System Overview

MiniDocs is a modern decoupled full-stack web application: a **React single-page frontend deployed on Vercel**, a **Node.js / Express REST API deployed on Railway**, and a **serverless PostgreSQL database hosted on Neon**, with persistent volume storage on Railway for file attachments.

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Edge Network                      │
│                  React SPA (Vite + Tiptap)                  │
│                                                             │
│  ┌─────────────────┐ ┌──────────────────┐ ┌──────────────┐ │
│  │ Document List   │ │   Rich-Text      │ │ Share Modal  │ │
│  │ (Owned / Shared)│ │ Editor (Tiptap)  │ │              │ │
│  └─────────────────┘ └──────────────────┘ └──────────────┘ │
│                            │                                │
│                   fetch / multipart (HTTPS)                 │
└────────────────────────────┼────────────────────────────────┘
                             │
                             │ HTTPS / CORS
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                     Railway Deployment                      │
│                    Node.js / Express API                    │
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │ Auth (mock)   │  │ Documents     │  │ Attachments     │  │
│  │ Middleware    │  │ Controller    │  │ (Multer + Disk) │  │
│  └───────────────┘  └───────────────┘  └─────────────────┘  │
│          │                  │                   │           │
│          │ pg.Pool / SSL    │                   │           │
└──────────┼──────────────────┼───────────────────┼───────────┘
           │                  │                   │
           ▼                  ▼                   ▼
┌──────────────────────────────────────┐ ┌──────────────────┐
│             Neon Postgres            │ │  Railway Volume  │
│         (Serverless Postgres)        │ │ (/data/uploads)  │
│  users, docs (JSONB), shares, attach │ │  File binaries   │
└──────────────────────────────────────┘ └──────────────────┘
```

---

## 2. Technology Choices & Rationale (Latest Stack)

| Layer | Technology & Version | Why / Rationale |
|---|---|---|
| **Frontend Framework** | **React 18 / 19 (Vite 6)** | Industry-standard component framework with blazing fast HMR and optimized production bundles. ESM-native and zero runtime overhead. |
| **Rich-Text Editor** | **Tiptap 2 (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`)** | Modern, headless, ProseMirror-based editor. Directly exports/imports structured JSON (`JSONB`), guaranteeing exact formatting fidelity (bold, italic, underline, heading, bullet list, ordered list) without fragile HTML parsing. |
| **Frontend Hosting** | **Vercel** | Global Edge Network, instant CDN caching, automatic branch previews, and seamless React/Vite deployment with custom environment variables (`VITE_API_URL`). |
| **Backend Runtime** | **Node.js 22 LTS** | Latest Active LTS release with high performance, native fetch, enhanced security, and full ESM / CommonJS compatibility. |
| **API Framework** | **Express 4.21 / 5.0** | Robust, minimal web framework for REST endpoints, middleware pipelines, CORS, and multipart file upload streams. |
| **Database** | **Neon Postgres (PostgreSQL 16+)** | Cloud-native serverless PostgreSQL. Provides robust relational integrity (ACID), native `JSONB` support for document trees, foreign keys, connection pooling, and branchable databases with a generous free tier. |
| **Database Driver** | **`pg` (node-postgres) with SSL Pool** | Standard, battle-tested PostgreSQL client with connection pooling, parameterized queries for SQL injection prevention, and native SSL support for Neon. |
| **File Storage** | **Persistent Railway Volume (`/data/uploads`)** | Dedicated persistent disk mount attached to the Railway container service. Ensures uploaded files survive container redeployments and restarts without external S3 configuration overhead. |
| **Backend Hosting** | **Railway** | Production-grade PaaS with zero-downtime deploys, automatic SSL certificates, persistent storage volume support, and effortless environment management. |

---

## 3. Data Model (PostgreSQL / Neon)

All tables use standard PostgreSQL types with `TIMESTAMPTZ` and UUIDs. The rich text document content is stored natively as `JSONB`.

```sql
-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Seeded users table (Startup seed; no registration flow required for core slice)
CREATE TABLE users (
  id         TEXT PRIMARY KEY,              -- 'user-a', 'user-b'
  name       TEXT NOT NULL,                 -- 'User A (Owner)', 'User B (Recipient)'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Documents table
CREATE TABLE documents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT 'Untitled Document',
  content    JSONB NOT NULL DEFAULT '{}'::jsonb, -- Tiptap ProseMirror JSON document
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Attachments table (Metadata; binary resides on persistent volume)
CREATE TABLE attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,              -- User-facing filename (e.g. 'ProjectBrief.pdf')
  stored_name   TEXT NOT NULL UNIQUE,       -- UUID-based disk filename (e.g. 'f47ac10b...pdf')
  mime_type     TEXT NOT NULL,              -- 'application/pdf', 'image/png', 'image/jpeg'
  size_bytes    INTEGER NOT NULL,           -- File size in bytes (max 5 MB)
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Shares table (Read grants from owner to recipient)
CREATE TABLE shares (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  shared_with TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_document_share UNIQUE (document_id, shared_with)
);

-- Indexes for rapid lookup
CREATE INDEX idx_documents_owner ON documents(owner_id);
CREATE INDEX idx_shares_shared_with ON shares(shared_with);
CREATE INDEX idx_attachments_document ON attachments(document_id);
```

### Key Architectural Choices:
- **`content` as `JSONB`**: Storing Tiptap JSON in PostgreSQL's binary JSON format (`JSONB`) ensures lossless document round-trips with zero schema degradation across saves.
- **`stored_name` isolation**: Files are stored with cryptographically unique UUIDs on the Railway volume, completely eliminating directory traversal risks and filesystem filename collisions.
- **Relational Integrity**: Foreign keys with `ON DELETE CASCADE` guarantee that deleting or migrating documents cleanly purges all related shares and attachment records.

---

## 4. API Surface

All API routes are served under the `/api` prefix by the Railway backend. The active user identity is passed via the `X-User-Id` HTTP header.

### 4.1 Users & Identity

| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/api/users` | Lists seeded users (`user-a`, `user-b`) for persona switcher | Public |
| `GET` | `/api/users/:id` | Returns active user profile and metadata | Authenticated |

### 4.2 Documents (CRUD & Access Control)

| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/api/documents` | Returns `{ owned: Document[], shared: Document[] }` | Authenticated |
| `POST` | `/api/documents` | Creates a new document with default title | Authenticated |
| `GET` | `/api/documents/:id` | Fetches document content & metadata | Owner or Share Recipient |
| `PATCH` | `/api/documents/:id` | Updates document `title` and/or `content` | Owner Only |

### 4.3 File Attachments

| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/api/documents/:id/attachment` | Uploads 1 attachment (`multipart/form-data`) | Owner Only |
| `GET` | `/api/documents/:id/attachment` | Streams file binary with `Content-Disposition` | Owner or Share Recipient |
| `DELETE` | `/api/documents/:id/attachment` | Deletes attachment record & disk file | Owner Only |

### 4.4 Sharing

| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/api/documents/:id/shares` | Grants read access to `userId` | Owner Only |
| `GET` | `/api/documents/:id/shares` | Lists all users granted access | Owner Only |
| `DELETE` | `/api/documents/:id/shares/:userId` | Revokes share access | Owner Only |

### Standard Error Response Shape

```json
{
  "error": {
    "code": "PAYLOAD_TOO_LARGE",
    "message": "File exceeds the maximum limit of 5 MB."
  }
}
```

---

## 5. Frontend Architecture (React on Vercel)

### 5.1 Route Map

```
/                -> LoginPage (User selector: User A / User B)
/documents       -> DocumentListPage (Owned vs Shared tabs, "Create New")
/documents/:id   -> EditorPage (Tiptap toolbar, canvas, attachment drawer, share modal)
```

### 5.2 Component Tree

```
App
├── AuthProvider (localStorage + X-User-Id header provider)
├── LoginPage
│   └── PersonaCard (User A / User B)
├── DocumentListPage
│   ├── AppHeader (User badge, switch identity, sign out)
│   ├── CreateDocButton
│   ├── TabGroup ("My Documents" | "Shared with Me")
│   └── DocGrid
│       └── DocCard (Title, updated timestamp, attachment indicator, owner tag)
└── EditorPage
    ├── EditorHeader
    │   ├── BackButton
    │   ├── InlineTitleEditor (Auto-save on blur / debounce)
    │   └── SaveStatusBadge ("Saved ✓", "Saving...", "Unsaved changes")
    ├── TiptapToolbar
    │   ├── FormattingGroup (Bold, Italic, Underline)
    │   ├── HeadingsDropdown (Paragraph, Heading 1, Heading 2)
    │   └── ListsGroup (Bullet List, Numbered List)
    ├── TiptapCanvas (Content-editable rich-text surface)
    ├── AttachmentSection
    │   ├── FileUploadZone (Drag-and-drop, explicit 5MB/PDF/PNG/JPG limit banner)
    │   └── AttachmentCard (Filename, size, Download button, Delete button)
    └── ShareModal
        ├── RecipientSelector (Dropdown of available seeded peers)
        └── CurrentSharesList (List of active grantees)
```

### 5.3 Editor Save & Load Lifecycle

```
[Load Flow]
EditorPage Mount -> GET /api/documents/:id (with X-User-Id)
                 -> Receives doc.content (JSONB)
                 -> editor.commands.setContent(doc.content)
                 -> Set read-only if user is not owner

[Save Flow]
User Types/Formats -> Editor onUpdate triggers
                   -> Debounce timer (1.5s) / Manual "Save" click
                   -> editor.getJSON() extracts ProseMirror tree
                   -> PATCH /api/documents/:id { title, content }
                   -> SaveStatusBadge updates to "Saved ✓"
```

---

## 6. Authentication & Authorization Flow

The application implements a clean mock authentication pattern:

1. **Identity Selection**: `LoginPage` sets the active persona in `localStorage` and `AuthContext`.
2. **Request Authentication**: The client HTTP utility (`api/client.js`) automatically attaches `X-User-Id: <id>` to every outgoing `fetch` call to the Railway backend.
3. **Backend Middleware (`middleware/auth.js`)**:
   - Reads `req.headers['x-user-id']`.
   - Queries Neon Postgres to verify valid user existence.
   - Binds `req.user = { id, name }` to request context. Returns `401 Unauthorized` if invalid.
4. **Authorization Guard (`middleware/authorize.js`)**:
   - `requireOwner`: Validates `document.owner_id === req.user.id` (required for editing, uploading, sharing).
   - `requireReadAccess`: Validates that `req.user.id` is either the owner OR present in `shares` table for the document.
5. **Future-Proof Isolation**: Swapping mock auth for JWT/OAuth in future iterations requires replacing only `middleware/auth.js` without touching business controllers or frontend components.

---

## 7. Persistence Strategy (FR6 Matrix)

| Entity | Storage Medium | Refresh Resilience | Restart / Redeploy Resilience |
|---|---|---|---|
| **User Identity** | Browser `localStorage` + Neon `users` | ✅ Survives refresh | ✅ Survives restart |
| **Document Metadata** | Neon PostgreSQL (`documents` table) | ✅ Survives refresh | ✅ Survives restart |
| **Rich-Text Formatting** | Neon PostgreSQL (`content` as `JSONB`) | ✅ Full fidelity | ✅ Full fidelity |
| **Attachment Metadata** | Neon PostgreSQL (`attachments` table) | ✅ Survives refresh | ✅ Survives restart |
| **Attachment Binary** | Railway Persistent Volume (`/data/uploads`) | ✅ Survives refresh | ✅ Survives container restart |
| **Sharing Grants** | Neon PostgreSQL (`shares` table) | ✅ Survives refresh | ✅ Survives restart |

---

## 8. File Upload & Validation Specifications (FR4)

- **Allowed MIME Types**: `application/pdf`, `image/png`, `image/jpeg`
- **File Size Limit**: **5 MB** (5,242,880 bytes)
- **Client Validation**: File drop zone checks file type and size before upload, displaying instant error feedback.
- **Server Validation**: `multer` fileFilter and limits middleware enforce authoritative rejection with HTTP 400/413.
- **Storage Path**: Stored as `/data/uploads/{stored_name}` on the Railway Persistent Volume.
- **Download Handler**: Streamed with `Content-Type: <mime_type>` and `Content-Disposition: attachment; filename="<original_name>"`.

---

## 9. Project Directory Structure

```
minidocs/
├── client/                           # Frontend (Vercel)
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js             # Fetch wrapper injecting X-User-Id & VITE_API_URL
│   │   ├── components/
│   │   │   ├── Attachments/
│   │   │   │   ├── AttachmentCard.jsx
│   │   │   │   └── FileUploadZone.jsx
│   │   │   ├── Documents/
│   │   │   │   ├── DocCard.jsx
│   │   │   │   └── DocList.jsx
│   │   │   ├── Editor/
│   │   │   │   ├── TiptapCanvas.jsx
│   │   │   │   └── TiptapToolbar.jsx
│   │   │   ├── Layout/
│   │   │   │   └── AppHeader.jsx
│   │   │   └── Sharing/
│   │   │       └── ShareModal.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── DocumentListPage.jsx
│   │   │   ├── EditorPage.jsx
│   │   │   └── LoginPage.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── vercel.json                   # SPA routing rewrites
│   └── vite.config.js
│
├── server/                           # Backend (Railway)
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # Neon Postgres connection pool (pg.Pool)
│   │   ├── middleware/
│   │   │   ├── auth.js               # X-User-Id extractor
│   │   │   ├── authorize.js          # Owner & Read authorization checks
│   │   │   └── upload.js             # Multer 5MB / MIME configuration
│   │   ├── routes/
│   │   │   ├── attachments.js
│   │   │   ├── documents.js
│   │   │   ├── shares.js
│   │   │   └── users.js
│   │   ├── scripts/
│   │   │   ├── migrate.js            # DDL migration runner
│   │   │   └── seed.js               # Seed User A & User B
│   │   └── index.js                  # Express app entry & CORS config
│   ├── .env.example
│   ├── Dockerfile                    # Railway container deployment
│   └── package.json
│
├── README.md
├── ARCHITECTURE.md
├── SWOT.md
├── AI_WORKFLOW.md
└── SUBMISSION.md
```

---

## 10. Deployment & Environment Configuration

### 10.1 Database (Neon Serverless Postgres)
1. Create a free project on [Neon.tech](https://neon.tech).
2. Copy the pooled connection string: `postgres://<user>:<pass>@<endpoint>.neon.tech/neondb?sslmode=require`.
3. Run `npm run db:migrate` and `npm run db:seed` from the server workspace to establish schema and initial personas.

### 10.2 Backend (Railway)
1. Deploy `server/` as a Node service on Railway.
2. In Railway Service Settings, add a **Persistent Volume** mounted at `/data/uploads`.
3. Configure Environment Variables:
   - `DATABASE_URL`: `postgres://...neon.tech/neondb?sslmode=require`
   - `UPLOAD_DIR`: `/data/uploads`
   - `CORS_ORIGIN`: `https://<minidocs-frontend>.vercel.app`
   - `PORT`: `5000` (or Railway default)

### 10.3 Frontend (Vercel)
1. Import `client/` into Vercel as a Vite project.
2. Configure Environment Variable:
   - `VITE_API_URL`: `https://<minidocs-backend>.railway.app`
3. Include `vercel.json` rewrite rule to redirect all routes to `index.html` for client-side routing.

---

## 11. Traceability Matrix (Requirements ↔ Architecture)

| Functional Requirement | Core Requirement | Architectural Implementation |
|---|---|---|
| **FR1** | Seeded identity & switching | `users` table seeded in Neon Postgres; `X-User-Id` header passed to Railway; `AuthContext` + `localStorage` |
| **FR2** | Document lifecycle (Create/Rename/List/Open) | `documents` table in Neon; `GET/POST/PATCH /api/documents`; `DocumentListPage` + `EditorPage` |
| **FR3** | Rich-text formatting & fidelity | Tiptap 2 with 6 formats; lossless `JSONB` storage in PostgreSQL; debounced autosave + status indicator |
| **FR4** | File upload & validation | `multer` on Express; 5 MB + PDF/PNG/JPG limits; Railway persistent volume `/data/uploads`; `attachments` table |
| **FR5** | Sharing model & owned/shared distinction | `shares` table with unique composite constraint; `GET /api/documents` returns separated arrays; `ShareModal` |
| **FR6** | Complete persistence across restarts | Serverless Neon Postgres for state; Railway persistent volume for binaries; survives any rebuild or restart |

---

## 12. Deliberate Scope Boundaries

As specified in the core slice requirements, the following remain out of scope for this baseline:
- Simultaneous multi-user WebSocket editing / live collaborative cursors
- Full password/OAuth registration systems
- Version history diffing / document branch recovery
- Multiple attachment slots per document

The architecture explicitly provides clean extension points for all of the above when required.
