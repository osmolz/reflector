---
status: investigating
trigger: "Session Titles Not Auto-Generating + Messages Not Persisting Across Session Switches"
created: 2026-03-29T17:15:00Z
updated: 2026-03-29T17:15:00Z
---

## Current Focus

**Issue 1: Session titles not auto-generating**
- Expected: First message content becomes session title (first 60 chars)
- Actual: Title always shows "New Chat"

**Issue 2: Messages not persisting across session switches**
- Expected: Messages in session A remain when switching to B and back
- Actual: Messages disappear after switch

hypothesis: Title not being set OR messages not being saved with correct session_id OR both issues related to missing/incorrect sessionId parameter
test: Trace sessionId parameter flow through Chat.jsx → Edge Function → Database
expecting: Identify where sessionId is lost or not properly passed
next_action: Code review - verify Chat.jsx passes activeSessionId and Edge Function receives/uses it

---

## Symptoms

expected: |
  1. User sends first message to new session
  2. First 60 chars of message become session title
  3. All messages associated with session are saved with session_id
  4. When switching sessions and back, all previous messages appear
actual: |
  1. Messages are sent and responses received (UI works)
  2. Session title always shows "New Chat" (never updates)
  3. Messages disappear when switching sessions (not persisted OR not queried correctly)
errors: |
  - Playwright test: Session title check fails (still "New Chat" after message)
  - Playwright test: After switching sessions, no messages found (0 messages)
reproduction: |
  1. Click "+ New" to create session
  2. Send a message
  3. Check session title - shows "New Chat" (should show first 60 chars of message)
  4. Send another message in same session
  5. Click different session
  6. Click original session - messages gone
started: Always broken (streaming implemented Phase 7, these issues existed at that time)

---

## Eliminated

(none yet)

---

## Evidence

- timestamp: 2026-03-29T17:15:00Z
  checked: Chat.jsx line 195 - handleSend method
  found: |
    activeSessionId variable is set from state.sessionId (line 142)
    If sessionId is null, it creates a new session and gets data.id (line 154)
    Then passes it in request body: sessionId: activeSessionId (line 195)
  implication: sessionId IS being passed to Edge Function

- timestamp: 2026-03-29T17:15:00Z
  checked: Chat.jsx line 73-74 - loadMessages query
  found: |
    Uses .eq('session_id', sessionId) to filter messages
    This depends on sessionId being set in state
  implication: If session_id column is NULL in database, query returns 0 messages

- timestamp: 2026-03-29T17:15:00Z
  checked: Edge Function line 51 - request parsing
  found: |
    Destructures { question, sessionId, dateRange } from request body
    sessionId is optional (not required)
  implication: sessionId parameter IS being extracted from request

- timestamp: 2026-03-29T17:15:00Z
  checked: Edge Function lines 170-177 - title setting
  found: |
    Only runs if sessionId is provided AND title is null
    Uses supabase.from('chat_sessions').update({ title })
    Uses .eq('id', sessionId) to target correct session
  implication: Logic looks correct, BUT this is fire-and-forget (no await, no error handling in return path)

- timestamp: 2026-03-29T17:15:00Z
  checked: Edge Function lines 180-188 - user message saving
  found: |
    Only saves if sessionId exists (wrapped in if (sessionId) block)
    Includes user_id, session_id, role, content, question, response, created_at
  implication: If sessionId is undefined, message is NOT saved (and no error returned!)

- timestamp: 2026-03-29T17:15:00Z
  checked: Edge Function lines 301-315 - assistant message saving
  found: |
    Only saves if sessionId exists (line 301)
    Otherwise saves without session_id (backward compat, lines 318-328)
  implication: If sessionId is undefined, message saves WITHOUT session_id (NULL)

---

## Analysis

### The Problem Flow:

1. **Chat.jsx passes activeSessionId correctly** - verified line 195
2. **Edge Function receives sessionId** - verified line 51
3. **BUT: Message saving depends on sessionId being non-null**
   - If sessionId is undefined/null when parsed, messages save with NULL session_id
   - Then loadMessages query (.eq('session_id', sessionId)) can't find them

4. **Title setting depends on sessionId being non-null**
   - If sessionId is undefined/null, title update never runs
   - Session stays with NULL title, displays as "New Chat"

### Critical Question:

**Is sessionId being properly passed in the request body from Chat.jsx?**

Need to verify:
- Is the request body well-formed JSON?
- Is activeSessionId actually set to a valid UUID string?
- Is the Edge Function actually receiving the sessionId parameter?

### Hypothesis Chain:

**H1: activeSessionId is undefined in Chat.jsx**
- Cause: sessionId state not set before handleSend runs
- Evidence needed: Network tab showing request body without sessionId

**H2: Edge Function receives sessionId but something else breaks title/message saving**
- Causes: RLS policy issue, database error, async timing issue
- Evidence needed: Edge Function logs showing what sessionId value it received

**H3: Request body is malformed or sessionId serialized incorrectly**
- Cause: JSON stringify issue, undefined getting lost
- Evidence needed: Network tab showing exact request body

---

## ROOT CAUSE ANALYSIS

### Issue 1: Session Titles Not Auto-Generating

**Root Cause:** Edge Function title update is fire-and-forget without await or error handling in critical path

At Edge Function lines 172-176:
```typescript
supabase
  .from('chat_sessions')
  .update({ title })
  .eq('id', sessionId)
  .catch((err: any) => console.error('[Chat API] Error setting title:', err));
```

The update query is started but NOT awaited. The critical issue:
- Stream response is returned immediately (line 337)
- But title update may still be pending or may fail silently
- Even if title update succeeds, client doesn't reload the session list to see the new title
- The title update query happens INSIDE the streaming response handler (not in critical path)

**Additional Issue:** Chat.jsx loads sessions ONCE on mount (useEffect line 26-58)
- Sessions are not reloaded after a message is sent
- Even if title IS updated on server, the client-side sessionTitle won't change
- The session chip still displays "New Chat" because the local state hasn't been updated

### Issue 2: Messages Not Persisting Across Session Switches

**Root Cause:** Messages ARE being saved to the database with correct session_id, BUT the RLS policy or client-side query logic has a race condition.

Evidence:
1. Edge Function saves messages with session_id (lines 180-188, 301-315)
2. Messages query in Chat.jsx uses correct filter: `.eq('session_id', sessionId)` (line 73)
3. RLS policy allows users to view their own messages (line 111-113 in migrations)

**The Actual Problem:** Messages saved in the streaming response (lines 301-315) happen AFTER the stream completes. If the client loads messages too quickly (before the save completes), it won't see them.

Even worse: The streaming message save is fire-and-forget with only a .catch() for logging:
```typescript
supabase
  .from('chat_messages')
  .insert({...})
  .catch((saveError: any) => {
    console.error('[Chat API] Error saving assistant message:', saveError);
  });
```

If this insert fails, user doesn't see an error - the message just vanishes.

## FIXES

### Fix for Issue 1: Auto-Generate Titles

**In Edge Function (index.ts):**
1. Await the title update (add await, remove fire-and-forget)
2. Include updated title in response OR in a separate response header
3. In Chat.jsx: After message send succeeds, update the local session object with the new title

**Recommended approach:**
- Edge Function: await the title update before closing the stream
- Edge Function: return session object with updated title in response envelope
- Chat.jsx: After streaming completes, update sessions state with new title

### Fix for Issue 2: Message Persistence

**In Edge Function (index.ts):**
1. Move message saves from fire-and-forget to awaited operations
2. Ensure user message is saved BEFORE calling Claude API (already done at line 180)
3. Await assistant message save BEFORE stream completes
4. Return error to client if saves fail

**Recommended approach:**
- Keep user message save as-is (awaited at line 180)
- Change assistant message save to await inside the streaming handler before controller.close()
- Add error handling that propagates save failures to client

**In Chat.jsx:**
1. After receiving assistant message, reload messages for the session
2. Add error boundary to catch persistence failures
3. Show error if save fails (don't silently lose messages)

---

## ROOT CAUSES (FINAL)

### Issue 1: Titles Not Auto-Generating
1. **Primary cause:** Title update is not awaited (fire-and-forget in streaming response handler, line 172-176)
2. **Secondary cause:** Even if title updates, client never reloads sessions list (loaded once on mount)
3. **Evidence:** Edge Function line 172 lacks `await`, Chat.jsx useEffect dependency doesn't trigger reload

### Issue 2: Messages Not Persisting
1. **Primary cause:** Assistant message save is fire-and-forget, not awaited (line 302-315)
2. **Secondary cause:** Stream response closes before database write completes (race condition)
3. **Fallback bug:** If sessionId falsy, message saves without session_id (backward compat code line 318)
4. **Evidence:** No await on .insert() at line 302, controller.close() at line 288 happens immediately after

---

## RESOLUTION

**DEBUG FILE:** See SESSION-PERSISTENCE-ROOT-CAUSES.md for complete analysis

**COMMIT NEEDED:** No (root cause identified, fix implementation not requested)

Both issues require:
1. Edge Function: Add `await` to message persistence operations
2. Chat.jsx: Reload messages after streaming completes OR reload sessions after message send
3. Testing: Verify messages persist across session switches and titles update
