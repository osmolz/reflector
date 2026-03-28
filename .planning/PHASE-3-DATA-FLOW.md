# Phase 3 Data Flow & Architecture

---

## High-Level Data Flow

### Journal Entry Creation Flow

```
User writes/speaks text
        ↓
    JournalForm.tsx
        │
        ├─→ Validate: text not empty
        │
        ├─→ Create payload:
        │   {
        │     user_id: auth.uid(),
        │     text: "User's text",
        │     created_at: NOW()
        │   }
        │
        ├─→ supabase.from('journal_entries').insert([payload])
        │
        ├─→ Supabase RLS checks:
        │   - Is user authenticated?
        │   - Does auth.uid() match user_id?
        │   - If NO → 403 Forbidden
        │   - If YES → proceed
        │
        ├─→ Row inserted into journal_entries table
        │
        ├─→ Response: 201 Created (success)
        │   or 400/500 (error)
        │
        ├─→ onEntryCreated() callback fired
        │
        └─→ JournalHistory refetches entries
                ↓
            SELECT id, text, created_at
            FROM journal_entries
            WHERE user_id = auth.uid()
            ORDER BY created_at DESC
                ↓
            Entries array updates in UI
                ↓
            List renders newest-first
```

---

### Activity Edit Flow

```
User clicks activity in Timeline
        ↓
    Timeline.tsx detects click
        │
        ├─→ setEditingActivity(activity)
        │   (activity = {id, activity_name, duration_minutes, category, start_time})
        │
        └─→ ActivityEditForm modal appears
                ↓
            User edits form fields:
            - activity_name: "Work" → "Deep Work"
            - duration_minutes: 120 → 90
            - category: "work" (unchanged)
            - start_time: (unchanged)
                ↓
            User clicks "Save"
                ↓
            Form validates:
            - name.trim() not empty? YES
            - duration > 0? YES
                ↓
            Create update payload:
            {
              activity_name: "Deep Work",
              duration_minutes: 90,
              updated_at: NOW()
            }
                ↓
            supabase.from('time_entries')
              .update(payload)
              .eq('id', activity.id)
                ↓
            Supabase RLS checks:
            - Does activity.user_id match auth.uid()?
            - Does the UPDATE policy exist?
            - If NO → 403 Forbidden
            - If YES → proceed
                ↓
            Row updated in time_entries table
                ↓
            Response: 200 OK (success)
                ↓
            onSave() callback fired
                ↓
            Timeline.tsx detects callback:
            setRefreshKey(k => k + 1)
                ↓
            useEffect triggers fetchTimelineActivities()
                ↓
            SELECT id, activity_name, duration_minutes, start_time, category
            FROM time_entries
            WHERE user_id = auth.uid()
            AND DATE(start_time) = CURRENT_DATE
            ORDER BY start_time ASC
                ↓
            Activities array re-populates
                ↓
            Gap recalculation runs:
            for each pair of activities:
              gap = nextActivity.start - (prevActivity.start + prevActivity.duration)
              if gap >= 15 minutes:
                add to gaps array
                ↓
            Timeline re-renders with:
            - Updated activities (duration now 90 min)
            - Updated gaps (recalculated)
                ↓
            Modal closes
```

---

### Activity Delete Flow

```
User clicks "Delete" button in edit modal
        ↓
    confirm("Delete this activity?")
    - User clicks "OK" → proceed
    - User clicks "Cancel" → abort
        ↓
    supabase.from('time_entries')
      .delete()
      .eq('id', activity.id)
        ↓
    Supabase RLS checks:
    - Does activity.user_id match auth.uid()?
    - Does the DELETE policy exist?
    - If NO → 403 Forbidden
    - If YES → proceed
        ↓
    Row deleted from time_entries table
        ↓
    Response: 204 No Content (success)
        ↓
    onSave() callback fired
        ↓
    Same refresh sequence as edit:
    - Timeline refetches activities
    - Gaps recalculate
    - UI updates with deleted activity gone
        ↓
    Modal closes
```

---

## Component & State Architecture

### Journal Feature

```
App
└── Journal Page (src/pages/Journal.tsx)
    │
    ├── JournalForm (src/components/JournalForm.tsx)
    │   │
    │   ├─ State:
    │   │  • text: string (user's input)
    │   │  • loading: bool (submit in progress)
    │   │  • error: string (validation/network errors)
    │   │  • isListening: bool (voice recording active)
    │   │  • transcript: string (voice transcription)
    │   │
    │   ├─ Hooks:
    │   │  • useAuthStore() → user object
    │   │  • useWebSpeechAPI() → voice input
    │   │  • useState() → form state
    │   │
    │   └─ Actions:
    │      • handleVoiceInput() → start/stop recording
    │      • handleSubmit() → insert into journal_entries
    │      • onEntryCreated() → callback to refresh history
    │
    └── JournalHistory (src/components/JournalHistory.tsx)
        │
        ├─ State:
        │  • entries: JournalEntry[] (fetched from DB)
        │  • loading: bool (query in progress)
        │  • error: string (fetch errors)
        │  • expandedId: string | null (which entry is expanded)
        │
        ├─ Hooks:
        │  • useAuthStore() → user.id for filtering
        │  • useState() → entries, loading, expanded
        │  • useEffect() → fetch on mount
        │
        └─ Actions:
           • fetchEntries() → SELECT * FROM journal_entries
           • handleExpandToggle() → toggle snippet/full view
```

### Activity Edit Feature

```
App
└── Dashboard / Timeline Page
    │
    └── Timeline (src/components/Timeline.tsx) [from Phase 2, modified]
        │
        ├─ State:
        │  • activities: Activity[] (time_entries)
        │  • gaps: Gap[] (auto-calculated)
        │  • refreshKey: number (triggers refetch)
        │  • editingActivity: Activity | null (which is being edited)
        │  • loading: bool (fetch in progress)
        │
        ├─ Hooks:
        │  • useAuthStore() → user.id
        │  • useState() → all above state
        │  • useEffect() → refetch on refreshKey change
        │
        ├─ Render Activities:
        │  └─ Activity Item (clickable)
        │     ├─ onClick → setEditingActivity(activity)
        │     └─ Displays: name, duration, category, time
        │
        ├─ Render Gaps:
        │  └─ Gap Item
        │     └─ Displays: unaccounted time, duration
        │
        └─ Conditionally Render Modal:
            {editingActivity && (
              <ActivityEditForm
                activity={editingActivity}
                onClose={() => setEditingActivity(null)}
                onSave={() => setRefreshKey(k => k + 1)}
              />
            )}

ActivityEditForm (src/components/ActivityEditForm.tsx)
│
├─ Props:
│  • activity: Activity (activity to edit)
│  • onClose: () => void (close modal)
│  • onSave: () => void (trigger refresh)
│
├─ State:
│  • name, duration, category, startTime: (form fields)
│  • loading: bool
│  • error: string
│
├─ Hooks:
│  • useState() → form state
│
└─ Actions:
   • handleSubmit() → UPDATE time_entries
   • handleDelete() → DELETE from time_entries
   • Both trigger onSave() callback when done
```

---

## State Synchronization

### When Activity is Edited

```
Timeline.tsx (parent)
    │
    ├─ User clicks activity
    │  └─ setEditingActivity(activity)
    │
    ├─ ActivityEditForm (child) renders with prop: activity
    │  └─ User edits and submits
    │     └─ onSave() callback fired
    │
    └─ Parent receives onSave():
       └─ setRefreshKey(k => k + 1)
          └─ useEffect([refreshKey]) triggers
             └─ fetchTimelineActivities()
                └─ SELECT * FROM time_entries
                   └─ activities array updates
                      └─ Timeline re-renders
                         └─ Modal closes (editingActivity = null)
```

**Key point:** Data flows DOWN (props) and UP (callbacks). No sibling communication.

---

## Supabase RLS & Permission Checks

### Insert Journal Entry (JournalForm)

```sql
INSERT INTO journal_entries (user_id, text, created_at)
VALUES ('123e4567...', 'User text', NOW());

-- RLS checks:
-- 1. Is user authenticated? auth.uid() != NULL
-- 2. Does INSERT policy exist?
--    create policy "Users can create their own journal entries"
--    on journal_entries for insert
--    with check (auth.uid() = user_id);
-- 3. Does payload satisfy check?
--    auth.uid() = '123e4567...'? YES → proceed
-- 4. Row inserted ✓
```

### Select Journal Entries (JournalHistory)

```sql
SELECT id, text, created_at
FROM journal_entries
WHERE user_id = auth.uid()
ORDER BY created_at DESC;

-- RLS checks:
-- 1. Is user authenticated? auth.uid() != NULL
-- 2. Does SELECT policy exist?
--    create policy "Users can view their own journal entries"
--    on journal_entries for select
--    using (auth.uid() = user_id);
-- 3. For each row returned:
--    Does auth.uid() = row.user_id? YES → include
--                                    NO → exclude (row filtered out)
-- 4. Results shown ✓
```

### Update Activity (ActivityEditForm)

```sql
UPDATE time_entries
SET activity_name = 'New Name', duration_minutes = 90, updated_at = NOW()
WHERE id = 'abc123...';

-- RLS checks:
-- 1. Is user authenticated? auth.uid() != NULL
-- 2. Does UPDATE policy exist?
--    create policy "Users can update their own time entries"
--    on time_entries for update
--    using (auth.uid() = user_id)
--    with check (auth.uid() = user_id);
-- 3. Does row exist AND does user own it?
--    SELECT user_id FROM time_entries WHERE id = 'abc123...';
--    auth.uid() = row.user_id? YES → proceed, NO → 403 Forbidden
-- 4. Update executed ✓
```

### Delete Activity (ActivityEditForm)

```sql
DELETE FROM time_entries
WHERE id = 'abc123...';

-- RLS checks:
-- 1. Is user authenticated? auth.uid() != NULL
-- 2. Does DELETE policy exist?
--    create policy "Users can delete their own time entries"
--    on time_entries for delete
--    using (auth.uid() = user_id);
-- 3. Does row exist AND does user own it?
--    Same check as UPDATE
--    auth.uid() = row.user_id? YES → proceed, NO → 403 Forbidden
-- 4. Delete executed ✓
```

---

## Error Handling Data Flow

### Network Error During Insert

```
JournalForm.handleSubmit()
    ↓
try {
  await supabase.from('journal_entries').insert(...)
} catch (err) {
    ↓
  setError(err.message)  // Set error state
    ↓
  Error displays in UI:
  <div style={{ color: 'red' }}>{error}</div>
    ↓
  Form remains open with user's text preserved
    ↓
  User can retry or fix issue
}
```

### RLS Violation (403)

```
ActivityEditForm.handleSubmit()
    ↓
try {
  await supabase.from('time_entries').update(...)
} catch (err) {
    // err.message = "Policy violation" or "403"
    ↓
  setError("Unauthorized: You can only edit your own activities")
    ↓
  Error displays in modal
    ↓
  Modal stays open (user can try again or cancel)
}
```

### Validation Error (Client-Side)

```
ActivityEditForm.handleSubmit()
    ↓
if (!name.trim() || duration <= 0) {
  setError("Activity name required, duration > 0")
  return  // Early exit, no DB call
}
    ↓
  Error displays in modal
    ↓
  User fixes field and retries
```

---

## Voice Input Data Flow

### Web Speech API Transcription

```
User clicks "Voice Input" button
    ↓
useWebSpeechAPI.startListening()
    ↓
recognition.onstart fires
    ├─ setIsListening(true)
    └─ Button changes: "Start Recording" → "Stop Recording"
    ↓
User speaks into microphone
    ↓
recognition.onresult fires (multiple times)
    ├─ For interim results (partial):
    │  └─ interimTranscript = "slept for a..."
    ├─ For final results:
    │  └─ setTranscript(prev => prev + " " + "towers")
    │     (isFinal = true, commit to state)
    └─ Display updates live:
       "Transcript: slept for a towers"
    ↓
User clicks "Stop Recording"
    ↓
recognition.stop()
    ↓
recognition.onend fires
    ├─ setIsListening(false)
    └─ Button changes: "Stop Recording" → "Start Recording"
    ↓
Transcript committed to state: "slept for a towers"
    ↓
User can:
  ├─ Correct: manually edit text field to "Slept for 8 hours"
  ├─ Append: click voice again to continue recording
  └─ Submit: click "Save Entry"
    ↓
Form submits with final text (may be original or edited)
```

---

## Gap Recalculation Algorithm

### Input

```
activities = [
  { id: '1', activity_name: 'Breakfast', start_time: '07:00', duration_minutes: 30 },
  { id: '2', activity_name: 'Work', start_time: '08:00', duration_minutes: 60 },
  { id: '3', activity_name: 'Lunch', start_time: '09:30', duration_minutes: 30 },
]
```

### Process

```
Step 1: Sort by start_time (should already be sorted)
[Breakfast @ 07:00, Work @ 08:00, Lunch @ 09:30]

Step 2: For each pair, calculate gap
├─ Breakfast (07:00 + 30 min = 07:30)
│  vs. Work (08:00)
│  Gap = 08:00 - 07:30 = 30 minutes
│  Is 30 >= 15 min? YES → Add to gaps
│
├─ Work (08:00 + 60 min = 09:00)
│  vs. Lunch (09:30)
│  Gap = 09:30 - 09:00 = 30 minutes
│  Is 30 >= 15 min? YES → Add to gaps
│
└─ Lunch is last, no next activity

Step 3: Return gaps array
[
  { startTime: '07:30', endTime: '08:00', durationMinutes: 30 },
  { startTime: '09:00', endTime: '09:30', durationMinutes: 30 },
]
```

### Rendering

```
<Timeline>
  <ActivityItem>Breakfast 30 min</ActivityItem>
  <GapItem>Unaccounted: 30 min (07:30 - 08:00)</GapItem>
  <ActivityItem>Work 60 min</ActivityItem>
  <GapItem>Unaccounted: 30 min (09:00 - 09:30)</GapItem>
  <ActivityItem>Lunch 30 min</ActivityItem>
</Timeline>
```

### After Edit (Duration changed)

```
User edits Work from 60 min → 120 min (now 08:00 - 10:00)

Step 1: Updated activities
[
  { start: '07:00', duration: 30 },  → ends at 07:30
  { start: '08:00', duration: 120 }, → ends at 10:00
  { start: '09:30', duration: 30 },  → ends at 10:00
]

Step 2: Recalculate gaps
├─ 07:30 to 08:00? YES, 30 min gap
├─ 10:00 to 09:30? NO, Lunch starts before Work ends!
│  (Overlap detected, but for MVP we just show it)
└─ Result: Only one gap (first one)

Step 3: Render
<Timeline>
  <ActivityItem>Breakfast 30 min</ActivityItem>
  <GapItem>Unaccounted: 30 min</GapItem>
  <ActivityItem>Work 120 min (UPDATED!)</ActivityItem>
  <ActivityItem>Lunch 30 min (OVERLAPS!</ActivityItem>
</Timeline>
```

**Note:** Overlaps are shown but not explicitly flagged in MVP. Phase 7 can add overlap detection.

---

## Summary: Data at Rest vs. In Transit

### Data at Rest (in Supabase)

```
journal_entries table:
┌──────────────────────────────────────┬──────────────────┐
│ user_id │ text │ created_at         │
├─────────┼──────┼────────────────────┤
│ uid-123 │ "..." │ 2026-03-29 10:00 │
│ uid-123 │ "..." │ 2026-03-29 12:30 │
└──────────────────────────────────────┴──────────────────┘

time_entries table:
┌─────────┬────────────────┬──────────┬──────────────────┐
│user_id │ activity_name │ duration │ start_time       │
├─────────┼────────────────┼──────────┼──────────────────┤
│ uid-123 │ Breakfast    │ 30       │ 2026-03-29 07:00 │
│ uid-123 │ Work         │ 120      │ 2026-03-29 08:00 │
└─────────┴────────────────┴──────────┴──────────────────┘
```

### Data in Transit (in React State)

```
JournalForm:
{
  text: "User's current text input",
  loading: false,
  error: "",
  isListening: false,
  transcript: "Voice transcription if recording"
}

Timeline:
{
  activities: [
    { id: '1', activity_name: 'Breakfast', duration_minutes: 30, ... },
    { id: '2', activity_name: 'Work', duration_minutes: 120, ... }
  ],
  gaps: [
    { startTime: '2026-03-29T07:30', endTime: '2026-03-29T08:00', durationMinutes: 30 }
  ],
  editingActivity: { id: '2', activity_name: 'Work', duration_minutes: 120, ... },
  loading: false
}
```

---

**This document shows how data moves through your app. Understand this flow, and you'll debug any Phase 3 issue.**
