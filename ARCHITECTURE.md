# MiniDocs — Architecture & Prioritization Note

> **Context.** This document details the technical architecture, design decisions, scope boundaries, and core tradeoffs made in building the **MiniDocs** collaborative document editor for Ajaia.

---

## 1. System Topology & Stack

MiniDocs is built on a **modern, decoupled full-stack architecture** designed for high reliability, fast edge delivery, and zero-loss document persistence:

```
┌────────────────────────────────────────────────────────┐
│               Frontend — Vercel (Edge CDN)            │
│  React 19 SPA • Vite 8 • Tiptap 2/3 (ProseMirror)     │
│  Vanilla CSS Design Tokens (Notion × Linear aesthetic) │
│  VersionHistoryPanel Drawer • Non-Destructive Preview  │
└───────────────────────────┬────────────────────────────┘
                            │ REST API (JSON / FormData)
                            │ Header: X-User-Id
                            ▼
┌────────────────────────────────────────────────────────┐
│               Backend — Railway (Node 22 LTS)          │
│  Express REST API • Multer (Local/Volume Uploads)      │
│  Volume Mount: /data/uploads (Binary files)            │
│  Resource Routes: users, documents, attachments,       │
│                   shares, versions                     │
└───────────────────────────┬────────────────────────────┘
                            │ Connection Pooling (SSL)
                            ▼
┌────────────────────────────────────────────────────────┐
│            Database — Neon Serverless PostgreSQL       │
│  Native JSONB Document Trees & Historical Snapshots    │
│  Tables: users, documents, attachments, shares,        │
│          versions (50-cap retention)                   │
└────────────────────────────────────────────────────────┘
```

### Component Choices & Rationale

| Component | Choice | Rationale |
|---|---|---|
| **Frontend Framework** | **React 19 + Vite 8** | Sub-second HMR in development and lightweight static asset generation for Vercel edge deployment. |
| **Rich-Text Engine** | **Tiptap 2/3 (ProseMirror)** | Rather than fragile HTML string serialization, Tiptap provides a structured Abstract Syntax Tree (AST) that round-trips losslessly into Postgres. |
| **Styling & Design System** | **Vanilla CSS Custom Properties** | Pure CSS design tokens (`index.css`) matching Notion and Linear dark-mode aesthetics with zero runtime styling dependencies. |
| **Backend Framework** | **Express (Node.js)** | Minimalist, predictable REST API with standard middleware chains for auth, ownership authorization, and file streaming. |
| **Database** | **Neon Serverless PostgreSQL** | Cloud-native Postgres with native `JSONB` support for document ASTs, foreign key cascades, and connection pooling. |
| **File Storage** | **Railway Persistent Volume / Disk** | Files are stored under `/data/uploads` with metadata in Postgres, preventing attachment loss during container restarts while avoiding paid S3 dependencies. |

---

## 2. Core Decisions & Where Depth Was Prioritized

Rather than building a shallow facsimile of 20 Google Docs features, we prioritized **deep engineering quality** in four critical areas:

### Depth 1: Native AST Tree Persistence (`JSONB`)
- **Problem**: Traditional document editors often store content as raw HTML strings or Markdown, which leads to formatting corruption, XSS vulnerabilities, and lost block structure when round-tripping complex marks.
- **Solution**: Documents are stored as native PostgreSQL `JSONB` ProseMirror trees. Every node (heading, paragraph, bullet list, ordered list) and mark (bold, italic, underline) is strictly validated and queryable.
- **Autosave Engine**: Client uses an asynchronous 1000ms debounced autosave engine with immediate visual feedback (`Saved ✓`, `Saving...`, `Save error`).

### Depth 2: Complete Binary Lifecycle & File Validation
- **Upload Engine**: Multer-backed storage isolated by cryptographic UUID filenames to prevent filesystem path traversal.
- **Strict Guards**: Enforces 5 MB size limit (`413 PAYLOAD_TOO_LARGE`) and whitelist MIME filtering (`application/pdf`, `image/png`, `image/jpeg` → `400 INVALID_FILE_TYPE`).
- **Disk Cleanup**: When an attachment is replaced or a document is deleted, old disk binaries are automatically purged.
- **Binary Streaming**: Downloads are served via secure streams with sanitized `Content-Disposition` headers.

### Depth 3: Document Version History with Non-Destructive Preview
- **Milestone Snapshots**: Allows owners to name versions (e.g., "Initial Draft", "Pre-Review") stored as historical `JSONB` AST trees.
- **Non-Destructive Preview**: Selecting past versions loads snapshot ASTs into the Tiptap canvas in read-only preview mode without mutating the active document.
- **Pre-Restore Safety Backups**: Restoring any version automatically creates a pre-restore backup snapshot, making rollbacks 100% reversible.
- **Bounded Retention**: Database retains the latest 50 versions per document to guarantee bounded storage.

### Depth 4: Authorization Boundary & Permission Model
- **Security Middleware**: Dedicated `requireOwner` (guards `PATCH`, `DELETE`, uploading, sharing, version creation, and version restoration) and `requireReadAccess` (enables share grantees to read documents, download attachments, and inspect version timelines in read-only mode).
- **Relational Integrity**: `shares` table enforces a composite unique constraint `uq_document_share (document_id, shared_with)` and foreign key cascade on document deletion. Self-sharing is rejected (`400 CANNOT_SHARE_WITH_SELF`).

---

## 3. Deliberate Scope Tradeoffs (What Was Deprioritized)

In accordance with the project constraints, we made deliberate scope cuts:

1. **Real-Time Collaborative OT/CRDTs (Deprioritized)**:
   - *Reason*: Building true multi-cursor CRDTs (e.g. Yjs / Automerge over WebSockets) consumes 20+ hours of edge-case debugging (split-brain, cursor reconciliation, network partitions).
   - *Choice*: Implemented a clean single-editor workflow with instant read-only sharing for grantees and snapshot version history.
2. **Complex OAuth/JWT Auth (Deprioritized)**:
   - *Reason*: Setting up third-party OAuth providers (Google/GitHub) adds friction for reviewers.
   - *Choice*: Used simulated seeded personas (`Alice - Owner`, `Bob - Recipient`) authenticated via the `X-User-Id` request header. Swapping to real JWT requires modifying only `middleware/auth.js`.
3. **AWS S3 Cloud Buckets (Deprioritized)**:
   - *Reason*: Requires reviewers to provide AWS credentials or credit cards.
   - *Choice*: Railway persistent volume mount (`/data/uploads`), guaranteeing 100% free reviewer access.

---

## 4. Database Schema (Neon PostgreSQL)

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE documents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT 'Untitled Document',
  content    JSONB NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  stored_name   TEXT NOT NULL UNIQUE,
  mime_type     TEXT NOT NULL,
  size_bytes    INTEGER NOT NULL,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shares (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  shared_with TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_document_share UNIQUE (document_id, shared_with)
);

CREATE TABLE versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  created_by  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label       TEXT,
  content     JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_owner ON documents(owner_id);
CREATE INDEX idx_shares_shared_with ON shares(shared_with);
CREATE INDEX idx_attachments_document ON attachments(document_id);
CREATE INDEX idx_versions_document_created_at ON versions(document_id, created_at DESC);
```

---

## 5. API Surface

All API routes are served under `/api` and authenticated via `X-User-Id`:

| Category | Method | Path | Description | Access Tier |
|---|---|---|---|---|
| **Users** | `GET` | `/api/users` | List seeded personas (Alice & Bob) | Public |
| **Users** | `GET` | `/api/users/me` | Current persona profile | Authenticated |
| **Documents** | `GET` | `/api/documents` | Get `{ owned, shared }` document lists | Authenticated |
| **Documents** | `POST` | `/api/documents` | Create new document | Authenticated |
| **Documents** | `GET` | `/api/documents/:id` | Open document & return `{ document, isOwner }` | `requireReadAccess` |
| **Documents** | `PATCH` | `/api/documents/:id` | Update title and/or AST content | `requireOwner` |
| **Documents** | `DELETE` | `/api/documents/:id` | Delete document, attachments, shares, versions | `requireOwner` |
| **Attachments** | `POST` | `/api/documents/:id/attachment` | Upload 1 file (PDF/PNG/JPG ≤ 5MB) | `requireOwner` |
| **Attachments** | `GET` | `/api/documents/:id/attachment` | Binary stream download | `requireReadAccess` |
| **Attachments** | `DELETE` | `/api/documents/:id/attachment` | Delete attached file | `requireOwner` |
| **Shares** | `POST` | `/api/documents/:id/shares` | Grant read-only access to peer persona | `requireOwner` |
| **Shares** | `GET` | `/api/documents/:id/shares` | List active grantees | `requireOwner` |
| **Shares** | `DELETE` | `/api/documents/:id/shares/:userId` | Revoke access | `requireOwner` |
| **Versions** | `GET` | `/api/documents/:id/versions` | List chronological snapshot metadata | `requireReadAccess` |
| **Versions** | `POST` | `/api/documents/:id/versions` | Save named version snapshot | `requireOwner` |
| **Versions** | `GET` | `/api/documents/:id/versions/:versionId` | Fetch snapshot AST for preview | `requireReadAccess` |
| **Versions** | `POST` | `/api/documents/:id/versions/:versionId/restore` | Restore document to version with auto-backup | `requireOwner` |
| **Versions** | `PATCH` | `/api/documents/:id/versions/:versionId` | Update snapshot label | `requireOwner` |
| **Versions** | `DELETE` | `/api/documents/:id/versions/:versionId` | Delete specific snapshot | `requireOwner` |
