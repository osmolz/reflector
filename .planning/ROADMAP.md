# Roadmap: Reflector MVP

**Total Phases:** 6
**Timeline:** 1–2 weeks (starting 2026-03-28)
**Target Completion:** 2026-04-11

---

## Phase 1: Backend Setup

**Goal:** Supabase project initialized, auth working, data schema defined and migrated.

**Deliverables:**
- Supabase project created (antml/oauth or email auth)
- Database schema: `users`, `check_ins`, `time_entries`, `journal_entries`, `chat_messages`
- Row-level security (RLS) policies for user data isolation
- Auth flow integrated into React app skeleton
- User can sign up, log in, log out, and see authenticated state

**Not included:** Frontend polish, data validation beyond schema

**Estimated effort:** 3–4 hours
**Blocks:** Phases 2, 3, 4

---

## Phase 2: Voice Capture & Parsing

**Goal:** User can speak a check-in and see it parsed into activities on a timeline.

**Deliverables:**
- Mic button (basic styling, functional)
- Web Speech API integration (transcribe speech to text)
- Claude API integration (send transcript, receive parsed activities)
- Review screen: show parsed activities with edits
- Save activities to Supabase (`time_entries`, `check_ins`)
- Daily timeline view (chronological list of activities with durations)
- Gap detection: flag unaccounted time between activities

**Not included:** Minute design polish, gap manual fill-in, activity edit interface (saves but bare-bones)

**Estimated effort:** 6–8 hours
**Blocks:** Phases 3, 5
**Depends on:** Phase 1

---

## Phase 3: Journal & Activity Editing

**Goal:** User can write/voice journal entries and edit parsed activities.

**Deliverables:**
- Journal entry form (text input + voice input option)
- Journal history view (reverse-chronological list, expandable)
- Persist journal entries to Supabase
- Activity editing UI: click activity in timeline to edit name, duration, category
- Delete activity
- Update timeline after edits

**Not included:** Journal search, activity categorization UI (text input only), advanced filters

**Estimated effort:** 4–5 hours
**Blocks:** Phase 5
**Depends on:** Phase 2

---

## Phase 4: Chat Analytics

**Goal:** User can ask questions about their time data and get answers from Claude.

**Deliverables:**
- Chat interface (text input, send button)
- Claude API integration: send user's time_entries + question, receive response
- Display response in chat
- Persist chat messages to Supabase
- Chat history view (scrollable)
- Fetch user's time data (last 30 days) and format for Claude

**Not included:** Multi-turn conversation, context awareness across messages, filtering/date range selection in UI

**Estimated effort:** 4–5 hours
**Blocks:** Phase 5
**Depends on:** Phase 1, 2

---

## Phase 5: Design & Polish

**Goal:** UI matches design direction (restrained, editorial, intentional). App is visually cohesive and ready to ship.

**Deliverables:**
- Custom CSS (no Tailwind defaults)
- Typography: intentional font pairing (choose serif + sans, set weights/sizes deliberately)
- Color palette: off-white/white bg, dark charcoal text, one accent color
- Mic button: styled to feel premium and custom
- Timeline: editorial layout, clean hierarchy
- Whitespace, borders, focus states, hover states refined
- Responsive design (desktop-first, works on tablets)
- Dark mode consideration (optional, can skip for MVP)

**Design passes test:** Someone seeing this without knowing it's AI-built believes a serious designer made it.

**Not included:** Animations (beyond critical interactions), micro-interactions, dark mode (can add post-MVP)

**Estimated effort:** 8–10 hours (design decisions are time-intensive)
**Blocks:** Phase 6
**Depends on:** Phases 2, 3, 4 (occurs in parallel; can start after Phase 2)

---

## Phase 6: Testing & Deploy

**Goal:** App is tested, secure, and live on Vercel.

**Deliverables:**
- Manual testing checklist (auth flow, voice capture, parsing, timeline, journal, chat, edits)
- Edge case testing (empty data, long transcripts, rapid check-ins, deleted activities)
- Security audit: RLS policies verified, no exposed secrets, CORS configured
- Vercel deployment (frontend)
- Supabase production config (if using free tier, note limits)
- Bugs fixed, UI responsive verified
- Documentation: README with setup instructions (for future reference)

**Not included:** Automated tests (nice-to-have, skip for MVP), load testing, multi-region deployment

**Estimated effort:** 3–4 hours
**Blocks:** Ship
**Depends on:** Phases 1–5

---

## Timeline Overview

| Phase | Effort | Start | End | Status |
|-------|--------|-------|-----|--------|
| 1: Backend | 3–4h | Day 1 | Day 1 | Pending |
| 2: Voice & Parse | 6–8h | Day 1 | Day 2–3 | Pending |
| 3: Journal & Edit | 4–5h | Day 2 | Day 3 | Pending |
| 4: Chat | 4–5h | Day 2 | Day 3 | Pending |
| 5: Design & Polish | 8–10h | Day 2 | Day 4–5 | Pending |
| 6: Testing & Deploy | 3–4h | Day 5 | Day 5–6 | Pending |
| **Total** | **28–36h** | — | — | — |

**Note:** Phases overlap; Phase 5 (design) threads through 2–4. Realistic timeline is 5–7 working days at 4–6h/day.

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Claude parsing is inaccurate on ambiguous speech | Parsing unusable, need rewrite | Assumption: input is clear and deliberate. Test early with 5–10 real transcripts. |
| Design takes longer than expected | Phase 6 slips, launch delayed | Start Phase 5 early, lock design decisions by Day 3. Don't perfectionist—aim for "passes the test" not pixel-perfect. |
| Web Speech API doesn't work reliably | Voice feature breaks | Test browser compatibility early (Chrome, Safari, Edge). Fallback: allow text input or upload audio file. |
| Supabase auth has hidden gotchas | Auth doesn't work, blocks everything | Follow official Supabase + React docs closely. Test auth flow (signup, login, logout, refresh) on Day 1. |
| Scope creep (features beyond MVP) | Timeline slips | Stick to REQUIREMENTS.md strictly. Any new feature goes to backlog (Phase 7+). |

---

## Post-MVP (Phase 7+) Backlog

- Multi-turn conversation in chat (maintain context across messages)
- Habit insights (most productive hours, day-of-week patterns)
- Mobile app (React Native or PWA)
- Dark mode
- Export data (CSV, JSON)
- Activity templates and categories (dropdown, not text input)
- Recurring reminders for daily check-ins
- Calendar integration (see entries on calendar)
- Analytics dashboard (charts, weekly summary)
- Real-time sync across devices
- Offline-first local storage
