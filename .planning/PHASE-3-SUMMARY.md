# Phase 3: Journal & Activity Editing — Execution Summary

**Created:** 2026-03-28
**Phase Start:** 2026-03-29 (Day 2 of project)
**Phase End:** 2026-03-30 (Day 3 of project)
**Status:** Ready for execution

---

## What You're Building

### Feature 1: Journal Entries (Personal Narrative)

Users can write or speak journal entries without time association. All entries persist to Supabase and display in reverse-chronological order.

**Key user flow:**
1. Navigate to Journal page
2. Type or speak a journal entry ("Woke up thinking about the project...")
3. Click "Save Entry"
4. Entry appears in Journal History (newest first)
5. Can expand to read full text
6. All entries persist across sessions

**Why it matters:** Separates narrative reflection from time logging. Data (timeline) vs. reflection (journal) are distinct concerns.

---

### Feature 2: Activity Editing (Correct the Data)

Users can click any activity in the timeline to edit its name, duration, category, or start time. Can also delete activities. Timeline automatically recalculates gaps after changes.

**Key user flow:**
1. View Timeline (from Phase 2)
2. Click on an activity (e.g., "Breakfast")
3. Modal opens with fields to edit
4. Change duration from 30 min to 45 min
5. Click "Save" → activity updates, timeline refreshes
6. Adjacent gaps recalculate automatically

**Why it matters:** Parsed activities aren't perfect. Users need to correct inaccuracies and refine their timeline.

---

## Why Phase 3 Comes After Phase 2

**Dependency chain:**

```
Phase 1: Backend (Supabase, Auth, Schema)
    ↓
Phase 2: Voice Parsing (Creates timeline + activities)
    ↓
Phase 3: Editing (Refines the data + adds reflection)
    ↓
Phase 4: Chat Analytics (Queries the refined data)
    ↓
Phase 5: Design (Styles everything)
```

**Can't do Phase 3 first because:** Activities don't exist until Phase 2 runs. Phase 3 assumes the timeline is populated.

---

## Effort Breakdown

| Task | Duration | Cumulative | Focus |
|------|----------|-----------|-------|
| 3.1: Journal Form | 45 min | 45 min | Form + voice input |
| 3.2: Journal History | 35 min | 80 min | Query + display |
| 3.3: Edit Modal | 50 min | 130 min | Edit form + Supabase save |
| 3.4: Delete Activity | 20 min | 150 min | Delete + confirm |
| 3.5: Timeline Integration | 30 min | 180 min | Refresh + gap recalculation |
| **Testing & Debugging** | 60-90 min | 240-270 min | Edge cases + error handling |
| **Total** | **4-4.5 hours** | — | Ready by Day 3 |

---

## What You Need Before Starting

[ok] **Phase 1 Complete:**
- Supabase project created
- Database schema migrated (users, check_ins, time_entries, journal_entries, chat_messages)
- RLS policies enabled
- React app with auth working

[ok] **Phase 2 Complete:**
- Timeline component rendering activities from `time_entries`
- Web Speech API hook for voice input (`useWebSpeechAPI`)
- Activities stored in Supabase

[ok] **Environment Setup:**
- `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- `npm install` dependencies up to date
- Dev server runs without errors

[ok] **Understanding:**
- React hooks (useState, useEffect)
- Supabase query syntax (insert, select, update, delete)
- How RLS policies work (per-user data isolation)

---

## Files You'll Create

### New Components

```
src/components/JournalForm.tsx          ← Form with text + voice
src/components/JournalHistory.tsx       ← List of entries (newest first)
src/components/ActivityEditForm.tsx     ← Modal to edit activity
src/pages/Journal.tsx                   ← Page wrapper for form + history
src/hooks/useWebSpeechAPI.ts            ← Voice input (if not from Phase 2)
src/utils/timelineUtils.ts              ← Helper: delete, gap calculation
```

### Files You'll Modify

```
src/components/Timeline.tsx             ← Add click handler + edit modal state
src/App.tsx                             ← Add Journal page route
```

### No changes needed

```
.env.local                              ← Already set from Phase 1
src/lib/supabase.ts                     ← Already configured
src/store/authStore.ts                  ← Already working
```

---

## Task Execution Order

**Start Task 3.1:** Create JournalForm (form + voice input)

- Write form component with textarea
- Integrate Web Speech API hook (reuse from Phase 2)
- Handle submit → insert into `journal_entries` table
- Call `onEntryCreated` callback to refresh history

**Then Task 3.2:** Create JournalHistory (display entries)

- Write component that queries `journal_entries` for authenticated user
- Sort by `created_at DESC` (newest first)
- Make entries expandable (click to see full text)
- Show snippets (first 100 chars) by default

**Then Task 3.3:** Create ActivityEditForm (edit modal)

- Write form with fields: name, duration, category, start_time
- Handle submit → update `time_entries` row
- Call `onSave` callback to trigger timeline refresh
- Make modal accessible (ESC to close, backdrop click)

**Then Task 3.4:** Add Delete Activity (button in modal)

- Add delete button to edit modal
- Show `confirm()` dialog before delete
- Call Supabase delete on `time_entries`
- Trigger timeline refresh via `onSave`

**Then Task 3.5:** Integrate & Test (timeline refresh + gaps)

- Wire edit modal to Timeline component (make activities clickable)
- Add refresh trigger: when activity is saved, refetch timeline
- Verify gap recalculation logic runs after each edit/delete
- Test full workflows

**Then Test:** Run through all scenarios

- Create journal entry (text), verify persists
- Create journal entry (voice), verify transcript appends
- Edit activity duration, verify timeline updates
- Delete activity, verify gaps recalculate
- Test error cases (empty form, invalid duration, network failure)

---

## Key Technical Decisions (Already Made)

| Decision | Impact | Status |
|----------|--------|--------|
| **Journal has no time association** | Simplifies data model; text-only, no datetime field | LOCKED |
| **Voice input uses Web Speech API** | Reuses Phase 2 hook; not perfect but free | LOCKED |
| **Activity editing via modal** | Simple modal > sidebar or inline editing for MVP | LOCKED |
| **Delete requires confirmation** | `confirm()` dialog prevents accidental loss | LOCKED |
| **Gaps recalculate automatically** | No manual "recalculate" button; happens on refresh | LOCKED |
| **No pagination on journal history** | Load all entries upfront; optimize later if needed | LOCKED |
| **No undo for deleted activities** | Not in MVP scope; add to Phase 7 backlog | LOCKED |

---

## What Success Looks Like

### By End of Phase 3

- **User perspective:**
  - Can write or speak journal reflections anytime
  - Journal history shows all past entries (newest first)
  - Can click any activity to edit its details
  - Can delete activities (with confirmation)
  - All changes save to Supabase and persist across sessions
  - Timeline automatically recalculates gaps when activities change

- **Developer perspective:**
  - 2-3 new React components (Form, History, Edit Modal)
  - ~500 lines of code (including form logic + Supabase queries)
  - All Supabase operations use RLS (user can only access own data)
  - No console errors; Network tab shows proper status codes
  - Code is readable, with clear separation between UI and business logic

- **Quality gates:**
  - [ ] All CRUD operations (Create/Read/Update/Delete) work on both tables
  - [ ] Form validation prevents invalid submissions
  - [ ] Error handling shows user-friendly messages
  - [ ] Voice transcription works (or falls back to text input)
  - [ ] Tested on Chrome and Edge (Safari if possible)
  - [ ] Code committed with clean git history

---

## Common Pitfalls & How to Avoid Them

### Pitfall 1: RLS Blocks Activity Updates

**Symptom:** "Edit button works but changes don't save. Network shows 403."

**Fix:** Verify RLS policy on `time_entries` has UPDATE permission.

```sql
-- Check if policy exists:
SELECT * FROM pg_policies WHERE tablename = 'time_entries';

-- If missing, add:
create policy "Users can update their own time entries"
on time_entries for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

### Pitfall 2: Timeline Doesn't Refresh After Edit

**Symptom:** "I edit an activity, modal closes, but timeline shows old data."

**Fix:** Ensure `onSave` callback triggers a refetch.

```typescript
// In parent Timeline component:
const [refreshKey, setRefreshKey] = useState(0);

useEffect(() => {
  fetchTimelineActivities(); // Runs when refreshKey changes
}, [refreshKey]);

// In ActivityEditForm:
onSave={() => setRefreshKey(k => k + 1)}
```

### Pitfall 3: Voice Input Never Initialized

**Symptom:** "Voice button doesn't do anything. No console errors."

**Fix:** Ensure `useWebSpeechAPI` hook is imported and `SpeechRecognition` is available in browser.

```typescript
// At top of component:
const { isListening, transcript, startListening, stopListening } = useWebSpeechAPI();

// If hook is missing, create it from Phase 2 or copy the implementation
```

### Pitfall 4: Form Validation Too Strict

**Symptom:** "User can't submit form even with valid data."

**Fix:** Check form validation logic. Common mistakes:

```typescript
// BAD: Rejects if text is exactly "x characters"
if (text.length !== 10) { /* error */ }

// GOOD: Rejects if text is empty or only whitespace
if (!text.trim()) { /* error */ }

// BAD: Rejects if duration is 0 (might be valid for very short tasks)
if (duration === 0) { /* error */ }

// GOOD: Rejects only negative or non-numeric
if (duration <= 0) { /* error */ }
```

### Pitfall 5: Timezone Issues with Start Time

**Symptom:** "I edit start time, it saves correctly, but displays wrong time zone."

**Fix:** Always use ISO 8601 format with timezone info.

```typescript
// BAD: Loses timezone
const startTime = '2026-03-29 10:00';

// GOOD: Preserves timezone
const startTime = new Date('2026-03-29T10:00:00').toISOString();
// Result: '2026-03-29T10:00:00Z' or local equivalent

// Display in local time:
new Date(startTime).toLocaleString();
```

---

## Debugging Workflow

**Something doesn't work? Follow this:**

1. **Is the code even running?**
   - Add `console.log()` to verify function is called
   - Check browser DevTools Console tab for errors

2. **Is Supabase returning data?**
   - Open Network tab in DevTools
   - Look for request to `api.supabase.co`
   - Check response status (201 for insert, 200 for select/update, 204 for delete)
   - If 4xx/5xx, read error message carefully

3. **Is RLS blocking it?**
   - If you see 403 Forbidden, it's an RLS policy issue
   - Verify policy using Supabase dashboard → Authentication → Policies
   - Check that policy includes the operation you're trying (SELECT, INSERT, UPDATE, DELETE)

4. **Is state updating correctly?**
   - Use React DevTools to inspect component state
   - Verify `setState` calls are happening
   - Check useEffect dependencies (should they trigger?

5. **Is the UI actually reflecting the change?**
   - Did the component re-render? (check DevTools React tab)
   - Is there a key/id issue preventing re-render?
   - Try hard refresh (Ctrl+Shift+R) to clear browser cache

---

## Handoff Checklist

**Before moving to Phase 4, verify:**

- [ ] All 5 tasks completed (Form, History, Edit, Delete, Integration)
- [ ] Journal entries persist to Supabase
- [ ] Activities can be edited and changes save
- [ ] Activities can be deleted with confirmation
- [ ] Timeline refreshes automatically after edit/delete
- [ ] Gaps recalculate correctly
- [ ] No console errors in DevTools
- [ ] Code is committed to git
- [ ] Ready for Phase 4 (Chat Analytics)

---

## Next Phase: Phase 4 (Chat Analytics)

**Phase 4 assumes Phase 3 is done.** It will:

1. Query your `time_entries` table (now with Phase 3 edits included)
2. Send activities to Claude API with user's question
3. Get back a natural language answer
4. Display in a chat interface
5. Persist Q&A to `chat_messages` table

**What Phase 4 needs from you:**
- Activities in `time_entries` table are accurate (thanks to Phase 3 editing)
- All Supabase queries working (you've tested them)
- Authentication still working (nothing changed)

---

## Resources & Links

**Supabase Documentation:**
- Insert/Update/Delete: https://supabase.com/docs/reference/javascript/insert
- RLS Policies: https://supabase.com/docs/guides/auth/row-level-security
- Web Queries: https://supabase.com/docs/reference/javascript/select

**React Documentation:**
- Hooks: https://react.dev/reference/react/hooks
- State: https://react.dev/learn/state-a-components-memory
- Effects: https://react.dev/reference/react/useEffect

**Web APIs:**
- Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- datetime-local input: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/datetime-local

**Prohairesis Docs:**
- Full Plan: PHASE-3-PLAN.md
- Quick Reference: PHASE-3-QUICK-REFERENCE.md
- Architecture: PROJECT.md
- Requirements: REQUIREMENTS.md

---

## Key Reminders

[tgt] **Keep it simple:** MVP first, polish later. Basic modal > fancy animated sidebar.

[tgt] **Test as you go:** Build one task, test it before moving to the next. Don't build all 5 tasks then discover task 1 broke something.

[tgt] **RLS is your security:** Don't bypass it. It ensures users can only access their own data.

[tgt] **Voice input is nice-to-have:** If it's broken on your browser, text input alone is enough for MVP. Add voice fallback handling.

[tgt] **Gaps are auto-calculated:** You don't need to manually recalculate them. Just refetch the timeline and re-run the gap detection logic.

[tgt] **No perfectionism:** The goal is functional, not pixel-perfect. Design polish is Phase 5.

---

## You're Halfway There

Phase 1 [OK] (Backend setup)
Phase 2 [OK] (Voice + timeline)
**Phase 3 [run] (Editing + journal) ← YOU ARE HERE**
Phase 4 (Chat analytics)
Phase 5 (Design)
Phase 6 (Test + deploy)

By the end of Phase 3, you have a complete, functional data entry and editing system. It won't look pretty yet, but it will work.

**Time to build. Let's go.**

---

**Questions?** Refer to PHASE-3-PLAN.md for detailed task-by-task instructions, or PHASE-3-QUICK-REFERENCE.md for code snippets and debugging tips.
