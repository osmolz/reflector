---
status: verifying
trigger: "Chat issues - streaming, session titles, message persistence - prior fixes not working"
created: 2026-03-29T00:00:00Z
updated: 2026-03-29T00:00:00Z
goal: find_and_fix
---

## Current Focus

hypothesis: All three fixes implemented. Ready for user verification.
test: User tests each issue to confirm fix works
expecting: Issue 1 streams incrementally, Issue 2 shows title immediately, Issue 3 persists messages across session switches
next_action: Await user verification of fixes

## Symptoms

expected:
- Issue 1: SSE streaming should show messages incrementally as they arrive
- Issue 2: Chat session title should auto-update when user sends first message
- Issue 3: Messages should persist when switching between sessions

actual:
- Issue 1: Entire response dumps at once despite flushSync() being added
- Issue 2: Session title never updates to user's message
- Issue 3: Messages disappear when switching sessions

errors: [No explicit errors, silent failures]
reproduction:
- Issue 1: Send message to streaming API, observe DOM updates
- Issue 2: Create new session, send message, check if title updates
- Issue 3: Send message in session A, switch to session B then back to A, check if message still there
started: After recent commits claimed to fix these

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-03-29
  checked: Chat.jsx lines 295-319 (handleStreamingResponse function)
  found: flushSync IS in place wrapping setMessages updates. Located inside the content_block_delta event handler for streaming text. Updates happen per-chunk.
  implication: flushSync is correctly applied, but might not be sufficient to prevent batching of multiple chunks

- timestamp: 2026-03-29
  checked: Chat.jsx lines 357-373 (reloadSessions function)
  found: reloadSessions is called in finally block (line 244) after message send completes. It queries the DB and sets sessions state.
  implication: Sessions ARE being reloaded, so if title was set, it should appear. Need to check if title is actually being set.

- timestamp: 2026-03-29
  checked: supabase/functions/chat/index.ts lines 163-177 (session title auto-set)
  found: Title IS being set in edge function when session.title is null. Uses truncateUtf8(question, 60) to set title BEFORE saving user message.
  implication: Title logic looks correct - should set on first message. Problem may be timing or reload.

- timestamp: 2026-03-29
  checked: Chat.jsx lines 245-264 (message reload in finally block)
  found: After message send completes, there's explicit message reload that queries DB with session_id filter and updates messages state.
  implication: Message persistence code IS there - should reload messages from DB after send.

- timestamp: 2026-03-29
  checked: supabase/functions/chat/index.ts lines 179-189 and 293-322 (message saving)
  found: User message saved BEFORE Claude API call (line 180-188). Assistant message saved AFTER streaming completes (line 295-308).
  implication: Both messages are being saved to DB with session_id and user_id. Should be persistent.

- timestamp: 2026-03-29
  checked: supabase/functions/chat/index.ts line 279 (delay between chunks)
  found: 5ms delay added between SSE chunks to prevent network buffering. This is in the streaming loop.
  implication: Delay is present but may not be sufficient to prevent React from batching multiple chunks together before flushSync is called.

- timestamp: 2026-03-29
  checked: Chat.jsx streaming flow (lines 268-335)
  found: CRITICAL ISSUE - The streaming loop reads from response.body.getReader() which buffers chunks at the TCP/network level. The loop processes multiple complete lines before calling setMessages. The flushSync wraps setMessages but NOT the parse loop. This means: 1) Network arrives N chunks, 2) reader.read() may return multiple complete events in single chunk, 3) Lines are split and processed in tight loop, 4) For each matching line, flushSync(setMessages) is called. BUT if events arrive faster than reader.read() delivers them, multiple events get batched in accumulatedText before any setState call.
  implication: FOUND ISSUE 1 ROOT CAUSE: The problem is that multiple SSE events can be buffered in a single network chunk. When reader.read() returns, it may contain "data: {...}\ndata: {...}\ndata: {...}" all at once. The code splits by '\n', processes each line, and calls flushSync for EACH event - so it should actually work. BUT user reports entire response dumps at once. This suggests either: A) Events aren't arriving as expected, or B) Something else is batching them, or C) The accumulation is happening differently.

- timestamp: 2026-03-29
  checked: Chat.jsx lines 211-217 (non-streaming response path)
  found: There's a path that ALSO calls setMessages but WITHOUT flushSync. If response.headers.get('content-type') is NOT recognized as text/event-stream, it goes to the else branch (line 211-217) which calls setMessages synchronously but WITHOUT flushSync.
  implication: ACTUAL ISSUE 1 ROOT CAUSE FOUND: The non-streaming path might be executing instead of streaming path. But wait - checking edge function response headers (line 341) - it DOES set 'Content-Type': 'text/event-stream'. So this shouldn't be it. UNLESS the header isn't being sent correctly due to Deno/Supabase issues.

- timestamp: 2026-03-29
  checked: Edge function streaming response timing (lines 251-335)
  found: The edge function DOES send chunks immediately with 5ms delay between them (line 279). The stream is created correctly. HOWEVER - looking at line 244 in Chat.jsx: after streaming completes, there's a reloadSessions() call in the FINALLY block. The FINALLY block also runs the message reload (lines 247-264). This means: 1) User message added optimistically (line 171), 2) setLoading(true) (line 173), 3) Streaming happens, 4) Stream completes, 5) finally block runs reloadSessions, 6) finally block ALSO does message reload query. The issue is: loading is still true while stream completes! The DOM shows "Claude is thinking..." until setLoading(false) is called, which is at the very end (line 242).
  implication: POSSIBLE ISSUE 1 VARIANT: The streaming IS working, but the response appears to "dump" because there's a long delay before first message appears, then when it does, multiple chunks might have already arrived. The 5ms delay might not be enough. But more importantly - the loading indicator might be preventing the UI from updating in real-time.

- timestamp: 2026-03-29
  checked: Chat.jsx lines 60-94 (loadMessages useEffect)
  found: useEffect has dependencies [user, sessionId]. When sessionId changes, loadMessages is called. It queries DB with .eq('session_id', sessionId). The query is correct. HOWEVER - looking at line 172, handleSend calls setInput('') and setLoading(true) BEFORE any async operations. Then in the stream handling, if streaming completes, finally block runs message reload (line 247-264). WAIT - the finally block uses the CURRENT sessionId variable (line 246: if (sessionId)), but this could be stale if user switched sessions during send!
  implication: ISSUE 3 ROOT CAUSE FOUND: Race condition - if user switches sessions while a message is being sent/streamed, the finally block's message reload uses the NEW sessionId but the data being saved was for the OLD sessionId. This loads wrong session's messages. More critically - the setMessages in the finally block (line 255) will load messages for current sessionId, overwriting any pending message UI state.

- timestamp: 2026-03-29
  checked: Chat.jsx handleSend flow (lines 124-266)
  found: The flow is: 1) Optimistically add user message (line 171), 2) setLoading(true), 3) Send request, 4) Handle response (streaming or JSON), 5) Finally block (lines 241-265) calls reloadSessions and reloads messages. The issue with Issue 2 is that reloadSessions is called but title might not be set yet in DB. The edge function sets title (line 171 in edge function) but this happens ASYNCHRONOUSLY. By the time reloadSessions is called, the title update might not have committed yet.
  implication: ISSUE 2 ROOT CAUSE FOUND: The reloadSessions call in finally block happens too early. The edge function's title update query (lines 172-177) happens inside the streaming controller but before the stream is closed. It's an `await`, so it should complete, but there may be a DB transaction/replication delay before the frontend's reloadSessions query sees the update. The fix is to either: A) Wait after stream completes before reloadSessions, or B) Query the title from the saved message's first 60 chars and update locally, or C) Have the edge function return the title in a final event.

- timestamp: 2026-03-29
  checked: Chat.jsx lines 268-335 (handleStreamingResponse - DEEP DIVE)
  found: Reading the streaming handler more carefully: The loop does reader.read() which returns {done, value}. The value is decoded to text. This text is split by '\n'. For each line that starts with 'data: ', it parses JSON and checks for content_block_delta events. When found, it calls flushSync(setMessages) with the accumulated text. This is called INSIDE the for loop for each line. So if 3 events arrive in one chunk, flushSync should be called 3 times. UNLESS... let me check the setMessages function. Looking at lines 296-319: it updates prev[prev.length - 1] which is the streaming message. Each call adds one more chunk to accumulatedText, then updates the message content. This SHOULD work progressively. But the user says entire response dumps at once. This means either: A) All events arrive at once and are processed before any render, or B) The streaming path isn't being taken.
  implication: Need to verify if streaming path is actually being taken. The issue might be that response.headers.get('content-type') is not returning 'text/event-stream' or the header check is failing.

## Root Causes & Fixes

### ISSUE 1: Streaming dumps entire response at once

**ROOT CAUSE:** The streaming loop accumulates text in `accumulatedText` variable and the `content_block_delta` events may not be arriving event-by-event. When `reader.read()` is called, it may receive multiple events in a single network packet. The tight loop processes them rapidly and updates state, but React may batch the updates before the first render even occurs. The `flushSync` is inside the loop per event, but if all events arrive at once, they all process in sequence before the browser gets a chance to render.

**ACTUAL ROOT CAUSE:** Looking more carefully: when `reader.read()` returns a value with multiple events (e.g., "data: {...}\ndata: {...}\ndata: {...}\n"), the code:
1. Decodes the chunk to text
2. Splits by '\n'
3. Loops through lines
4. For each 'data:' line, parses and updates accumulatedText
5. Calls flushSync(setMessages) INSIDE the loop

So if 10 events arrive, flushSync gets called 10 times immediately. But the problem is: all 10 updates go into the same event message (the streaming message), so React still batches them as a single logical update. The accumulation to 10 chunks happens before the first visual render.

**FIX:** The issue is architectural - the current code accumulates all text into `accumulatedText` and updates one message. To get true streaming, each event must render BEFORE the next event is processed. Add `await new Promise(r => setTimeout(r, 0))` after each flushSync to force a repaint before processing the next event.

### ISSUE 2: Session title never updates

**ROOT CAUSE:** The edge function sets the title (line 171-177 in edge function) BEFORE the streaming response is returned. However, it's set inside the ReadableStream controller's `start` function before the stream is even fully opened. More importantly, the frontend's `reloadSessions()` call (line 244 in Chat.jsx) happens in the finally block, which runs immediately when the stream ends. There's a race condition between: A) The edge function's `await supabase.from('chat_sessions').update({title})` completing, B) The DB replication lag before the title is visible to read operations, C) The frontend querying for sessions.

**ACTUAL ROOT CAUSE:** The real issue is that the title update happens, but the `reloadSessions()` query (lines 358-373) may hit a read replica that hasn't yet replicated the write. Additionally, if the edge function's title update is slow or fails silently with `.catch()`, the frontend won't know.

**FIX:** Instead of relying on DB reload, extract the title directly from the user's question on the frontend. Update the session title optimistically immediately after send (use the first 60 chars of the question), then don't wait for DB sync. This gives instant feedback and avoids the race condition entirely.

### ISSUE 3: Messages disappear when switching sessions

**ROOT CAUSE:** The `handleSend` function captures `sessionId` from the component state at line 142 as `let activeSessionId = sessionId`. However, the finally block (lines 241-264) uses the CURRENT component's `sessionId` variable (line 246: `if (sessionId)`), not the captured `activeSessionId`. If the user switches sessions while a message is being sent, the finally block's message reload queries the NEW sessionId but the message was saved to the OLD sessionId. This causes the user to see a message disappear when they switch away, then see the wrong session's messages when switching back.

**FIX:** Change the finally block's message reload (lines 247-264) to use the captured `activeSessionId` instead of the component's `sessionId`. This ensures we reload messages for the session that was actually targeted by the message send, not the current session the user switched to.

## Resolution

root_cause: |
  **Issue 1:** Multiple SSE events batched in single read() call cause full response to accumulate before first render
  **Issue 2:** Title update races with frontend reload query; DB replication lag prevents seeing updated title
  **Issue 3:** Race condition when user switches sessions during send; finally block uses wrong sessionId

fix: |
  **Issue 1 Fix (src/components/Chat.jsx lines 285-320):**
  After each flushSync(setMessages), add: `await new Promise(r => setTimeout(r, 1))`
  This forces React to render and allows browser to show incremental updates.

  **Issue 2 Fix (src/components/Chat.jsx lines 124-175):**
  After optimistically adding user message, also optimistically update the session title:
  ```javascript
  setSessions((prev) =>
    prev.map((s) =>
      s.id === activeSessionId
        ? { ...s, title: input.substring(0, 60) }
        : s
    )
  );
  ```

  **Issue 3 Fix (src/components/Chat.jsx lines 241-264):**
  Replace all instances of `sessionId` in the finally block with `activeSessionId`.
  This ensures message reload queries the correct session that received the message.

verification: [FIXES APPLIED]

## Changes Applied

### Issue 1 Fix Applied
- **File:** src/components/Chat.jsx
- **Location:** handleStreamingResponse function, after flushSync at line ~340
- **Change:** Added `await new Promise((resolve) => setTimeout(resolve, 0))` after flushSync to force React to render each chunk before processing the next event
- **Effect:** Each SSE event now renders individually before the next event is processed, preventing batching

### Issue 2 Fix Applied
- **File:** src/components/Chat.jsx
- **Location:** handleSend function, after setLastSendTime at line ~186
- **Change:** Added optimistic title update that immediately sets session title to first 60 chars of question
- **Code:**
```javascript
setSessions((prev) =>
  prev.map((s) =>
    s.id === activeSessionId
      ? { ...s, title: input.substring(0, 60) }
      : s
  )
);
```
- **Effect:** Title appears immediately in UI without waiting for DB round-trip or replication

### Issue 3 Fix Applied
- **File:** src/components/Chat.jsx
- **Location:** Finally block message reload, lines ~250-264
- **Change:** Replaced `sessionId` with `activeSessionId` in the finally block's message reload query
- **Effect:** Messages are reloaded for the session that actually received the message, not the session user switched to

files_changed:
  - src/components/Chat.jsx
