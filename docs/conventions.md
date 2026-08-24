# Conventions & Standards — MiniDocs

> **Purpose.** This document codifies every naming, coding, structural, and workflow convention for the MiniDocs project. Every contributor (human or AI) must follow these rules so the codebase stays consistent, reviewable, and aligned with the [architecture](file:///c:/Users/jangr/Documents/AJAIA/Docs/architecture.md) and [problem statement](file:///c:/Users/jangr/Documents/AJAIA/Docs/problemstatement_core.md).

---

## 1. Language & Runtime

| Rule | Convention |
|---|---|
| Language | **JavaScript (ES2022+)** throughout — no TypeScript in the core slice. |
| Module system | **ESM** (`import`/`export`) in the client. **CommonJS** (`require`/`module.exports`) in the server unless `"type": "module"` is set in `server/package.json`. |
| Node.js version | **22 LTS** (latest Active LTS). Pin in `.nvmrc` or `engines` field. |
| Package manager | **npm** (lockfile committed). No yarn, pnpm, or bun. |
| Formatting | **Prettier** with defaults (2-space indent, single quotes, trailing commas, semicolons). Config in root `.prettierrc`. |
| Linting | **ESLint** with `eslint:recommended` + `plugin:react/recommended` + `plugin:react-hooks/recommended` for the client. No linting rules that conflict with Prettier. |

---

## 2. Naming Conventions

### 2.1 Files & Directories

| Entity | Pattern | Example |
|---|---|---|
| React components | **PascalCase** `.jsx` | `DocCard.jsx`, `ShareModal.jsx` |
| Pages | **PascalCase** + `Page` suffix | `LoginPage.jsx`, `EditorPage.jsx` |
| Context providers | **PascalCase** + `Context` suffix | `AuthContext.jsx` |
| Utility / helper modules | **camelCase** `.js` | `client.js`, `formatDate.js` |
| Express route files | **camelCase** `.js` (plural noun) | `documents.js`, `shares.js`, `users.js` |
| Middleware files | **camelCase** `.js` (descriptive) | `auth.js`, `authorize.js`, `upload.js` |
| Config files | **camelCase** `.js` | `db.js`, `vite.config.js` |
| SQL / migration scripts | **camelCase** `.js` | `migrate.js`, `seed.js` |
| Directories | **PascalCase** for component folders, **camelCase** for everything else | `Editor/`, `middleware/`, `routes/`, `config/` |

### 2.2 Variables & Functions

| Entity | Pattern | Example |
|---|---|---|
| Local variables | **camelCase** | `documentId`, `currentUser`, `savedAt` |
| Constants | **UPPER_SNAKE_CASE** | `MAX_FILE_SIZE`, `ALLOWED_MIME_TYPES` |
| Functions | **camelCase**, verb-first | `createDocument()`, `handleSave()`, `fetchUsers()` |
| React components | **PascalCase** | `TiptapCanvas`, `AttachmentCard` |
| Custom hooks | **camelCase**, `use` prefix | `useAuth()`, `useDocument()` |
| Boolean variables | **camelCase**, `is`/`has`/`can` prefix | `isOwner`, `hasAttachment`, `canEdit` |
| Event handlers | **camelCase**, `handle` prefix (component) or `on` prefix (prop) | `handleSave`, `onClick`, `onUpload` |

### 2.3 Database

| Entity | Pattern | Example |
|---|---|---|
| Table names | **snake_case**, plural | `users`, `documents`, `attachments`, `shares` |
| Column names | **snake_case** | `owner_id`, `created_at`, `mime_type`, `shared_with` |
| Primary keys | `id` (UUID or TEXT) | `documents.id`, `shares.id` |
| Foreign keys | `<referenced_table_singular>_id` | `owner_id`, `document_id` |
| Timestamps | `*_at` suffix, always `TIMESTAMPTZ` | `created_at`, `updated_at`, `uploaded_at` |
| Constraints | `uq_<table>_<description>` for unique, `idx_<table>_<column>` for indexes | `uq_document_share`, `idx_documents_owner` |

### 2.4 API

| Entity | Pattern | Example |
|---|---|---|
| URL paths | `/api/<resource>` lowercase plural nouns, no verbs | `/api/documents`, `/api/users` |
| URL params | `:camelCase` | `:id`, `:userId` |
| Request body keys | **camelCase** JSON | `{ "userId": "user-b", "title": "My Doc" }` |
| Response body keys | **camelCase** JSON | `{ "ownerId": "user-a", "createdAt": "..." }` |
| Error shape | `{ "error": { "code": "UPPER_SNAKE", "message": "Human-readable." } }` | `{ "error": { "code": "NOT_FOUND", "message": "Document not found." } }` |
| HTTP status codes | Standard REST semantics | `200` success, `201` created, `400` bad request, `401` unauthorized, `403` forbidden, `404` not found, `413` payload too large, `500` server error |

### 2.5 Environment Variables

| Pattern | Example |
|---|---|
| **UPPER_SNAKE_CASE**, prefixed by context | `DATABASE_URL`, `CORS_ORIGIN`, `PORT`, `UPLOAD_DIR` |
| Client-side env vars use `VITE_` prefix | `VITE_API_URL` |
| Never commit secrets — use `.env` + `.env.example` | `.env` in `.gitignore`; `.env.example` committed with placeholder values |

---

## 3. Project Structure Rules

Follow the directory layout defined in [architecture.md §9](file:///c:/Users/jangr/Documents/AJAIA/Docs/architecture.md). Deviations require updating both the architecture doc and this conventions file.

### Key rules:

1. **Client and server are separate workspaces** — each has its own `package.json`. No shared `node_modules`.
2. **One component per file.** No barrel exports (`index.js` re-exports) in the core slice — keep imports explicit.
3. **Co-locate related files.** A component's styles, tests, and helpers live in the same directory as the component.
4. **Route files own their HTTP concern.** Express route files define endpoints and call through to data-access logic. No SQL queries in middleware.
5. **Middleware is single-purpose.** Each middleware file does one thing: `auth.js` extracts identity, `authorize.js` checks ownership, `upload.js` configures multer.

---

## 4. React & Frontend Conventions

### 4.1 Component Patterns

| Rule | Convention |
|---|---|
| Component style | **Functional components only.** No class components. |
| Props | Destructure in the function signature: `function DocCard({ title, updatedAt })` |
| Default props | Use default parameter values, not `defaultProps`. |
| Conditional rendering | Use early returns or ternary operators. No `&&` with non-boolean left operand. |
| Key prop | Always use a stable, unique identifier (UUID from API). Never use array index. |
| Fragments | Use `<>...</>` shorthand unless a key is needed. |

### 4.2 State Management

| Rule | Convention |
|---|---|
| Global state | **`AuthContext`** only — holds `userId`, `signIn()`, `signOut()`. |
| Page state | `useState` + `useEffect` at the page level. Fetch data on mount. |
| Form state | Local `useState` per input. No form libraries in the core slice. |
| Derived state | Compute inline or with `useMemo`. Do not duplicate state. |
| Side effects | Always in `useEffect` with correct dependency arrays. No naked async in render. |

### 4.3 API Client (`api/client.js`)

```javascript
// All API calls go through this module.
// It reads the user ID from localStorage and attaches it as X-User-Id.
// Base URL comes from VITE_API_URL environment variable.

const API_BASE = import.meta.env.VITE_API_URL;

async function request(path, options = {}) {
  const userId = localStorage.getItem('userId');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(userId && { 'X-User-Id': userId }),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

// Usage: api.get('/api/documents'), api.post('/api/documents', { title })
export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
```

For **multipart uploads** (attachments), use `FormData` directly — do not set `Content-Type` (the browser sets the boundary automatically).

### 4.4 Styling

| Rule | Convention |
|---|---|
| Approach | **Vanilla CSS** — one `index.css` in `client/src/`. |
| No CSS frameworks | No Tailwind, Bootstrap, or CSS-in-JS unless explicitly requested. |
| CSS variables | Define a design token system at `:root` — colors, spacing, radii, shadows. |
| Class naming | **BEM-inspired**: `.doc-card`, `.doc-card__title`, `.doc-card--shared`. |
| Responsiveness | Mobile-first, using `min-width` media queries. |
| Dark mode | Use `prefers-color-scheme` media query with CSS variable overrides. |
| Animations | CSS transitions and `@keyframes` only. No JavaScript animation libraries. |

---

## 5. Express & Backend Conventions

### 5.1 Route Handlers

```javascript
// Pattern: async handler with try/catch, consistent error response.
router.get('/:id', auth, async (req, res, next) => {
  try {
    const doc = await getDocumentById(req.params.id);
    if (!doc) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Document not found.' } });
    res.json(doc);
  } catch (err) {
    next(err);
  }
});
```

| Rule | Convention |
|---|---|
| Async errors | Wrap in `try/catch` and call `next(err)`. |
| Response format | Always JSON. Always camelCase keys. |
| Status codes | Use semantically correct codes (see §2.4). |
| No business logic in routes | Routes orchestrate; data access and validation live in separate functions or modules. |

### 5.2 Database Access

| Rule | Convention |
|---|---|
| Driver | `pg` (node-postgres) with a shared `Pool` exported from `config/db.js`. |
| Queries | Parameterized queries only — **never** string interpolation for SQL values. |
| Connection string | Read from `DATABASE_URL` env var. Always use `ssl: { rejectUnauthorized: false }` for Neon. |
| Query pattern | `pool.query('SELECT * FROM documents WHERE id = $1', [id])` |
| Transaction pattern | Use `pool.connect()` → `client.query('BEGIN')` → ... → `client.query('COMMIT')` → `client.release()` for multi-step writes. |
| Naming | SQL uses `snake_case`; JavaScript objects use `camelCase`. Map at the query boundary. |

### 5.3 Column-to-JS Mapping

Always convert database column names to camelCase when returning JSON:

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

### 5.4 Error Handling

A central error handler in `index.js`:

```javascript
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred.',
    },
  });
});
```

Custom errors can set `err.status` and `err.code` before calling `next(err)`.

---

## 6. Git Conventions

### 6.1 Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Always deployable. Merged only after verification. |
| `dev` | Integration branch for feature work. |
| `feat/<short-name>` | Feature branches off `dev`. | 
| `fix/<short-name>` | Bug fix branches off `dev`. |

### 6.2 Commit Messages

Follow **Conventional Commits**:

```
<type>(<scope>): <short description>

[optional body]
```

| Type | When to use |
|---|---|
| `feat` | New feature or capability. |
| `fix` | Bug fix. |
| `refactor` | Code change that neither fixes a bug nor adds a feature. |
| `style` | CSS or formatting changes (no logic change). |
| `docs` | Documentation only. |
| `chore` | Build, tooling, dependency updates. |
| `test` | Adding or updating tests. |

**Scope** matches a component or layer: `editor`, `api`, `auth`, `db`, `upload`, `share`, `docs`.

**Examples:**
```
feat(editor): add Tiptap toolbar with 6 formatting buttons
fix(upload): reject files exceeding 5 MB on server side
docs(readme): add local setup instructions
chore(server): upgrade express to 4.21
```

### 6.3 `.gitignore` Must-Haves

```
node_modules/
.env
dist/
*.sqlite
*.sqlite3
/server/uploads/
.DS_Store
```

---

## 7. Data & Content Conventions

### 7.1 Document Content Format

- Content is stored as **Tiptap/ProseMirror JSON** in the PostgreSQL `JSONB` column.
- The JSON structure follows the ProseMirror document schema: `{ "type": "doc", "content": [...] }`.
- **Never store raw HTML** in the database. HTML is rendered client-side only by Tiptap.
- Default empty document: `{}` (empty JSON object).

### 7.2 Seeded User Data

Two users are seeded at startup. Their IDs are stable strings, not UUIDs:

```javascript
const SEEDED_USERS = [
  { id: 'user-a', name: 'Alice (Owner)' },
  { id: 'user-b', name: 'Bob (Recipient)' },
];
```

- **`user-a`** is the primary demo persona — creates, edits, uploads, shares.
- **`user-b`** is the secondary — receives shares, reads documents.
- These IDs appear in tests, seed scripts, and demo scripts. Do not change them without updating all references.

### 7.3 Attachment Constraints

| Constraint | Value | Enforced at |
|---|---|---|
| Allowed MIME types | `application/pdf`, `image/png`, `image/jpeg` | Client + Server |
| Maximum file size | **5 MB** (5,242,880 bytes) | Client + Server |
| Attachments per document | **1** (core slice) | Application layer |

These values are defined as constants in a shared config:

```javascript
// server/src/config/upload.js
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
```

State the same limits clearly in the UI upload zone and the project README.

---

## 8. Security Conventions (Core Slice)

| Rule | Convention |
|---|---|
| Auth header | `X-User-Id` — acknowledged as insecure mock. Document in README. |
| Input validation | Validate all request bodies server-side. Never trust client data. |
| SQL injection | Parameterized queries only (`$1`, `$2` placeholders). |
| File uploads | Validate MIME type and size server-side via multer config. Store files with UUID names, never user-provided filenames. |
| Content sanitization | Tiptap's schema-based rendering is the primary XSS defense. Optionally add server-side JSON schema validation on `content`. |
| CORS | Whitelist only the Vercel frontend domain in production. Use `*` only in local development. |
| Secrets | Never commit `.env`. Provide `.env.example` with placeholder values. |
| Directory traversal | Serve attachments through the API route only — never expose the `uploads/` directory directly via static file serving. |

---

## 9. Testing Conventions

### 9.1 Test Framework

| Layer | Tool |
|---|---|
| Backend unit/integration | **Jest** or **Vitest** |
| API endpoint testing | **Supertest** (with Express) |
| Frontend component tests | **Vitest** + **React Testing Library** |
| End-to-end | **Playwright** (if time permits) |

### 9.2 Test File Naming

| Pattern | Example |
|---|---|
| Unit/integration | `<module>.test.js` co-located with source | `documents.test.js`, `auth.test.js` |
| E2E | `<flow>.spec.js` in a top-level `e2e/` folder | `golden-path.spec.js` |

### 9.3 Golden Path Acceptance Test

The core acceptance criteria from [problemstatement_core.md §11](file:///c:/Users/jangr/Documents/AJAIA/Docs/problemstatement_core.md) must pass as a manual or automated test:

```
1. Sign in as User A → create document → rename it.
2. Write content with bold, italic, underline, heading, bullet list, numbered list.
3. Save → refresh → reopen → all formatting intact.
4. Upload allowed file → visible on document. Upload disallowed file → rejected.
5. Share with User B.
6. Sign in as User B → document under "Shared with me" → readable.
7. Restart application → all state preserved.
```

---

## 10. Documentation Conventions

### 10.1 Required Documents

Per the [task brief](file:///c:/Users/jangr/Documents/AJAIA/Docs/Task.txt), the submission includes:

| Document | Purpose |
|---|---|
| `README.md` | Local setup, run instructions, file type limits, live URL. |
| `ARCHITECTURE.md` | Technical architecture note (the architecture.md). |
| `AI_WORKFLOW.md` | How AI tools were used during development. |
| `SUBMISSION.md` | Manifest listing exactly what is included. |
| `CONVENTIONS.md` | This file — coding and project standards. |

### 10.2 README Musts

- Local setup in **≤ 5 steps** (clone, install, env, migrate/seed, run).
- Clearly state file type and size limits.
- Include the live product URL.
- Link to walkthrough video.
- Frame the product as a **document workspace**, not a collaboration tool.
- List what is in scope and what is explicitly out of scope.

### 10.3 Code Comments

| Rule | Convention |
|---|---|
| When to comment | Non-obvious logic, architectural decisions, workarounds, and TODOs. |
| When NOT to comment | Self-explanatory code. Don't restate what the code does. |
| TODO format | `// TODO: <description> — <reason>` |
| JSDoc | Use for exported functions in the API client and database modules. Optional elsewhere. |

---

## 11. Deployment Conventions

| Rule | Convention |
|---|---|
| Frontend (Vercel) | `vercel.json` with SPA rewrite rule. `VITE_API_URL` env var pointing to Railway backend. |
| Backend (Railway) | Dockerfile or Nixpacks auto-detect. Persistent volume mounted at `/data/uploads`. `DATABASE_URL`, `CORS_ORIGIN`, `UPLOAD_DIR`, `PORT` env vars. |
| Database (Neon) | Pooled connection string with `?sslmode=require`. Migrations run via `npm run db:migrate`. Seeds via `npm run db:seed`. |
| Environments | Two environments: `development` (local) and `production` (deployed). No staging in core slice. |
| Build command | `npm run build` in `client/` for Vercel. Railway runs `npm start` in `server/`. |

---

## 12. Scope Enforcement

**The single most important convention:**

> *Nothing on the "out" list may be started before every item on the "in" list passes the acceptance criteria.* — [problemstatement_core.md §10](file:///c:/Users/jangr/Documents/AJAIA/Docs/problemstatement_core.md)

### In scope (all mandatory before any extension):

1. Seeded users + identity switching
2. Create, rename, list, and open documents
3. Rich-text editing with 6 baseline formats
4. Save and reopen with full fidelity
5. File upload with explicit limits
6. Owner → user read sharing with owned/shared distinction
7. Full persistence across refresh and restart

### Out of scope (do not build):

- Real-time simultaneous editing
- Real authentication (passwords/OAuth)
- Version history, trash, search, folders
- Multiple attachments per document
- Comments, notifications, activity feeds
- Edit access for share recipients

If you are tempted to add any "out" item, stop and verify that all 7 "in" items pass the [acceptance script](file:///c:/Users/jangr/Documents/AJAIA/Docs/problemstatement_core.md) first.
