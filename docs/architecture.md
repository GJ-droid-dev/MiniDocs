# Architecture Note — MiniDocs

> **Scope anchor.** Every decision in this document serves the core-slice golden path defined in [`problemstatement_core.md`](problemstatement_core.md). Nothing here is speculative; if a capability isn't needed for that path, it isn't designed.

---

## 1. System Overview

MiniDocs is a modern decoupled full-stack web application: a **React single-page frontend deployed on Vercel**, a **Node.js / Express REST API deployed on Railway**, and a **serverless PostgreSQL database hosted on Neon**, with persistent volume storage on Railway for file attachments.

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Edge Network                      │
│                  React SPA (Vite + Tiptap)                  │
│                                                             │
│  ┌─────────────────┐ ┌──────────────────┐ ┌──────────────┐ │
│  │   Dashboard     │ │   Rich-Text      │ │ Share Modal  │ │
│  │ (Owned / Shared)│ │ Editor (Tiptap)  │ │ (Glassmorphic│ │
│  └─────────────────┘ └──────────────────┘ └──────────────┘ │
│                            │                                │
│                   fetch / multipart (HTTPS)                 │
│                            │ (X-User-Id)                    │
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
│ └────────┼──────────────────┼───────────────────┼───────────┘
           │                  │                   │
           ▼                  ▼                   ▼
┌──────────────────────────────────────┐ ┌──────────────────┐
│             Neon Postgres            │ │  Railway Volume  │
│         (Serverless Postgres)        │ │ (/data/uploads)  │
│  users, docs (JSONB), shares, attach │ │  File binaries   │
└──────────────────────────────────────┘ └──────────────────┘
```

---

## 2. Technology Choices & Rationale (Production Stack)

| Layer | Technology & Version | Why / Rationale |
|---|---|---|
| **Frontend Framework** | **React 19 + Vite 8** | High-performance SPA with instant HMR and optimized production static bundles for Vercel Edge CDN. |
| **Rich-Text Editor** | **Tiptap 2/3 (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`)** | Headless ProseMirror-based editor. Serializes directly to a structured Abstract Syntax Tree (`JSONB`), guaranteeing exact formatting fidelity (headings, bold, italic, underline, bullet lists, numbered lists) without fragile HTML parsing. |
| **Design System** | **Vanilla CSS Custom Properties (`index.css`)** | Custom design system matching Notion × Linear dark-mode aesthetics (`#0a0b10` canvas, glassmorphism, glowing accents) with zero runtime CSS dependency overhead. |
| **Frontend Hosting** | **Vercel** | Global Edge Network, instant CDN caching, automatic SPA rewrites (`vercel.json`), and custom environment variables (`VITE_API_URL`). |
| **Backend Runtime** | **Node.js 22 LTS** | Modern LTS release with high-throughput event loops, native fetch, and full ESM/CommonJS compatibility. |
| **API Framework** | **Express** | Minimalist web framework for REST endpoints, layered middleware pipelines, CORS, and multipart file streams. |
| **Database** | **Neon Serverless PostgreSQL** | Cloud-native serverless PostgreSQL with native `JSONB` support for document trees, ACID guarantees, foreign keys, and connection pooling. |
| **Database Driver** | **`pg` (node-postgres) with SSL Pool** | Standard PostgreSQL client with connection pooling (`pg.Pool`), parameterized queries, and SSL verification. |
| **File Storage** | **Railway Persistent Volume (`/data/uploads`)** | Dedicated persistent disk mount on Railway ensuring uploaded files survive container redeployments without paid AWS S3 dependencies. |
| **Backend Hosting** | **Railway** | Production PaaS with zero-downtime deploys, persistent volume disk attachments, and automated health checks (`railway.json`). |

---

## 3. Data Model (PostgreSQL / Neon)

All tables use standard PostgreSQL types with `TIMESTAMPTZ` and UUIDs. The rich text document content is stored natively as `JSONB`.

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Seeded users table (Alice & Bob)
CREATE TABLE users (
  id         TEXT PRIMARY KEY,              -- 'user-a', 'user-b'
  name       TEXT NOT NULL,                 -- 'Alice (Owner)', 'Bob (Recipient)'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Documents table
CREATE TABLE documents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT 'Untitled Document',
  content    JSONB NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Attachments table (Metadata; binary resides on persistent volume)
CREATE TABLE attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,              -- User-facing filename (e.g. 'Specification.pdf')
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
- **Relational Integrity**: Foreign keys with `ON DELETE CASCADE` guarantee that deleting documents cleanly purges all related shares and attachment records.

---

## 4. API Surface

All API routes are served under the `/api` prefix by the Express backend. Active persona identity is passed via the `X-User-Id` HTTP header.

### 4.1 Users & Identity

| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/api/users` | Lists seeded users (`user-a`, `user-b`) | Public |
| `GET` | `/api/users/me` | Returns current active user profile | Authenticated |
| `GET` | `/api/users/:id` | Returns user details by ID | Authenticated |

### 4.2 Documents (CRUD & Access Control)

| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/api/documents` | Returns `{ owned: Document[], shared: Document[] }` | Authenticated |
| `POST` | `/api/documents` | Creates a new document with default title | Authenticated |
| `GET` | `/api/documents/:id` | Fetches document content & metadata (`{ document, isOwner }`) | Owner or Share Recipient |
| `PATCH` | `/api/documents/:id` | Updates document `title` and/or `content` | Owner Only (`requireOwner`) |
| `DELETE` | `/api/documents/:id` | Deletes document, shares, and attachment binary | Owner Only (`requireOwner`) |

### 4.3 File Attachments

| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/api/documents/:id/attachment` | Uploads 1 attachment (`multipart/form-data`) | Owner Only (`requireOwner`) |
| `GET` | `/api/documents/:id/attachment` | Streams file binary with `Content-Disposition` | Owner or Share Recipient (`requireReadAccess`) |
| `DELETE` | `/api/documents/:id/attachment` | Deletes attachment record & disk file | Owner Only (`requireOwner`) |

### 4.4 Sharing

| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/api/documents/:id/shares` | Grants read access to `userId` | Owner Only (`requireOwner`) |
| `GET` | `/api/documents/:id/shares` | Lists all users granted access | Owner Only (`requireOwner`) |
| `DELETE` | `/api/documents/:id/shares/:userId` | Revokes share access | Owner Only (`requireOwner`) |

---

## 5. Frontend Architecture (React on Vercel)

### 5.1 Route Map

```
/login           -> Login (Persona cards for Alice and Bob)
/documents       -> Dashboard (Owned vs Shared document grids, Search bar, New Document)
/documents/:id   -> EditorPage (Tiptap editor, live save badge, Toolbar, AttachmentDrawer, ShareModal)
*                -> Redirect to /documents (or /login if unauthenticated)
```

### 5.2 Component Hierarchy

```
App
├── AuthProvider (localStorage + X-User-Id provider)
├── Login (PersonaCard for Alice & Bob)
├── Dashboard
│   ├── Navbar (Brand logo, persona switcher dropdown, + New Document button, Sign Out)
│   ├── SearchBar (Filter documents by title)
│   ├── MyDocumentsSection (Grid of owned DocCard items with delete action)
│   ├── SharedWithMeSection (Grid of shared DocCard items with owner tag)
│   └── Toast (Sliding feedback notification)
└── EditorPage
    ├── Header (Back button, Editable title input, Save status badge, Share button)
    ├── GuestBanner (Informative read-only banner when viewed by Bob)
    ├── Toolbar (Synchronously subscribed to ProseMirror transactions for instant <16ms cues)
    ├── TiptapEditorCanvas (ProseMirror contenteditable writing surface)
    ├── AttachmentDrawer (Drag-drop upload zone, client validation, file card, download/delete)
    ├── ShareModal (Glassmorphism backdrop, persona selector, active share list, revoke)
    └── Toast (Sliding feedback notification)
```

### 5.3 Real-Time Editor Save & Load Lifecycle

```
[Load Flow]
EditorPage Mount -> GET /api/documents/:id (with X-User-Id)
                 -> Receives doc.content (JSONB)
                 -> normalizeDocContent() validates AST structure
                 -> editor.commands.setContent(safeContent, false)
                 -> Set editor.setEditable(isOwner)

[Save Flow]
User Types/Formats -> Tiptap onUpdate event fires
                   -> Debounce timer (1000ms)
                   -> SaveStatus updates to "Saving..." (pulsing indicator)
                   -> editor.getJSON() extracts ProseMirror AST
                   -> PATCH /api/documents/:id { title, content }
                   -> SaveStatus updates to "Saved ✓"
```

---

## 6. Authentication & Authorization Boundary

1. **Identity Selection**: `Login` stores the active persona in `localStorage` (`minidocs_user_id`) and `AuthContext`.
2. **Request Authentication**: The client utility (`api.js`) automatically attaches `X-User-Id: <id>` to every outgoing request.
3. **Backend Auth Middleware (`middleware/auth.js`)**:
   - Reads `req.headers['x-user-id']`.
   - Queries Neon Postgres to verify user existence.
   - Binds `req.user = { id, name }` to request context. Returns `401 UNAUTHORIZED` if missing or invalid.
4. **Authorization Guard (`middleware/authorize.js`)**:
   - `requireOwner`: Enforces `document.owner_id === req.user.id` for editing, deleting, uploading, and sharing. Returns `403 FORBIDDEN` for unauthorized users.
   - `requireReadAccess`: Enforces that `req.user.id` is either the owner OR present in the `shares` table. Returns `403 FORBIDDEN` if not shared.

---

## 7. Actual Project Directory Structure

```
minidocs/
├── client/                           # Frontend (Vercel)
│   ├── src/
│   │   ├── api.js                    # API client injecting X-User-Id & VITE_API_URL
│   │   ├── context/
│   │   │   └── AuthContext.jsx       # User identity state & persona switching
│   │   ├── components/
│   │   │   ├── AttachmentDrawer.jsx  # Drag-drop upload, file card, download, delete
│   │   │   ├── DocCard.jsx           # Document preview card with attachment badge
│   │   │   ├── Navbar.jsx            # Brand header, persona switcher, New Document CTA
│   │   │   ├── ShareModal.jsx        # Glassmorphic share dialog & access revocation
│   │   │   ├── Toast.jsx             # Sliding notification alert
│   │   │   └── Toolbar.jsx           # Formatting buttons with transaction listeners
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx         # Owned & Shared document lists with search
│   │   │   ├── EditorPage.jsx        # Tiptap ProseMirror editor & live autosave badge
│   │   │   └── Login.jsx             # Persona selector screen (Alice vs Bob)
│   │   ├── App.jsx                   # React Router routing & route guards
│   │   ├── index.css                 # Vanilla CSS design system tokens & glassmorphism
│   │   └── main.jsx                  # React DOM mount
│   ├── index.html
│   ├── package.json
│   ├── vercel.json                   # Vercel SPA rewrite configuration
│   └── vite.config.js
│
├── server/                           # Backend (Railway)
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # Neon Postgres connection pool (pg.Pool)
│   │   ├── middleware/
│   │   │   ├── auth.js               # X-User-Id extractor & validator
│   │   │   ├── authorize.js          # requireOwner & requireReadAccess guards
│   │   │   └── upload.js             # Multer 5MB / MIME configuration
│   │   ├── routes/
│   │   │   ├── attachments.js        # File upload, download stream, and delete
│   │   │   ├── documents.js          # Document CRUD & JSONB persistence
│   │   │   ├── shares.js             # Share grant, list, and revoke
│   │   │   └── users.js              # Persona list & profile lookup
│   │   ├── scripts/
│   │   │   ├── migrate.js            # DDL migration runner
│   │   │   ├── seed.js               # Seed Alice & Bob personas
│   │   │   ├── test-phase3.js        # Auth integration test suite
│   │   │   ├── test-phase4.js        # Document CRUD test suite
│   │   │   └── test-phase5.js        # Attachment & Share test suite
│   │   └── index.js                  # Express app entry & CORS config
│   ├── .env.example
│   ├── package.json
│   └── railway.json                  # Railway deployment & health check configuration
│
├── README.md                         # Quickstart, scope boundaries, and live URL
├── ARCHITECTURE.md                   # Technical design decisions and schema
├── AI_WORKFLOW.md                    # AI tools, speedups, rejected outputs, verification
├── SUBMISSION.md                     # Deliverables manifest & 2-4 hour roadmap
└── docs/
    ├── design_system.md              # Design system token specification
    └── SWOT.md                       # MiniDocs vs. Google Docs SWOT analysis
```
