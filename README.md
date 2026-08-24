# MiniDocs 📄

> **MiniDocs** is a minimalist, high-craft document workspace built for the Ajaia Full Stack Product Engineer assignment. It enables users to create and format rich-text documents, attach files, save and restore version history milestones, and share documents with peers — with guaranteed persistence across page refreshes and server restarts.

---

## 🚀 Live Demo & Deployment
- **Frontend SPA (Vercel)**: [https://mini-docs-chi.vercel.app](https://mini-docs-chi.vercel.app)
- **Backend API (Railway)**: [https://minidocs-production.up.railway.app](https://minidocs-production.up.railway.app)
- **Database**: Neon Serverless PostgreSQL (`JSONB` AST trees)
- **Repository**: [https://github.com/GJ-droid-dev/MiniDocs](https://github.com/GJ-droid-dev/MiniDocs)
- **Google Drive Submission**: [https://drive.google.com/drive/folders/19uIKFyq54zt_SHj_QvYJ55Oo3FgRHL8O?usp=sharing](https://drive.google.com/drive/folders/19uIKFyq54zt_SHj_QvYJ55Oo3FgRHL8O?usp=sharing)

---

## 👥 Seeded Personas (No Login Required)

The application simulates authentication using seeded accounts for frictionless review:

| Persona | Role | ID | Capabilities |
|---|---|---|---|
| **Alice (Owner)** | Owner | `user-a` | Creates & deletes documents, styles rich-text, attaches files, names & restores version history snapshots, invites collaborators, and revokes shares. |
| **Bob (Recipient)** | Guest / Viewer | `user-b` | Views shared documents and inspects version history in read-only mode, and downloads attached files. Cannot edit, delete, or restore. |

*Switch personas instantly at any time via the login screen or the dropdown in the top-right header.*

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 19, Vite 8, Tiptap 2/3 (ProseMirror AST rich-text engine), React Router 7.
- **Styling**: Vanilla CSS Design System (`index.css`) with Notion × Linear dark-mode aesthetic.
- **Backend**: Node.js 22 LTS, Express, Multer (file parsing & validation).
- **Database**: Neon Serverless PostgreSQL storing document trees and historical version snapshots natively as `JSONB`.
- **Storage**: Railway Persistent Volume (`/data/uploads`) with disk binary cleanup.

---

## 📋 Core Capabilities (The Golden Path)

1. **Document Creation & Editing**: Create, rename, delete documents. Rich-text formatting supports:
   - **Headings** (H1, H2)
   - **Bold**, *Italic*, <u>Underline</u>
   - **Bullet Lists** and **Numbered Lists**
   - Instant toolbar visual feedback (<16ms) and 1000ms debounced autosave.
2. **File Attachments**: Single file upload per document:
   - **Supported formats**: PDF, PNG, JPG (`.pdf`, `.png`, `.jpg`, `.jpeg`).
   - **Size limit**: Max 5 MB per file.
   - Drag-and-drop upload zone, client/server MIME & size validation, and binary streaming download.
3. **Document Version History (Stretch Enhancement)**:
   - **Name current version**: Save milestone snapshots with custom labels (e.g. "Initial Draft", "Pre-Review").
   - **Timeline Drawer**: Right-side slide-over panel displaying chronological snapshots with author avatars and formatted timestamps.
   - **Non-Destructive Preview Mode**: Click any version to inspect past content in read-only preview without losing current edits.
   - **1-Click Restore**: Restore any historical version with automatic pre-restore backup safeguards.
   - **50-Version Bounded Retention**: Automatically prunes older versions to keep database storage lightweight.
4. **Sharing & Access Control**:
   - Owner can grant read-only view access to peer personas via the glassmorphic Share Modal.
   - Grantees receive read-only viewer mode with a guest banner and disabled edit/delete/restore controls.
   - Active share list with single-click access revocation.
5. **Full Persistence**:
   - All documents, AST trees, uploads, version snapshots, and share relationships persist across page refreshes and server restarts.

---

## ⚖️ Intentional Scope Boundaries

| In Scope (Built with Depth) | Out of Scope (Intentionally Deprioritized) |
|---|---|
| ✅ Native PostgreSQL `JSONB` AST trees | ❌ Real-time simultaneous multi-cursor CRDTs |
| ✅ 6 core rich-text formats with debounced autosave | ❌ Comments & suggestion mode |
| ✅ Single file attachment (PDF/PNG/JPG ≤ 5MB) | ❌ Multi-file attachments / nested folders |
| ✅ Document Version History with non-destructive preview & restore | ❌ Per-character diff visualization / branch merging |
| ✅ 1 permission tier (Read-Only for grantees) | ❌ Complex multi-tier RBAC |
| ✅ Mock persona switching (`X-User-Id` header) | ❌ Third-party OAuth / SSO |

---

## 💻 Local Setup in 5 Steps

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/GJ-droid-dev/MiniDocs.git
cd MiniDocs
npm run install:all
```

### 2. Configure Environment Variables
Copy `.env.example` to `server/.env` (Neon Postgres pooled connection is pre-configured):
```bash
cp server/.env.example server/.env
```

### 3. Run Migrations & Seed Personas
```bash
cd server
npm run db:migrate
npm run db:seed
cd ..
```

### 4. Start Development Servers
```bash
# Terminal 1 — Backend Express Server (Port 5000):
npm run dev:server

# Terminal 2 — Frontend Vite Client (Port 5173):
npm run dev:client
```

### 5. Open in Browser
Visit **`http://localhost:5173`** to test the Golden Path.

---

## 🧪 Automated Testing

Run the automated integration test suites against the database:
```bash
cd server
node src/scripts/test-phase3.js   # Auth & persona tests (5 tests)
node src/scripts/test-phase4.js   # Document CRUD & JSONB tests (10 tests)
node src/scripts/test-phase5.js   # Attachment & sharing tests (15 tests)
node src/scripts/test-phase-vh1.js # Version History & restore tests (14 tests)
```
*All 44 integration tests pass with a 100% success rate.*

---

## 📚 Project Documentation

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — Architectural decisions, database schema, and depth tradeoffs.
- [`AI_WORKFLOW.md`](AI_WORKFLOW.md) — AI tools used, speedup areas, rejected AI outputs, and verification.
- [`SUBMISSION.md`](SUBMISSION.md) — Submission manifest, seeded accounts, and 2–4 hour roadmap.
- [`docs/design_system.md`](docs/design_system.md) — Complete visual design system & CSS token specification.
- [`docs/conventions.md`](docs/conventions.md) — Coding conventions, naming patterns, and security rules.
- [`docs/SWOT.md`](docs/SWOT.md) — MiniDocs architecture vs. full-scale Google Docs SWOT analysis.
