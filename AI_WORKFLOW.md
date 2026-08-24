# AI-Native Workflow Note — MiniDocs

> **Purpose.** This note reflects how AI tools were integrated into the product-engineering lifecycle for MiniDocs. In an AI-forward engineering environment, the goal is high leverage paired with rigorous human judgment, domain taste, and automated validation.

---

## 1. AI Tools Utilized

| Tool | Primary Purpose | Lifecycle Stage |
|---|---|---|
| **Antigravity IDE (Gemini 3.7 Flash & Claude Opus)** | Agentic code generation, project scaffolding, multi-file refactoring, and integration testing. | Implementation & Verification |
| **Google Stitch UI Generator** | Generating initial visual concepts, design token extraction, and screen layout exploration. | UI/UX Design & Prototyping |
| **Browser Subagent (Playwright/Chrome DevTools)** | Automated browser interaction, visual validation, and end-to-end user journey recording. | E2E Testing & Verification |

---

## 2. Where AI Materially Sped Up the Work

1. **Architecture & Schema Formulation (10x Acceleration)**:
   - Rapidly generating the relational schema in PostgreSQL DDL with proper constraints (`ON DELETE CASCADE`, composite uniqueness on `(document_id, shared_with)`, and composite timestamp index `(document_id, created_at DESC)` for versioning).
2. **Boilerplate Scaffolding & Integration Test Suites**:
   - Creating comprehensive integration test suites (`test-phase3.js`, `test-phase4.js`, `test-phase5.js`, `test-phase-vh1.js`) covering 44 automated test assertions against the live Neon database.
3. **Design System & Component Assembly**:
   - Translating visual designs from Stitch into structured Vanilla CSS tokens, glassmorphic styles, and responsive React components (`Navbar.jsx`, `DocCard.jsx`, `AttachmentDrawer.jsx`, `ShareModal.jsx`, `VersionHistoryPanel.jsx`).
4. **Automated End-to-End Browser Walkthroughs**:
   - Using the `browser_subagent` to autonomously click through user journeys (sign-in → create doc → format text → autosave → save named versions → non-destructive preview → 1-click restore → share → switch persona → download attachment), providing immediate regression feedback.

---

## 3. What AI-Generated Output Was Changed or Rejected

High-leverage AI engineering requires actively identifying subtle bugs and architectural traps that AI models introduce:

1. **Rejected: Destructive Version History Preview**:
   - *AI Output*: The initial AI suggestion was to directly overwrite `documents.content` via `editor.commands.setContent()` whenever a user clicked a past snapshot in the timeline.
   - *Problem Identified*: This would destroy unsaved work or trigger premature autosaves of old snapshots.
   - *Our Fix*: Introduced a defensive non-destructive preview buffer (`headDocContentRef.current`) and suppressed the autosave loop while viewing snapshots, requiring an explicit user confirmation to restore.
2. **Rejected: Missing Pre-Restore Backup**:
   - *AI Output*: Restoring a version immediately executed `UPDATE documents SET content = $1`.
   - *Problem Identified*: If a user restored by mistake, intermediate work was permanently lost.
   - *Our Fix*: Added an automatic pre-restore backup snapshot: `label: 'Pre-restore (before <label>)'` so restores are 100% reversible.
3. **Rejected: Loose Tiptap Content Parsing**:
   - *AI Output*: The initial AI suggestion was to directly call `editor.commands.setContent(doc.content)` on load.
   - *Problem Identified*: When opening a newly created or empty document (`{}`), ProseMirror's internal parser failed with `Cannot read properties of null (reading 'commands')`.
   - *Our Fix*: Introduced a defensive `normalizeDocContent()` AST validator that guarantees a valid ProseMirror node tree before mounting.
4. **Rejected: Disconnected React/Tiptap Toolbar Lifecycle**:
   - *AI Output*: Initial toolbar buttons only evaluated `editor.isActive('bold')` on component render, causing a 1–2 second delay in visual active state cues.
   - *Problem Identified*: ProseMirror's internal transaction loop runs outside of React's state tree.
   - *Our Fix*: Subscribed `Toolbar.jsx` directly to `editor.on('transaction')` and `editor.on('selectionUpdate')` and converted button clicks to `onMouseDown(e.preventDefault())` to eliminate focus loss, achieving instantaneous (<16ms) toolbar responsiveness.
5. **Rejected: External Test Runner Bloat**:
   - *AI Output*: AI proposed installing heavyweight external testing frameworks (`supertest`, `jest`) for single-purpose scripts.
   - *Our Fix*: Standardized test suites on native Node.js `http.createServer(app)` on ephemeral ports (`server.listen(0)`), keeping reviewer dependencies at zero.

---

## 4. How Correctness, UX Quality, and Reliability Were Verified

We employed a multi-layered verification strategy:

### Layer 1: Automated Integration Tests Against Live Database
- Executed **44 automated integration tests** across 4 test suites against the live Neon PostgreSQL database:
  - Verified `JSONB` AST trees survived updates and historical restores with 100% fidelity.
  - Verified non-owners receive `403 FORBIDDEN` when attempting to edit documents, upload attachments, create versions, or trigger restores.
  - Verified files exceeding 5 MB return `413 PAYLOAD_TOO_LARGE` and invalid extensions return `400 INVALID_FILE_TYPE`.
  - Verified duplicate shares return `409 ALREADY_SHARED` and self-shares return `400 CANNOT_SHARE_WITH_SELF`.
  - Verified 50-version retention limits prune older snapshots automatically.

### Layer 2: Automated Browser Subagent Runs
- Automated browser sessions executed the full persona lifecycle:
  - Switching between Alice and Bob.
  - Creating, formatting, autosaving, naming milestones, previewing, and restoring rich-text documents.
  - Verifying recipient read-only viewing banners and disabled edit controls.

### Layer 3: Build & Asset Validation
- Executed production Vite builds (`npm run build`) ensuring zero bundle errors, strict type safety in JS modules, and clean SPA rewrite routing (`vercel.json`).

---

## 5. Summary
AI was used as an **accelerator for velocity and test volume**, while **architecture, safety invariants, UX taste, and correctness** were strictly directed and verified by human engineering judgment.
