---
name: osmposm-ui-design
description: Implements and evolves Next.js/React UI for osmPosm per Phase 21 (Joe Gebbia–inspired) design spec — typography-first, restrained palette, structural whitespace, no decorative chrome. Use when building or refactoring components, pages, layouts, chat/nutrition/data/navigation UI, styling, tokens, or when the user mentions design system, visual polish, Tailwind theme, accessibility, or frontend consistency.
---

# osmPosm UI design (Phase 21)

## This repository (Reflector / Vite)

- **Stack here:** Vite + React + **CSS variables** in [`src/index.css`](src/index.css) and component styles under [`src/components/*.css`](src/components/). There is **no** `tailwind.config.ts` or `globals.css` unless the project adds them.
- **Map “Tailwind-first”** to: extend **`:root` tokens** and **shared patterns** in existing CSS files; avoid one-off hex except as new documented tokens.
- **Canonical spec file:** When present, use `.planning/phases/21-ui-redesign-joe-gebbia-design-philosophy/DESIGN-21-SPEC.md`. If it is missing, treat the **Non‑negotiables** and **Ship checklist** below as the contract.
- **`CLAUDE.md`:** Use when present; if absent, rely on this skill + live code.

## Research context (skills ecosystem)

Popular **Claude Code / Cursor** UI skills (e.g. Anthropic’s `frontend-design` in [anthropics/claude-code](https://github.com/anthropics/claude-code), [anthropics/skills](https://github.com/anthropics/skills)) optimize for **distinctive, high-variance** interfaces (bold type, rich motion, atmospheric backgrounds). **This repository overrides that default:** the product spec is **editorial minimalism** — calm, typographic, almost monochrome. When another skill or instinct pushes “more visual flair,” **defer to this skill and the canonical spec below**.

## Authority stack (highest wins)

1. **`.planning/phases/21-ui-redesign-joe-gebbia-design-philosophy/DESIGN-21-SPEC.md`** — full principles, chat/dashboard/form rules, checklist (when the file exists in the repo).
2. **`CLAUDE.md`** (Frontend / UI) — when present: stack, breakpoints, a11y bar. If it still says “dark theme primary” but the codebase uses Phase 21 light tokens, **trust** [`src/index.css`](src/index.css), [`src/components/Layout.css`](src/components/Layout.css), and layouts **over** stale prose.
3. **Existing code** — match neighboring components, token names, and layout patterns unless the user asks for a spec change.

## Before writing UI code

1. **Read or skim** `DESIGN-21-SPEC.md` for the surface you touch (chat, nav, forms, empty states), when available.
2. **Identify tokens** — use CSS variables from [`src/index.css`](src/index.css); avoid new raw hex unless adding a documented token.
3. **List states** — default, hover, focus, active, disabled, loading, empty, error; keyboard and screen reader labels for interactive controls.
4. **Grayscale test (mental or temporary filter)** — hierarchy must read from **type weight and size**, not color alone.

## Non‑negotiables (Phase 21 summary)

| Area | Rule |
|------|------|
| Typography | Hierarchy from **weight + size jumps**; serif for headings (e.g. Fraunces), geometric sans for UI/body roles per project setup; no timid 1px type steps. |
| Color | **One** background family (off-white), **one** text (charcoal), **one** accent (terracotta or spec-approved alternate); accent only for state, links (underlined), meaningful emphasis — never decoration. |
| Surfaces | **No gradients**; **no shadows** on cards; **no decorative** radius, blobs, emoji, or ornamental icons. |
| Whitespace | **Generous** section and container padding; prefer removing elements over compressing spacing when crowded. |
| Motion | **Restrained**: short fades or one calm stagger on load; 150–300ms ease-out for feedback; **no** bounce, spin, parallax, or “delight” noise. |
| Chat | **No** colored bubbles as hierarchy; typography and alignment carry conversation; links underlined + accent. |

## Implementation discipline

- **Tokens + shared CSS** for styling; no CSS-in-JS unless project docs allow.
- **Reuse patterns** from [`src/components`](src/components) (layout header, chat, forms, timeline): spacing, borders, button and link treatments.
- **Accessibility**: WCAG 2.1 AA for text contrast; visible focus; semantic headings; don’t rely on color alone for meaning.
- **Responsive**: mobile-first; tighten/loosen padding at small breakpoints consistently with existing media queries.
- **Evolving the system**: extend **tokens and shared primitives** instead of one-off magic values; if the spec and implementation diverge, flag it and align to spec or request a deliberate exception.

## Decision questions (from spec)

Before shipping or stopping work, ask:

1. Does this **serve clarity** for a health-coaching product, or only “look designed”?
2. Can anything be **removed** without losing meaning?
3. Does it feel **calm and considered** vs. trendy?
4. Would **grayscale** still communicate hierarchy and actions?

If any answer is weak, revise.

## Ship checklist (mirror spec)

- [ ] Hierarchy clear without relying on color.
- [ ] Palette = background + charcoal text + single accent + muted/disabled as defined in theme.
- [ ] Layout feels editorial (breathing room), not dashboard-crammed.
- [ ] No forbidden decoration (shadows on cards, gradient fills, decorative motion).
- [ ] Loading / empty / error states are intentional and readable.
- [ ] Keyboard and focus behavior are correct for new interactives.

## When the user asks for “more pop” or “flashier UI”

Negotiate: Phase 21 defines **restraint as premium**. Offer **stronger type hierarchy, spacing, or one accent moment** tied to a **user goal**, not generic glassmorphism, neon, or busy animation — unless they explicitly change the spec.
