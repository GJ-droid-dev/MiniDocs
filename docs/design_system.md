# Design System — MiniDocs

> **Purpose.** This document defines every visual token, component pattern, and interaction rule for the MiniDocs frontend. Every React component must consume these tokens — no ad-hoc colors, sizes, or shadows. The system is implemented entirely in vanilla CSS custom properties.

---

## 1. Design Philosophy

MiniDocs targets the aesthetic intersection of **Notion's clean minimalism** and **Linear's dark-mode sophistication**. The UI should feel:

- **Calm & focused** — the editor is the protagonist; everything else recedes.
- **Premium & polished** — subtle glassmorphism, micro-animations, and precise spacing signal quality.
- **Information-dense but uncluttered** — every pixel earns its place.

### Guiding Principles

| Principle | What it means in practice |
|---|---|
| **Content-first** | The Tiptap editor canvas gets 70%+ of viewport height. Chrome stays thin. |
| **Progressive disclosure** | Share modal, upload zone, and error states appear on demand, not by default. |
| **Status over action** | Show save state, ownership, and share status passively. Don't require the user to hunt for it. |
| **Motion with purpose** | Every animation communicates a state change (saved, shared, uploaded). No decoration-only motion. |

---

## 2. Color System

### 2.1 Core Palette

The palette is built on a **deep indigo-tinted dark canvas** with a **violet-indigo accent** that signals interactivity.

```css
:root {
  /* ── Canvas & Surfaces ── */
  --color-bg-app:             #0a0b10;   /* Deepest background — app shell */
  --color-bg-surface:         #12141e;   /* Primary surface — cards, panels */
  --color-bg-surface-hover:   #1a1d2b;   /* Surface on hover / active state */
  --color-bg-surface-raised:  #1e2130;   /* Elevated panels — modals, dropdowns */
  --color-bg-editor:          #15171f;   /* Editor canvas — slightly brighter than app bg */
  --color-bg-input:           #0f1118;   /* Input fields & text areas */
  --color-bg-toolbar:         #12141e;   /* Editor toolbar background */

  /* ── Borders ── */
  --color-border-subtle:      #1f2233;   /* Default card/section borders */
  --color-border-default:     #2a2e42;   /* Input borders, dividers */
  --color-border-strong:      #363b52;   /* Focused/active borders */
  --color-border-accent:      #6366f1;   /* Accent border on focus */

  /* ── Text ── */
  --color-text-primary:       #f1f5f9;   /* Headings, primary body */
  --color-text-secondary:     #94a3b8;   /* Descriptions, metadata */
  --color-text-muted:         #64748b;   /* Placeholders, timestamps */
  --color-text-disabled:      #475569;   /* Disabled controls */
  --color-text-inverse:       #0f172a;   /* Text on accent-colored backgrounds */

  /* ── Accent (Indigo) — Primary interactive color ── */
  --color-accent:             #6366f1;
  --color-accent-hover:       #5558e6;
  --color-accent-active:      #4f46e5;
  --color-accent-subtle:      rgba(99, 102, 241, 0.10);
  --color-accent-glow:        rgba(99, 102, 241, 0.20);

  /* ── Semantic Colors ── */
  --color-success:            #10b981;
  --color-success-subtle:     rgba(16, 185, 129, 0.12);
  --color-success-text:       #34d399;

  --color-warning:            #f59e0b;
  --color-warning-subtle:     rgba(245, 158, 11, 0.12);
  --color-warning-text:       #fbbf24;

  --color-danger:             #ef4444;
  --color-danger-subtle:      rgba(239, 68, 68, 0.12);
  --color-danger-text:        #f87171;

  --color-info:               #06b6d4;
  --color-info-subtle:        rgba(6, 182, 212, 0.12);
}
```

### 2.2 Usage Rules

| Context | Token to use |
|---|---|
| App background | `--color-bg-app` |
| Cards, panels, sidebars | `--color-bg-surface` |
| Modals, popovers, dropdowns | `--color-bg-surface-raised` |
| Editor writing surface | `--color-bg-editor` |
| Primary text (titles, body) | `--color-text-primary` |
| Secondary text (timestamps, labels) | `--color-text-secondary` |
| Buttons (primary) | Background: `--color-accent`, text: `white` |
| Buttons (ghost/outline) | Border: `--color-border-default`, text: `--color-text-secondary` |
| Destructive actions | `--color-danger` for icon/text, `--color-danger-subtle` for background |
| Save indicator "Saved ✓" | `--color-success-text` |
| Save indicator "Saving…" | `--color-warning-text` |
| Save indicator "Unsaved" | `--color-text-muted` |

---

## 3. Typography

### 3.1 Font Stack

```css
:root {
  --font-sans:    'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono:    'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  --font-editor:  'Inter', Georgia, 'Times New Roman', serif;
}
```

**Load Inter from Google Fonts** in `index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

### 3.2 Type Scale

A modular scale with ratio **1.25** (Major Third), base **16px**.

| Token | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `--text-xs` | `0.75rem` (12px) | 400 | 1.5 | Badges, captions, timestamps |
| `--text-sm` | `0.875rem` (14px) | 400 | 1.5 | Secondary labels, metadata |
| `--text-base` | `1rem` (16px) | 400 | 1.6 | Body text, editor content |
| `--text-lg` | `1.125rem` (18px) | 500 | 1.5 | Sub-headings, card titles |
| `--text-xl` | `1.25rem` (20px) | 600 | 1.4 | Page section titles |
| `--text-2xl` | `1.5rem` (24px) | 700 | 1.3 | Page headings |
| `--text-3xl` | `1.875rem` (30px) | 700 | 1.2 | Login page title |
| `--text-display` | `2.25rem` (36px) | 800 | 1.1 | Hero text (login only) |

```css
:root {
  --text-xs:      0.75rem;
  --text-sm:      0.875rem;
  --text-base:    1rem;
  --text-lg:      1.125rem;
  --text-xl:      1.25rem;
  --text-2xl:     1.5rem;
  --text-3xl:     1.875rem;
  --text-display: 2.25rem;

  --weight-light:    300;
  --weight-regular:  400;
  --weight-medium:   500;
  --weight-semibold: 600;
  --weight-bold:     700;
  --weight-extrabold: 800;

  --leading-tight:   1.2;
  --leading-snug:    1.3;
  --leading-normal:  1.5;
  --leading-relaxed: 1.6;
}
```

---

## 4. Spacing & Layout

### 4.1 Spacing Scale

An 8px base grid with half-steps for tight UI:

```css
:root {
  --space-0:   0;
  --space-1:   0.25rem;   /*  4px */
  --space-2:   0.5rem;    /*  8px */
  --space-3:   0.75rem;   /* 12px */
  --space-4:   1rem;      /* 16px */
  --space-5:   1.25rem;   /* 20px */
  --space-6:   1.5rem;    /* 24px */
  --space-8:   2rem;      /* 32px */
  --space-10:  2.5rem;    /* 40px */
  --space-12:  3rem;      /* 48px */
  --space-16:  4rem;      /* 64px */
  --space-20:  5rem;      /* 80px */
  --space-24:  6rem;      /* 96px */
}
```

### 4.2 Border Radius

```css
:root {
  --radius-xs:   4px;
  --radius-sm:   6px;
  --radius-md:   10px;
  --radius-lg:   14px;
  --radius-xl:   18px;
  --radius-2xl:  24px;
  --radius-full: 9999px;
}
```

### 4.3 Layout Constraints

```css
:root {
  --max-width-page:    1200px;   /* Page content max width */
  --max-width-editor:  820px;    /* Editor canvas max width */
  --max-width-modal:   480px;    /* Modal dialog max width */
  --max-width-narrow:  400px;    /* Login card width */

  --header-height:     56px;     /* App header height */
  --toolbar-height:    44px;     /* Editor toolbar height */
  --sidebar-width:     280px;    /* If sidebar is added later */
}
```

---

## 5. Elevation & Shadows

Layered shadow system for depth hierarchy:

```css
:root {
  --shadow-xs:     0 1px 2px rgba(0, 0, 0, 0.25);
  --shadow-sm:     0 2px 6px rgba(0, 0, 0, 0.3);
  --shadow-md:     0 4px 16px rgba(0, 0, 0, 0.35);
  --shadow-lg:     0 8px 32px rgba(0, 0, 0, 0.4);
  --shadow-xl:     0 16px 48px rgba(0, 0, 0, 0.5);

  --shadow-glow-accent:  0 0 20px var(--color-accent-glow);
  --shadow-glow-success: 0 0 16px rgba(16, 185, 129, 0.2);
  --shadow-glow-danger:  0 0 16px rgba(239, 68, 68, 0.2);

  /* Glassmorphism backdrop for modals & overlays */
  --glass-bg:     rgba(18, 20, 30, 0.85);
  --glass-blur:   12px;
  --glass-border: rgba(255, 255, 255, 0.06);
}
```

---

## 6. Motion & Animation

### 6.1 Timing Tokens

```css
:root {
  --duration-instant:  100ms;
  --duration-fast:     150ms;
  --duration-normal:   250ms;
  --duration-slow:     400ms;
  --duration-slower:   600ms;

  --ease-default:      cubic-bezier(0.4, 0, 0.2, 1);   /* Standard ease-in-out */
  --ease-spring:       cubic-bezier(0.34, 1.56, 0.64, 1); /* Springy overshoot */
  --ease-decelerate:   cubic-bezier(0, 0, 0.2, 1);     /* Enter screen */
  --ease-accelerate:   cubic-bezier(0.4, 0, 1, 1);     /* Leave screen */
}
```

### 6.2 Keyframe Animations

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInScale {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(16px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### 6.3 Usage Guidelines

| Context | Animation | Duration | Easing |
|---|---|---|---|
| Page mount | `fadeInUp` | `--duration-normal` | `--ease-decelerate` |
| Card grid items | `fadeInUp` with staggered `animation-delay` | `--duration-normal` | `--ease-decelerate` |
| Modal open | `fadeInScale` | `--duration-fast` | `--ease-spring` |
| Modal backdrop | `fadeIn` | `--duration-fast` | `--ease-default` |
| Toast notification | `slideInRight` | `--duration-normal` | `--ease-spring` |
| Button hover | `transform: scale(1.02)` | `--duration-instant` | `--ease-default` |
| Save status "Saving…" | `pulse` on the dot indicator | `1.5s infinite` | linear |
| Loading skeleton | `shimmer` | `1.5s infinite` | linear |
| Spinner icon | `spin` | `0.8s infinite` | linear |

---

## 7. Component Specifications

### 7.1 Buttons

Four variants, each with three sizes:

```
┌──────────────────────────────────────────────────────────────────┐
│  Variant        Background           Text          Border       │
│  ─────────────  ──────────────────   ────────────  ──────────── │
│  Primary        --color-accent       white         none         │
│  Secondary      --color-bg-surface   --text-sec    --border-def │
│  Ghost          transparent          --text-sec    none         │
│  Danger         --color-danger-subtle --danger-text --danger/20% │
└──────────────────────────────────────────────────────────────────┘
```

**Size tokens:**

| Size | Height | Padding (h) | Font Size | Radius |
|---|---|---|---|---|
| `sm` | 32px | `--space-3` | `--text-sm` | `--radius-sm` |
| `md` | 38px | `--space-4` | `--text-sm` | `--radius-md` |
| `lg` | 44px | `--space-6` | `--text-base` | `--radius-md` |

**Interaction states:**
- **Hover**: Lighten background 8%, `transform: translateY(-1px)`, `box-shadow: --shadow-sm`.
- **Active/Press**: Darken background 4%, `transform: translateY(0)`.
- **Disabled**: `opacity: 0.4`, `cursor: not-allowed`, no hover effects.
- **Focus-visible**: `outline: 2px solid var(--color-accent)`, `outline-offset: 2px`.

### 7.2 Cards (DocCard)

```
┌──────────────────────────────────────────────┐
│  ┌──────┐                                    │
│  │ Icon │  Document Title              ⋮     │
│  └──────┘  Updated 3 minutes ago             │
│            📎 Attachment • Shared by Alice    │
└──────────────────────────────────────────────┘

Background:   --color-bg-surface
Border:       1px solid --color-border-subtle
Radius:       --radius-lg
Padding:      --space-5
Shadow:       --shadow-xs
Hover:        border-color -> --color-border-strong
              transform: translateY(-2px)
              shadow: --shadow-md
Transition:   all --duration-fast --ease-default
```

**Card grid layout:**
```css
.doc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);
}
```

### 7.3 Toolbar (Editor)

```
┌──────────────────────────────────────────────────────────────┐
│  [B] [I] [U]  │  [H1 ▾]  │  [•] [1.]  │          Saved ✓  │
└──────────────────────────────────────────────────────────────┘

Background:    --color-bg-toolbar
Border-bottom: 1px solid --color-border-subtle
Height:        --toolbar-height (44px)
Padding:       0 --space-4
```

**Toolbar button:**

| State | Background | Text Color | Border |
|---|---|---|---|
| Default | `transparent` | `--color-text-muted` | none |
| Hover | `--color-bg-surface-hover` | `--color-text-primary` | none |
| Active (format applied) | `--color-accent-subtle` | `--color-accent` | none |
| Disabled (read-only) | transparent | `--color-text-disabled` | none |

Size: `32 × 32px`, `border-radius: --radius-sm`, `font-weight: 600`.

Separator: `1px solid --color-border-subtle`, height `20px`, `margin: 0 --space-2`.

### 7.4 Modal (Share Dialog)

```
┌─── Backdrop (--glass-bg + blur) ────────────────────────────┐
│                                                              │
│    ┌──── Modal Card ──────────────────────────┐              │
│    │  Share "Architecture Plan"          ✕     │              │
│    │  ─────────────────────────────────────    │              │
│    │                                          │              │
│    │  Share with:   [ Bob (Recipient) ▾ ]     │              │
│    │                         [ Share ]        │              │
│    │                                          │              │
│    │  Shared with:                            │              │
│    │  ┌─────────────────────────────────┐     │              │
│    │  │ 🟢 Bob (Recipient)    [Remove]  │     │              │
│    │  └─────────────────────────────────┘     │              │
│    └──────────────────────────────────────────┘              │
│                                                              │
└──────────────────────────────────────────────────────────────┘

Modal card:
  Background:   --color-bg-surface-raised
  Border:       1px solid var(--glass-border)
  Radius:       --radius-xl
  Padding:      --space-6
  Shadow:       --shadow-xl
  Max-width:    --max-width-modal
  Animation:    fadeInScale --duration-fast --ease-spring

Backdrop:
  Background:   --glass-bg
  Backdrop-filter: blur(--glass-blur)
  Animation:    fadeIn --duration-fast
```

### 7.5 Upload Zone

```
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
│                                                      │
│          ↑  Drag & drop or click to upload           │
│             PDF, PNG, JPG — Max 5 MB                 │
│                                                      │
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘

Default state:
  Background:   transparent
  Border:       2px dashed --color-border-default
  Radius:       --radius-lg
  Padding:      --space-8 --space-4
  Text:         --color-text-muted
  Text-align:   center

Drag-over state:
  Border-color: --color-accent
  Background:   --color-accent-subtle
  Shadow:       --shadow-glow-accent

Error state:
  Border-color: --color-danger
  Background:   --color-danger-subtle
```

### 7.6 Attachment Card

```
┌──────────────────────────────────────────────────────┐
│  📄 ProjectBrief.pdf                                 │
│  1.2 MB • PDF            [Download]  [Delete]        │
└──────────────────────────────────────────────────────┘

Background:   --color-bg-surface
Border:       1px solid --color-border-subtle
Radius:       --radius-md
Padding:      --space-3 --space-4
```

### 7.7 Toast Notifications

```
┌────────────────────────────────────────┐
│  ✓  Document saved successfully        │
└────────────────────────────────────────┘

Position:     fixed, bottom: --space-6, right: --space-6
Background:   --color-bg-surface-raised
Border:       1px solid --color-border-subtle
Border-left:  3px solid (success/danger/info color)
Radius:       --radius-md
Padding:      --space-3 --space-4
Shadow:       --shadow-lg
Animation:    slideInRight, auto-dismiss after 4s
Z-index:      1000
```

### 7.8 Save Status Badge

Three states, rendered inline in the editor header:

| State | Icon | Text | Color |
|---|---|---|---|
| **Saved** | `●` (solid) | "Saved" | `--color-success-text` |
| **Saving** | `●` (pulsing) | "Saving…" | `--color-warning-text` |
| **Unsaved** | `○` (hollow) | "Unsaved changes" | `--color-text-muted` |
| **Error** | `●` (solid) | "Save failed" | `--color-danger-text` |

Font: `--text-xs`, `--weight-medium`, `font-family: --font-mono`.

### 7.9 Persona Card (Login Page)

```
┌────────────────────────────────────────────┐
│                                            │
│         ┌────────┐                         │
│         │   A    │   ← Initial Avatar      │
│         └────────┘                         │
│                                            │
│      Alice (Owner)                         │
│      Primary persona • Creates & shares    │
│                                            │
│            [ Sign in as Alice ]            │
│                                            │
└────────────────────────────────────────────┘

Background:    --color-bg-surface
Border:        1px solid --color-border-subtle
Radius:        --radius-xl
Padding:       --space-8 --space-6
Text-align:    center
Hover:         border-color -> --color-accent
               shadow: --shadow-glow-accent
               transform: translateY(-4px)
Transition:    all --duration-normal --ease-default
```

**Avatar circle:**
```css
.avatar {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--color-accent), #a78bfa);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xl);
  font-weight: var(--weight-bold);
  color: white;
}
```

---

## 8. Page Layouts

### 8.1 Login Page

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                                                              │
│                       📄 MiniDocs                            │
│              Minimal Document Workspace                      │
│                                                              │
│        ┌──────────────┐    ┌──────────────┐                 │
│        │   Alice (A)   │    │   Bob (B)    │                 │
│        │   Owner       │    │  Recipient   │                 │
│        │  [Sign in]    │    │  [Sign in]   │                 │
│        └──────────────┘    └──────────────┘                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘

Layout:        Centered flex column
Max-width:     none (full viewport)
Background:    --color-bg-app with subtle radial gradient glow
```

Background effect:
```css
.login-page {
  background:
    radial-gradient(ellipse at 30% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, rgba(139, 92, 246, 0.06) 0%, transparent 50%),
    var(--color-bg-app);
}
```

### 8.2 Document List Page

```
┌── Header ─────────────────────────────────────────────────────┐
│  📄 MiniDocs        [+ New Document]    👤 Alice  [Sign Out] │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  My Documents (3)                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ Doc 1    │  │ Doc 2    │  │ Doc 3    │                   │
│  │ 2m ago   │  │ 1h ago   │  │ 3d ago   │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
│                                                               │
│  Shared with Me (1)                                          │
│  ┌──────────┐                                                │
│  │ Doc 4    │                                                │
│  │ By Bob   │                                                │
│  └──────────┘                                                │
│                                                               │
└───────────────────────────────────────────────────────────────┘

Header:        height: --header-height, sticky top
Content:       max-width: --max-width-page, centered
Grid:          auto-fill, minmax(300px, 1fr)
Section gap:   --space-10
```

### 8.3 Editor Page

```
┌── Editor Header ──────────────────────────────────────────────┐
│  ← Back   │  Document Title (editable)       │  ● Saved ✓    │
├── Toolbar ────────────────────────────────────────────────────┤
│  [B] [I] [U]  │  [H ▾]  │  [•] [1.]         [Share] [👤]    │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│   ┌── Editor Canvas ──────────────────────────────────┐      │
│   │                                                    │      │
│   │  Heading text here                                 │      │
│   │                                                    │      │
│   │  Body paragraph with **bold**, *italic*,           │      │
│   │  and underlined text...                            │      │
│   │                                                    │      │
│   │  • Bullet item one                                 │      │
│   │  • Bullet item two                                 │      │
│   │                                                    │      │
│   │  1. Numbered item one                              │      │
│   │  2. Numbered item two                              │      │
│   │                                                    │      │
│   └────────────────────────────────────────────────────┘      │
│                                                               │
│   ┌── Attachment Section ─────────────────────────────┐      │
│   │  📄 Specification.pdf  1.2MB  [Download] [Delete] │      │
│   └───────────────────────────────────────────────────┘      │
│                                                               │
└───────────────────────────────────────────────────────────────┘

Editor canvas:
  max-width:     --max-width-editor
  margin:        0 auto
  padding:       --space-8 --space-6
  min-height:    60vh
  background:    --color-bg-editor
  border:        1px solid --color-border-subtle
  border-radius: --radius-lg (top corners only if toolbar attached)
```

**Read-only mode** (share recipient):
- Toolbar buttons visually disabled (greyed out with `--color-text-disabled`).
- Upload zone hidden entirely.
- Share button hidden.
- A subtle banner: `"You are viewing this document as a guest"` at the top with `--color-info-subtle` background.

---

## 9. Iconography

Use **inline SVG** icons for maximum control over color and size. No icon library dependency.

### Required icons (minimal set):

| Icon | Usage | Suggested approach |
|---|---|---|
| Bold (**B**) | Toolbar | Text glyph `B` in `--weight-bold` |
| Italic (*I*) | Toolbar | Text glyph `I` in `--weight-medium`, italic |
| Underline (U̲) | Toolbar | Text glyph `U` with `text-decoration: underline` |
| Heading (H) | Toolbar | Text glyph `H` in `--weight-bold` |
| Bullet list (•) | Toolbar | Simple SVG: three horizontal lines with leading dots |
| Ordered list (1.) | Toolbar | Simple SVG: three horizontal lines with leading numbers |
| Plus (+) | New document button | Simple SVG or Unicode `+` |
| Back arrow (←) | Editor back button | Simple SVG chevron or Unicode `←` |
| Paperclip (📎) | Attachment indicator | Simple SVG paperclip |
| Upload (↑) | Upload zone | Simple SVG arrow-up |
| Download (↓) | Attachment download | Simple SVG arrow-down |
| Trash (🗑) | Delete | Simple SVG trash outline |
| Share (👥) | Share button | Simple SVG two-person silhouette |
| Close (✕) | Modal close | Unicode `×` or SVG X |
| Sign out (→) | Header sign out | Simple SVG arrow-right-from-bracket |

---

## 10. Responsive Breakpoints

```css
:root {
  --bp-sm:   640px;
  --bp-md:   768px;
  --bp-lg:   1024px;
  --bp-xl:   1280px;
}

/* Usage: @media (min-width: 640px) { ... } */
```

| Breakpoint | Layout changes |
|---|---|
| `< 640px` | Single column cards; toolbar buttons shrink to icons; modal fills viewport width with `--space-3` margin |
| `640px – 1024px` | Two-column card grid; toolbar shows full labels |
| `> 1024px` | Three+ column card grid; full-width editor with comfortable margins |

---

## 11. Accessibility Baseline

| Requirement | Implementation |
|---|---|
| **Focus indicators** | All interactive elements use `outline: 2px solid var(--color-accent)` on `:focus-visible`. |
| **Contrast ratios** | `--color-text-primary` on `--color-bg-app` = ~15.3:1 (AAA). `--color-text-secondary` on `--color-bg-surface` = ~5.8:1 (AA). |
| **Keyboard navigation** | Toolbar buttons focusable with `Tab`. Modal traps focus. `Escape` closes modals. |
| **Screen reader labels** | All toolbar buttons have `aria-label`. Save status has `aria-live="polite"`. |
| **Reduced motion** | `@media (prefers-reduced-motion: reduce)` disables all animations. |

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 12. Implementation Checklist

When building the frontend in Phase 6, implement tokens in this order:

1. **`index.css`** — All CSS variables from §2–6 + keyframes from §6.2 + resets + accessibility baseline.
2. **Layout shells** — Login, DocumentList, and Editor page containers using §8 layout specs.
3. **Buttons** — Primary, Secondary, Ghost, Danger variants with size tokens from §7.1.
4. **Cards** — DocCard component with hover, transition, and grid layout from §7.2.
5. **Header** — App header with avatar, sign-out, and "New Document" button.
6. **Toolbar** — 6 formatting buttons with active states per §7.3.
7. **Editor canvas** — Tiptap mount with editor-specific styling from §8.3.
8. **Save status** — Badge states from §7.8.
9. **Upload zone** — Drag-drop area with three visual states from §7.5.
10. **Attachment card** — Filename, size, download/delete from §7.6.
11. **Share modal** — Full modal with backdrop, glass effect, recipient list from §7.4.
12. **Toast system** — Notification component with auto-dismiss from §7.7.
13. **Persona cards** — Login page cards with avatar and gradient from §7.9.
14. **Responsive** — Apply breakpoint adjustments from §10.
15. **Polish** — Staggered card animations, page transitions, skeleton loaders.
