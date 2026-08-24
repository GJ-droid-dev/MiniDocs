# Conventions & Standards — MiniDocs

> **Purpose.** This document codifies every naming, coding, structural, and workflow convention for the MiniDocs project. Every contributor (human or AI) must follow these rules so the codebase stays consistent, reviewable, and aligned with the [architecture](architecture.md) and [problem statement](problemstatement_core.md).

---

## 1. Language & Runtime

| Rule | Convention |
|---|---|
| Language | **JavaScript (ES2022+)** throughout — no TypeScript in the core slice. |
| Module system | **ESM** (`import`/`export`) in the client. **CommonJS** (`require`/`module.exports`) in the server. |
| Node.js version | **22 LTS** (Active LTS). |
| Package manager | **npm** (lockfile committed). |
| Formatting | **Prettier** with defaults (2-space indent, single quotes, trailing commas, semicolons). |
| Linting | **ESLint** + React Hooks rules for client. |

---

## 2. Naming Conventions

### 2.1 Files & Directories

| Entity | Pattern | Example |
|---|---|---|
| React components | **PascalCase** `.jsx` | `DocCard.jsx`, `ShareModal.jsx`, `VersionHistoryPanel.jsx`, `AttachmentDrawer.jsx` |
| Pages | **PascalCase** | `Login.jsx`, `Dashboard.jsx`, `EditorPage.jsx` |
| Context providers | **PascalCase** + `Context` suffix | `AuthContext.jsx` |
| Utility / helper modules | **camelCase** `.js` | `api.js` |
| Express route files | **camelCase** `.js` (plural noun) | `documents.js`, `shares.js`, `users.js`, `attachments.js`, `versions.js` |
| Middleware files | **camelCase** `.js` (descriptive) | `auth.js`, `authorize.js`, `upload.js` |
| Config files | **camelCase** `.js` | `db.js`, `vite.config.js` |
| SQL / migration scripts | **camelCase** `.js` | `migrate.js`, `seed.js` |
| Integration tests | `test-phase*.js` | `test-phase3.js`, `test-phase4.js`, `test-phase5.js`, `test-phase-vh1.js` |
| Directories | **camelCase** | `components/`, `middleware/`, `routes/`, `config/`, `scripts/` |

### 2.2 Variables & Functions

| Entity | Pattern | Example |
|---|---|---|
| Local variables | **camelCase** | `documentId`, `currentUser`, `selectedVersionId`, `savedAt` |
| Constants | **UPPER_SNAKE_CASE** | `MAX_FILE_SIZE`, `MAX_VERSIONS_PER_DOC`, `ALLOWED_MIME_TYPES` |
| Functions | **camelCase**, verb-first | `createDocument()`, `createVersion()`, `restoreVersion()`, `handleSave()` |
| React components | **PascalCase** | `VersionHistoryPanel`, `Toolbar`, `AttachmentDrawer` |
| Custom hooks | **camelCase**, `use` prefix | `useAuth()`, `useEditor()` |
| Boolean variables | **camelCase**, `is`/`has`/`can` prefix | `isOwner`, `hasAttachment`, `isHistoryOpen` |
| Event handlers | **camelCase**, `handle` prefix (component) or `on` prefix (prop) | `handleSelectVersion`, `handleRestoreVersion`, `onClose` |

### 2.3 Database

| Entity | Pattern | Example |
|---|---|---|
| Table names | **snake_case**, plural | `users`, `documents`, `attachments`, `shares`, `versions` |
| Column names | **snake_case** | `owner_id`, `created_at`, `mime_type`, `shared_with`, `created_by` |
| Primary keys | `id` (UUID or TEXT) | `documents.id`, `shares.id`, `versions.id` |
| Foreign keys | `<referenced_table_singular>_id` | `owner_id`, `document_id`, `created_by` |
| Timestamps | `*_at` suffix, always `TIMESTAMPTZ` | `created_at`, `updated_at`, `uploaded_at` |
| Constraints | `uq_<table>_<description>` for unique, `idx_<table>_<column>` for indexes | `uq_document_share`, `idx_versions_document_created_at` |

### 2.4 API Endpoints

| Entity | Pattern | Example |
|---|---|---|
| URL paths | `/api/<resource>` lowercase plural nouns | `/api/documents`, `/api/users`, `/api/documents/:id/versions` |
| URL params | `:camelCase` | `:id`, `:userId`, `:versionId` |
| Request body keys | **camelCase** JSON | `{ "userId": "user-b", "label": "v1.0 Draft" }` |
| Response body keys | **camelCase** JSON | `{ "ownerId": "user-a", "createdAt": "...", "versions": [] }` |
| Error shape | `{ "error": { "code": "UPPER_SNAKE", "message": "Human-readable." } }` | `{ "error": { "code": "VERSION_NOT_FOUND", "message": "Version not found." } }` |

---

## 3. Project Structure Rules

```
minidocs/
├── client/                           # Frontend (React 19 + Vite 8 + Tiptap)
│   ├── src/
│   │   ├── api.js                    # API client injecting X-User-Id & VITE_API_URL
│   │   ├── context/
│   │   │   └── AuthContext.jsx       # User identity & persona switching
│   │   ├── components/
│   │   │   ├── AttachmentDrawer.jsx  # Single file upload & binary download
│   │   │   ├── DocCard.jsx           # Document preview card
│   │   │   ├── Navbar.jsx            # App header with persona switcher
│   │   │   ├── ShareModal.jsx        # Glassmorphic share modal & revocation
│   │   │   ├── Toast.jsx             # Sliding feedback alerts
│   │   │   ├── Toolbar.jsx           # Tiptap toolbar with transaction listeners
│   │   │   └── VersionHistoryPanel.jsx # Version timeline, naming, preview, restore
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx         # Owned vs Shared document lists
│   │   │   ├── EditorPage.jsx        # Tiptap editor canvas, live autosave badge
│   │   │   └── Login.jsx             # Persona selector (Alice vs Bob)
│   │   ├── App.jsx                   # React Router routing
│   │   ├── index.css                 # Vanilla CSS design tokens & glassmorphism
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── vercel.json                   # SPA routing rewrites
│   └── vite.config.js
│
├── server/                           # Backend (Node 22 LTS + Express)
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # Neon Postgres connection pool (pg.Pool)
│   │   ├── middleware/
│   │   │   ├── auth.js               # X-User-Id extractor
│   │   │   ├── authorize.js          # requireOwner & requireReadAccess guards
│   │   │   └── upload.js             # Multer 5MB / MIME configuration
│   │   ├── routes/
│   │   │   ├── attachments.js        # File upload, download stream, delete
│   │   │   ├── documents.js          # Document CRUD & JSONB persistence
│   │   │   ├── shares.js             # Share grant, list, revoke
│   │   │   ├── users.js              # Persona list & profile lookup
│   │   │   └── versions.js           # Version history snapshots, preview, restore
│   │   ├── scripts/
│   │   │   ├── migrate.js            # DDL migration runner
│   │   │   ├── seed.js               # Seed Alice & Bob personas
│   │   │   ├── test-phase3.js        # Auth integration test suite
│   │   │   ├── test-phase4.js        # Document CRUD test suite
│   │   │   ├── test-phase5.js        # Attachment & Share test suite
│   │   │   └── test-phase-vh1.js     # Version History test suite
│   │   └── index.js                  # Express app entry & CORS config
│   ├── .env.example
│   ├── package.json
│   └── railway.json                  # Railway deployment configuration
```

---

## 4. Frontend & Editor Conventions

### 4.1 Tiptap & ProseMirror AST
- Document content is stored exclusively as **Tiptap ProseMirror JSON AST** in PostgreSQL `JSONB`.
- Never store raw HTML strings in the database.
- Always use `normalizeDocContent()` before mounting content to prevent empty object parser crashes:
  ```javascript
  function normalizeDocContent(raw) {
    if (raw && typeof raw === 'object' && raw.type === 'doc' && Array.isArray(raw.content) && raw.content.length > 0) {
      return raw;
    }
    return { type: 'doc', content: [{ type: 'paragraph', content: [] }] };
  }
  ```

### 4.2 Non-Destructive Preview Mode
- When previewing a historical snapshot:
  1. Set `selectedVersionId` to the snapshot ID.
  2. Load snapshot AST into the Tiptap canvas in read-only mode (`editor.setEditable(false)`).
  3. Suppress the debounced autosave loop so preview content is never accidentally persisted as the active head.
  4. Display the prominent top warning banner: `⚠️ Preview Mode: Viewing snapshot from [Date] ("Label")`.
  5. On "Restore", call `api.restoreVersion()`, update current document state, show success toast, and return to edit mode.
  6. On "Exit preview", restore the editor to `headDocContentRef.current` and re-enable editing.

### 4.3 Instant Toolbar Active Feedback (<16ms)
- `useEditor` does not trigger React re-renders on selection changes by default.
- `Toolbar.jsx` MUST listen directly to `editor.on('transaction', forceUpdate)` and `editor.on('selectionUpdate', forceUpdate)`.
- Use `onMouseDown={(e) => { e.preventDefault(); ... }}` on all toolbar buttons to eliminate focus loss from `contenteditable`.

---

## 5. Backend Conventions

### 5.1 Route Handlers & Data Access
- Standard Express async middleware pattern: `async (req, res, next) => { try { ... } catch (err) { next(err); } }`.
- Layered security guards:
  - `requireOwner`: Enforces `document.owner_id === req.user.id` for mutations (`PATCH`, `DELETE`, uploading, sharing, creating versions, restoring versions).
  - `requireReadAccess`: Enforces that `req.user.id` is either the owner OR present in `shares` table (enables reading documents, downloading attachments, and inspecting version history).

### 5.2 Error Handling & Standard Error Codes
All errors are normalized to:
```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Document not found."
  }
}
```
Standard codes: `UNAUTHORIZED`, `FORBIDDEN`, `DOCUMENT_NOT_FOUND`, `VERSION_NOT_FOUND`, `INVALID_FILE_TYPE`, `PAYLOAD_TOO_LARGE`, `ALREADY_SHARED`, `CANNOT_SHARE_WITH_SELF`.

### 5.3 Retention Policy
- Version snapshots are capped at **50 versions per document** to ensure database storage remains strictly bounded.
- Restoring a past version automatically writes a pre-restore backup snapshot: `label: 'Pre-restore (before <label>)'` so restores are 100% reversible.

---

## 6. Seeded Personas & Authentication

| Persona | Role | ID | Purpose |
|---|---|---|---|
| **Alice (Owner)** | Owner | `user-a` | Creates & deletes documents, styles rich-text, attaches files, creates versions, restores history, and shares access. |
| **Bob (Recipient)** | Guest / Viewer | `user-b` | Views shared documents and inspects version history in read-only mode. Cannot edit, delete, create snapshots, or restore. |

Identity is passed via `X-User-Id: <id>` request header.

---

## 7. Testing Conventions

Every phase requires an automated test script running against the live Neon database:

| Script | Purpose | Test Count |
|---|---|:---:|
| `server/src/scripts/test-phase3.js` | Auth & User routes | 5 tests |
| `server/src/scripts/test-phase4.js` | Document CRUD & JSONB AST | 10 tests |
| `server/src/scripts/test-phase5.js` | Attachment & Sharing | 15 tests |
| `server/src/scripts/test-phase-vh1.js` | Version History & Restores | 14 tests |
| **Total Test Suite** | **Comprehensive Integration** | **44 tests (100% pass)** |

---

## 8. Deployment Conventions

| Layer | Host | Configuration |
|---|---|---|
| **Frontend** | **Vercel** | SPA rewrites via `vercel.json`, `VITE_API_URL` pointing to backend. |
| **Backend** | **Railway** | Node.js service via `railway.json`, persistent volume `/data/uploads`, `DATABASE_URL` pointing to Neon pooled connection string. |
| **Database** | **Neon** | Serverless PostgreSQL with SSL connection pooling (`?sslmode=require`). |
