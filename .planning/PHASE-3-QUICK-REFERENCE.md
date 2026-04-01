# Phase 3 Quick Reference & Visual Guide

## Phase At a Glance

**Goal:** Journal entries + Activity editing
**Effort:** ~3 hours (development) + 1-2 hours (testing) = 4-5 hours
**Depends on:** Phase 2 (timeline & activities exist)
**Blocks:** Phase 5 (design polish)

---

## Feature Overview

### Feature 1: Journal Entries

```
User Types Text or Speaks
        ↓
    JournalForm
    ├─ Text Input (textarea)
    ├─ Voice Button (Web Speech API)
    └─ Submit Button
        ↓
  Save to Supabase (journal_entries)
        ↓
  JournalHistory fetches & displays
  (newest first, expandable snippets)
```

### Feature 2: Activity Editing

```
User Clicks Activity in Timeline
        ↓
  ActivityEditForm Modal Opens
  ├─ Name (text)
  ├─ Duration (number)
  ├─ Category (text)
  ├─ Start Time (datetime)
  └─ Delete Button (optional)
        ↓
  Save to Supabase (time_entries)
        ↓
  Timeline Refreshes
        ↓
  Gap Recalculation Runs
```

---

## Component Tree

```
App
├── Journal Page
│   ├── JournalForm
│   │   ├─ textarea (text input)
│   │   ├─ button (voice input)
│   │   └─ button (submit)
│   └── JournalHistory
│       └─ JournalEntry[] (expandable list)
│
├── Dashboard / Timeline Page
│   └── Timeline
│       ├─ Activity[] (clickable)
│       │  └─ onClick → ActivityEditForm
│       ├─ Gap[] (auto-calculated)
│       └─ ActivityEditForm (modal)
│           ├─ Form fields (edit)
│           ├─ button (save)
│           ├─ button (delete)
│           └─ button (cancel)
```

---

## Task Execution Path

### Sequential (Recommended for MVP)

```
Task 3.1: JournalForm        [45 min]
    ↓
Task 3.2: JournalHistory    [35 min]  ← Journal feature complete
    ↓
Task 3.3: ActivityEditForm   [50 min]
    ↓
Task 3.4: Delete Activity    [20 min]
    ↓
Task 3.5: Timeline Integration [30 min] ← Activity editing complete
    ↓
Testing & Debugging          [60-90 min]
    ↓
PHASE 3 COMPLETE
```

### Parallel Option (Advanced)

```
Tasks 3.1 & 3.3 can start simultaneously if you have capacity:

Start at T+0:00
├─ Task 3.1: JournalForm (45 min) ─ Task 3.2: History (35 min) ─┐
│                                                                 ├─→ DONE (3 hours)
└─ Task 3.3: Edit (50 min) ─ Task 3.4: Delete (20 min) ─ Task 3.5: Integration (30 min) ┘
```

---

## File Reference

### Create These Files

| File | Purpose | Task |
|------|---------|------|
| `src/components/JournalForm.tsx` | Form for text/voice journal input | 3.1 |
| `src/components/JournalHistory.tsx` | Reverse-chronological journal list | 3.2 |
| `src/components/ActivityEditForm.tsx` | Modal to edit activity details | 3.3 |
| `src/pages/Journal.tsx` | Journal page (wraps form + history) | 3.1/3.2 |
| `src/utils/timelineUtils.ts` | Delete + gap calculation helpers | 3.4/3.5 |
| `src/hooks/useWebSpeechAPI.ts` | Voice input hook (if not from Phase 2) | 3.1 |

### Modify These Files

| File | Change | Task |
|------|--------|------|
| `src/components/Timeline.tsx` | Add click handler, edit modal state | 3.3 |
| `src/App.tsx` or routes | Add Journal page link/route | 3.1 |
| `.env.local` | No changes (reuse Phase 1) | — |

---

## Database Operations Checklist

### Journal Feature

```sql
-- Task 3.1: Insert journal entry
INSERT INTO journal_entries (user_id, text, created_at)
VALUES (auth.uid(), 'User text...', NOW());

-- Task 3.2: Query journal entries
SELECT id, text, created_at
FROM journal_entries
WHERE user_id = auth.uid()
ORDER BY created_at DESC;
```

### Activity Editing

```sql
-- Task 3.3: Update activity
UPDATE time_entries
SET activity_name = '...', duration_minutes = X, category = '...', start_time = '...', updated_at = NOW()
WHERE id = '...' AND user_id = auth.uid();

-- Task 3.4: Delete activity
DELETE FROM time_entries
WHERE id = '...' AND user_id = auth.uid();

-- Task 3.5: Fetch timeline (from Phase 2)
SELECT id, activity_name, category, duration_minutes, start_time, created_at
FROM time_entries
WHERE user_id = auth.uid()
AND DATE(start_time) = CURRENT_DATE
ORDER BY start_time ASC;
```

---

## Code Snippets Quick Copy

### JournalForm Minimal

```typescript
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export function JournalForm({ onEntryCreated }: { onEntryCreated: () => void }) {
  const user = useAuthStore((state) => state.user);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;
    setLoading(true);

    try {
      await supabase.from('journal_entries').insert([{
        user_id: user.id,
        text: text.trim(),
        created_at: new Date().toISOString(),
      }]);
      setText('');
      onEntryCreated();
    } catch (err) {
      alert('Error saving entry: ' + (err as any).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} />
      <button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
    </form>
  );
}
```

### ActivityEditForm Minimal

```typescript
import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface Activity {
  id: string;
  activity_name: string;
  duration_minutes: number;
  category: string;
  start_time: string;
}

export function ActivityEditForm({ activity, onClose, onSave }: { activity: Activity; onClose: () => void; onSave: () => void }) {
  const [name, setName] = useState(activity.activity_name);
  const [duration, setDuration] = useState(activity.duration_minutes);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await supabase.from('time_entries').update({
        activity_name: name,
        duration_minutes: parseInt(String(duration)),
        updated_at: new Date().toISOString(),
      }).eq('id', activity.id);

      onSave();
      onClose();
    } catch (err) {
      alert('Error: ' + (err as any).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this activity?')) return;
    setLoading(true);

    try {
      await supabase.from('time_entries').delete().eq('id', activity.id);
      onSave();
      onClose();
    } catch (err) {
      alert('Error: ' + (err as any).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} min="1" />
        <button type="submit" disabled={loading}>Save</button>
        <button type="button" onClick={onClose}>Cancel</button>
        <button type="button" onClick={handleDelete} style={{ color: 'red' }}>Delete</button>
      </form>
    </div>
  );
}
```

---

## Testing Scenarios

### Scenario 1: Create & Persist Journal Entry

```
1. Go to Journal page
2. Type: "Woke up at 7am, had coffee, worked 8-12"
3. Click "Save Entry"
   [ok] Entry appears in history
   [ok] Supabase has entry with created_at timestamp
4. Refresh page (F5)
   [ok] Entry still there (persisted)
5. Verify in Supabase: dashboard > journal_entries table
   [ok] Row exists with user_id, text, created_at
```

### Scenario 2: Edit Activity Duration

```
1. Go to Timeline (from Phase 2)
2. See activity: "Work" 120 minutes
3. Click on activity
   [ok] Modal opens with fields: name="Work", duration=120
4. Change duration to 90
5. Click "Save"
   [ok] Modal closes
   [ok] Timeline refreshes
   [ok] Activity now shows 90 minutes
6. Verify in Supabase: time_entries table
   [ok] duration_minutes = 90, updated_at = NOW
```

### Scenario 3: Delete Activity & Gaps Recalculate

```
1. Timeline has:
   - 7:00am "Breakfast" 30 min
   - 8:00am "Work" 60 min
   - 10:00am "Break" 15 min
   (No gaps, activities are adjacent)

2. Click on "Work" activity, delete it
   [ok] Activity removed from timeline
   [ok] Gaps array now contains one gap from 7:30am to 10:00am (150 min)

3. Timeline shows:
   - 7:00am "Breakfast" 30 min
   - [Gap: 150 min unaccounted]
   - 10:00am "Break" 15 min
```

### Scenario 4: Voice Input Failure Fallback

```
1. Click "Voice Input" button
2. Browser doesn't support Web Speech API (Firefox on some OS)
   [ok] Error message: "Voice input not supported on your browser"
   [ok] User can still type manually

OR

1. Browser supports it, user clicks "Voice Input"
2. User speaks: "Slept for 8 hours"
3. Web Speech API transcribes: "slept for a towers"
   [ok] Transcript appends to text field
   [ok] User can manually correct to "Slept for 8 hours"
   [ok] Submit saves corrected text
```

---

## Debugging Checklist

### If Journal Entry Doesn't Save

```
[ ] Check user is logged in (useAuthStore shows user.id)
[ ] Check Network tab: POST to /rest/v1/journal_entries returns 201
[ ] Check Console: any Supabase errors?
[ ] Check Supabase RLS policies: journal_entries SELECT/INSERT enabled?
[ ] Verify .env.local has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
[ ] Try force refresh: Ctrl+Shift+R (not just F5)
```

### If Activity Edit Fails

```
[ ] Check user is logged in
[ ] Check activity.id is valid UUID
[ ] Check Network tab: PATCH to /rest/v1/time_entries returns 200
[ ] Check Supabase RLS: time_entries UPDATE policy enabled?
[ ] Check form validation: duration > 0, name not empty?
[ ] Try editing just one field at a time to isolate issue
```

### If Timeline Doesn't Refresh After Edit

```
[ ] Check setRefreshKey or similar trigger is called onSave
[ ] Check useEffect dependencies include refreshKey
[ ] Check Timeline component re-fetches activities on refresh
[ ] Try manually clicking back/forward navigation to force re-render
[ ] Check Console: any React errors or warnings?
```

### If Voice Input Not Working

```
[ ] Test in Chrome (best support) first
[ ] Check browser permissions: allow microphone access?
[ ] Check Console for errors related to SpeechRecognition
[ ] Verify useWebSpeechAPI hook is imported correctly
[ ] Test with microphone working (not muted)
[ ] Check browser supports it: console.log(window.SpeechRecognition || window.webkitSpeechRecognition)
```

---

## Performance Tips

### For 20+ Journal Entries

- [ok] Reverse-chronological sort by created_at DESC (use DB order, not in-memory)
- [ok] Load all entries upfront (no pagination for MVP)
- [ok] Collapsible snippets avoid rendering full text for all entries

### For 20+ Activities per Timeline

- [ok] Sort by start_time ASC in SQL query
- [ok] Gap detection is O(n), acceptable for < 100 activities
- [ok] Avoid re-calculating gaps on every keystroke (only on save)

### Modal Performance

- [ok] Modal doesn't re-render parent (use separate state)
- [ok] Backdrop click handler is debounced (not needed for simple onClick)

---

## Rollback/Undo Plan (for mistakes)

### Accidentally Deleted Activity

**Mitigation (MVP):** No undo built in. User must recreate.
**Future (Phase 7):** Add soft delete flag, implement undo.

### Accidentally Edited Journal Entry

**Mitigation:** No edit on journal entries yet (can only delete). Add edit capability in Phase 7.

### Form Submission Bugs

**Mitigation:** If form is stuck, hard refresh page (Ctrl+Shift+R). No data loss (not submitted).

### Supabase Down

**Mitigation:** Display "Service unavailable" message. Retry button. Try again later.

---

## Integration Handoff to Phase 4

### What Phase 4 Needs from Phase 3

- [ ] `time_entries` table with updated activities (Phase 3 edits them)
- [ ] `journal_entries` table populated with entries
- [ ] Activity names, durations, categories all current
- [ ] Supabase queries working (select with user_id filter)

### What Phase 4 Will Do

- Fetch all `time_entries` for last 30 days
- Send to Claude API with user question
- Store Q+A in `chat_messages` table

### What Phase 5 Needs from Phase 3

- [ ] JournalForm component (needs styling)
- [ ] JournalHistory list (needs card layout, typography)
- [ ] ActivityEditForm modal (needs custom styling, animations)
- [ ] Timeline activities clickable (needs hover states, visual feedback)

---

## Sign-Off Checklist

**Phase 3 is complete when:**

- [ ] Journal form: text + voice input working
- [ ] Journal history: entries display reverse-chronological
- [ ] Activity edit: modal opens, edits save, timeline refreshes
- [ ] Activity delete: confirms, removes, gaps recalculate
- [ ] No console errors (Network tab clean)
- [ ] All features work on Chrome, Edge (Safari if possible)
- [ ] Code committed to git with message "Phase 3: Journal & Activity Editing"
- [ ] Ready for Phase 4: Chat Analytics
- [ ] Ready for Phase 5: Design & Polish

---

## Quick Links & References

- **Phase 3 Plan:** PHASE-3-PLAN.md (full detail)
- **Phase 2 Reference:** PHASE-1-PLAN.md (for reused patterns)
- **Supabase Docs:** https://supabase.com/docs
- **React Docs:** https://react.dev
- **Web Speech API:** https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API

---

**Phase 3 is the mid-point. After this, you're 50% through the MVP. Design and chat analytics are next, then polish and ship.**
