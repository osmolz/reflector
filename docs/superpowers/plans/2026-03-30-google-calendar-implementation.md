# Google Calendar Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google Calendar sync to Prohairesis, allowing users to view calendar events on the timeline, create calendar events from time blocks, and enable the coach to see calendar context.

**Architecture:** Lightweight storage model with `calendar_events` table. OAuth tokens stored in user metadata. Two Edge Functions handle sync (pull) and push operations. Timeline UI enhanced to display calendar events alongside time entries. Coach gains read-only access via `gcal_list_events` tool.

**Tech Stack:** Supabase (PostgreSQL + Auth + Edge Functions), Google Calendar API, React, TypeScript, Anthropic SDK (coach integration)

---

## File Structure

**Backend:**
- `supabase/migrations/20260330_001000_add_calendar_events.sql` — Calendar events table + RLS
- `supabase/functions/sync-calendar/index.ts` — Pull from GCal, upsert to Supabase
- `supabase/functions/create-calendar-event/index.ts` — Push time entry to GCal

**Frontend:**
- `src/components/SyncCalendarModal.jsx` — Date range picker + sync trigger
- `src/components/Timeline.jsx` — Enhanced to display calendar events
- `src/components/AddToCalendarModal.jsx` — Create event from time entry
- `src/utils/calendarUtils.ts` — Helper functions (format times, merge events for display)
- `src/types/calendar.ts` — TypeScript types for calendar_events

**Coach:**
- `supabase/functions/chat/index.ts` — Updated system prompt with gcal_list_events tool

**Tests:**
- `tests/sync-calendar.spec.js` — sync-calendar Edge Function
- `tests/create-calendar-event.spec.js` — create-calendar-event Edge Function
- `tests/calendar-timeline.spec.js` — Timeline with calendar events display

---

## Task Breakdown

### Task 1: Create Calendar Events Migration

**Files:**
- Create: `supabase/migrations/20260330_001000_add_calendar_events.sql`

- [ ] **Step 1: Write migration file**

```sql
-- Create calendar_events table
create table if not exists calendar_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gcp_event_id text not null,
  title text not null,
  description text,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  calendar_id text,
  synced_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create indexes
create index if not exists idx_calendar_events_user_id on calendar_events(user_id);
create index if not exists idx_calendar_events_start_time on calendar_events(start_time);
create index if not exists idx_calendar_events_gcp_event_id on calendar_events(gcp_event_id);

-- Enable RLS
alter table calendar_events enable row level security;

-- RLS Policies
create policy "Users can view their own calendar events"
on calendar_events for select
using (auth.uid() = user_id);

create policy "Users can insert their own calendar events"
on calendar_events for insert
with check (auth.uid() = user_id);

create policy "Users can update their own calendar events"
on calendar_events for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own calendar events"
on calendar_events for delete
using (auth.uid() = user_id);
```

- [ ] **Step 2: Apply migration locally**

Run: `supabase db push`

Expected: Migration applies successfully. Verify table exists: `supabase db list` shows `calendar_events` table.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260330_001000_add_calendar_events.sql
git commit -m "feat(db): add calendar_events table with RLS policies"
```

---

### Task 2: Implement sync-calendar Edge Function

**Files:**
- Create: `supabase/functions/sync-calendar/index.ts`

[Full task as shown in plan above - implement the Edge Function with all code provided]

---

### Task 3: Implement create-calendar-event Edge Function

**Files:**
- Create: `supabase/functions/create-calendar-event/index.ts`

[Full task as shown in plan above]

---

### Task 4: Create calendar utility functions

**Files:**
- Create: `src/utils/calendarUtils.ts`
- Create: `src/types/calendar.ts`

[Full task as shown in plan above]

---

### Task 5: Create SyncCalendarModal component

**Files:**
- Create: `src/components/SyncCalendarModal.jsx`
- Create: `src/components/SyncCalendarModal.css`

[Full task as shown in plan above]

---

### Task 6: Create AddToCalendarModal component

**Files:**
- Create: `src/components/AddToCalendarModal.jsx`
- Create: `src/components/AddToCalendarModal.css`

[Full task as shown in plan above]

---

### Task 7: Update Timeline component to display calendar events

**Files:**
- Modify: `src/components/Timeline.jsx`

[Full task as shown in plan above]

---

### Task 8: Add calendar styling to Timeline CSS

**Files:**
- Modify: `src/components/Timeline.css`

[Full task as shown in plan above]

---

### Task 9: Update chat system prompt for calendar access

**Files:**
- Modify: `supabase/functions/chat/index.ts`

[Full task as shown in plan above]

---

### Task 10: Write integration tests

**Files:**
- Create: `tests/calendar-integration.spec.js`

[Full task as shown in plan above]

---

### Task 11: Manual E2E testing checklist

**Files:**
- Create: `docs/superpowers/plans/2026-03-30-google-calendar-e2e-test.md`

[Full task as shown in plan above]

---

### Task 12: Final integration and cleanup

**Files:**
- Modify: `.gitignore`
- Modify: `README.md`

[Full task as shown in plan above]

---

### Task 13: Deploy Edge Functions to production

**Files:**
- Deploy: `supabase/functions/sync-calendar/`
- Deploy: `supabase/functions/create-calendar-event/`
- Deploy: `supabase/functions/chat/` (updated system prompt)

[Full task as shown in plan above]
