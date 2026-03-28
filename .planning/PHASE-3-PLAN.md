# Phase 3 Plan: Journal & Activity Editing

**Phase Goal:** User can write/voice journal entries and edit parsed activities.

**Estimated Total Effort:** 4–5 hours
**Timeline:** Days 2–3 (2026-03-29 to 2026-03-30)
**Blocks:** Phase 5 (design polish)
**Depends on:** Phase 2 (timeline and parsed activities must exist)

---

## Summary

This phase adds two complementary features:
1. **Journal entries**: Text or voice input, no time association, reverse-chronological history
2. **Activity editing**: Click an activity in the timeline to edit name, duration, category; delete activity; timeline recalculates gaps automatically

Both features persist to Supabase and integrate with the authenticated session from Phase 1.

---

## Task Breakdown

### Task 3.1: Create Journal Entry Form Component

**Goal:** Build a functional journal entry form with text input and voice input option.

**Acceptance criteria:**
- [ ] Form component exists at `src/components/JournalForm.tsx`
- [ ] Text input field accepts multi-line input (textarea)
- [ ] Voice input button uses Web Speech API (reuse component from Phase 2 if available)
- [ ] Submit button sends entry to Supabase (`journal_entries` table)
- [ ] On submit success: form clears, new entry appears in journal history
- [ ] On submit error: user sees error message, form retains text
- [ ] Form shows character count or minimal UI feedback (no complex validation)
- [ ] Voice input transcription works (integrates with existing Web Speech API hook)

**Implementation steps:**

1. Create `src/components/JournalForm.tsx`:

```typescript
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useWebSpeechAPI } from '../hooks/useWebSpeechAPI'; // Reuse from Phase 2

export function JournalForm({ onEntryCreated }: { onEntryCreated: () => void }) {
  const user = useAuthStore((state) => state.user);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { isListening, transcript, startListening, stopListening, resetTranscript } = useWebSpeechAPI();

  const handleVoiceInput = () => {
    if (isListening) {
      stopListening();
      setText((prev) => prev + ' ' + transcript);
      resetTranscript();
    } else {
      startListening();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;

    setLoading(true);
    setError('');

    try {
      const { error: insertError } = await supabase
        .from('journal_entries')
        .insert([
          {
            user_id: user.id,
            text: text.trim(),
            created_at: new Date().toISOString(),
          },
        ]);

      if (insertError) throw insertError;

      setText('');
      onEntryCreated(); // Trigger journal history refresh
    } catch (err: any) {
      setError(err.message || 'Failed to save journal entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your thoughts here... or use the voice button below"
        rows={4}
        disabled={loading}
      />
      <div style={{ marginTop: '0.5rem' }}>
        <button
          type="button"
          onClick={handleVoiceInput}
          disabled={loading}
        >
          {isListening ? 'Stop Recording' : 'Start Voice Input'}
        </button>
        {transcript && <span> (Transcript: {transcript})</span>}
      </div>
      <button type="submit" disabled={loading || !text.trim()}>
        {loading ? 'Saving...' : 'Save Entry'}
      </button>
      {error && <div style={{ color: 'red', marginTop: '0.5rem' }}>{error}</div>}
    </form>
  );
}
```

2. Ensure `useWebSpeechAPI` hook exists from Phase 2. If not, create it:

```typescript
// src/hooks/useWebSpeechAPI.ts
import { useEffect, useState } from 'react';

const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;

export function useWebSpeechAPI() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognition = new SpeechRecognition();

  useEffect(() => {
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setTranscript((prev) => prev + ' ' + transcript);
        } else {
          interimTranscript += transcript;
        }
      }
    };

    return () => {
      recognition.abort();
    };
  }, []);

  return {
    isListening,
    transcript,
    startListening: () => recognition.start(),
    stopListening: () => recognition.stop(),
    resetTranscript: () => setTranscript(''),
  };
}
```

3. Integrate form into main App or a dedicated Journal page. Example in `src/pages/Journal.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { JournalForm } from '../components/JournalForm';
import { JournalHistory } from '../components/JournalHistory';

export function Journal() {
  const user = useAuthStore((state) => state.user);
  const [refreshKey, setRefreshKey] = useState(0);

  if (!user) return <div>Please log in to access journal</div>;

  return (
    <div>
      <h1>Journal</h1>
      <JournalForm onEntryCreated={() => setRefreshKey((k) => k + 1)} />
      <JournalHistory key={refreshKey} />
    </div>
  );
}
```

**Estimated effort:** 45 minutes

**Depends on:** Phase 2 (Web Speech API hook), Phase 1 (auth, Supabase client)

**Blocks:** Task 3.3 (layout/integration)

---

### Task 3.2: Create Journal History Component

**Goal:** Display all journal entries in reverse-chronological order with expandable/readable UI.

**Acceptance criteria:**
- [ ] Component exists at `src/components/JournalHistory.tsx`
- [ ] Fetches all journal entries for authenticated user from `journal_entries` table
- [ ] Entries displayed in reverse-chronological order (newest first)
- [ ] Shows: date, first 100 characters or snippet, full text on click/expand
- [ ] Expandable/collapsible for each entry (simple toggle, no animation required)
- [ ] Scrollable list (no pagination limit for MVP, but reasonable scroll performance)
- [ ] Delete button per entry (optional for MVP, can skip)
- [ ] Shows loading state while fetching
- [ ] Shows error message if fetch fails
- [ ] Automatically refreshes when new entry created (receives `key` prop to trigger re-fetch)

**Implementation steps:**

1. Create `src/components/JournalHistory.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface JournalEntry {
  id: string;
  text: string;
  created_at: string;
}

export function JournalHistory() {
  const user = useAuthStore((state) => state.user);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('journal_entries')
        .select('id, text, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setEntries(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load journal entries');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading journal...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;
  if (entries.length === 0) return <div>No journal entries yet. Start writing!</div>;

  return (
    <div>
      <h2>Journal History</h2>
      <div style={{ marginTop: '1rem' }}>
        {entries.map((entry) => (
          <div
            key={entry.id}
            style={{
              border: '1px solid #ccc',
              padding: '1rem',
              marginBottom: '1rem',
              borderRadius: '4px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong>{new Date(entry.created_at).toLocaleDateString()}</strong>
                <span style={{ marginLeft: '0.5rem', color: '#666' }}>
                  {new Date(entry.created_at).toLocaleTimeString()}
                </span>
              </div>
              <button
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0066cc' }}
              >
                {expandedId === entry.id ? 'Collapse' : 'Expand'}
              </button>
            </div>
            {expandedId === entry.id ? (
              <p style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>{entry.text}</p>
            ) : (
              <p style={{ marginTop: '0.5rem', color: '#666' }}>
                {entry.text.substring(0, 100)}
                {entry.text.length > 100 ? '...' : ''}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

2. Verify Supabase RLS policies allow read on journal_entries (should be from Phase 1).

3. Test in Journal page: entries should load, display in reverse-chronological order.

**Estimated effort:** 35 minutes

**Depends on:** Phase 1 (auth, Supabase client), Task 3.1 (form submission triggers history refresh)

**Blocks:** Task 3.3 (layout integration)

---

### Task 3.3: Create Activity Edit Modal/Form

**Goal:** Allow users to click an activity in the timeline and edit its properties (name, duration, category).

**Acceptance criteria:**
- [ ] Edit modal/form component exists at `src/components/ActivityEditForm.tsx`
- [ ] Modal accepts activity object (id, activity_name, duration_minutes, category, start_time)
- [ ] Form fields: activity_name (text), duration_minutes (number), category (text), start_time (datetime or manual adjustment)
- [ ] Submit button updates activity in `time_entries` table
- [ ] Cancel button closes modal without saving
- [ ] On submit success: modal closes, parent component triggers timeline refresh
- [ ] On submit error: error message displayed in modal
- [ ] Modal is accessible (ESC to close, focus management)
- [ ] Form validation: duration > 0, name not empty, start_time is valid

**Implementation steps:**

1. Create `src/components/ActivityEditForm.tsx`:

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

interface Props {
  activity: Activity;
  onClose: () => void;
  onSave: () => void;
}

export function ActivityEditForm({ activity, onClose, onSave }: Props) {
  const [name, setName] = useState(activity.activity_name);
  const [duration, setDuration] = useState(activity.duration_minutes);
  const [category, setCategory] = useState(activity.category);
  const [startTime, setStartTime] = useState(activity.start_time);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || duration <= 0) {
      setError('Name is required and duration must be greater than 0');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('time_entries')
        .update({
          activity_name: name.trim(),
          duration_minutes: parseInt(String(duration), 10),
          category: category.trim(),
          start_time: new Date(startTime).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', activity.id);

      if (updateError) throw updateError;

      onSave(); // Notify parent to refresh timeline
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update activity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'white',
      padding: '2rem',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      zIndex: 1000,
      minWidth: '300px',
    }}>
      <h2>Edit Activity</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label>Activity Name:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Duration (minutes):</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value, 10))}
            min="1"
            disabled={loading}
            required
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Category:</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g., work, personal, sleep"
            disabled={loading}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Start Time:</label>
          <input
            type="datetime-local"
            value={startTime.slice(0, 16)}
            onChange={(e) => setStartTime(e.target.value)}
            disabled={loading}
          />
        </div>

        {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>
          <button type="button" onClick={onClose} disabled={loading}>
            Cancel
          </button>
        </div>
      </form>

      {/* Modal backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: -1,
        }}
        onClick={onClose}
      />
    </div>
  );
}
```

2. Integrate into Timeline component (from Phase 2). Modify timeline to:
   - Make activities clickable
   - Pass activity data to edit form on click
   - Trigger timeline refresh on save

Example modification to timeline component:

```typescript
// In existing Timeline component, add state:
const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
const [timelineRefresh, setTimelineRefresh] = useState(0);

// Add click handler to activity list:
<div onClick={() => setEditingActivity(activity)}>
  {/* Activity display */}
</div>

// Add edit form render:
{editingActivity && (
  <ActivityEditForm
    activity={editingActivity}
    onClose={() => setEditingActivity(null)}
    onSave={() => {
      setTimelineRefresh((r) => r + 1);
      setEditingActivity(null);
    }}
  />
)}

// Use timelineRefresh key to re-fetch timeline
useEffect(() => {
  fetchTimelineActivities();
}, [timelineRefresh]);
```

**Estimated effort:** 50 minutes

**Depends on:** Phase 2 (Timeline component exists), Phase 1 (Supabase client)

**Blocks:** Task 3.5 (delete activity)

---

### Task 3.4: Create Activity Delete Function

**Goal:** Add ability to delete an activity from the timeline.

**Acceptance criteria:**
- [ ] Delete button appears in edit modal or timeline activity
- [ ] On delete: confirmation dialog (or simple confirm via JS alert for MVP)
- [ ] Activity removed from `time_entries` table
- [ ] Timeline refreshes after deletion
- [ ] User sees success message or activity disappears immediately
- [ ] On delete error: error message displayed

**Implementation steps:**

1. Add delete function to `src/utils/timelineUtils.ts` (or similar):

```typescript
import { supabase } from '../lib/supabase';

export async function deleteActivity(activityId: string): Promise<void> {
  const { error } = await supabase
    .from('time_entries')
    .delete()
    .eq('id', activityId);

  if (error) throw error;
}
```

2. Integrate delete button into ActivityEditForm:

```typescript
const handleDelete = async () => {
  if (!confirm('Are you sure you want to delete this activity?')) return;

  setLoading(true);
  setError('');

  try {
    const { error: deleteError } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', activity.id);

    if (deleteError) throw deleteError;

    onSave(); // Refresh timeline
    onClose();
  } catch (err: any) {
    setError(err.message || 'Failed to delete activity');
  } finally {
    setLoading(false);
  }
};

// Add delete button in form:
<button type="button" onClick={handleDelete} disabled={loading} style={{ color: 'red' }}>
  Delete Activity
</button>
```

3. Or add delete button directly in Timeline activity list (for quick delete without modal):

```typescript
<button
  onClick={async () => {
    if (confirm('Delete this activity?')) {
      await deleteActivity(activity.id);
      setTimelineRefresh((r) => r + 1);
    }
  }}
  style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}
>
  Delete
</button>
```

**Estimated effort:** 20 minutes

**Depends on:** Task 3.3 (edit form structure)

**Blocks:** Task 3.5 (timeline refresh)

---

### Task 3.5: Integrate Activities into Main Timeline & Test Gap Recalculation

**Goal:** Ensure edited and deleted activities properly refresh the timeline and gaps recalculate automatically.

**Acceptance criteria:**
- [ ] Timeline component refetches activities when edit/delete occurs
- [ ] Timeline re-renders with updated activity list
- [ ] Gap detection runs again after edits (gaps recalculate based on new activity times/durations)
- [ ] Timeline shows correct activities, durations, and gaps after all operations
- [ ] No stale data or UI inconsistencies
- [ ] Scrolling and list performance acceptable for 20+ activities per day

**Implementation steps:**

1. Ensure Timeline component has a refresh mechanism. Example:

```typescript
// In Timeline.tsx or parent component:
const [refreshKey, setRefreshKey] = useState(0);

useEffect(() => {
  fetchTimelineActivities();
}, [refreshKey]);

const handleActivitySaved = () => {
  setRefreshKey((k) => k + 1); // Triggers refetch
};
```

2. Pass `onActivitySaved` callback to ActivityEditForm:

```typescript
<ActivityEditForm
  activity={editingActivity}
  onClose={() => setEditingActivity(null)}
  onSave={handleActivitySaved}
/>
```

3. Verify gap recalculation logic in timeline (from Phase 2):

```typescript
// Pseudo-code for gap detection (should exist from Phase 2)
function calculateGaps(activities: Activity[]): Gap[] {
  const gaps = [];
  const sorted = activities.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    const currentEnd = new Date(current.start_time).getTime() + current.duration_minutes * 60 * 1000;
    const nextStart = new Date(next.start_time).getTime();

    if (nextStart > currentEnd) {
      const gapMinutes = (nextStart - currentEnd) / (60 * 1000);
      if (gapMinutes >= 15) { // Only flag gaps >= 15 min
        gaps.push({
          startTime: new Date(currentEnd),
          endTime: new Date(nextStart),
          durationMinutes: gapMinutes,
        });
      }
    }
  }
  return gaps;
}
```

4. Test scenario:
   - Create 3 activities: 7am (30min), 8am (60min), 10am (45min)
   - Edit middle activity to 120min (now 7am-9am, 8am-9am, 10am-10:45am)
   - Verify new gap calculation: 7am (30min) → gap 30-60min → 8am (120min, now runs 8am-10am) → no gap → 10am (45min)
   - Delete first activity
   - Verify: now starts at 8am with no preceding gap

**Estimated effort:** 30 minutes

**Depends on:** Task 3.3 (edit form), Task 3.4 (delete function), Phase 2 (timeline component exists)

**Blocks:** None (last feature task)

---

## Dependency Graph

```
Phase 1: Backend (Supabase, Auth)
    ↓
Phase 2: Timeline (Activities, Voice Parsing)
    ↓
Task 3.1: Journal Form ──→ Task 3.2: Journal History
    ↓                              ↓
Task 3.3: Edit Modal ──→ Task 3.4: Delete Activity ──→ Task 3.5: Timeline Integration
```

**Wave analysis:**
- **Wave 1 (independent):** Tasks 3.1 and 3.3 can start immediately (both depend on Phase 1 & 2, not on each other)
- **Wave 2:** Task 3.2 starts after 3.1 (journal form), Tasks 3.4-3.5 start after 3.3
- **Sequential within journal:** Form → History (UI completion)
- **Sequential within activities:** Edit → Delete → Integration (feature completion)

**Parallelization:** Journal and Activity features can run parallel, but recommend sequential (smaller overhead).

---

## Task Sizing & Effort Summary

| Task | Focus | Effort | Cumulative |
|------|-------|--------|-----------|
| 3.1: Journal Form | Form + voice input | 45 min | 45 min |
| 3.2: Journal History | Query & display list | 35 min | 80 min |
| 3.3: Edit Modal | Edit form, update DB | 50 min | 130 min |
| 3.4: Delete Activity | Delete function + confirm | 20 min | 150 min |
| 3.5: Timeline Integration | Refresh logic, gaps | 30 min | 180 min |
| **Total** | | **180 min (3 hours)** | — |

**Total time: 3 hours (well within 4–5 hour estimate). Buffer for debugging: 1–2 hours.**

---

## Technical Requirements & Assumptions

### Stack Reuse (from Phase 1 & 2)

- **Frontend:** React 18, Vite, Zustand for auth state
- **Backend:** Supabase (auth, RLS, tables)
- **APIs:** Web Speech API (voice input)
- **Environment:** Same `.env.local` from Phase 1

### Key Imports

All tasks import from existing modules:

```typescript
import { supabase } from '../lib/supabase'; // Phase 1
import { useAuthStore } from '../store/authStore'; // Phase 1
import { useWebSpeechAPI } from '../hooks/useWebSpeechAPI'; // Phase 2
```

### Web Speech API Compatibility

- Chrome, Edge, Safari: Supported
- Firefox: Limited support (may need fallback)
- Fallback: Disable voice button, force text-only

### Supabase RLS

Verify RLS policies from Phase 1 include:

- `journal_entries`: SELECT, INSERT, UPDATE, DELETE on user's own entries
- `time_entries`: SELECT, INSERT, UPDATE, DELETE on user's own entries

If missing, add:

```sql
create policy "Users can view their own journal entries"
on journal_entries for select using (auth.uid() = user_id);

create policy "Users can create their own journal entries"
on journal_entries for insert with check (auth.uid() = user_id);

create policy "Users can update their own journal entries"
on journal_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete their own journal entries"
on journal_entries for delete using (auth.uid() = user_id);

-- Time entries already have policies; verify they include UPDATE and DELETE
```

---

## Data Model Reference

### `journal_entries` table

```sql
id (UUID, PK)
user_id (UUID, FK → auth.users)
text (text, narrative content)
created_at (timestamp with time zone)
```

### `time_entries` table (from Phase 2)

```sql
id (UUID, PK)
user_id (UUID, FK → auth.users)
activity_name (text)
category (text)
duration_minutes (integer)
start_time (timestamp with time zone)
check_in_id (UUID, FK → check_ins, nullable)
created_at (timestamp with time zone)
updated_at (timestamp with time zone)
```

---

## Verification Checklist

### Journal Feature

- [ ] User can type text and submit journal entry
- [ ] Submitted entry appears in journal history (reverse-chronological)
- [ ] User can click "Expand" to read full text
- [ ] Voice input button works: records, transcribes, adds to text field
- [ ] Voice transcription correctly appends to existing text
- [ ] Error handling: network failure shows error message
- [ ] Form clears after successful submit
- [ ] Journal history shows correct date/time for each entry
- [ ] Entries persist after page refresh (localStorage + Supabase)

### Activity Editing Feature

- [ ] Timeline displays all activities from `time_entries`
- [ ] User can click an activity to open edit modal
- [ ] Edit form shows current activity data (name, duration, category, start time)
- [ ] User can change any field and submit
- [ ] Changes save to Supabase and timeline refreshes immediately
- [ ] Duration validation: prevents 0 or negative values
- [ ] Name validation: prevents empty names
- [ ] Delete button works: removes activity from timeline after confirmation
- [ ] Timeline gaps recalculate after edit/delete
- [ ] Example: if activity duration changes, adjacent gaps update correctly
- [ ] Modal closes on cancel (no changes saved)
- [ ] Error handling: failed update shows error message in modal

### Integration

- [ ] Journal form and history render together on a Journal page
- [ ] Timeline with edit capability integrates into main Dashboard/Home
- [ ] No console errors related to Supabase or React
- [ ] Performance acceptable with 20+ entries (scrolling smooth)
- [ ] Session persistence: log out and log back in, journal and activities still there

---

## Error Handling Strategy

### Network Errors

- **Scenario:** Supabase is down, network fails
- **Handling:** Display error message in form or modal, allow retry
- **Example:** "Failed to save entry. Please check your connection and try again."

### Voice Transcription Failures

- **Scenario:** Web Speech API fails or times out
- **Handling:** Show error, allow user to continue typing manually
- **Example:** "Voice input failed. You can type instead."

### RLS Policy Violations

- **Scenario:** User tries to edit/delete another user's activity (shouldn't happen, but edge case)
- **Handling:** Supabase returns 403 Forbidden, display "Unauthorized"
- **Fix:** Verify RLS policies include WHERE user_id = auth.uid() on all operations

### Validation Errors

- **Scenario:** User submits empty form or invalid duration
- **Handling:** Prevent submit, highlight invalid field
- **Example:** "Activity name is required" or "Duration must be greater than 0"

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Web Speech API fails silently** | Voice input doesn't work, user frustrated | Test voice on Day 1 (Phase 2). Plan text-only fallback. Provide clear error messages. |
| **RLS policies block activity updates** | User can't edit own activities; feature broken | Test update operation with authenticated user in Phase 1. Verify RLS includes UPDATE/DELETE. |
| **Gap recalculation is slow with many activities** | Timeline becomes sluggish, UX degrades | For MVP, assume < 50 activities per day. Optimize sort/filter if needed in Phase 5. |
| **User accidentally deletes important activity** | Data loss, user frustrated | Simple confirm() dialog is sufficient for MVP. No undo for MVP (add to Phase 7 backlog). |
| **Journal transcript is very long** | Performance issues, slow render | For MVP, assume < 10,000 characters per entry. Add pagination if needed post-MVP. |
| **Modal keyboard handling poor** | Accessibility issue, focus trap | Implement ESC to close, return focus to trigger button. Use semantic HTML (form, button). |
| **Timezone issues with start_time** | Activities show wrong time after edit | Always use ISO 8601 format with timezone. Test on different timezones (or test locally only for MVP). |

---

## Integration Points with Other Phases

### Phase 2 Dependencies

- **Timeline component** must exist (provides activity list for editing)
- **Web Speech API hook** must exist (reused for journal voice input)
- **Check-in flow** creates initial activities (Phase 3 edits them)

### Phase 5 Dependencies (Design Polish)

- All Phase 3 features provide functional UI → Phase 5 styles it
- Modal, form, buttons, list items all need custom CSS
- Journal card layout, typography, spacing
- Activity edit modal styling (currently placeholder)

### Phase 4 (Chat Analytics)

- Phase 3 edits activities → Chat queries the updated data
- No direct dependency, but chat should see latest activity names/durations

---

## Code Organization

```
src/
├── components/
│   ├── JournalForm.tsx          (Task 3.1)
│   ├── JournalHistory.tsx       (Task 3.2)
│   ├── ActivityEditForm.tsx     (Task 3.3)
│   └── Timeline.tsx             (from Phase 2, modified in Task 3.5)
├── pages/
│   ├── Journal.tsx              (wraps JournalForm + JournalHistory)
│   └── Dashboard.tsx            (wraps Timeline with edit integration)
├── hooks/
│   └── useWebSpeechAPI.ts       (from Phase 2, reused in 3.1)
├── utils/
│   └── timelineUtils.ts         (gap detection, delete utility)
├── lib/
│   └── supabase.ts              (from Phase 1)
└── store/
    └── authStore.ts             (from Phase 1)
```

---

## Testing Notes

### Local Testing Checklist

1. **Start dev server:** `npm run dev`
2. **Sign in** to app (from Phase 1 auth)
3. **Navigate to Journal page**
   - Type entry, submit → should appear in history
   - Test voice: click button, speak, button shows transcript
   - Verify entry persists on refresh
4. **Navigate to Timeline**
   - Ensure activities from Phase 2 are present
   - Click activity → edit modal opens
   - Edit name/duration, submit → timeline refreshes
   - Verify new data in modal before saving
   - Delete activity, confirm → disappears from timeline
   - Edit duration of activity, verify gap recalculates (check adjacent gaps)
5. **Test error cases**
   - Try submitting empty journal entry (button should be disabled)
   - Try editing activity with invalid duration (form should show error)
   - Turn off wifi, try submitting → should show network error

### Browser DevTools

- Open Network tab, watch for Supabase API calls
- Check for 201 (create), 200 (read), 200/204 (update), 204 (delete)
- Check Console for errors (should be clean)

---

## Success Criteria (End of Phase 3)

**Phase completion is verified when:**

- [ ] User can write text OR speak a journal entry
- [ ] Journal entries persist in Supabase and display reverse-chronological
- [ ] User can click an activity in the timeline to edit it
- [ ] Editing activity (name, duration, category, start time) saves to Supabase
- [ ] Timeline refreshes immediately after edit (no manual refresh needed)
- [ ] User can delete an activity with confirmation
- [ ] Timeline gaps recalculate after any edit/delete
- [ ] All operations handle errors gracefully (error messages shown)
- [ ] No console errors; Network tab shows correct status codes
- [ ] Feature works on Chrome, Edge, Safari (Web Speech API support verified)

---

## Next Steps (Phase 4)

Once Phase 3 is complete and verified:

1. Commit all changes to git:
   ```bash
   git add .
   git commit -m "Phase 3: Journal & Activity Editing (form, history, edit modal, delete)"
   ```

2. Begin Phase 4: Chat Analytics
   - Create chat interface (text input, send button)
   - Claude API integration: send user's time_entries + question
   - Persist chat messages to Supabase
   - Query last 30 days of time_entries for context

3. Prepare for Phase 5 (Design & Polish)
   - Functional phase 3 features are ready for styling
   - Collect UI/UX feedback on form, modal, list layouts

---

## Notes & Gotchas

1. **Voice input reuses Phase 2 hook:** Ensure `useWebSpeechAPI` is exported from Phase 2 (or copied to Phase 3).
2. **RLS policies are critical:** Without proper DELETE/UPDATE policies, edits will fail silently.
3. **Timezone handling:** Store all timestamps in UTC (ISO 8601). Display in local time using `toLocaleString()`.
4. **Modal backdrop click:** Clicking outside modal should close it (see ActivityEditForm example with position fixed backdrop).
5. **Form validation:** Simple client-side validation is sufficient for MVP. Supabase RLS provides server-side protection.
6. **No pagination needed:** For MVP, load all journal entries and activities in memory. Optimize later if needed.
7. **Delete confirmation:** Simple `confirm()` is fine for MVP. Nicer confirmation UI can be added in Phase 5.
8. **Gap recalculation:** Implement as function that runs every time timeline refreshes. No async caching needed for MVP.

---

## Phase 3 Complete

**Phase 3 delivers:**
- Functional journal entry form (text + voice input)
- Reverse-chronological journal history view
- Clickable timeline activities with edit modal
- Delete activity functionality
- Automatic gap recalculation

**All features persist to Supabase, integrate with Phase 1 auth, and are ready for Phase 5 styling.**

**Estimated completion:** 3 hours of development + 1-2 hours of testing & debugging = ~4-5 hours total (on track with roadmap).
