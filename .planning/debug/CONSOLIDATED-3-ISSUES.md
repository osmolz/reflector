---
status: investigating
trigger: "Three critical issues detected by Playwright tests: streaming blocks, session titles not auto-generating, messages not persisting"
created: 2026-03-29T17:00:00Z
updated: 2026-03-29T17:00:00Z
---

## Current Focus

**CRITICAL: Three independent bugs found. Triage order:**
1. **Streaming block arrival** (Issue #1) - Already has active debug session (chat-streaming-block.md)
2. **Session title broken** (Issue #2) - No session title function found in codebase
3. **Message persistence** (Issue #3) - Messages saved but not filtered by session_id correctly

hypothesis:
  - Issue #1: flushSync applied but not verified by user yet
  - Issue #2: maybeSetSessionTitle() function doesn't exist or was never implemented
  - Issue #3: Messages saved to wrong session_id or queries missing session filter

test: Code inspection + user verification of streaming fix + database query audit

next_action: |
  1. Request user confirmation on streaming block fix (test in browser)
  2. Search codebase for session title auto-generation logic
  3. Verify message save/load queries filter by session_id

## Symptoms

### Issue 1: Streaming Block Arrival (CRITICAL)
expected: Text flows gradually (5+ DOM updates during response, character by character)
actual: Only 1 large update detected (860 chars dumped at once)
errors: None reported
reproduction: Send a question in chat, observe response arrival timing
started: After deploying multi-session chat with "true streaming" fix

### Issue 2: Session Title Auto-Generation Broken
expected: First message truncated to 60 chars becomes session title
actual: Title stays "New Chat" after sending message
errors: None reported
reproduction: Send first message in new session, check if title updates
started: Unknown (session title feature may never have worked)

### Issue 3: Message Persistence Broken
expected: Switch sessions, original session messages still there
actual: Messages not found after switching away and back
errors: None reported
reproduction: Create session A with message, create session B, switch back to A
started: After multi-session implementation

## Eliminated

(none yet - just started)

## Evidence

### Issue 1 Evidence (from chat-streaming-block.md)

- **Found:** flushSync() was added to Chat.jsx line 2 and wrapped setMessages calls
- **Implication:** Code fix applied but NOT YET VERIFIED by user in actual browser
- **Status:** AWAITING USER VERIFICATION - pending test in browser

### Issue 2 Evidence

- **Found:** No `maybeSetSessionTitle` or `setSessionTitle` functions in codebase
- **Checked:** Grepped for "setSessionTitle|session_id" - only found reference to `eq('session_id', sessionId)` filter
- **Implication:** Session title auto-generation feature was never implemented OR function name is different
- **Next:** Search Edge Function for title update logic

### Issue 3 Evidence

- **Found:** Messages are queried with `.eq('session_id', sessionId)` filter (Chat.jsx:73)
- **Implication:** Query structure looks correct for session filtering
- **Next:** Verify:
  1. User messages being saved WITH session_id before sending?
  2. Assistant messages being saved WITH session_id in Edge Function?
  3. Are queries using correct active sessionId state variable?

## ROOT CAUSES (Preliminary)

### Issue 1: Streaming Block Arrival
**Root Cause:** React 19 batching state updates
- Multiple SSE events bundled by reader.read() into single chunk
- Each event triggers setMessages() call
- React batches all calls into single render
- flushSync() applied as fix (pending verification)

### Issue 2: Session Title Missing
**Root Cause:** Feature never implemented
- No title update function exists in React component or Edge Function
- Requires:
  1. Extract first 60 chars of user's first message
  2. Call Supabase to update chat_sessions.title with that text
  3. Update local sessions state

### Issue 3: Messages Not Persisting
**Root Cause:** Likely one of:
1. User messages not being saved to DB before streaming starts
2. Assistant messages saved in Edge Function without session_id
3. Messages being queried before sessionId is fully loaded
4. Session switching not triggering message reload

## Next Steps

1. **Issue 1:** User must verify streaming fix works in browser
2. **Issue 2:** Implement session title auto-generation (need to create function)
3. **Issue 3:** Audit message save/load lifecycle to find where session_id is lost
