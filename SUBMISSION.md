# MiniDocs — Submission Manifest

> **Full Stack Product Engineer Assignment — Ajaia**  
> **Candidate:** Gaurav Jangra  
> **Repository:** [https://github.com/GJ-droid-dev/MiniDocs](https://github.com/GJ-droid-dev/MiniDocs)  
> **Live Demo (Frontend):** [https://mini-docs-gamma.vercel.app](https://mini-docs-gamma.vercel.app) *(or your deployed Vercel URL)*  
> **Backend API:** [https://minidocs-production.up.railway.app](https://minidocs-production.up.railway.app)  

---

## 1. Deliverables Checklist

| Deliverable | Location | Status |
|---|---|---|
| **Source Code** | GitHub repository (`client/`, `server/`) | ✅ Complete |
| **Local Setup Guide** | [`README.md`](file:///c:/Users/jangr/Documents/AJAIA/Docs/minidocs/README.md) (5-step quickstart) | ✅ Complete |
| **Architecture Note** | [`ARCHITECTURE.md`](file:///c:/Users/jangr/Documents/AJAIA/Docs/minidocs/ARCHITECTURE.md) | ✅ Complete |
| **AI-Native Workflow Note** | [`AI_WORKFLOW.md`](file:///c:/Users/jangr/Documents/AJAIA/Docs/minidocs/AI_WORKFLOW.md) | ✅ Complete |
| **Design System Tokens** | [`docs/design_system.md`](file:///c:/Users/jangr/Documents/AJAIA/Docs/minidocs/docs/design_system.md) | ✅ Complete |
| **Conventions & Standards** | [`docs/conventions.md`](file:///c:/Users/jangr/Documents/AJAIA/Docs/minidocs/docs/conventions.md) | ✅ Complete |
| **SWOT Analysis** | [`docs/SWOT.md`](file:///c:/Users/jangr/Documents/AJAIA/Docs/minidocs/docs/SWOT.md) | ✅ Complete |
| **Automated Test Suites** | `server/src/scripts/test-phase*.js` | ✅ 44 / 44 Tests Passed (100%) |
| **Walkthrough Video** | `WALKTHROUGH_VIDEO.txt` | 🎥 Recorded (Loom/YouTube link) |

---

## 2. Seeded Personas & Credentials

The application uses simulated seeded personas for frictionless evaluation (zero login passwords required):

| Persona | Role | ID | Purpose in Review |
|---|---|---|---|
| **Alice** | **Document Owner** | `user-a` | Creates documents, styles rich-text, attaches files, saves & restores version history snapshots, and grants/revokes sharing access. |
| **Bob** | **Recipient (Guest)** | `user-b` | Views shared documents and inspects version history in read-only mode, and downloads attachments. Cannot edit, delete, or restore. |

*You can switch between Alice and Bob at any time via the login screen or the dropdown in the top-right navigation bar.*

---

## 3. Quickstart: Run Locally in 5 Steps

```bash
# 1. Clone & install dependencies
git clone https://github.com/GJ-droid-dev/MiniDocs.git
cd MiniDocs
npm run install:all

# 2. Configure Environment (Neon Postgres already pre-configured in .env.example)
cp server/.env.example server/.env

# 3. Run Migrations & Seed Personas
cd server
npm run db:migrate
npm run db:seed
cd ..

# 4. Start Development Servers
# Terminal 1 (Backend API on :5000):
npm run dev:server

# Terminal 2 (Frontend Client on :5173):
npm run dev:client

# 5. Open in Browser
# Visit http://localhost:5173
```

---

## 4. Feature Status (What Works vs. Intentional Scope Cuts)

### ✅ What is 100% Complete & Working End-to-End:
1. **Document Lifecycle**: Create, rename, view, delete documents; updates synchronized in Neon Postgres.
2. **Rich-Text Editing**: Headings (H1/H2), Bold, Italic, Underline, Bullet Lists, and Numbered Lists with real-time toolbar highlighting (<16ms) and 1000ms debounced autosave.
3. **Lossless Persistence**: Documents stored as native PostgreSQL `JSONB` ProseMirror AST trees, surviving page refreshes, session changes, and server restarts.
4. **File Attachments**: Single file upload per document (PDF, PNG, JPG ≤ 5 MB) with drag-and-drop UI, client/server validation, disk cleanup on replacement, and binary download streaming.
5. **Document Version History (Stretch Enhancement)**:
   - Save custom-named milestone snapshots ("Name current version").
   - Chronological timeline panel with author avatars and formatted timestamps.
   - Non-destructive read-only preview mode with clear warning notice.
   - 1-click restore with automatic pre-restore backup safeguards.
   - 50-version bounded retention cap.
6. **Sharing & Access Control**: Owner can share with peer users; grantees receive immediate read-only access with recipient badges, disabled editing controls, and blocked deletion/restore rights.
7. **Persona Switching**: Instant reactive workspace swapping between Alice and Bob without manual page reloads.

### ⏸️ What Was Intentionally Deprioritized (Scope Cuts):
- **Real-Time Simultaneous Collaboration (OT/CRDT)**: We prioritized depth in single-user editing, version snapshots, and relational access logic rather than an incomplete or buggy WebSocket CRDT prototype.
- **Complex OAuth/SSO**: Kept login lightweight to ensure reviewers can test in seconds without third-party authentication barriers.
- **Multi-File Attachments**: Enforced 1 file per document to maintain a clean, uncluttered interface.

---

## 5. What I Would Build Next with Another 2–4 Hours

If granted an additional 2–4 hours of development time:
1. **PDF Export**: Implement serverless client-side or backend PDF generation from the `JSONB` document AST.
2. **Inline Comments & Annotations**: Add an inline commenting sidebar where Bob can highlight text ranges and leave feedback notes.
3. **Yjs WebSocket Live Cursors**: Upgrade the Tiptap editor with `@tiptap/extension-collaboration` and a lightweight Hocuspocus WebSocket server on Railway for multi-user live cursors.
4. **File Import (.md / .docx to Document)**: Allow users to drop a Markdown or DOCX file onto the dashboard to automatically parse it into a new rich-text document.
