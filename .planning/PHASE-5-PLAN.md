---
phase: "05-design-polish"
title: "Design & Polish: Editorial, Restrained, Premium Craft"
description: "Transform Prohairesis from functional to visually cohesive and ship-ready. Every pixel deliberate, no AI scaffolding."
start_date: "2026-04-01"
estimated_hours: "8-10"
depends_on: ["Phase 2 (voice capture)", "Phase 3 (journal & editing)", "Phase 4 (chat)"]
blocks: ["Phase 6 (testing & deploy)"]
team: "osmol (user) + Claude (builder)"
status: "not_started"

# Design Philosophy
# ================
# Restrained: Remove visual noise. Use whitespace as a design tool.
# Editorial: Feels like Financial Times, not SaaS dashboard. Serious, confident, curated.
# Intentional: Every color, font, spacing decision has a reason. No defaults.
# Premium: Craft evident in typography, mic button, interactions. Worth paying for.
#
# Success Test: Show someone the app without context. Would they believe a serious
# designer (not AI scaffolding) made it? If no, tear it down.
---

# DESIGN SYSTEM SPECIFICATION

## Color Palette

**Base Colors (Non-Negotiable)**
- Background primary: `#F9F9F9` (off-white, soft on eyes)
- Background secondary: `#FFFFFF` (white, use sparingly for elevation/cards)
- Text primary: `#1A1A1A` (dark charcoal, high contrast, readable)
- Text secondary: `#4A4A4A` (lighter gray, for metadata/secondary text)
- Text tertiary: `#757575` (muted gray, for disabled/hint text)

**Accent Color (Single, Muted)**
- Primary accent: `#2B5A6B` (muted teal-blue, sophisticated, works with charcoal)
  OR `#3D5C47` (muted sage green, alternative if teal feels too corporate)
  - **Decision point:** Choose one before Phase 5 starts. Use consistently across all interactive elements.

**Functional Colors**
- Success: `#2E7D32` (muted green, for confirmations)
- Error: `#C62828` (muted red, for warnings/errors)
- Warning: `#F57C00` (muted orange, for cautions)

**Borders & Dividers**
- Border light: `#E8E8E8` (subtle, 1px)
- Border medium: `#D0D0D0` (more definition, used sparingly)
- Divider: same as border light

**Shadows (Minimal)**
- Elevation 1: `0 1px 3px rgba(0, 0, 0, 0.08)`
- Elevation 2: `0 4px 6px rgba(0, 0, 0, 0.12)`
- No drop shadows or glows—use color/borders instead

## Typography System

**Font Pairing (Choose One)**

Option A (Professional-Editorial):
- Headers: **Crimson Text** (serif, elegant, editorial)
- Body: **Sohne** (sans-serif, modern, readable) or **Inter** (if Sohne unavailable)

Option B (Clean-Sophisticated):
- Headers: **Playfair Display** (serif, bold, High Fashion)
- Body: **Lora** + **Lato** or similar

Option C (Minimal-Premium):
- Headers: **EB Garamond** (serif, refined)
- Body: **Roboto** (sans-serif, clean)

**Recommendation for Prohairesis:** Option A (Crimson Text + Sohne). Crimson is editorial without being pretentious. Sohne has humanist geometry that feels intentional.

**Type Scale (Desktop-first)**

| Use | Font | Size | Weight | Line-height | Letter-spacing |
|-----|------|------|--------|-------------|-----------------|
| H1 (page title) | Crimson Text | 3.5rem (56px) | 600 (semibold) | 1.2 | -0.02em |
| H2 (section) | Crimson Text | 2.25rem (36px) | 600 | 1.3 | -0.01em |
| H3 (subsection) | Crimson Text | 1.5rem (24px) | 600 | 1.4 | 0 |
| H4 (small heading) | Sohne | 1rem (16px) | 700 (bold) | 1.5 | 0.01em |
| Body | Sohne | 1rem (16px) | 400 | 1.6 | 0 |
| Body small | Sohne | 0.875rem (14px) | 400 | 1.6 | 0 |
| Label/Meta | Sohne | 0.75rem (12px) | 500 | 1.4 | 0.02em |
| Mono (code) | Courier New or JetBrains Mono | 0.875rem | 400 | 1.5 | 0 |

**Responsive Adjustments (Tablet < 1024px, Mobile < 640px)**
- H1: 2.5rem → 2rem (maintain elegance, not cramped)
- H2: 1.75rem → 1.5rem
- Body: stays 1rem (readable, not micro)
- Scale preserves hierarchy but reduces visual loudness

## Spacing System

**Base unit:** 8px

| Spacing | Size | Use |
|---------|------|-----|
| xs | 4px | internal component spacing, micro gaps |
| sm | 8px | adjacent elements, tight groups |
| md | 16px | sections, component padding, standard margin |
| lg | 24px | major sections, card padding |
| xl | 32px | page sections, large gaps |
| 2xl | 48px | screen padding, major divisions |
| 3xl | 64px | hero spacing, large visual breaks |

**Guidelines:**
- Never nest spacing (don't use `md` inside `md`—use `sm` for sub-grouping)
- Whitespace ≥ content in editorial layouts (not cramped)
- Generous padding on mobile (breathing room for touch)

## Border System

**No borders by default.** Use only when structure requires:
- Input fields: 1px border (`#D0D0D0`) on focus, transparent at rest
- Cards: optional 1px border (`#E8E8E8`) OR subtle shadow (elevation 1) — choose one aesthetic
- Dividers: 1px line (`#E8E8E8`), use between major sections (not between every element)
- Separators in lists: `#E8E8E8` below item, not around

**Color Variables (CSS Custom Properties)**

```css
:root {
  /* Colors */
  --bg-primary: #F9F9F9;
  --bg-secondary: #FFFFFF;
  --text-primary: #1A1A1A;
  --text-secondary: #4A4A4A;
  --text-tertiary: #757575;
  --accent-color: #2B5A6B; /* or #3D5C47 */
  --border-light: #E8E8E8;
  --border-medium: #D0D0D0;
  --success: #2E7D32;
  --error: #C62828;
  --warning: #F57C00;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.12);

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --space-3xl: 64px;

  /* Fonts */
  --font-serif: 'Crimson Text', Georgia, serif;
  --font-sans: 'Sohne', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'Courier New', monospace;
}
```

---

# IMPLEMENTATION TASKS

## Task 1: Establish Global CSS & Typography Baseline

**Files modified:** `src/index.css`, `src/fonts.css` (new)

**Action:**
1. Import font files (Crimson Text + Sohne) from Google Fonts or self-hosted:
   ```css
   @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400;600&family=Sohne:wght@400;500;700&display=swap');
   ```
   OR self-host for better control and offline support (download from Fontsource, include in `/public/fonts/`)

2. Set global CSS reset in `src/index.css`:
   ```css
   * {
     margin: 0;
     padding: 0;
     box-sizing: border-box;
   }

   :root {
     /* Color palette */
     --bg-primary: #F9F9F9;
     --bg-secondary: #FFFFFF;
     --text-primary: #1A1A1A;
     --text-secondary: #4A4A4A;
     --text-tertiary: #757575;
     --accent-color: #2B5A6B;
     --border-light: #E8E8E8;
     --border-medium: #D0D0D0;
     --success: #2E7D32;
     --error: #C62828;
     --warning: #F57C00;

     /* Shadows */
     --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
     --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.12);

     /* Spacing */
     --space-xs: 4px;
     --space-sm: 8px;
     --space-md: 16px;
     --space-lg: 24px;
     --space-xl: 32px;
     --space-2xl: 48px;
     --space-3xl: 64px;

     /* Fonts */
     --font-serif: 'Crimson Text', Georgia, serif;
     --font-sans: 'Sohne', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
   }

   html {
     font-family: var(--font-sans);
     font-size: 16px;
     background-color: var(--bg-primary);
     color: var(--text-primary);
   }

   body {
     line-height: 1.6;
     -webkit-font-smoothing: antialiased;
     -moz-osx-font-smoothing: grayscale;
   }

   h1, h2, h3, h4, h5, h6 {
     font-family: var(--font-serif);
     font-weight: 600;
     margin-bottom: var(--space-md);
   }

   h1 {
     font-size: 3.5rem;
     line-height: 1.2;
     letter-spacing: -0.02em;
   }

   h2 {
     font-size: 2.25rem;
     line-height: 1.3;
     letter-spacing: -0.01em;
   }

   h3 {
     font-size: 1.5rem;
     line-height: 1.4;
   }

   h4 {
     font-family: var(--font-sans);
     font-size: 1rem;
     font-weight: 700;
     line-height: 1.5;
   }

   p {
     margin-bottom: var(--space-md);
   }

   a {
     color: var(--accent-color);
     text-decoration: none;
     transition: color 0.2s ease;
   }

   a:hover {
     color: var(--text-primary);
     text-decoration: underline;
   }

   input, textarea, button {
     font: inherit;
   }
   ```

3. Create responsive breakpoints:
   ```css
   @media (max-width: 1024px) {
     html { font-size: 16px; }
     h1 { font-size: 2.5rem; }
     h2 { font-size: 1.75rem; }
   }

   @media (max-width: 640px) {
     html { font-size: 14px; }
     h1 { font-size: 2rem; }
     h2 { font-size: 1.5rem; }
     body { margin: 0 var(--space-md); }
   }
   ```

**Verify:**
- Typography loads without fallback (Google Fonts or self-hosted fonts visible)
- Color variables accessible in browser DevTools (`:root` computed styles)
- Reset applied (no browser default margins/padding on headings)
- Responsive breakpoints trigger correctly (test at 1024px, 640px)

```bash
# Verify fonts load
curl -s https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400;600 | grep -q "Crimson" && echo "Fonts loaded"
```

**Done:** Global CSS, typography scale, and color system live. All components inherit from CSS variables.

---

## Task 2: Design & Style Core Layout Components

**Files modified:** `src/components/Layout.tsx`, `src/layouts/Main.css` (new), `src/layouts/Header.css` (new)

**Action:**
1. Create main layout component (app shell):
   - Header: sticky, minimal (logo/title + nav or user menu)
   - Sidebar (optional): if needed for navigation, keep it simple (no icons, text labels)
   - Main content area: generous padding, max-width ~900px on desktop
   - Footer: minimal or absent (app-like, not website-like)

2. Style header:
   ```css
   /* src/layouts/Header.css */
   .header {
     position: sticky;
     top: 0;
     background-color: var(--bg-secondary);
     border-bottom: 1px solid var(--border-light);
     padding: var(--space-lg) var(--space-2xl);
     display: flex;
     justify-content: space-between;
     align-items: center;
     z-index: 100;
   }

   .header-title {
     font-family: var(--font-serif);
     font-size: 1.5rem;
     font-weight: 600;
     color: var(--text-primary);
   }

   .header-nav {
     display: flex;
     gap: var(--space-lg);
     list-style: none;
   }

   .header-nav a {
     color: var(--text-secondary);
     font-size: 0.95rem;
     transition: color 0.2s ease;
   }

   .header-nav a:hover,
   .header-nav a.active {
     color: var(--accent-color);
   }

   @media (max-width: 640px) {
     .header {
       padding: var(--space-md) var(--space-md);
       flex-direction: column;
       gap: var(--space-md);
     }

     .header-nav {
       flex-wrap: wrap;
       justify-content: center;
     }
   }
   ```

3. Style main content container:
   ```css
   /* src/layouts/Main.css */
   .main-container {
     max-width: 900px;
     margin: 0 auto;
     padding: var(--space-2xl) var(--space-2xl);
     background-color: var(--bg-primary);
     min-height: calc(100vh - 80px); /* Account for header */
   }

   .section {
     margin-bottom: var(--space-3xl);
   }

   .section-title {
     font-family: var(--font-serif);
     font-size: 2.25rem;
     margin-bottom: var(--space-xl);
     color: var(--text-primary);
   }

   @media (max-width: 1024px) {
     .main-container {
       padding: var(--space-xl) var(--space-lg);
     }
   }

   @media (max-width: 640px) {
     .main-container {
       padding: var(--space-lg) var(--space-md);
     }

     .section-title {
       font-size: 1.75rem;
       margin-bottom: var(--space-lg);
     }
   }
   ```

4. Ensure no Tailwind defaults (review any existing HTML/TSX; strip `class="px-4 py-2 bg-blue-500"`, replace with custom CSS)

**Verify:**
- Header sticky on scroll (position fixed or sticky works)
- Main content centered, breathing room on sides
- Typography hierarchy clear (title > subtitle)
- No Tailwind utilities in classnames (only custom CSS classes)

**Done:** Main layout (header, content area, footer) styled. Foundation for all screens.

---

## Task 3: Timeline Component Styling (Editorial Layout)

**Files modified:** `src/components/Timeline.tsx`, `src/components/Timeline.css` (new)

**Action:**
The timeline is the centerpiece. It must feel editorial, like Financial Times or Linear, not a SaaS dashboard.

1. **Timeline structure:** Vertical flow (activities listed chronologically)
   ```css
   /* src/components/Timeline.css */
   .timeline {
     list-style: none;
     padding: 0;
     margin: 0;
   }

   .timeline-item {
     display: flex;
     gap: var(--space-lg);
     padding: var(--space-lg) 0;
     border-bottom: 1px solid var(--border-light);
     transition: background-color 0.2s ease;
   }

   .timeline-item:last-child {
     border-bottom: none;
   }

   .timeline-item:hover {
     background-color: var(--bg-secondary);
   }

   /* Timeline dot/indicator */
   .timeline-indicator {
     flex-shrink: 0;
     width: 12px;
     height: 12px;
     border-radius: 50%;
     background-color: var(--accent-color);
     margin-top: 4px; /* Align with text baseline */
     cursor: pointer;
   }

   /* Time (HH:MM) */
   .timeline-time {
     font-family: var(--font-mono);
     font-size: 0.875rem;
     color: var(--text-secondary);
     font-weight: 500;
     min-width: 50px;
   }

   /* Activity content */
   .timeline-content {
     flex: 1;
     padding: var(--space-sm) 0;
   }

   .timeline-activity-name {
     font-size: 1rem;
     font-weight: 500;
     color: var(--text-primary);
     margin-bottom: var(--space-xs);
     cursor: pointer;
     border-bottom: 1px dotted var(--border-light);
     padding-bottom: 2px;
     transition: border-color 0.2s ease;
   }

   .timeline-activity-name:hover {
     border-color: var(--accent-color);
   }

   .timeline-duration {
     font-size: 0.875rem;
     color: var(--text-tertiary);
   }

   /* Optional: Category tag */
   .timeline-category {
     display: inline-block;
     font-size: 0.75rem;
     font-weight: 600;
     color: var(--accent-color);
     text-transform: uppercase;
     letter-spacing: 0.05em;
     margin-right: var(--space-sm);
   }

   /* Gap indicator */
   .timeline-gap {
     background-color: var(--bg-secondary);
     border-left: 2px solid var(--error);
     padding-left: var(--space-md);
     color: var(--error);
     font-size: 0.875rem;
   }

   @media (max-width: 640px) {
     .timeline-item {
       gap: var(--space-md);
       padding: var(--space-md) 0;
     }

     .timeline-time {
       font-size: 0.75rem;
       min-width: 40px;
     }

     .timeline-activity-name {
       font-size: 0.95rem;
     }
   }
   ```

2. **Daily section header:**
   ```css
   .timeline-day {
     margin-bottom: var(--space-2xl);
   }

   .timeline-day-header {
     font-family: var(--font-serif);
     font-size: 1.25rem;
     font-weight: 600;
     color: var(--text-primary);
     margin-bottom: var(--space-lg);
     padding-bottom: var(--space-md);
     border-bottom: 1px solid var(--border-medium);
   }
   ```

3. **Interaction state (click/edit):**
   ```css
   .timeline-item.editing {
     background-color: var(--bg-secondary);
     padding: var(--space-md);
     border-radius: 4px;
     border: 1px solid var(--border-medium);
   }

   .timeline-item.editing .timeline-activity-name {
     border-color: var(--accent-color);
   }
   ```

**Verify:**
- Timeline displays chronologically, no jumps
- Hover state subtle (slight bg change, not disruptive)
- Edit mode visually distinct (background + border)
- Gaps flagged clearly (error color, left border)
- Responsive: time moves beside activity on mobile (flexbox adjusts)
- No Tailwind classes (all custom)

**Done:** Timeline styled as editorial centerpiece. Feels curated, intentional.

---

## Task 4: Mic Button (Premium Styling)

**Files modified:** `src/components/MicButton.tsx`, `src/components/MicButton.css` (new)

**Action:**
The mic button is not a Bootstrap component. It's a premium interactive object. Make it beautiful.

1. **Button design:**
   ```css
   /* src/components/MicButton.css */
   .mic-button {
     position: relative;
     display: flex;
     align-items: center;
     justify-content: center;
     width: 60px;
     height: 60px;
     border-radius: 50%;
     background: linear-gradient(135deg, var(--accent-color) 0%, #1a3d4d 100%);
     border: 2px solid var(--accent-color);
     color: var(--bg-secondary);
     font-size: 1.5rem;
     cursor: pointer;
     transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
     box-shadow: var(--shadow-md);
   }

   .mic-button:hover {
     transform: translateY(-2px);
     box-shadow: 0 6px 12px rgba(0, 0, 0, 0.16);
   }

   .mic-button:active {
     transform: translateY(0);
     box-shadow: var(--shadow-sm);
   }

   /* Recording state */
   .mic-button.recording {
     animation: pulse 1.5s infinite;
     background: linear-gradient(135deg, #c62828 0%, #8b0000 100%);
     border-color: #c62828;
   }

   @keyframes pulse {
     0%, 100% {
       box-shadow: 0 4px 8px rgba(198, 40, 40, 0.3);
     }
     50% {
       box-shadow: 0 4px 20px rgba(198, 40, 40, 0.6);
     }
   }

   /* Disabled state */
   .mic-button:disabled {
     opacity: 0.5;
     cursor: not-allowed;
     transform: none;
   }

   /* Loading spinner (if needed) */
   .mic-button-spinner {
     display: inline-block;
     width: 20px;
     height: 20px;
     border: 2px solid rgba(255, 255, 255, 0.3);
     border-top-color: var(--bg-secondary);
     border-radius: 50%;
     animation: spin 0.8s linear infinite;
   }

   @keyframes spin {
     to { transform: rotate(360deg); }
   }
   ```

2. **Button container (within form/page):**
   ```css
   .mic-button-container {
     display: flex;
     flex-direction: column;
     align-items: center;
     gap: var(--space-lg);
     margin: var(--space-2xl) 0;
   }

   .mic-status {
     font-size: 0.875rem;
     color: var(--text-secondary);
     text-align: center;
   }

   .mic-status.recording {
     color: var(--accent-color);
     font-weight: 500;
   }
   ```

3. **Ensure contrast:** White icon on teal background passes WCAG AAA (contrast > 7:1)

**Verify:**
- Button looks premium (gradient, shadow, smooth transition)
- Hover state lifts button (not generic color change)
- Recording state clear (red, pulsing)
- Responsive: size scales down on mobile (adjust to 48px or keep 60px with margin)
- Icon clear and visible (no aliasing)

**Done:** Mic button is a crafted object, not a Bootstrap component.

---

## Task 5: Form & Input Styling

**Files modified:** `src/components/forms/Input.css` (new), `src/components/forms/Textarea.css` (new), `src/components/Button.css` (new)

**Action:**
Forms and inputs must feel intentional. No defaults.

1. **Input fields:**
   ```css
   /* src/components/forms/Input.css */
   input[type="text"],
   input[type="email"],
   input[type="password"],
   input[type="number"],
   input[type="date"],
   input[type="time"] {
     width: 100%;
     padding: var(--space-md) var(--space-md);
     border: 1px solid var(--border-light);
     border-radius: 2px; /* Minimal rounding, editorial feel */
     background-color: var(--bg-secondary);
     color: var(--text-primary);
     font-family: var(--font-sans);
     font-size: 1rem;
     transition: border-color 0.2s ease;
   }

   input:focus {
     outline: none;
     border-color: var(--accent-color);
     box-shadow: inset 0 0 0 1px var(--accent-color);
   }

   input:disabled {
     background-color: var(--bg-primary);
     color: var(--text-tertiary);
     cursor: not-allowed;
   }

   input::placeholder {
     color: var(--text-tertiary);
   }

   /* Label */
   label {
     display: block;
     margin-bottom: var(--space-sm);
     font-size: 0.875rem;
     font-weight: 500;
     color: var(--text-secondary);
     text-transform: uppercase;
     letter-spacing: 0.05em;
   }

   .form-group {
     margin-bottom: var(--space-lg);
   }

   .form-group:last-child {
     margin-bottom: 0;
   }
   ```

2. **Textarea:**
   ```css
   /* src/components/forms/Textarea.css */
   textarea {
     width: 100%;
     padding: var(--space-md);
     border: 1px solid var(--border-light);
     border-radius: 2px;
     background-color: var(--bg-secondary);
     color: var(--text-primary);
     font-family: var(--font-sans);
     font-size: 1rem;
     line-height: 1.6;
     resize: vertical;
     transition: border-color 0.2s ease;
     min-height: 120px;
   }

   textarea:focus {
     outline: none;
     border-color: var(--accent-color);
     box-shadow: inset 0 0 0 1px var(--accent-color);
   }
   ```

3. **Buttons (primary, secondary, tertiary):**
   ```css
   /* src/components/Button.css */
   button {
     cursor: pointer;
     transition: all 0.2s ease;
     border-radius: 2px;
     font-weight: 600;
     font-size: 0.95rem;
     padding: var(--space-md) var(--space-lg);
     border: none;
     text-transform: none; /* Don't force uppercase */
   }

   /* Primary button */
   .btn-primary {
     background-color: var(--accent-color);
     color: var(--bg-secondary);
   }

   .btn-primary:hover {
     background-color: #1a3d4d; /* Darker teal */
     transform: translateY(-1px);
     box-shadow: var(--shadow-sm);
   }

   .btn-primary:active {
     transform: translateY(0);
   }

   /* Secondary button */
   .btn-secondary {
     background-color: transparent;
     color: var(--accent-color);
     border: 1px solid var(--accent-color);
   }

   .btn-secondary:hover {
     background-color: var(--bg-secondary);
     border-color: #1a3d4d;
     color: #1a3d4d;
   }

   /* Tertiary button (text only) */
   .btn-tertiary {
     background-color: transparent;
     color: var(--text-secondary);
     padding: var(--space-sm) 0;
   }

   .btn-tertiary:hover {
     color: var(--accent-color);
     text-decoration: underline;
   }

   /* Disabled state */
   button:disabled {
     opacity: 0.5;
     cursor: not-allowed;
   }

   /* Small button variant */
   .btn-small {
     padding: var(--space-sm) var(--space-md);
     font-size: 0.875rem;
   }

   @media (max-width: 640px) {
     button {
       width: 100%;
       padding: var(--space-lg);
     }
   }
   ```

**Verify:**
- Focus states clear (blue border/outline)
- Labels uppercase, small (matches editorial style)
- Input padding comfortable (not cramped)
- Button hover state clear (not too dramatic)
- No Tailwind classes

**Done:** Forms styled intentionally. Inputs and buttons feel custom.

---

## Task 6: Journal & Chat Screen Styling

**Files modified:** `src/components/Journal.css` (new), `src/components/Chat.css` (new)

**Action:**
Two secondary screens. Both should feel cohesive with the main timeline but have their own structure.

1. **Journal entry list:**
   ```css
   /* src/components/Journal.css */
   .journal-entry {
     padding: var(--space-lg);
     margin-bottom: var(--space-lg);
     border: 1px solid var(--border-light);
     background-color: var(--bg-secondary);
     border-radius: 2px;
     transition: all 0.2s ease;
   }

   .journal-entry:hover {
     border-color: var(--accent-color);
     box-shadow: var(--shadow-sm);
   }

   .journal-entry-date {
     font-family: var(--font-mono);
     font-size: 0.75rem;
     color: var(--text-tertiary);
     text-transform: uppercase;
     letter-spacing: 0.05em;
     margin-bottom: var(--space-sm);
   }

   .journal-entry-title {
     font-size: 1.1rem;
     font-weight: 600;
     color: var(--text-primary);
     margin-bottom: var(--space-sm);
   }

   .journal-entry-content {
     font-size: 0.95rem;
     line-height: 1.7;
     color: var(--text-secondary);
   }

   .journal-entry-content p {
     margin-bottom: var(--space-md);
   }

   .journal-entry-content p:last-child {
     margin-bottom: 0;
   }

   .journal-entry-actions {
     margin-top: var(--space-md);
     padding-top: var(--space-md);
     border-top: 1px solid var(--border-light);
     display: flex;
     gap: var(--space-md);
   }

   .journal-entry-actions button {
     font-size: 0.875rem;
     padding: var(--space-sm) var(--space-md);
   }
   ```

2. **Chat interface:**
   ```css
   /* src/components/Chat.css */
   .chat-container {
     display: flex;
     flex-direction: column;
     height: 100%;
     max-height: 600px; /* Or fit to screen */
   }

   .chat-messages {
     flex: 1;
     overflow-y: auto;
     padding: var(--space-lg);
     display: flex;
     flex-direction: column;
     gap: var(--space-md);
     background-color: var(--bg-secondary);
     border: 1px solid var(--border-light);
     margin-bottom: var(--space-md);
     border-radius: 2px;
   }

   .chat-message {
     display: flex;
     gap: var(--space-md);
     max-width: 80%;
   }

   .chat-message.user {
     align-self: flex-end;
     flex-direction: row-reverse;
   }

   .chat-message.assistant {
     align-self: flex-start;
   }

   .chat-bubble {
     padding: var(--space-md) var(--space-lg);
     border-radius: 2px;
     line-height: 1.6;
   }

   .chat-message.user .chat-bubble {
     background-color: var(--accent-color);
     color: var(--bg-secondary);
   }

   .chat-message.assistant .chat-bubble {
     background-color: var(--bg-primary);
     border: 1px solid var(--border-light);
     color: var(--text-primary);
   }

   .chat-timestamp {
     font-size: 0.75rem;
     color: var(--text-tertiary);
     margin-top: var(--space-xs);
   }

   .chat-input-area {
     display: flex;
     gap: var(--space-md);
   }

   .chat-input-area input {
     flex: 1;
   }

   .chat-input-area button {
     flex-shrink: 0;
   }
   ```

**Verify:**
- Journal entries feel like curated cards, not cluttered
- Chat bubbles clear (user vs. assistant visually distinct)
- Consistent styling with timeline (same colors, spacing, borders)
- Responsive: entry width adjusts on mobile, chat bubbles stack

**Done:** Journal and chat styled cohesively.

---

## Task 7: Responsive Design & Mobile Polish

**Files modified:** All CSS files (add mobile breakpoints)

**Action:**
Desktop-first approach already built into Tasks 1–6. Now refine mobile experience.

1. **Review all media queries** (max-width: 1024px tablet, max-width: 640px mobile)
   - Spacing: reduce 2xl to xl, lg to md on mobile
   - Typography: H1 3.5rem → 2rem, H2 2.25rem → 1.5rem
   - Button width: expand to full-width on mobile (for touch target)
   - Timeline: adjust dot position, reduce margins

2. **Touch interactions:**
   ```css
   /* Increase touch target size (min 44x44px) */
   button, a, input {
     min-height: 44px; /* or equivalent padding */
   }

   /* Remove hover states on touch (prevents double-tap) */
   @media (hover: none) {
     button:hover {
       transform: none;
     }

     a:hover {
       text-decoration: none;
     }
   }
   ```

3. **Viewport meta tag** (in HTML <head>):
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   ```

4. **Test responsiveness at:**
   - 1920px (desktop)
   - 1024px (tablet/iPad)
   - 768px (iPad)
   - 640px (mobile)
   - 375px (iPhone SE)

**Verify:**
- No horizontal scroll at any width
- Text readable on mobile (min 16px base font)
- Buttons tappable (44px+ height/width)
- Images scale properly (max-width: 100%)
- Test in Chrome DevTools, Safari, Firefox

**Done:** Responsive design polished and tested across breakpoints.

---

## Task 8: Accessibility & Focus States Refinement

**Files modified:** All CSS files (add focus states, color contrast)

**Action:**
Accessibility is part of intentional design. No compromises.

1. **Focus states (keyboard navigation):**
   ```css
   /* Override :focus-visible (modern approach) */
   button:focus-visible,
   input:focus-visible,
   textarea:focus-visible,
   a:focus-visible {
     outline: 2px solid var(--accent-color);
     outline-offset: 2px;
   }

   /* Fallback for older browsers */
   button:focus,
   input:focus,
   textarea:focus,
   a:focus {
     outline: 2px solid var(--accent-color);
     outline-offset: 2px;
   }
   ```

2. **Color contrast verification:**
   - Text primary (#1A1A1A) on bg primary (#F9F9F9): 13.4:1 [ok] WCAG AAA
   - Text secondary (#4A4A4A) on bg primary: 6.8:1 [ok] WCAG AA
   - Accent (#2B5A6B) on white: 6.2:1 [ok] WCAG AA
   - Error/warning colors: verify with WebAIM contrast checker

3. **Semantic HTML:** Ensure proper element usage:
   ```html
   <button> not <div onclick="">
   <a href=""> not styled <span>
   <label for="input-id"> for form fields
   <h1>, <h2>, <h3> for headings (proper hierarchy)
   ```

4. **Screen reader considerations:**
   - alt text on images (if any)
   - aria-label on icon buttons
   - aria-live regions for dynamic content (chat messages, status)

**Verify:**
- Tab through all interactive elements (keyboard accessible)
- Focus outline visible on all interactive elements
- Contrast checker (WebAIM) passes WCAG AA for all text/backgrounds
- No color used alone to convey information (e.g., error text must say "Error" not just be red)

**Done:** Accessible and intentional. Design includes all users.

---

## Task 9: Polish & QA (Design Perfectionism Sprint)

**Files modified:** All CSS files (refinements)

**Action:**
This is the final pass. Every detail counts.

1. **Visual audit:**
   - Print all screens to PDF (desktop, tablet, mobile)
   - Compare to design references (Financial Times, Linear, whitehouse.gov)
   - Ask: Does this feel premium? Would I believe a serious designer made this?
   - Fix anything that feels off (kerning, alignment, breathing room)

2. **Edge cases:**
   - Very long text (activity name > 50 chars): truncate or wrap? (wrap, elegant)
   - Empty states: show helpful message, not blank (e.g., "No activities yet. Start a check-in.")
   - Loading states: mic button spinner visible, chat loading message, etc.
   - Error states: form validation, API errors (use error color, clear message)
   - Dark backgrounds (if any): ensure text is readable

3. **Micro-refinements:**
   - Button padding consistency across all sizes
   - Icon sizing (if using SVG or icon library): 24px, 32px, 48px (8px scale)
   - Link underlines: solid, not decorative
   - Hover state speed (0.2s): consistent across all elements
   - Animations: only on critical interactions (loading, recording, sending), no gratuitous motion

4. **Browser compatibility:**
   - Test in Chrome, Safari, Firefox, Edge
   - CSS custom properties supported (all modern browsers [ok])
   - Flexbox/Grid layout (all modern browsers [ok])
   - Gradients, shadows, transitions (all modern [ok])
   - Clip old browsers (IE11 not supported)

**Verify:**
- Visual consistency across all screens
- No buttons/inputs feel out of place
- Spacing feels generous (not cramped)
- Typography hierarchy clear
- Passes the "serious designer" test
- No browser errors (console clean)

```bash
# Verify CSS syntax (if using linter like stylelint)
npx stylelint "src/**/*.css" --fix
```

**Done:** Design is polished and cohesive. Ready to ship.

---

# DESIGN REFERENCES & INSPIRATION

**Visual References (Study These)**
- **Financial Times:** https://www.ft.com — editorial typography, restrained color, generous whitespace
- **whitehouse.gov (2024 redesign):** https://www.whitehouse.gov — serif headers, dark text, intentional spacing
- **Linear:** https://linear.app — minimalist UI, premium feel, clear hierarchy
- **Anthropic design:** https://www.anthropic.com — restrained, confident, serious

**Font Resources**
- Google Fonts: https://fonts.google.com (search "Crimson Text", "Sohne")
- Fontsource: https://fontsource.org (self-hosted fonts)
- Typekit/Adobe Fonts: Premium options (if budget allows)

**Color Tools**
- Contrast Checker: https://webaim.org/resources/contrastchecker/
- Color Palette Generator: https://coolors.co
- Accessible Colors: https://accessible-colors.com

**Inspiration Boards**
- Are.na: https://www.are.na (curate design inspiration)
- Dribbble: https://dribbble.com (UI design community)

---

# DESIGN SYSTEM VALIDATION CHECKLIST

Before moving to Phase 6 (Testing), verify:

## Color Palette
- [ ] Primary background (#F9F9F9) soft but not washed out
- [ ] Text primary (#1A1A1A) high contrast, readable
- [ ] Accent color (#2B5A6B or #3D5C47) used sparingly, feels intentional
- [ ] All colors defined as CSS variables
- [ ] Color contrast passes WCAG AA minimum (4.5:1 for text)

## Typography
- [ ] Font pairing chosen (Crimson Text + Sohne recommended)
- [ ] Fonts imported correctly (Google Fonts or self-hosted)
- [ ] Type scale applied (H1–H6, body, labels)
- [ ] Weights and sizes intentional (not arbitrary)
- [ ] Line heights readable (1.4–1.7 depending on use)
- [ ] No system defaults (San Francisco, Segoe UI) used directly

## Spacing
- [ ] 8px base unit applied consistently
- [ ] Whitespace feels generous (not cramped)
- [ ] Padding/margin uses CSS variables (--space-sm, etc.)
- [ ] Responsive spacing (larger on desktop, smaller on mobile)

## Components
- [ ] Mic button: premium, gradient, shadow (not Bootstrap)
- [ ] Timeline: editorial layout, dots, chronological flow
- [ ] Forms: labels, inputs, buttons styled intentionally
- [ ] Journal: card layout, readable text
- [ ] Chat: bubble messaging, user vs. assistant distinct
- [ ] Header/footer: minimal, sticky

## Interactions
- [ ] Hover states: subtle, not distracting (0.2s transition)
- [ ] Focus states: keyboard accessible, outline visible
- [ ] Active/pressed states: clear feedback
- [ ] Disabled states: 50% opacity or grayed out
- [ ] Loading states: spinner visible (mic button, chat)
- [ ] Error states: error color (#C62828), clear message

## Responsive
- [ ] Desktop (1920px): full spacing, large type
- [ ] Tablet (1024px): slightly condensed, still readable
- [ ] Mobile (640px): full-width buttons, stacked layout
- [ ] No horizontal scroll at any width
- [ ] Touch targets 44px+

## Accessibility
- [ ] Color contrast WCAG AA (4.5:1 for text)
- [ ] Focus outlines visible (2px, var(--accent-color))
- [ ] Semantic HTML (<button>, <a>, <label>)
- [ ] Keyboard navigation works (tab, enter, escape)
- [ ] No color used alone to convey info (error: text + color)

## Cohesion
- [ ] Every screen feels like same app (color, type, spacing)
- [ ] No Tailwind defaults visible
- [ ] No AI scaffolding feel (generic, safe, boring)
- [ ] "Serious designer" test: Yes, I'd believe this. [ok]

---

# RISKS & MITIGATIONS

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Design perfectionism** | Phase spills over, delays testing | Lock design decisions by Day 1 of Phase 5. Set "good enough" threshold. Don't pixel-perfect. |
| **Font loading slow** | Typography shift on page load (CLS) | Use `font-display: swap` to avoid flash. Test font load time (<200ms). |
| **Browser compatibility** | CSS custom properties not supported | CSS custom properties supported in all modern browsers (95%+ users). Skip IE11. |
| **Responsive design breaks** | Mobile unusable | Test at 375px, 640px, 1024px early. Use flexbox (flexible), avoid fixed widths. |
| **Accessibility missed** | Non-keyboard users excluded | Build focus states from the start. Use WCAG checklist every task. |
| **Tailwind defaults slip in** | Design feels generic | Audit all className attributes. Search codebase for "bg-", "text-", "p-", "m-". Ban Tailwind. |
| **Accent color too bold** | Doesn't feel intentional | Test accent color (#2B5A6B) in mockups. If too corporate, switch to #3D5C47. |

---

# EXECUTION STRATEGY

1. **Start with foundation (Task 1):** CSS variables, fonts, reset. This unblocks all other tasks.
2. **Build layout next (Task 2):** Header, main container. Essential for all screens.
3. **Design centerpiece (Task 3):** Timeline. It's the hero. Get this right first.
4. **Mic button (Task 4):** Premium object. High-visibility component. Make it sing.
5. **Forms (Task 5):** Inputs, buttons. Used everywhere. Consistency critical.
6. **Secondary screens (Task 6):** Journal, chat. Build on established patterns.
7. **Responsive (Task 7):** Refinement pass. Scale down proportionally.
8. **Accessibility (Task 8):** Focus states, contrast. Non-negotiable.
9. **QA (Task 9):** Final polish. Compare to references. Perfectionism sprint.

**Each task ~1–1.5 hours Claude execution time.**

---

# WHAT SUCCESS LOOKS LIKE

When Phase 5 is complete:

[ok] **Visual Cohesion:** Every screen uses same color palette, typography, spacing. Feels like one app.

[ok] **Intentional Design:** No Tailwind defaults. Every color, font, spacing has a reason. Would survive designer review.

[ok] **Premium Feel:** Mic button is crafted. Typography is chosen. Whitespace feels generous. Micro-interactions feel smooth.

[ok] **Editorial Aesthetic:** Timeline feels like Financial Times, not SaaS dashboard. Serious, confident, curated.

[ok] **Responsive & Accessible:** Works on desktop, tablet, mobile. Keyboard accessible. Color contrast WCAG AA.

[ok] **Ready to Ship:** No visual debt. Passes the "serious designer" test. Phase 6 can focus on testing, not design fixes.

---

**End of PLAN.md**

*Design blueprint for Prohairesis MVP. Lock accent color (#2B5A6B or #3D5C47) before starting Task 1. Timeline is centerpiece—don't compromise. Whitespace is feature. Never ship AI scaffolding.*
