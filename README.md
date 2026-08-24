# MiniDocs 📄

> **MiniDocs** is a minimal document workspace where a user creates and formats rich-text documents, attaches files, and shares them with peer users — with guaranteed persistence across page refreshes and server restarts.

---

## 🚀 Live Demo & Repository
- **Frontend (Vercel)**: *[Deploy link to be added]*
- **Backend (Railway)**: *[Deploy link to be added]*
- **Database**: Neon Serverless PostgreSQL

---

## 🛠️ Tech Stack
- **Frontend**: React 18 / 19, Vite, Tiptap 2 (ProseMirror rich-text engine), Vanilla CSS design system. Hosted on **Vercel**.
- **Backend**: Node.js 22 LTS, Express, Multer (file parsing), `pg` (node-postgres connection pool). Hosted on **Railway**.
- **Database**: Neon Serverless Postgres with native `JSONB` document storage.
- **Storage**: Railway Persistent Volume (`/data/uploads`) for attached binaries.

---

## 📋 Core Capabilities (Golden Path)
1. **Persona Switching (Mock Auth)**: Switch between seeded personas (`User A - Owner`, `User B - Recipient`).
2. **Document Lifecycle**: Create, rename, view, and organize documents across "My Documents" and "Shared with Me".
3. **Rich-Text Editing**: Headings, Bold, Italic, Underline, Bullet Lists, Numbered Lists with debounced autosave.
4. **File Attachments**: Attach 1 file per document (PDF, PNG, JPG up to 5 MB) with client & server validation.
5. **Document Sharing**: Share documents with read-only permission for grantees.
6. **Full Persistence**: All states (database records, rich-text structure, uploads, shares) persist across restarts.

---

## 💻 Local Setup in 5 Steps

### 1. Clone & Install Dependencies
```bash
npm run install:all
```

### 2. Configure Environment Variables
Copy `.env.example` in `server/` to `server/.env` and provide your Neon Postgres connection string:
```bash
cp server/.env.example server/.env
```

### 3. Run Database Migrations & Seed Personas
```bash
cd server
npm run db:migrate
npm run db:seed
```

### 4. Start Development Servers
From the root directory:
```bash
# Terminal 1 - Backend Server (Port 5000)
npm run dev:server

# Terminal 2 - Frontend Client (Port 5173)
npm run dev:client
```

### 5. Open in Browser
Visit `http://localhost:5173` to test the golden path.
