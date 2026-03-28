# Project: Reflector — Personal Time Tracking & Journaling App

**Vision:**
A desktop-first web app that transforms stream-of-consciousness speech about daily activities into a clean, visual timeline and persistent journal. Users speak in raw, unstructured form; the app parses it into categorized time blocks with duration. A chat interface lets users ask questions of their own data ("what did I waste time on this week?") and get real answers from real logs.

**Core Promise:**
See where your time actually goes—even the embarrassing parts—through 3 daily voice check-ins. Separate logging from reflection: the timeline is data, the journal is narrative.

---

## Constraints

| Constraint | Impact | Decision |
|-----------|--------|----------|
| **Timeline** | 1-2 weeks to MVP | Scope ruthlessly; design > features |
| **Input quality** | Clean, deliberate speech expected | No fuzzy parsing; parsing assumes good input |
| **Single user, proper security** | Supabase auth, no multi-user complexity | Standard OAuth flow, per-user data isolation |
| **Design philosophy** | Restrained, editorial, premium craft—not AI-generated | Custom CSS, intentional color/type, no Tailwind defaults |
| **Check-in flexibility** | Anytime recording, backfill allowed | No strict 3/day enforcement; timeline-based, not calendar-based |
| **Analytics approach** | Chat-driven, not dashboard-based | User asks questions; Claude answers from logs. Minimal preloaded analytics |

---

## Features (MVP)

### Core Logging
- **Voice Check-in**: Tap mic, speak stream-of-consciousness (~1-5 min), AI parses into time blocks with durations
- **Timeline View**: Visual display of activities + durations for the day/week, with unaccounted gaps flagged
- **Journal Entries**: Separate text/voice notes, scrollable history, no time association
- **Activity Editing**: User can manually adjust parsed activities (duration, category, time)

### Analytics & Chat
- **Chat Interface**: Ask questions about logged data; Claude API reads logs and responds conversationally
- **Data Model**: All time entries tagged with category, duration, timestamp, parsed from speech or manual entry
- **High-level Summary**: Weekly/daily totals by category (no heavy dashboard, just summary cards)

### Backend
- **Supabase**: Auth, time entries table, journal entries table, user profiles
- **Claude API**: Speech parsing (turn raw transcript into structured time blocks), analytics chat

---

## Tech Stack

- **Frontend**: React 18 + Vite, custom CSS (no Tailwind defaults), Zustand for state
- **Backend**: Supabase (Postgres), Edge Functions for Claude integration if needed
- **APIs**: Claude API (Anthropic SDK), Web Speech API for microphone input
- **Deployment**: Vercel (frontend), Supabase hosted (backend)

---

## Design Direction

**Philosophy: Restraint as the core aesthetic.**

- **Color**: Off-white or white background (#F9F9F9 or pure white), dark charcoal text (#1A1A1A). One accent color, used sparingly (maybe a muted blue or green for interactive elements).
- **Typography**: Intentional font pairing (e.g., system serif for headers, geometric sans for body), not generic stack defaults. Considered weights and line heights.
- **Layout**: Generous whitespace, borders only when structure demands them, card elements without shadows unless they're truly interactive overlays.
- **Mic Button**: Premium physical object feel—not a Bootstrap component. Custom, refined, feels solid.
- **Timeline**: Editorial aesthetic, closer to Financial Times or Linear than typical SaaS productivity app.
- **Test**: Would someone believe a serious designer made this if they didn't know it was AI-built? If no, tear it down.

**Reference points:** Anthropic's product design, whitehouse.gov's 2024 redesign, Brian Chesky's sensibility (obsessive craft, every pixel deliberate).

---

## Success Criteria

- [ ] User can speak a stream-of-consciousness check-in and see it parsed into a clean timeline with 80%+ accuracy
- [ ] Timeline shows activities + durations, with unaccounted gaps clearly flagged
- [ ] Journal entries persist and are scrollable; user can add text or voice entries
- [ ] Chat feature works: user asks "what did I spend time on this week?" and gets accurate answers from logged data
- [ ] Design passes the "serious designer" test: no Tailwind defaults, no AI scaffolding feel, intentional craft
- [ ] App is fast, feels responsive, desktop-first responsive design
- [ ] User can log in, data is persisted to Supabase, sessions are secure

---

## Out of Scope (for MVP)

- Multi-user collaboration, sharing, teams
- Mobile app (desktop-first only; responsive web is sufficient)
- Heavy analytics dashboards, charts, graphs
- Recurring reminders, push notifications
- Integrations with calendar, task management, or other apps
- On-device speech processing; we'll use Web Speech API + Claude parsing

---

## Phase Structure (Rough)

1. **Backend Setup** — Supabase schema, auth, data models
2. **Core Logging** — Voice capture, parsing with Claude API, timeline display
3. **Journal & Edit** — Journal entries, editing parsed activities
4. **Chat Analytics** — Claude API integration for data questions
5. **Design & Polish** — Restrained, intentional UI per design direction
6. **Testing & Deploy** — Verification, security check, launch

**Note**: Phases 2–5 likely overlap; design is threaded through all phases.

---

## Owner

User (osmol) — building for personal use, guiding design direction.

**Start date:** 2026-03-28
**Target MVP:** 2026-04-11 (2 weeks)
