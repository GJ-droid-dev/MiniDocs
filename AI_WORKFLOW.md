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
   - Rapidly generating the initial relational schema in PostgreSQL DDL with proper constraints (`ON DELETE CASCADE`, composite uniqueness on `(document_id, shared_with)`), reducing schema setup time from hours to minutes.
2. **Boilerplate Scaffolding & Integration Scripts**:
   - Creating comprehensive integration test suites (`test-phase3.js`, `test-phase4.js`, `test-phase5.js`, `validate-phases-1-to-3.js`) testing status codes (`201`, `400`, `401`, `403`, `409`, `413`) and boundary conditions against the live database.
3. **Design System & Component Assembly**:
   - Translating visual designs from Stitch into structured Vanilla CSS tokens, glassmorphic styles, and responsive React components (`Navbar.jsx`, `DocCard.jsx`, `AttachmentDrawer.jsx`, `ShareModal.jsx`).
4. **Automated End-to-End Browser Walkthroughs**:
   - Using the `browser_subagent` to autonomously click through the entire Golden Path (sign-in → create doc → format text → verify autosave → share → switch persona → download attachment), providing instant feedback on regressions.

---

## 3. What AI-Generated Output Was Changed or Rejected

High-leverage AI engineering requires actively identifying subtle bugs and architectural traps that AI models introduce:

1. **Rejected: Loose Tiptap Content Parsing**:
   - *AI Output*: The initial AI suggestion was to directly call `editor.commands.setContent(doc.content)` on load.
   - *Problem Identified*: When opening a newly created or empty document (`{}`), ProseMirror's internal parser failed with `Cannot read properties of null (reading 'commands')`.
   - *Our Fix*: Introduced a defensive `normalizeDocContent()` AST validator that guarantees a valid ProseMirror node tree before mounting.
2. **Rejected: Disconnected React/Tiptap Toolbar Lifecycle**:
   - *AI Output*: Initial toolbar buttons only evaluated `editor.isActive('bold')` on component render, causing a 1–2 second delay in visual active state cues.
   - *Problem Identified*: ProseMirror's internal transaction loop runs outside of React's state tree.
   - *Our Fix*: Subscribed `Toolbar.jsx` directly to `editor.on('transaction')` and `editor.on('selectionUpdate')` and converted button clicks to `onMouseDown(e.preventDefault())` to eliminate focus loss, achieving instantaneous (<16ms) toolbar responsiveness.
3. **Rejected: Static Dashboard Reactivity**:
   - *AI Output*: Dashboard `useEffect` hook had an empty dependency array `[]`.
   - *Problem Identified*: Switching personas from Alice to Bob in the header dropdown updated `localStorage` but did not re-fetch the document lists.
   - *Our Fix*: Connected `useAuth()` and added `user?.id` to `useEffect` across both Dashboard and Editor pages for instant, reactive persona switching.
4. **Rejected: Inline Extension Re-Instantiation**:
   - *AI Output*: Instantiating `StarterKit` and `Underline` inside the component body caused duplicate extension name warnings during Vite HMR re-renders.
   - *Our Fix*: Hoisted `EXTENSIONS` to a static, stable module-level declaration.

---

## 4. How Correctness, UX Quality, and Reliability Were Verified

We employed a multi-layered verification strategy:

### Layer 1: Automated Integration Tests Against Live Database
- Executed 28 automated integration tests (`validate-phases-1-to-3.js`, `test-phase4.js`, `test-phase5.js`) testing all REST endpoints against the live Neon PostgreSQL database:
  - Verified `JSONB` AST trees survived updates with 100% fidelity.
  - Verified non-owners receive `403 FORBIDDEN` when attempting to edit or delete documents.
  - Verified files exceeding 5 MB return `413 PAYLOAD_TOO_LARGE` and invalid extensions return `400 INVALID_FILE_TYPE`.
  - Verified duplicate shares return `409 ALREADY_SHARED` and self-shares return `400 CANNOT_SHARE_WITH_SELF`.

### Layer 2: Automated Browser Subagent Runs
- Automated browser sessions executed the full persona lifecycle:
  - Switching between Alice and Bob.
  - Creating, formatting, autosaving, and reloading rich-text documents.
  - Verifying recipient read-only viewing banners and disabled edit controls.

### Layer 3: Build & Asset Validation
- Executed production Vite builds (`npm run build`) ensuring zero bundle errors, strict type safety in JS modules, and clean SPA rewrite routing (`vercel.json`).

---

## 5. Summary
AI was used as an **accelerator for execution**, while **architecture, scope boundaries, UX taste, and safety invariants** were strictly controlled and validated.
