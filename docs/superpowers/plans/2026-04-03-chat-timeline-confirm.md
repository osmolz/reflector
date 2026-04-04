# Chat timeline confirmation + unified save — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface chat timeline previews in the UI with Save/Cancel, persist only via an edge function shared with Log, and remove model-driven timeline commits.

**Architecture:** Extract `saveTimelineCheckIn` into `supabase/functions/_shared/save-timeline-checkin.ts`. Add `supabase/functions/save-check-in/index.ts` (JWT via `getUser`, then shared save). Chat stream emits `timeline_preview_pending` SSE after successful `preview_timeline_from_text`. `Chat.tsx` holds pending state and embeds `ActivityReview` in a modal. VoiceCheckIn calls `save-check-in` instead of direct inserts. Remove `commit_timeline_activities` from `TOOL_DEFINITIONS` and `executeTool`.

**Tech stack:** Supabase Edge (Deno), React (`Chat.tsx`, `VoiceCheckIn.jsx`, `ActivityReview.jsx`), existing Anthropic chat loop in `supabase/functions/chat/index.ts`.

---

## File map

| File | Responsibility |
|------|------------------|
| `supabase/functions/_shared/save-timeline-checkin.ts` | **Create** — normalize activities, insert `check_ins` + `time_entries` |
| `supabase/functions/save-check-in/index.ts` | **Create** — HTTP handler, CORS, auth, call shared save |
| `supabase/functions/chat/tools.ts` | **Modify** — delete commit tool + `commitTimelineActivities`; import shared only if preview needs nothing from it (preview stays) |
| `supabase/functions/chat/index.ts` | **Modify** — after tool batch, emit `timeline_preview_pending` for successful previews |
| `supabase/functions/chat/types.ts` | **Modify** — extend `SSEEvent` with `timeline_preview_pending` |
| `supabase/functions/chat/system-prompt.ts` | **Modify** — timeline instructions: UI Save only, no commit tool |
| `supabase/config.toml` | **Modify** — `[functions.save-check-in]` if required by project convention |
| `src/lib/saveTimelineCheckIn.js` | **Create** — `fetch` wrapper for `save-check-in` |
| `src/components/VoiceCheckIn.jsx` | **Modify** — `handleSaveActivities` uses lib instead of inline inserts |
| `src/components/Chat.tsx` | **Modify** — SSE handler, state, modal + `ActivityReview`, refresh callback |
| Parent of Chat (e.g. `App.tsx` or route) | **Modify** only if `onActivitiesSaved` must reach Chat — wire same refresh as Log |

---

### Task 1: Shared save module

**Files:**

- Create: `supabase/functions/_shared/save-timeline-checkin.ts`
- Modify: `supabase/functions/chat/tools.ts` (remove duplicate logic after Task 1 is consumed by save-check-in — defer removal to Task 2–3)

- [ ] **Step 1: Add shared module**

Move the core of today’s `commitTimelineActivities` (normalize → check_in insert → time_entries insert → return ids) into:

```typescript
// supabase/functions/_shared/save-timeline-checkin.ts
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.1'
import { inferredTimeToIso } from './inferred-time-to-iso.ts'
import { normalizeActivities } from './parse-transcript-activities.ts'

export type SaveTimelineCheckInResult = { check_in_id: string; entries_created: number }

export async function saveTimelineCheckIn(
  supabase: SupabaseClient,
  userId: string,
  transcript: string,
  rawActivities: unknown[],
): Promise<SaveTimelineCheckInResult> {
  const normalized = normalizeActivities(rawActivities)
  if (normalized.length === 0) {
    throw new Error('PARSE_OUTPUT_INVALID: No valid activities to save.')
  }
  const trimmedTranscript = transcript.trim() || '(from app)'
  const now = new Date().toISOString()

  const { data: checkInData, error: checkInError } = await supabase
    .from('check_ins')
    .insert([
      {
        user_id: userId,
        transcript: trimmedTranscript,
        parsed_activities: normalized,
        created_at: now,
      },
    ])
    .select('id')
    .single()

  if (checkInError) throw new Error(checkInError.message)
  if (!checkInData?.id) throw new Error('Failed to create check-in record.')

  const checkInId = checkInData.id as string

  const timeEntries = normalized.map((activity) => ({
    user_id: userId,
    activity_name: activity.activity,
    duration_minutes: activity.duration_minutes,
    category: activity.category ?? null,
    start_time: inferredTimeToIso(activity.start_time_inferred),
    check_in_id: checkInId,
    created_at: now,
    updated_at: now,
  }))

  const { error: entriesError } = await supabase.from('time_entries').insert(timeEntries)
  if (entriesError) throw new Error(entriesError.message)

  return { check_in_id: checkInId, entries_created: normalized.length }
}
```

Adjust imports/paths to match existing `_shared` filenames exactly.

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/save-timeline-checkin.ts
git commit -m "refactor(edge): extract shared saveTimelineCheckIn for check-ins"
```

---

### Task 2: save-check-in edge function

**Files:**

- Create: `supabase/functions/save-check-in/index.ts`
- Modify: `supabase/config.toml`

- [ ] **Step 1: Implement handler** (mirror `chat/index.ts` auth: `createClient` with service role + `getUser(token)`; reject if no user).

Request body:

```typescript
interface Body {
  transcript: string
  activities: unknown[]
}
```

On success return JSON `{ check_in_id, entries_created }` with 200. On validation error 400; 401 unauthorized.

- [ ] **Step 2: Register function** in `supabase/config.toml`:

```toml
[functions.save-check-in]
verify_jwt = true
```

(If the project uses `verify_jwt = false` for others, match local dev docs — align with `parse`/`chat`.)

- [ ] **Step 3: Deploy / local test**

Run: `npx supabase functions serve save-check-in` (or project’s documented command) and `curl` with Bearer token and sample activities.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/save-check-in/index.ts supabase/config.toml
git commit -m "feat(edge): add save-check-in function using shared timeline save"
```

---

### Task 3: Remove commit tool; wire tools.ts

**Files:**

- Modify: `supabase/functions/chat/tools.ts`

- [ ] **Step 1: Delete** `commit_timeline_activities` from `TOOL_DEFINITIONS`.

- [ ] **Step 2: Remove** `case 'commit_timeline_activities'` and the old `commitTimelineActivities` function body (replaced by shared module used only from `save-check-in`).

- [ ] **Step 3: Remove unused imports** (`inferredTimeToIso` if no longer used in this file).

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/chat/tools.ts
git commit -m "fix(chat): remove commit_timeline_activities; saves go through save-check-in only"
```

---

### Task 4: SSE `timeline_preview_pending`

**Files:**

- Modify: `supabase/functions/chat/types.ts`
- Modify: `supabase/functions/chat/index.ts`

- [ ] **Step 1: Extend SSE union** in `types.ts`:

```typescript
// Add to SSEEvent discriminated union:
| {
    type: 'timeline_preview_pending'
    source_text: string
    activities: unknown[]
  }
```

Use the app’s existing `ParsedActivity`-like shape in comments if you add TypeScript types for activities.

- [ ] **Step 2: After `Promise.all` on tool execution** in `index.ts`, loop `i = 0..toolUseBlocks.length-1`:

  - `block = toolUseBlocks[i]`
  - Parse `toolResults[i].content` as JSON (tool result payload).
  - If `block.name === 'preview_timeline_from_text'` and parsed `status === 'ok'` and `parsed.data?.activities` is a non-empty array, `emit({ type: 'timeline_preview_pending', source_text: String(block.input?.text ?? ''), activities: parsed.data.activities })`.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/chat/types.ts supabase/functions/chat/index.ts
git commit -m "feat(chat): emit timeline_preview_pending SSE after preview tool"
```

---

### Task 5: System prompt

**Files:**

- Modify: `supabase/functions/chat/system-prompt.ts`

- [ ] **Step 1: Edit `TIMELINE_FROM_CHAT` and `CAPABILITIES`** so the flow is: call preview tool → describe in prose → user confirms in the **app** (Save). Explicitly state there is **no** server-side commit tool; saving happens when the user uses the confirmation UI.

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/chat/system-prompt.ts
git commit -m "docs(chat): timeline saves only via UI after preview"
```

---

### Task 6: Client `saveTimelineCheckIn` helper

**Files:**

- Create: `src/lib/saveTimelineCheckIn.js`

- [ ] **Step 1: Implement**

```javascript
export async function saveTimelineCheckIn(authToken, transcript, activities) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('App misconfigured: missing Supabase URL or anon key')
  }
  const res = await fetch(`${supabaseUrl}/functions/v1/save-check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({ transcript, activities }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || data.message || `Save failed (${res.status})`)
  }
  return data
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/saveTimelineCheckIn.js
git commit -m "feat(client): add saveTimelineCheckIn for edge save-check-in"
```

---

### Task 7: VoiceCheckIn uses helper

**Files:**

- Modify: `src/components/VoiceCheckIn.jsx`

- [ ] **Step 1: Replace** the body of `handleSaveActivities` (the `check_ins` + `time_entries` direct inserts) with:

```javascript
import { saveTimelineCheckIn } from '../lib/saveTimelineCheckIn'

// inside handleSaveActivities, after auth check:
const { data: { session } } = await supabase.auth.getSession()
if (!session?.access_token) throw new Error('Not authenticated')
await saveTimelineCheckIn(session.access_token, transcript.trim(), activities)
```

Keep existing loading/error/stage/`onActivitiesSaved` behavior.

- [ ] **Step 2: Remove** now-unused helpers if `parseTimeString` is only used for inserts — if still used elsewhere in file, keep.

- [ ] **Step 3: Commit**

```bash
git add src/components/VoiceCheckIn.jsx
git commit -m "refactor(log): save timeline via save-check-in edge function"
```

---

### Task 8: Chat UI — pending preview + ActivityReview

**Files:**

- Modify: `src/components/Chat.tsx`
- Modify: parent that renders Chat (only if needed for `onActivitiesSaved`)

- [ ] **Step 1: State** — e.g. `pendingTimelinePreview: null | { sourceText: string; activities: unknown[] }`. On `timeline_preview_pending` SSE, **set** (replace) this object.

- [ ] **Step 2: Render** — when non-null, show modal/overlay containing:

  - `ActivityReview` with `activities={pendingTimelinePreview.activities}`, `isLoading={false}`, `onSave={async (edited) => { await saveTimelineCheckIn(...); clear pending; notify refresh }}`, `onDiscard={() => clear pending}`.

  - Pass `transcript` to save as `pendingTimelinePreview.sourceText`.

- [ ] **Step 3: Refresh** — call the same callback used when Log saves (lift `onActivitiesSaved` into Chat props or use a small store/event if already present).

- [ ] **Step 4: Styling** — use existing design tokens / modal patterns; ensure focus trap for accessibility.

- [ ] **Step 5: Commit**

```bash
git add src/components/Chat.tsx
git commit -m "feat(chat): timeline preview confirmation with ActivityReview save"
```

---

### Task 9: Verification

- [ ] **Step 1: Typecheck / lint** (project script, e.g. `npm run build` or `npm run lint`).

- [ ] **Step 2: Manual**

  - Log page: parse → review → Save → timeline shows entries.
  - Chat: “Yesterday 10–11 I did X, log it” → preview card → Save → DB + dismiss.
  - Cancel → no new rows.

- [ ] **Step 3: Commit** any small fixes.

---

## Spec coverage check

| Spec section | Task |
|--------------|------|
| Single save path | Tasks 1–2, 3, 6–7 |
| SSE pending payload | Task 4 |
| Model does not commit | Tasks 3, 5 |
| Chat UI save/dismiss | Task 8 |
| Red-team (replace pending, auth) | Tasks 2, 4, 8 |
| VoiceCheckIn alignment | Task 7 |

## Plan self-review

- No TBD/TODO placeholders in tasks above.
- Types: `activities` stays `unknown[]` until normalized on server; client passes through ActivityReview shape matching Log.

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-03-chat-timeline-confirm.md`. Two execution options:**

**1. Subagent-driven (recommended)** — Fresh subagent per task, review between tasks.

**2. Inline execution** — Run tasks in this session with batch checkpoints.

Which approach do you want?
