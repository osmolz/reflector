# Google Calendar Integration Design

**Date:** 2026-03-30
**Feature:** Google Calendar sync for Reflector timeline + coach visibility
**Scope:** MVP (ships with v1.0)
**Approach:** Lightweight storage (Approach 2)

---

## Overview

Reflector will integrate with Google Calendar to:
1. **Display calendar events on the timeline** alongside logged time entries
2. **Create calendar events from time entries** with one click
3. **Give the coach calendar visibility** to provide context-aware advice without creating events directly

This solves a core problem: seeing your actual calendar context alongside how you spent your time, enabling better time management insights.

---

## 1. Data Model

### New Table: `calendar_events`

```sql
create table calendar_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gcp_event_id text not null,                    -- Google Calendar event ID (unique key)
  title text not null,                           -- Event title
  description text,                              -- Optional event description
  start_time timestamp with time zone not null,  -- Event start
  end_time timestamp with time zone not null,    -- Event end
  calendar_id text,                              -- Which calendar (if user has multiple)
  synced_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Indexes for performance
create index idx_calendar_events_user_id on calendar_events(user_id);
create index idx_calendar_events_start_time on calendar_events(start_time);

-- RLS: Users see only their own events
alter table calendar_events enable row level security;
create policy "Users can view/manage their own calendar events"
  on calendar_events using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### OAuth Token Storage

Google OAuth tokens (access + refresh) are stored in Supabase:
- Option A: Store in `auth.users.user_metadata` (Supabase Auth native support)
- Option B: New table `user_oauth_tokens` with encrypted column
- **Chosen:** Option A (simpler, Supabase handles encryption)

When token expires, Edge Functions automatically refresh using the refresh token.

---

## 2. Architecture

### Components

**Frontend:**
- `<Timeline />` component enhanced to display both `time_entries` and `calendar_events`
- New "Sync with Google Calendar" button in Timeline header
- "Add to Calendar" action on each time entry
- Sync modal: date picker (Today / This Week / Custom range)

**Backend:**
- OAuth redirect handler (initiate Google login)
- Edge Function `sync-calendar`: fetch from GCal, upsert to Supabase
- Edge Function `create-calendar-event`: push time entry to GCal, store reference
- Coach system prompt updated to use `gcal_list_events` tool

**Google Calendar API:**
- `google.calendar.events.list()` — fetch events for date range
- `google.calendar.events.insert()` — create new event
- OAuth 2.0 flow (standard)

### Data Flows

**Pull (Sync from Google Calendar):**
```
User clicks "Sync with Google Calendar"
  → Modal: select date range
  → Frontend: POST /functions/v1/sync-calendar { dateMin, dateMax }
  → Edge Function:
      - Get user's Google access token from metadata
      - Call GCal API: events.list(timeMin, timeMax)
      - Upsert each event into calendar_events (by gcp_event_id)
      - Return synced event count
  → Frontend: Show "[ok] Synced X events", refresh timeline
```

**Push (Create event on Google Calendar):**
```
User clicks "Add to Calendar" on time entry
  → Modal shows: title (editable), start, end, duration
  → User confirms
  → Frontend: POST /functions/v1/create-calendar-event { title, start_time, end_time }
  → Edge Function:
      - Get user's Google access token
      - Call GCal API: events.insert(summary, start, end)
      - Receive created event with gcp_event_id
      - Store in calendar_events table
      - Return confirmation
  → Frontend: Show "[ok] Event created", refresh timeline
```

**Coach Calendar Access:**
```
User asks chat question
  → Coach system prompt has access to gcal_list_events tool
  → Coach can call gcal_list_events(dateMin, dateMax) to see user's schedule
  → Coach uses calendar context to give advice
  → Coach suggests events in natural language: "I'd suggest blocking 2 hours tomorrow at 2pm for this"
  → User can then use "Add to Calendar" button to create it, or ignore
  → Coach NEVER calls create-calendar-event directly (tool not available to coach)
```

---

## 3. UI & UX

### Timeline Display

Calendar events and time entries both appear in the timeline, grouped by day.

**Styling:**
- **Time entries:** white/off-white background, dark text, shows "edit" hint on hover
- **Calendar events:** light gray/light blue background (e.g., `#F0F4FF`), slightly lighter text, no edit affordance
- Both show: start time, title, duration (for time entries), time range (for calendar events)

**Example:**
```
Tuesday, Mar 30

  09:00  Standup  30m  [work]          ← Time entry (clickable)
  09:30  Design meeting  2h             ← Calendar event (not clickable)
  11:45  Design refinement  1h 15m [work] ← Time entry

  Gap: 11:30–11:45 (15m unaccounted)   ← Includes both types
```

Gap detection includes calendar events, so gaps only appear when neither a time entry nor a calendar event fills the time.

### Sync Button & Modal

**Location:** Timeline page header, next to "Timeline" title

**Interaction:**
1. User clicks "Sync with Google Calendar"
2. If not yet connected: redirect to Google OAuth consent (one-time)
3. If connected: modal appears with options:
   - "Sync for: ◉ Today  ◯ This Week  ◯ Custom range"
   - If custom: date picker (from/to)
   - "Sync" button
4. During sync: spinner + "Syncing..." text
5. After sync: "[ok] Synced 5 events" (success) or "✗ Failed to sync" (error)
6. Modal closes, timeline refreshes

### "Add to Calendar" Action

**Location:** Each time entry (click time entry or show action button)

**Interaction:**
1. User clicks time entry → activity detail/edit form opens
2. In form, "Add to Calendar" button available
3. User clicks → confirmation modal:
   - Show: title (text input, editable), start time, end time, duration
   - "Create Event" button
4. On success: "[ok] Event created in your calendar"
5. On error: "✗ Failed to create. Check your calendar connection."
6. Modal closes, timeline refreshes (calendar event now visible)

---

## 4. Error Handling

### OAuth & Authentication

| Scenario | Behavior |
|----------|----------|
| First sync, no token | Redirect to Google OAuth consent screen |
| Token expired | Edge Function auto-refreshes using refresh token |
| Token revoked (user removed Reflector from Google) | Show "Reconnect to Google Calendar" button in sync modal |
| Token refresh fails | Prompt user: "Reconnect to Google Calendar?" |

### API Errors

| Error | Message | Action |
|-------|---------|--------|
| Rate limit (429) | "Calendar sync limit reached; try again later" | Show retry button |
| Timeout (>30s) | "Sync took too long; try a smaller date range" | Suggest custom date range |
| Quota exceeded | "Calendar quota reached; try tomorrow" | Inform user, no retry |
| Network error | "Check connection and retry" | Show retry button |

### Sync Conflicts

| Scenario | Behavior |
|----------|----------|
| Same event synced twice | Idempotent upsert by `gcp_event_id` (no duplicates) |
| Event deleted in GCal, but still in Reflector | No auto-delete. User sees stale event; can be cleared on next manual refresh |
| Calendar changed between syncs | Next sync pulls latest version from GCal (GCal is source of truth) |

### Push Conflicts

| Scenario | Behavior |
|----------|----------|
| Time entry edited after calendar event created | Calendar event is snapshot (doesn't auto-update) |
| Time entry deleted after calendar event created | Calendar event persists independently |
| Calendar event created from time entry, then deleted from GCal | Reflector still shows stored event (can be manually removed) |

---

## 5. Coach System Prompt Integration

The coach's system prompt is updated with:

```
You have access to the user's Google Calendar via the gcal_list_events tool.
Use it to understand their schedule when giving time management advice.

When it's relevant, suggest calendar events for the user to create themselves.
Example: "I'd suggest blocking 90 minutes tomorrow at 2pm for the refactor work."

Do NOT attempt to create calendar events. The user has full control and will
create events themselves using the "Add to Calendar" button in the timeline.

Format calendar suggestions clearly:
- What: [activity name]
- When: [specific date and time]
- Duration: [suggested length]
- Why: [brief rationale]
```

**Coach can:**
- Call `gcal_list_events(dateMin, dateMax)` to see user's schedule
- Use calendar context to give better advice
- Suggest blocking time for specific work

**Coach cannot:**
- Create events directly (no `gcal_create_event` tool access)
- Delete or modify calendar events
- Override user's calendar

---

## 6. Success Criteria

### Functional
- [ok] User connects Google Calendar via OAuth (one-click setup)
- [ok] User syncs calendar events for today, this week, or custom range
- [ok] Calendar events appear on timeline with distinct styling (non-editable)
- [ok] User creates calendar event from time entry with 2–3 clicks
- [ok] Coach can see calendar schedule and suggest events
- [ok] Gap detection includes both time entries and calendar events

### Technical
- [ok] `calendar_events` table with RLS policies
- [ok] Edge Function: `sync-calendar` (fetch + upsert)
- [ok] Edge Function: `create-calendar-event` (push + store)
- [ok] OAuth tokens stored securely and auto-refreshed
- [ok] All operations require authentication (per-user isolation)

### UX
- [ok] Visual distinction between time entries and calendar events
- [ok] Loading states during sync
- [ok] Clear error messages
- [ok] Timeline refreshes automatically after sync
- [ok] No broken state if sync fails

### Data Integrity
- [ok] No duplication (calendar_events is single source for synced events)
- [ok] gcp_event_id links local event to GCal original
- [ok] Synced events persist across sessions

---

## 7. Out of Scope (MVP)

- Automatic background sync (manual sync button only)
- Sync of changes from GCal back to local (watch/webhook)
- Conflict resolution UI (manual handling only)
- Multiple calendar selection (syncs primary calendar only)
- Calendar event editing (delete via GCal, not Reflector)
- Analytics on calendar vs logged time patterns (v1.1+)

---

## 8. Notes

**Design philosophy alignment:**
- Minimal, restrained UI (no heavy modals, clean visual distinction)
- Single source of truth (GCal is authoritative for calendar, Reflector for logged time)
- User control (no surprises, explicit sync action, coach suggests but doesn't create)

**Performance considerations:**
- GCal fetch is per-request (no polling). Typical 1-3 calendar events per day = fast
- Upsert by gcp_event_id ensures no duplicates
- Timeline grouping and gap calculation already optimized

**Future work (v1.1+):**
- Automatic daily sync
- Calendar event editing from Reflector
- Conflict detection and resolution UI
- Analytics: time blocked vs time logged by category
- Push to other calendars if user has multiple
- Webhook for real-time updates
