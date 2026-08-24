# Problem Statement (Core Slice): MiniDocs

> **What this document is.** The context definition for the *thinnest complete slice* of the product described in the assignment brief — the smallest end-to-end version in which every required capability (document creation & editing, file upload, sharing, persistence) genuinely works. All further development extends this slice; nothing later should replace or contradict it.
>
> **What this document is not.** It contains no architecture, stack, storage, schema, or folder decisions. Those belong in a separate architecture note written after this scope is agreed.

---

## 1. Project Summary

**MiniDocs** (working name) is a small full-stack, Google-Docs-inspired web application in which a signed-in user creates documents, edits them with basic rich-text formatting, attaches a file, and shares a document with another user. Documents, formatting, attachments, and sharing all survive refresh and reopening. The outcome of this slice is a coherent, demonstrable product core that every future feature builds upon.

---

## 2. Why a Thinnest Complete Slice

The brief rewards depth over breadth: *"keep the project intentionally scoped"* and *"prioritize depth in a few important areas over shallow coverage everywhere."* The main failure mode is building many shallow, disconnected features that individually impress and collectively don't work.

The core slice is therefore:

- **Thin** — exactly one way to do each required thing; no optional variants, no settings.
- **Complete** — each of the four required capabilities works end-to-end on real persisted data; nothing is faked at the surface.
- **Foundational** — the vocabulary (user, document, attachment, share) and the golden-path journey stay stable as features grow around them.

---

## 3. Goal: The Golden Path

Build the smallest product in which this single journey works flawlessly:

```text
Sign in as seeded User A
      ↓
Create a document (appears in "My documents")
      ↓
Rename it
      ↓
Write & format text (bold / italic / underline / heading / lists)
      ↓
Save → refresh → reopen (content + formatting intact)
      ↓
Upload one file to the document
      ↓
Share the document with seeded User B
      ↓
Sign in as User B → document appears under "Shared with me" → open & read it
```

If every step of this path still works after a browser refresh and an application restart, the core slice is done.

---

## 4. Users

Simulated users are sufficient, per the brief: *"you may simulate users with seeded accounts, mocked auth, or a lightweight login flow."*

### Seeded personas

- **User A — Owner.** Creates, edits, renames, uploads, shares.
- **User B — Recipient.** Receives shared access; sees and reads shared documents.

Login is a minimal identity switch (e.g., pick a user from a list). No passwords, registration, or session security — real authentication is explicitly future work.

### User stories

> As **User A**, I want to create, format, and save a document so that I can return to it later with everything intact.

> As **User A**, I want to attach a file to my document so that related material lives with the document.

> As **User A**, I want to share a document with User B so that they can read it.

> As **User B**, I want shared documents clearly separated from my own so that I always know what I own versus what was shared with me.

---

## 5. Core Vocabulary (conceptual, not a schema)

| Concept | Meaning in this slice |
|---|---|
| **User** | One of the seeded identities; can own documents and receive shares. |
| **Document** | A titled piece of rich-text content with exactly one owner. |
| **Attachment** | A file uploaded to a specific document by its owner. |
| **Share** | A grant from a document's owner to another user, giving read access. |

These four nouns are the base language of the whole application. Later features (permissions, versions, comments) attach to them rather than rename them.

---

## 6. What the Product Accepts (inputs)

| Input | Provided by | Notes |
|---|---|---|
| Identity choice | Any user | Which seeded user is currently acting. |
| Document title | Owner | Set at creation (default allowed) and via rename. |
| Rich-text content | Owner | Bold, italic, underline, at least one heading level (or size variation), bulleted and numbered lists. |
| One file | Owner | Attached to a document. Allowed types and size limit must be stated in the UI and README (e.g., PDF/PNG/JPG up to 5 MB — the exact list is the implementer's call, but it must be explicit). |
| Share grant | Owner | The other seeded user who should receive read access. |

---

## 7. What the Product Shows (outputs)

1. A **document list** for the signed-in user with a visible distinction between **Owned** and **Shared with me**.
2. An **editor view** where formatting is applied and visibly rendered as the user works.
3. A **trustworthy saved state**: reopening a document shows the same content and formatting that was saved.
4. The **attachment** visible on its document (file name at minimum; open/download if trivial).
5. For the recipient, the shared document is **readable** and clearly not owned by them.

---

## 8. Functional Requirements

### FR1 — Seeded identity
At least two seeded users exist. A person can sign in as one, sign out, and switch to the other. Every action is attributed to the signed-in user.

### FR2 — Document lifecycle
Create a new document (default title acceptable), rename it, see it in the owner's list, and reopen it later. Deletion is not required in this slice.

### FR3 — Rich-text editing & saving
Edit content with at minimum: **bold**, *italic*, underline, one heading level (or text-size variation), bulleted list, numbered list. Content saves — explicit save button or autosave, either is fine, but the current save state must be visible — and reopens with formatting preserved.

### FR4 — File upload
The owner can upload at least one file to a document. Supported types and size limits are clearly stated in the UI and README. The file persists and remains visible on the document. A file outside the stated limits is rejected with a clear message.

### FR5 — Sharing
The owner can grant another seeded user access to a specific document. The recipient sees it under a distinct "Shared with me" grouping and can open and read it. One access level (read) is enough; recipients cannot re-share or edit.

### FR6 — Persistence
Everything above — documents, titles, content and formatting, attachments, shares — survives a page refresh and an application restart.

---

## 9. Product Qualities (context level)

- **Coherent** — the editing flow feels usable, not a tech demo (per the brief: *"usable and coherent"*).
- **Honest** — no faked persistence or sharing; what the demo shows is what the system actually does.
- **Explicit** — limits (file types, sizes, single access level) are stated in the UI/README rather than discovered through failure.
- **Demoable** — the golden path can be walked live, or on the deployed URL, in a few minutes.
- **Free to run** — no dependency or service that reviewers must pay for.

---

## 10. Scope Fence

### In the core slice (all required)

1. Seeded users + minimal sign-in / switch
2. Create, rename, list, and open documents
3. Rich-text editing with the six baseline formats
4. Save and reopen with fidelity
5. File upload attached to a document (at least one file)
6. Owner → user read sharing with a visible owned/shared distinction
7. Full persistence across refresh and restart

### Explicitly out (natural next increments, in rough priority order)

- Edit access for recipients; multiple permission levels; revoking shares
- Real authentication (passwords/OAuth) and registration
- Real-time simultaneous editing, cursors, comments
- Version history, trash/restore, search, folders or other organization
- Multiple attachments per document; images embedded in the document body
- Notifications, activity feeds, public links

Nothing on the "out" list may be started before every item on the "in" list passes the acceptance criteria below.

---

## 11. Acceptance Criteria (demo script)

The core slice is complete when this script can be performed on the running product without workarounds:

- [ ] Sign in as User A; create a document; rename it to a chosen title.
- [ ] Write multi-paragraph content using bold, italic, underline, a heading, a bulleted list, and a numbered list.
- [ ] Save; refresh the browser; reopen — title, content, and all formatting are intact.
- [ ] Upload one allowed file to the document; it appears on the document. A disallowed file is rejected with a clear message.
- [ ] Share the document with User B.
- [ ] Sign in as User B: the document appears under "Shared with me", visually distinct from owned documents, and opens in readable form; User B's own documents are unaffected.
- [ ] Restart the application; every state above is still present.

---

## 12. Fixed Constraints (inherited from the brief)

- Keep the project intentionally scoped; do not chase Google Docs feature parity.
- Any language, framework, editor library, or tooling stack is allowed; AI coding tools and assistants are allowed.
- Reviewers must never need to pay for a dependency or service.
- If file types are limited, that must be stated clearly in the UI and README.
- The wider submission package (README, architecture note, AI workflow note, SUBMISSION.md, live URL, walkthrough video, screenshots) is a separate deliverable; this document governs product scope only.

---

## 13. One-Line Product Description

> **MiniDocs** is a minimal document workspace where a user creates and formats a document, attaches a file, and shares it with another user — and everything is still there when they come back.
