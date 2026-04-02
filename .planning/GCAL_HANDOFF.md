# Google Calendar Integration - Session Handoff

**Date:** 2026-03-30
**Status:** Backend complete, resuming frontend Tasks 5-13

## Completed [OK]

### Tasks 1-4 (Backend)
1. **Migration** (commit 312ff31) — `calendar_events` table with RLS
2. **sync-calendar Edge Function** (commit efce84f + 18da4d1) — Fetch from Google Calendar, upsert to Supabase
3. **create-calendar-event Edge Function** — Push time entries to Google Calendar
4. **Calendar utilities & types** (commit e565311) — Helper functions and TypeScript interfaces

### Key Commits
```
312ff31 feat(db): add calendar_events table with RLS policies
efce84f feat(functions): add sync-calendar Edge Function to pull from Google Calendar
18da4d1 fix(functions): improve sync-calendar type safety, error handling, and maintainability
[create-calendar-event committed but SHA not noted]
e565311 feat(utils): add calendar utility functions and TypeScript types
```

## Next: Tasks 5-13 (Frontend + Integration)

### Task 5: SyncCalendarModal component
**Files:** `src/components/SyncCalendarModal.jsx` + `.css`
**Purpose:** Modal with date range picker, sync button
**Key features:**
- Preset options: Today / This Week / Custom
- Loading spinner during sync
- Success/error messages
- Calls `POST /functions/v1/sync-calendar`

### Task 6: AddToCalendarModal component
**Files:** `src/components/AddToCalendarModal.jsx` + `.css`
**Purpose:** Modal to create calendar event from time entry
**Key features:**
- Shows editable title, start/end times, duration
- Calls `POST /functions/v1/create-calendar-event`
- Success confirmation

### Task 7: Update Timeline component
**File:** `src/components/Timeline.jsx`
**Changes:**
- Fetch `calendar_events` from Supabase alongside `time_entries`
- Add "Sync with Google Calendar" button in header
- Render calendar events with distinct styling (light blue background)
- Calendar events non-editable, distinct from time entries
- Import and use SyncCalendarModal and AddToCalendarModal

### Task 8: Add calendar styling
**File:** `src/components/Timeline.css`
**Add:**
- `.timeline-item.calendar-event` — light blue background, distinct border
- `.timeline-indicator.calendar-indicator` — different color
- `.btn-sync-calendar` — sync button styling

### Task 9: Update chat system prompt
**File:** `supabase/functions/chat/index.ts`
**Changes:**
- Add `gcal_list_events` tool definition (read-only, for coach context)
- Update system prompt to mention calendar awareness
- Coach can suggest events but NOT create them (no `gcal_create_event` tool)

### Task 10: Integration tests
**File:** `tests/calendar-integration.spec.js`
**Test:** Calendar events table CRUD, merge/sort logic

### Task 11: E2E testing checklist
**File:** `docs/superpowers/plans/2026-03-30-google-calendar-e2e-test.md`
**Document:** Manual testing checklist for sync/push/coach flows

### Task 12: Final integration & cleanup
**Files:** `README.md`, `.gitignore`
**Changes:** Document calendar feature, verify gitignore

### Task 13: Production deployment
**Action:** Deploy Edge Functions to production, verify

## Key Design Decisions

1. **Calendar events are read-only on Timeline** — User creates/edits via Google Calendar directly
2. **Coach suggests but doesn't create** — User has full calendar control
3. **OAuth once, manual sync button** — No background sync, user controls when to fetch
4. **Lightweight storage** — Store event references for history, not as source of truth

## Implementation Plan File

Full details: `/docs/superpowers/plans/2026-03-30-google-calendar-implementation.md`

Each task has complete code examples and step-by-step instructions.

## Ready to Resume

Use subagent-driven development:
- Task 5 → implementer → spec reviewer → code quality reviewer → Task 6
- Continue through Task 13

All backend APIs tested and ready. Frontend is straightforward React following Prohairesis patterns.
