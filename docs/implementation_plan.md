# Implementation Plan — MiniDocs Core Slice

> **Goal.** Build the thinnest complete slice of MiniDocs: a working full-stack application where a user creates a rich-text document, attaches a file, shares it with another user, and everything persists across refresh and restart.
>
> **Source documents:**
> - [Problem Statement](problemstatement_core.md) — scope, requirements, acceptance criteria
> - [Architecture](architecture.md) — stack, schema, API, components, deployment
> - [Conventions](conventions.md) — naming, patterns, standards

---

## Phased Execution Overview

The build is divided into **7 phases**, ordered by dependency. Each phase produces a verifiable outcome before the next begins. No phase may be skipped.

```mermaid
gantt
    title MiniDocs Core Slice — Build Phases
    dateFormat X
    axisFormat %s

    section Foundation
    Phase 1 - Project Scaffold & Infra     :p1, 0, 1
    Phase 2 - Database & Seed              :p2, after p1, 1

    section Backend API
    Phase 3 - Auth + User Routes           :p3, after p2, 1
    Phase 4 - Document CRUD API            :p4, after p3, 1
    Phase 5 - Attachment & Share API        :p5, after p4, 1

    section Frontend
    Phase 6 - Frontend Pages & Editor      :p6, after p3, 3

    section Polish
    Phase 7 - Integration, Deploy, Verify  :p7, after p5, 1
```

---

## Phase 1 — Project Scaffold & Infrastructure Setup

**Outcome:** Two runnable workspaces (client + server), connected to Neon Postgres, deployable to Vercel and Railway.

### 1.1 Initialize Monorepo Structure

```
minidocs/
├── client/          # React (Vite)
├── server/          # Express API
├── .gitignore
├── .prettierrc
├── README.md
└── package.json     # Root scripts only (no deps)
```

#### Tasks:
- [ ] Create root directory `minidocs/`.
- [ ] Initialize git: `git init`, create `.gitignore` per [conventions §6.3](conventions.md).
- [ ] Add root `.prettierrc`: `{ "singleQuote": true, "trailingComma": "all", "semi": true }`.
- [ ] Add root `package.json` with convenience scripts:
  ```json
  {
    "scripts": {
      "dev:client": "cd client && npm run dev",
      "dev:server": "cd server && npm run dev",
      "install:all": "cd client && npm install && cd ../server && npm install"
    }
  }
  ```

### 1.2 Scaffold Client (Vite + React)

- [ ] Run `npx -y create-vite@latest ./client -- --template react` (non-interactive).
- [ ] `cd client && npm install`.
- [ ] Install dependencies:
  ```bash
  npm install react-router-dom @tiptap/react @tiptap/starter-kit @tiptap/extension-underline
  ```
- [ ] Create `vercel.json` for SPA routing:
  ```json
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
  ```
- [ ] Configure `vite.config.js` with proxy for local development:
  ```javascript
  export default defineConfig({
    plugins: [react()],
    server: {
      proxy: { '/api': 'http://localhost:5000' },
    },
  });
  ```
- [ ] Clear boilerplate: remove `App.css`, default Vite content. Set up empty `index.css` with CSS variable skeleton.

### 1.3 Scaffold Server (Express)

- [ ] `mkdir server && cd server && npm init -y`.
- [ ] Install dependencies:
  ```bash
  npm install express cors pg multer uuid dotenv
  npm install --save-dev nodemon
  ```
- [ ] Create directory structure:
  ```
  server/src/
  ├── config/db.js
  ├── middleware/auth.js
  ├── middleware/authorize.js
  ├── middleware/upload.js
  ├── routes/users.js
  ├── routes/documents.js
  ├── routes/attachments.js
  ├── routes/shares.js
  ├── scripts/migrate.js
  ├── scripts/seed.js
  └── index.js
  ```
- [ ] Create `server/.env.example`:
  ```
  DATABASE_URL=postgres://user:pass@endpoint.neon.tech/neondb?sslmode=require
  CORS_ORIGIN=http://localhost:5173
  UPLOAD_DIR=./uploads
  PORT=5000
  ```
- [ ] Create `server/src/index.js` — Express app skeleton with CORS, JSON parsing, and health check route:
  ```javascript
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  ```
- [ ] Add `nodemon` dev script in `server/package.json`:
  ```json
  { "scripts": { "dev": "nodemon src/index.js", "start": "node src/index.js" } }
  ```

### 1.4 Neon Postgres Setup

- [ ] Create a free project on [neon.tech](https://neon.tech).
- [ ] Copy the pooled connection string.
- [ ] Create `server/.env` with real `DATABASE_URL`.
- [ ] Implement `server/src/config/db.js`:
  ```javascript
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  module.exports = pool;
  ```

### 1.5 Verification Checkpoint

- [ ] `cd server && npm run dev` → server starts on port 5000.
- [ ] `curl http://localhost:5000/api/health` → `{ "status": "ok" }`.
- [ ] `cd client && npm run dev` → Vite dev server starts on port 5173.
- [ ] Browser opens to empty React app without errors.

**Commit:** `chore(scaffold): initialize client/server workspaces with Vite, Express, and Neon connection`

---

## Phase 2 — Database Schema & Seed Data

**Outcome:** All 4 tables exist in Neon Postgres. Two seeded users are queryable.

### 2.1 Migration Script

- [ ] Create `server/src/scripts/migrate.js` that runs the full DDL from [architecture §3](architecture.md):
  - `users`, `documents`, `attachments`, `shares` tables.
  - Indexes: `idx_documents_owner`, `idx_shares_shared_with`, `idx_attachments_document`.
  - Unique constraint: `uq_document_share`.
- [ ] Add npm script: `"db:migrate": "node src/scripts/migrate.js"`.
- [ ] Run migration: `npm run db:migrate`.

### 2.2 Seed Script

- [ ] Create `server/src/scripts/seed.js` that inserts:
  ```javascript
  const USERS = [
    { id: 'user-a', name: 'Alice (Owner)' },
    { id: 'user-b', name: 'Bob (Recipient)' },
  ];
  ```
- [ ] Use `INSERT ... ON CONFLICT DO NOTHING` to make seeds idempotent.
- [ ] Add npm script: `"db:seed": "node src/scripts/seed.js"`.
- [ ] Run seed: `npm run db:seed`.

### 2.3 Verification Checkpoint

- [ ] Connect to Neon dashboard → verify 4 tables exist with correct columns.
- [ ] Query `SELECT * FROM users` → returns `user-a` (Alice) and `user-b` (Bob).
- [ ] Run migrate + seed a second time → no errors, no duplicate rows.

**Commit:** `feat(db): add migration and seed scripts for Neon Postgres`

---

## Phase 3 — Auth Middleware & User Routes

**Outcome:** The mock identity system works. Frontend can list users and authenticate via `X-User-Id`.

### 3.1 Auth Middleware (`middleware/auth.js`)

- [ ] Read `X-User-Id` from request headers.
- [ ] Query `users` table to validate the ID exists.
- [ ] Attach `req.user = { id, name }` to the request context.
- [ ] Return `401 Unauthorized` if header is missing or user ID is unknown.
- [ ] Skip auth for user-listing endpoints (public).

### 3.2 User Routes (`routes/users.js`)

| Endpoint | Implementation |
|---|---|
| `GET /api/users` | Query `SELECT id, name FROM users ORDER BY id`. Return array. No auth required. |
| `GET /api/users/:id` | Query by ID. Return user object. Requires auth. |

### 3.3 Central Error Handler

- [ ] Add error-handling middleware in `index.js` per [conventions §5.4](conventions.md):
  ```javascript
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({
      error: { code: err.code || 'INTERNAL_ERROR', message: err.message || 'An unexpected error occurred.' },
    });
  });
  ```

### 3.4 Verification Checkpoint

- [ ] `GET /api/users` → returns `[{ "id": "user-a", "name": "Alice (Owner)" }, ...]`.
- [ ] `GET /api/users/user-a` with `X-User-Id: user-a` → returns user object.
- [ ] `GET /api/users/user-a` without `X-User-Id` → `401`.
- [ ] `GET /api/users/user-a` with `X-User-Id: fake` → `401`.

**Commit:** `feat(auth): add mock auth middleware and user routes`

---

## Phase 4 — Document CRUD API

**Outcome:** Documents can be created, listed (owned + shared), fetched, and updated via the API.

### 4.1 Authorization Middleware (`middleware/authorize.js`)

- [ ] `requireOwner(req, res, next)` — loads document, verifies `owner_id === req.user.id`, attaches `req.document`.
- [ ] `requireReadAccess(req, res, next)` — verifies user is owner OR has a row in `shares`.

### 4.2 Document Routes (`routes/documents.js`)

| Endpoint | Logic | Auth |
|---|---|---|
| `POST /api/documents` | `INSERT INTO documents (id, owner_id, title, content) VALUES (gen_random_uuid(), $1, 'Untitled Document', '{}'::jsonb)`. Return the created document. | Authenticated |
| `GET /api/documents` | Two queries: owned docs (`WHERE owner_id = $1`) and shared docs (`JOIN shares ON ...`). Return `{ owned: [...], shared: [...] }`. | Authenticated |
| `GET /api/documents/:id` | Fetch single document. Include attachment metadata if exists. | Owner or Share Recipient |
| `PATCH /api/documents/:id` | Update `title` and/or `content`. Set `updated_at = NOW()`. | Owner Only |

### 4.3 Column Mapping

- [ ] Implement `toDocument(row)` mapper per [conventions §5.3](conventions.md):
  ```javascript
  function toDocument(row) {
    return {
      id: row.id,
      ownerId: row.owner_id,
      title: row.title,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
  ```

### 4.4 Verification Checkpoint

- [ ] `POST /api/documents` (as user-a) → `201` with new document.
- [ ] `GET /api/documents` (as user-a) → `{ "owned": [{ ... }], "shared": [] }`.
- [ ] `PATCH /api/documents/:id` → updates title. Refresh → title persisted.
- [ ] `PATCH /api/documents/:id` (as user-b) → `403 Forbidden`.
- [ ] `GET /api/documents/:id` (as user-b, no share) → `403`.

**Commit:** `feat(api): add document CRUD routes with ownership authorization`

---

## Phase 5 — Attachment & Sharing API

**Outcome:** Files can be uploaded/downloaded/deleted. Documents can be shared with another user.

### 5.1 Upload Middleware (`middleware/upload.js`)

- [ ] Configure `multer` with:
  - `dest`: `process.env.UPLOAD_DIR || './uploads'`
  - `limits`: `{ fileSize: 5 * 1024 * 1024 }` (5 MB)
  - `fileFilter`: allow only `application/pdf`, `image/png`, `image/jpeg`.
- [ ] Return `400` with clear error message for rejected files.
- [ ] Ensure the `uploads/` directory is created at server startup if missing.

### 5.2 Attachment Routes (`routes/attachments.js`)

| Endpoint | Logic | Auth |
|---|---|---|
| `POST /api/documents/:id/attachment` | If attachment exists, delete old file + row. Store new file as `<uuid>.<ext>`. Insert row in `attachments`. Return metadata. | Owner Only |
| `GET /api/documents/:id/attachment` | Look up attachment row. Stream file with correct `Content-Type` and `Content-Disposition: attachment`. | Owner or Share Recipient |
| `DELETE /api/documents/:id/attachment` | Delete file from disk + row from table. | Owner Only |

### 5.3 Sharing Routes (`routes/shares.js`)

| Endpoint | Logic | Auth |
|---|---|---|
| `POST /api/documents/:id/shares` | Body: `{ "userId": "user-b" }`. Insert into `shares`. Return `201`. Reject if sharing with self or duplicate. | Owner Only |
| `GET /api/documents/:id/shares` | `SELECT u.id, u.name FROM shares JOIN users ...`. Return array of shared-with users. | Owner Only |
| `DELETE /api/documents/:id/shares/:userId` | Delete share row. Return `200`. | Owner Only |

### 5.4 Verification Checkpoint

**Attachments:**
- [ ] Upload a 1 MB PDF as user-a → `201`, metadata returned.
- [ ] Download the file → correct binary content and filename.
- [ ] Upload a 6 MB file → `413` with clear error message.
- [ ] Upload a `.exe` file → `400` with clear error message.
- [ ] Delete attachment → file removed from disk and database.

**Sharing:**
- [ ] Share doc as user-a with user-b → `201`.
- [ ] Share same doc again → `409 Conflict` or idempotent success.
- [ ] `GET /api/documents` as user-b → document appears in `shared[]`.
- [ ] `GET /api/documents/:id` as user-b → returns document content (read access).
- [ ] `PATCH /api/documents/:id` as user-b → `403 Forbidden`.

**Commit:** `feat(api): add file upload, download, sharing routes with validation`

---

## Phase 6 — Frontend Pages & Editor

**Outcome:** The full UI is functional. The golden path can be walked entirely in the browser.

> **Note:** Phase 6 work can begin in parallel with Phases 4–5 once Phase 3 is complete (the auth layer and user routes are available). Mock API responses or build pages against the already-deployed endpoints.

### 6.1 Design System & Global Styles (`index.css`)

- [ ] Define CSS custom properties at `:root`:
  ```css
  :root {
    --color-bg: #0f0f14;
    --color-surface: #1a1a24;
    --color-primary: #6366f1;
    --color-primary-hover: #818cf8;
    --color-text: #e2e8f0;
    --color-text-muted: #94a3b8;
    --color-border: #2d2d3d;
    --color-success: #22c55e;
    --color-danger: #ef4444;
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 16px;
    --shadow-card: 0 4px 24px rgba(0, 0, 0, 0.3);
    --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  }
  ```
- [ ] Import Google Font (Inter) in `index.html`.
- [ ] Set global body styles: dark background, antialiased text, font-family.
- [ ] Style resets, scrollbar, selection, focus-visible.
- [ ] Add micro-animation keyframes: fade-in, slide-up, pulse.

### 6.2 Auth Context (`context/AuthContext.jsx`)

- [ ] Create `AuthContext` with `userId`, `user`, `signIn(id)`, `signOut()`.
- [ ] On mount, read `userId` from `localStorage`. Fetch user profile from API.
- [ ] `signIn(id)`: set `localStorage`, update state, navigate to `/documents`.
- [ ] `signOut()`: clear `localStorage`, clear state, navigate to `/`.
- [ ] Wrap the entire app in `<AuthProvider>`.

### 6.3 API Client (`api/client.js`)

- [ ] Implement the fetch wrapper per [conventions §4.3](conventions.md).
- [ ] Export `api.get()`, `api.post()`, `api.patch()`, `api.delete()`.
- [ ] Handle non-JSON responses gracefully (for file downloads, use separate fetch).

### 6.4 App Routing (`App.jsx`)

- [ ] Set up React Router with three routes:
  ```jsx
  <Routes>
    <Route path="/" element={<LoginPage />} />
    <Route path="/documents" element={<ProtectedRoute><DocumentListPage /></ProtectedRoute>} />
    <Route path="/documents/:id" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />
  </Routes>
  ```
- [ ] `ProtectedRoute`: redirects to `/` if no `userId` in context.

### 6.5 Login Page (`pages/LoginPage.jsx`)

- [ ] Fetch users from `GET /api/users`.
- [ ] Render two persona cards (User A / User B) with names and avatars.
- [ ] On click: call `signIn(userId)` from context.
- [ ] Add glassmorphism card styling, hover scale animation, smooth transitions.
- [ ] If already signed in, redirect to `/documents`.

### 6.6 Document List Page (`pages/DocumentListPage.jsx`)

- [ ] **AppHeader**: display user name, avatar initial, sign-out button.
- [ ] **"Create New" button**: calls `POST /api/documents`, navigates to `/documents/:id`.
- [ ] **Tab Group** or **section headers**: "My Documents" and "Shared with Me".
- [ ] **DocCard** component:
  - Title (truncated if long).
  - "Updated X ago" relative time.
  - Attachment indicator (paperclip icon if attachment exists).
  - Owner tag on shared docs (e.g., "Shared by Alice").
  - Click navigates to `/documents/:id`.
- [ ] Fetch data from `GET /api/documents` on mount.
- [ ] Empty state: "No documents yet. Create your first one!" with CTA.
- [ ] Grid layout with card animations on mount.

### 6.7 Editor Page (`pages/EditorPage.jsx`) — The Core

This is the most complex page. Break it into sub-components:

#### 6.7.1 Editor Header

- [ ] **Back button**: navigates to `/documents`.
- [ ] **Inline title editor**: editable input that auto-saves on blur or debounce.
- [ ] **Save status badge**: "Saved ✓" / "Saving..." / "Unsaved changes" with icon + color.
- [ ] **Read-only indicator**: if the user is not the owner, show "View only" badge.

#### 6.7.2 Tiptap Toolbar (`components/Editor/TiptapToolbar.jsx`)

- [ ] Six formatting buttons, each with:
  - Icon (use Unicode or simple SVG).
  - Active state (highlighted when format is applied at cursor).
  - Click handler that toggles the format via `editor.chain().focus().toggle*().run()`.

| Button | Tiptap Command | Active Check |
|---|---|---|
| **B** (Bold) | `toggleBold()` | `editor.isActive('bold')` |
| *I* (Italic) | `toggleItalic()` | `editor.isActive('italic')` |
| U (Underline) | `toggleUnderline()` | `editor.isActive('underline')` |
| H (Heading) | `toggleHeading({ level: 2 })` | `editor.isActive('heading')` |
| • (Bullet List) | `toggleBulletList()` | `editor.isActive('bulletList')` |
| 1. (Ordered List) | `toggleOrderedList()` | `editor.isActive('orderedList')` |

- [ ] Disable toolbar when user is not the owner (read-only mode).

#### 6.7.3 Tiptap Editor Canvas (`components/Editor/TiptapCanvas.jsx`)

- [ ] Initialize Tiptap with `StarterKit` + `Underline` extension.
- [ ] Set `content` from fetched document JSON.
- [ ] Set `editable: isOwner` (false for share recipients).
- [ ] On `onUpdate`, start debounce timer (1.5s). When it fires:
  1. Set save status to "Saving...".
  2. `PATCH /api/documents/:id` with `{ content: editor.getJSON() }`.
  3. On success, set status to "Saved ✓".
  4. On error, set status to "Save failed" with retry option.

#### 6.7.4 Attachment Section (`components/Attachments/`)

- [ ] **FileUploadZone**: drag-and-drop area + file picker button.
  - Show accepted types and size limit: "PDF, PNG, JPG — Max 5 MB".
  - Client-side validation: check `file.type` and `file.size` before upload.
  - On valid file: `POST /api/documents/:id/attachment` with `FormData`.
  - Show upload progress indicator.
  - On invalid file: show error toast with specific reason.
- [ ] **AttachmentCard**: displayed when attachment exists.
  - Filename, file size (human-readable), file type icon.
  - Download button: opens `GET /api/documents/:id/attachment` in new tab.
  - Delete button (owner only): calls `DELETE /api/documents/:id/attachment`.
- [ ] Hide upload zone for non-owners. Show attachment card as read-only.

#### 6.7.5 Share Panel (`components/Sharing/`)

- [ ] **Share button** in editor header (owner only) → opens **ShareModal**.
- [ ] **ShareModal**:
  - Dropdown listing available users to share with (exclude self and already-shared users).
  - "Share" button: `POST /api/documents/:id/shares` with `{ userId }`.
  - List of currently shared users with "Remove" option.
  - Close button / click outside to dismiss.
- [ ] Hide share button for non-owners.

### 6.8 Visual Polish & UX Details

- [ ] Toast notification system for success/error messages.
- [ ] Loading skeletons on page mount (document list, editor).
- [ ] Smooth page transitions (CSS fade-in).
- [ ] Responsive layout: usable on mobile (toolbar wraps, sidebar collapses).
- [ ] Hover effects on cards, buttons. Active states on toolbar buttons.
- [ ] Focus-visible outlines for keyboard navigation.
- [ ] Favicon and page title (`<title>MiniDocs</title>`).

### 6.9 Verification Checkpoint

Walk the **entire golden path** locally:

- [ ] Sign in as User A → land on document list → empty state visible.
- [ ] Create document → navigate to editor → default title "Untitled Document".
- [ ] Rename to "Test Document" → title saves.
- [ ] Type paragraphs with bold, italic, underline, heading, bullet list, numbered list.
- [ ] Save → refresh browser → reopen → all content and formatting intact.
- [ ] Upload a PDF → attachment card appears with filename and download.
- [ ] Upload a `.exe` → rejected with clear message.
- [ ] Share with User B → share modal shows Bob as shared.
- [ ] Sign out → sign in as User B → "Shared with Me" shows the document.
- [ ] Open as User B → content readable, toolbar disabled, no upload/share controls.
- [ ] Sign out → sign in as User A → own documents unaffected.

**Commits:**
- `feat(ui): add design system, auth context, and API client`
- `feat(ui): add login page with persona selector`
- `feat(ui): add document list page with owned/shared tabs`
- `feat(editor): integrate Tiptap with toolbar and autosave`
- `feat(upload): add file upload zone with validation`
- `feat(share): add share modal and read-only recipient view`
- `style(ui): add animations, polish, and responsive layout`

---

## Phase 7 — Integration, Deployment & Final Verification

**Outcome:** The application is deployed live and passes all acceptance criteria.

### 7.1 Deployment — Neon Database

- [ ] Verify migration and seed have been run against the production Neon database.
- [ ] Confirm connection pooling URL is used (`-pooler` endpoint).

### 7.2 Deployment — Railway Backend

- [ ] Push `server/` to Railway.
- [ ] Add **Persistent Volume** mounted at `/data/uploads`.
- [ ] Set environment variables:
  - `DATABASE_URL` = Neon pooled connection string.
  - `UPLOAD_DIR` = `/data/uploads`.
  - `CORS_ORIGIN` = `https://<project>.vercel.app`.
  - `PORT` = `5000`.
- [ ] Verify: `curl https://<backend>.railway.app/api/health` → `{ "status": "ok" }`.
- [ ] Verify: `curl https://<backend>.railway.app/api/users` → returns seeded users.

### 7.3 Deployment — Vercel Frontend

- [ ] Push `client/` to Vercel.
- [ ] Set environment variable: `VITE_API_URL` = `https://<backend>.railway.app`.
- [ ] Verify `vercel.json` SPA rewrite is active (deep links work).
- [ ] Open `https://<project>.vercel.app` → login page loads.

### 7.4 Production Acceptance Test

Run the full acceptance script from [problemstatement_core.md §11](problemstatement_core.md) on the **live deployed URL**:

- [ ] **AC1:** Sign in as User A; create a document; rename it to "Architecture Review".
- [ ] **AC2:** Write multi-paragraph content using **bold**, *italic*, underline, a heading, a bulleted list, and a numbered list.
- [ ] **AC3:** Save; refresh the browser; reopen — title, content, and all formatting are intact.
- [ ] **AC4:** Upload a PDF → appears on the document. Upload a `.exe` → rejected with clear message.
- [ ] **AC5:** Share the document with User B.
- [ ] **AC6:** Sign in as User B → document appears under "Shared with me", visually distinct from owned documents, opens in readable form; User B's own documents are unaffected.
- [ ] **AC7:** Close the browser; reopen the URL; every state above is still present.

### 7.5 Persistence Stress Test

- [ ] Create 3 documents as User A with different content and formatting.
- [ ] Upload attachments to 2 of them.
- [ ] Share 1 with User B.
- [ ] Redeploy the Railway backend (trigger a new deploy).
- [ ] Verify: all documents, content, attachments, and shares survive the redeploy.

### 7.6 Submission Documentation

- [ ] Write `README.md`:
  - Project description, live URL, local setup (≤ 5 steps).
  - File type/size limits stated clearly.
  - Scope: what's in, what's explicitly out.
  - Screenshots of key screens.
- [ ] Write `AI_WORKFLOW.md`: describe how AI tools were used.
- [ ] Write `SUBMISSION.md`: manifest of all deliverables.
- [ ] Record walkthrough video (3–5 min) walking the golden path on the live URL.
- [ ] Take screenshots: login, document list (owned + shared), editor with formatted content, attachment, share modal.

**Commits:**
- `chore(deploy): configure Railway, Vercel, and Neon for production`
- `docs(readme): add setup instructions, scope, and live URL`
- `docs(submission): add AI workflow note and submission manifest`

---

## Dependency Graph

```mermaid
flowchart TD
    P1[Phase 1: Scaffold & Infra] --> P2[Phase 2: DB Schema & Seed]
    P2 --> P3[Phase 3: Auth & User Routes]
    P3 --> P4[Phase 4: Document CRUD API]
    P3 --> P6[Phase 6: Frontend Pages & Editor]
    P4 --> P5[Phase 5: Attachments & Sharing API]
    P5 --> P7[Phase 7: Integration, Deploy & Verify]
    P6 --> P7
```

- **Phase 6 can begin as soon as Phase 3 is done** (auth + user routes available).
- **Phase 7 requires both Phase 5 and Phase 6** to be complete.
- **No phase may be skipped.** Each verification checkpoint must pass before proceeding.

---

## Risk Mitigations Embedded in Plan

| Risk | Mitigation Built Into Plan |
|---|---|
| Scope creep | Phase 7 runs acceptance criteria *before* any docs or polish. No extensions until all 7 ACs pass. |
| Neon cold starts | Phase 7 includes live testing. If latency is an issue, add a keep-alive ping. |
| Railway volume misconfiguration | Phase 7.5 explicitly tests attachment persistence across redeployment. |
| CORS failures | Phase 1 configures Vite proxy for dev. Phase 7 sets `CORS_ORIGIN` for production. |
| Tiptap complexity | Phase 6.7.3 uses only `StarterKit` + `Underline` — no custom nodes, no advanced features. |
| Save data loss | Phase 6.7.3 implements debounced autosave with visible status indicator. Phase 6.9 tests refresh persistence. |

---

## Definition of Done

The core slice is **done** when:

1. All 7 acceptance criteria from §11 of the problem statement pass on the **live deployed URL**.
2. The README documents setup, scope, and file limits.
3. The submission package (code, docs, video, screenshots, live URL) is complete.
4. No item from the "out" scope list has been started.
