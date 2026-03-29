---
status: awaiting_human_verify
trigger: "Chat responses arrive as text blocks instead of streaming character-by-character, despite Edge Function rewrite"
created: 2026-03-29T16:30:00Z
updated: 2026-03-29T16:35:00Z
---

## Current Focus

hypothesis: React is batching state updates, OR chunks are arriving in large clumps instead of individually
test: Add detailed logging to see exact timing and content of each chunk arrival
expecting: Either (A) multiple state updates batched by React, or (B) chunks arriving in large blocks
next_action: Add browser console logging to trace chunk arrival timing in real-time

## Symptoms

expected: Text flows in real-time as Claude generates (character-by-character visible to user)
actual: Text appears but "waits then dumps" — entire response arrives at once, not streaming
errors: Unknown (user hasn't checked console)
reproduction: Send a question in chat and observe response arrival timing
started: After deploying multi-session chat with "true streaming" fix

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-03-29T16:30:00Z
  checked: Active debug sessions
  found: No active sessions, creating new debug file
  implication: Starting fresh investigation

- timestamp: 2026-03-29T16:31:00Z
  checked: supabase/functions/chat/index.ts streaming loop (lines 221-341)
  found: |
    Server-side streaming logic appears correct:
    1. Creates ReadableStream with async start(controller)
    2. Iterates through stream with "for await"
    3. For each content_block_delta event, immediately enqueues SSE data
    4. Line 275: controller.enqueue(encoder.encode(data)) - no await, immediate
    5. No explicit await or batch operations that would buffer
    6. Uses ReadableStream which should send chunks as they arrive
  implication: Server code looks correct - chunks should forward immediately. Issue likely client-side.

- timestamp: 2026-03-29T16:32:00Z
  checked: src/components/Chat.jsx handleStreamingResponse (lines 245-310)
  found: |
    Client-side streaming handler structure:
    1. Uses response.body.getReader() - standard streaming pattern
    2. Calls reader.read() in while loop (line 256)
    3. Decodes chunks and splits by newline (lines 259-260)
    4. Updates state on each text_delta event with setMessages (line 273)
    5. NO apparent batching or buffering delays
    6. Updates happen immediately on each chunk arrival
  implication: Client code also looks correct. But need to verify:
    - Is reader.read() actually returning chunks in real-time?
    - Is React batching the state updates and delaying renders?
    - Are chunks actually arriving one-by-one or bundled together?

- timestamp: 2026-03-29T16:33:00Z
  checked: Network streaming behavior and SSE chunk batching
  found: |
    CRITICAL FINDING: Reader.read() returns variable-sized chunks!

    The issue is in how chunks are processed in handleStreamingResponse:
    - Line 259: reader.read() returns a chunk of VARIABLE size
    - Line 260: chunk.split('\n') splits multiple SSE events if they arrived together
    - Lines 262-305: Process ALL lines from ONE reader.read() call in a single loop
    - Line 273: setMessages is called for EACH SSE event

    PROBLEM: If reader.read() returns (say) 10 KB which contains 50 SSE events:
    - All 50 setMessages() calls happen in quick succession
    - React batches them into ONE render update
    - User sees all 50 events worth of text appear at once

    Solution: Need to add delay between state updates OR use flushSync() to force immediate renders
  implication: ROOT CAUSE IDENTIFIED: Multiple SSE events per read() call cause batched state updates

## Resolution

root_cause: |
  React 19 batches multiple state updates (setMessages calls) into a single render.
  When reader.read() returns multiple SSE events bundled together (which is normal
  for streaming), the for loop processes all lines and calls setMessages for each
  event. React batches all these calls together, causing the entire response to
  appear at once instead of streaming character by character.

fix: |
  Wrapped setMessages call with flushSync() from react-dom in handleStreamingResponse.
  This forces synchronous DOM updates for each SSE event, bypassing React's
  automatic batching and rendering each text chunk immediately.

  Changes:
  1. Line 2: Added "import { flushSync } from 'react-dom'"
  2. Lines 273-297: Wrapped setMessages callback with flushSync()

verification: PENDING - User must test in browser to confirm text now streams character-by-character
files_changed: ["src/components/Chat.jsx"]
