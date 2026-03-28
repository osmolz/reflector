# Memory Index: Reflector Project

## Project Documents (Auto-loaded on each session)

- [PROJECT.md](.planning/PROJECT.md) — Vision, constraints, design direction, success criteria
- [REQUIREMENTS.md](.planning/REQUIREMENTS.md) — Formal scoped requirements, data model, feature breakdown
- [ROADMAP.md](.planning/ROADMAP.md) — 6-phase breakdown, effort estimates, timeline, risks
- [STATE.md](.planning/STATE.md) — Current project state, decisions made, next steps

## Quick Reference

**Tech stack:** React 18 + Vite, Supabase, Claude API, Vercel
**Timeline:** 1–2 weeks (started 2026-03-28, target 2026-04-11)
**Design philosophy:** Restrained, editorial, premium craft—no Tailwind defaults, no AI scaffolding
**Key features:** Voice parsing, timeline, journal, chat analytics, Supabase persistence
**Owner:** osmol (personal use, single user, proper auth)

## Phase Structure

1. Backend Setup (3–4h)
2. Voice & Parsing (6–8h)
3. Journal & Editing (4–5h)
4. Chat Analytics (4–5h)
5. Design & Polish (8–10h)
6. Testing & Deploy (3–4h)

**Total: 28–36h over 5–7 working days**

## Critical Non-Negotiables

🎯 **Design:** Restrained aesthetic (off-white/white, dark charcoal text, one accent color). Editorial timeline. Premium mic button. Serious designer test: if shown to someone who doesn't know it's AI-built, would they believe a senior designer made it? **If no, tear it down and start over.**

🎯 **Scope:** 1–2 weeks is tight. Design > features. No multi-user, no dashboards, no heavy analytics. Chat-driven queries only. Stick to REQUIREMENTS.md; backlog anything else.

🎯 **Parsing:** Assuming clear, deliberate speech input. Test Claude API parsing early (Phase 2, Day 2) with real transcripts.

## Known Risks

1. Claude parsing accuracy on ambiguous speech
2. Design timeline is aggressive; start Phase 5 early
3. Web Speech API browser compatibility (test Day 1, plan fallback)
4. Scope creep (ruthlessly enforce MVP discipline)

---

**Session started:** 2026-03-28
**Next milestone:** Complete Phase 1 planning, begin execution
