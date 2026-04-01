# Phase 2 Plan — Summary & Quick Reference

**File:** `.planning/PHASE-2-PLAN.md` (1,799 lines)
**Status:** [OK] Complete and committed
**Date:** 2026-03-28

---

## What's Included

### 6 Concrete, Executable Tasks

| Task | Goal | Effort | Files |
|------|------|--------|-------|
| **2.1** | Web Speech API mic button + recording | 1.5h | `MicButton.tsx`, `VoiceCheckIn.tsx` |
| **2.2** | Claude API parsing (transcript → activities JSON) | 1.5h | `src/lib/anthropic.ts`, `.env.local` config |
| **2.3** | Review screen for parsed activities (edit/delete UI) | 1.5h | `ActivityReview.tsx` |
| **2.4** | Save check-in + time_entries to Supabase | 1h | `src/lib/supabase-operations.ts` |
| **2.5** | Daily timeline view with gap detection | 1.5h | `Timeline.tsx` |
| **2.6** | End-to-end testing & verification | 1.5h | Manual test checklist + test summary |
| **TOTAL** | **8.5 hours** | — | — |

### Code Examples Provided

- [OK] Complete `MicButton.tsx` component (Web Speech API integration)
- [OK] Complete `ActivityReview.tsx` component (inline editing UI)
- [OK] Complete `Timeline.tsx` component (chronological display + gap detection)
- [OK] Complete `anthropic.ts` client (Claude parsing with error handling)
- [OK] Complete `supabase-operations.ts` (save & fetch functions)
- [OK] Updated `App.tsx` and `VoiceCheckIn.tsx` wiring

### Critical Implementation Details

1. **Web Speech API**
   - Browser compatibility: Chrome [OK], Safari [OK], Edge [OK], Firefox [FAIL]
   - Error handling: Browser not supported → clear fallback message
   - Recording stops on user action OR after 60 seconds (timeout)

2. **Claude API**
   - Model: `claude-3-5-sonnet-20241022`
   - Environment variable: `VITE_ANTHROPIC_API_KEY` (in `.env.local`)
   - Prompt: Detailed JSON parsing instruction with examples
   - Error handling: Invalid key, rate limit, timeout all covered

3. **Data Flow**
   - Transcript → `check_ins` table (stores raw + parsed JSON)
   - Each activity → `time_entries` row (linked via `check_in_id`)
   - Timeline fetches by date, computes gaps, flags > 15 min

4. **Time Parsing**
   - Flexible parsing: "7 AM", "7:00 AM", "07:00", "19:30" all handled
   - Defaults to current date if no date context
   - Uses ISO 8601 UTC for storage; converts to local on display

### Testing Strategy

**Part A - Functional (Tasks 2.1–2.5)**
- Record → Parse → Review → Save → Display (full flow)
- Each component tested independently
- Integration tested as pipeline

**Part B - Accuracy (Task 2.2)**
- 5 test transcripts: clear, vague, short, long, with explicit times
- Target: 80%+ accuracy (achievable with clear input)
- Use Claude's notes field to flag ambiguities

**Part C - Browser Compatibility (Task 2.6)**
- Chrome, Safari, Edge: full support expected
- Firefox: fallback error shown
- Test recording + parsing in each

**Part D - Data Persistence**
- Logout/login cycle
- Timeline remains visible (fetched from Supabase)
- Multiple check-ins in same day accumulate

**Part E - Error Scenarios**
- No network: "Failed to connect"
- Invalid API key: "Claude API key is invalid"
- Rate limit: "Rate limit exceeded, please wait"
- Parsing fails: User can edit transcript or discard

### Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Claude parsing < 70% accuracy | Feature unusable | Test early (Day 2); if poor, refine prompt or scope back |
| Web Speech API unsupported | Feature doesn't work in ~20% browsers | Fallback error; document supported browsers |
| Timezone misalignment | Activities show wrong times | Always store UTC; convert on display |
| RLS policy blocks save | Data doesn't persist | Verify Phase 1 policies; test with authenticated user |
| Claude API rate limit | Can't create many check-ins | Add retry logic if needed (low priority) |

### Stretch Goals (if time permits)

1. Manual text input fallback (if Web Speech API unavailable)
2. Transcript editing before parsing
3. Parsing confidence scores
4. Undo/redo on timeline
5. Quick-add activity templates

---

## How to Use This Plan

1. **Start Task 2.1** — Implement `MicButton.tsx` component
2. **Follow sequentially** — Each task depends on previous (2.1 → 2.2 → ... → 2.6)
3. **Copy code samples** — All implementations provided; paste directly into files
4. **Run verification** — Follow manual testing checklist in Task 2.6
5. **Test parsing** — Use 5 real transcripts to verify 80%+ accuracy early

**Estimated timeline:** 2–3 calendar days at 4–5 hours/day

---

## Key Success Metrics (End of Phase 2)

- [ ] User can record + parse in < 30 seconds
- [ ] 80%+ parsing accuracy on clear input
- [ ] Timeline shows activities + gaps
- [ ] Data persists across sessions
- [ ] Works in Chrome, Safari, Edge (fallback error in Firefox)
- [ ] No unhandled errors in console

**Go/No-Go:** If ALL above are true → Phase 2 complete. Proceed to Phase 3 or Phase 5.

---

## File Locations

**Planning document:**
- `.planning/PHASE-2-PLAN.md` — Executable, detailed plan

**Implementation files (to be created):**
- `src/components/MicButton.tsx`
- `src/components/VoiceCheckIn.tsx`
- `src/components/ActivityReview.tsx`
- `src/components/Timeline.tsx`
- `src/lib/anthropic.ts`
- `src/lib/supabase-operations.ts`

**Configuration:**
- `.env.local` — Add `VITE_ANTHROPIC_API_KEY`

---

## Next Steps After Phase 2

1. **Commit:** `git commit -m "Phase 2: Voice capture, parsing, timeline"`
2. **Update STATE.md:** Mark Phase 2 complete
3. **Branch:** Phase 3 (Journal & Editing) or Phase 5 (Design & Polish) in parallel
4. **Daily standup:** Any parsing issues? Browser compatibility problems? Data persistence working?

---

**Plan created by:** Claude (Haiku 4.5)
**Created at:** 2026-03-28 14:51 UTC
**Total effort estimate:** 8.5 hours (within 6–8 hour target)
