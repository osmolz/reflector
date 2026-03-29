---
phase: 07-chat-quality
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/functions/chat/index.ts
  - src/components/Chat.jsx
  - src/components/Chat.css
  - tests/chat-streaming.spec.js
autonomous: true
requirements: [CHAT-STREAMING, CHAT-FORMAT, COACH-TONE]
user_setup: []

must_haves:
  truths:
    - "Chat responses display without markdown artifacts (**, __, `, |, [, ], {, }, etc.)"
    - "Responses read as natural prose from an executive coach voice"
    - "Text appears progressively in real-time as it's being generated"
    - "System maintains warm, direct, honest tone across all response types"
    - "Fallback handler gracefully cleans any leaked markdown if edge case occurs"
  artifacts:
    - path: "supabase/functions/chat/index.ts"
      provides: "Streaming response generation and markdown safeguards"
      exports: ["POST /functions/v1/chat with streaming support"]
    - path: "src/components/Chat.jsx"
      provides: "Real-time streaming message display"
      exports: ["Chat component with SSE stream handler"]
    - path: "src/components/Chat.css"
      provides: "Streaming animation and text display styling"
      contains: ["streaming-text animation, progress indicator styles"]
    - path: "tests/chat-streaming.spec.js"
      provides: "Comprehensive streaming and markdown validation tests"
      exports: ["20+ test cases for tone, format, edge cases"]
  key_links:
    - from: "supabase/functions/chat/index.ts"
      to: "anthropic.messages.stream()"
      via: "SDK streaming API"
      pattern: "stream()"
    - from: "src/components/Chat.jsx"
      to: "supabase/functions/chat/index.ts"
      via: "EventSource SSE stream"
      pattern: "new EventSource.*chat"
    - from: "Chat responses"
      to: "system prompt"
      via: "Format enforcement"
      pattern: "no markdown, plain prose only"
---

<objective>
Fix chat output to read naturally without markdown artifacts, enable streaming for better perceived performance, and ensure consistent executive coach tone.

Purpose: Current chat responses occasionally leak markdown formatting (**, `, |, etc.) due to edge cases in Claude's output. Streaming enables real-time text display, making interactions feel 5-10x faster. System prompt is solid but needs validation across diverse questions.

Output: Production-ready chat with no markdown artifacts, streaming responses, comprehensive test suite, and documented system prompt philosophy.
</objective>

<execution_context>
@supabase/functions/chat/index.ts
@src/components/Chat.jsx
@src/components/Chat.css
</execution_context>

<context>
Current implementation:
- Edge Function calls `anthropic.messages.create()` with non-streaming mode
- System prompt explicitly forbids markdown: "Write in plain prose only. No bullet points, numbered lists, headers, bold text, italics, code blocks, or any markdown whatsoever."
- Chat component loads full response at once (no streaming UX)
- Occasional user reports of markdown leaking through (estimated 1-5% of responses)

Key files:
- supabase/functions/chat/index.ts (lines 149-171) — Claude API call
- src/components/Chat.jsx (lines 91-159) — Response fetch and display
- System prompt (lines 152-164) — Markdown prohibition documented

Research context:
- Anthropic SDK v0.80.0+ supports `messages.stream()` for Server-Sent Events
- Streaming responses improve perceived latency by 5-10x (user sees text appearing)
- Edge Function timeout: 150s; recommended max_tokens: 512 for chat
- No external markdown libraries needed — prevent at source via prompt + fallback

Acceptance criteria from Phase 7 request:
- No markdown artifacts visible in any response
- Responses display natural prose as if typed by human coach
- Streaming enabled and working
- Component handles both streaming and non-streaming gracefully
- Executive coach tone consistent across all responses
- Tested with 20+ different question types
- Performance improved (measure time-to-first-token)
- No regressions in error handling
- System prompt documented for maintainers
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add streaming support to chat Edge Function</name>
  <files>supabase/functions/chat/index.ts</files>
  <action>
    Update the chat Edge Function to use `anthropic.messages.stream()` instead of `create()`:

    1. Replace the standard `anthropic.messages.create()` call (line 149) with `anthropic.messages.stream()`.
    2. Return Server-Sent Events (text/event-stream) with Content-Type header and chunked encoding.
    3. Stream each text delta as a JSON event: `data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"chunk"}}\n\n`
    4. When stream completes, emit: `data: {"type":"message_stop"}\n\n`
    5. Add error handling for stream interruption — if stream fails, fall back to standard response.
    6. Preserve all existing logic: auth verification, time entries fetch, system prompt, error handling.
    7. Keep max_tokens: 512 (recommended for chat).
    8. Ensure CORS headers allow SSE streaming.

    Reference: @anthropic-ai/sdk streaming examples. Do not use ReadableStream — use standard Deno.serve event emitter pattern.

    Key safeguards (keeping existing):
    - System prompt explicitly forbids markdown
    - Add fallback markdown remover: if any line contains ** or __ or ``` or | at line start, remove it
    - Keep existing validation: no empty responses, proper error messages

    Database save: Still save to chat_messages table, but extract final response from accumulated stream chunks.
  </action>
  <verify>
    <automated>
      1. Test Edge Function locally: `supabase functions serve`
      2. Send test request with curl: `curl -X POST http://localhost:54321/functions/v1/chat -H "Content-Type: application/json" -H "Authorization: Bearer test-token" -d '{"question":"What did I spend most time on?"}'`
      3. Verify response is text/event-stream with proper SSE format (data: lines)
      4. Verify no errors in Edge Function logs
      5. Verify database save still works (check chat_messages table)
    </automated>
  </verify>
  <done>
    Edge Function returns Server-Sent Events format with streaming chunks. Each event is valid SSE JSON. No errors in logs. Chat message saved to database after stream completes. System prompt safeguards still in place.
  </done>
</task>

<task type="auto">
  <name>Task 2: Update Chat component to handle streaming responses</name>
  <files>src/components/Chat.jsx</files>
  <action>
    Refactor Chat component to consume SSE stream and display text in real-time:

    1. In `handleSend()` (line 61), after API fetch, check Content-Type: if "text/event-stream", use stream handler; else use old JSON handler.
    2. Create `handleStreamingResponse()` function:
       - Open EventSource: `const eventSource = new EventSource(...)`
       - On 'message' event, parse JSON: `JSON.parse(event.data)`
       - If type === "content_block_delta", append `delta.text` to message response
       - Update component state (immutable): `setMessages(prev => prev.map(msg => msg.id === userMessage.id ? {...msg, response: msg.response + chunk} : msg))`
       - On 'message_stop', close stream and mark complete
       - Smooth text accumulation: no flickering
    3. Keep fallback for non-streaming responses (old JSON format).
    4. Update loading indicator: instead of "Claude is thinking...", show "Claude is responding..." with character count updating in real-time.
    5. Preserve all error handling: network errors, auth errors, timeouts.
    6. For streaming: set 60s timeout (longer than non-streaming because we're waiting for chunks).
    7. Disable input while streaming (already done via `loading` state).

    No UI changes yet (see Task 3 for CSS).
  </action>
  <verify>
    <automated>
      1. Verify component renders without errors: `npm run dev` and navigate to Chat
      2. Test with mock streaming server (create a test Edge Function that returns simple SSE stream)
      3. Verify real-time text accumulation: text should appear character-by-character, not all at once
      4. Verify fallback works: if response is JSON (not streaming), component still works
      5. Verify error handling: if stream closes unexpectedly, component shows error
      6. Check browser console for no errors or warnings
    </automated>
  </verify>
  <done>
    Chat component accepts SSE streams from Edge Function. Text accumulates in real-time. Fallback handles non-streaming responses. Errors are caught and displayed. Loading indicator shows progress. No console errors.
  </done>
</task>

<task type="auto">
  <name>Task 3: Add streaming animation and progress UI styling</name>
  <files>src/components/Chat.css</files>
  <action>
    Enhance Chat.css to visually indicate streaming text and improve perceived performance:

    1. Add `.streaming-text` class: soft fade-in animation as text appears (optional subtle animation, not distracting)
    2. Update `.loading-indicator` to show character count: "Claude is responding... 42 characters so far" (count updates as text streams in)
    3. Add `.message-in-progress` class for message divs during streaming (slightly muted color until complete)
    4. Ensure response text has good line-height and spacing (already done, preserve)
    5. Add visual separation between streamed text and next message
    6. Test on mobile: ensure text wrapping and sizing work at 375px+

    Keep design minimal and restrained (per Bauhaus/Joe Gebbia philosophy). No fancy animations, just clarity.
  </action>
  <verify>
    <automated>
      1. npm run build succeeds
      2. Open Chat component in browser (npm run dev)
      3. Manually test streaming: text should appear smoothly, not jarringly
      4. Test on mobile (DevTools responsive mode, 375px width): layout should remain readable
      5. Verify CSS classes apply to correct elements
      6. Check no syntax errors in CSS
    </automated>
  </verify>
  <done>
    Chat.css updated with streaming animations and progress indicator. Responsive design preserved. No broken styles. Text appears smoothly. Mobile layout works.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: Create comprehensive streaming and markdown validation test suite</name>
  <files>tests/chat-streaming.spec.js, tests/chat-streaming-edge-cases.spec.js</files>
  <behavior>
    Test categories (20+ tests total):

    A. Markdown Prevention (5 tests):
    - No double-asterisks (**) in response
    - No underscores (__) in response
    - No backticks (`) in response
    - No pipes (|) in response
    - No code block markers (``` or ~~~) in response

    B. Prose Quality (5 tests):
    - Response is continuous prose (no bullet points)
    - Response has no numbered lists (1. 2. 3.)
    - Response has no headers (# ## ###)
    - Response reads naturally (no "based on your data" formal language)
    - Response is 1-2 paragraphs max

    C. Executive Coach Tone (4 tests):
    - Warm and direct (detects phrases like "I notice" vs "based on")
    - Specific with numbers (detects actual numbers from data)
    - Ends with actionable observation (detects question or reflection)
    - No flattery, honest feedback (detects critical insight)

    D. Streaming Behavior (4 tests):
    - Stream produces valid SSE format
    - Stream accumulates text without duplication
    - Stream completes without hanging
    - Stream handles 500+ character responses

    E. Edge Cases (2 tests):
    - Responds correctly when user has no time entries
    - Handles API errors gracefully
  </behavior>
  <action>
    Create tests/chat-streaming.spec.js using a testing framework (Jest or Vitest):

    1. Set up test environment with mock Supabase client and Edge Function responses
    2. For each test category above, create test cases:
       - Markdown tests: call Chat API 5 times with different questions, parse response for markdown characters
       - Prose tests: analyze response structure (paragraph count, list indicators, etc.)
       - Tone tests: semantic analysis (optional: use simple keyword matching for "I notice", "you spent", etc.)
       - Streaming tests: mock SSE stream, verify JSON events parse correctly
       - Edge cases: test with empty time entries, API errors
    3. Use real or mocked API calls (if real, use 1-2 dedicated test questions)
    4. Generate test report with pass/fail for each category
    5. Add timeout of 30s per test (streaming may be slower)

    Tools: Jest + fetch-mock for HTTP mocking, or Vitest if already in use.
  </action>
  <verify>
    <automated>
      npm test -- tests/chat-streaming.spec.js

      Expected output: 20+ tests passing, no failures. If any fail:
      - Markdown tests fail → Task 1 needs markdown stripper
      - Tone tests fail → System prompt needs tuning
      - Streaming tests fail → Task 2 needs SSE handler fix
    </automated>
  </verify>
  <done>
    Test suite created with 20+ tests. All tests passing. No markdown artifacts, prose quality verified, tone consistent, streaming functional, edge cases handled. Test report generated.
  </done>
</task>

<task type="auto">
  <name>Task 5: Document system prompt philosophy and streaming implementation</name>
  <files>.planning/PHASE-7-SYSTEM-PROMPT-GUIDE.md</files>
  <action>
    Create internal documentation for maintaining and evolving the chat system:

    1. System Prompt Philosophy:
       - Explain why no markdown is required (natural prose is more readable)
       - Document the "executive coach" voice: warm, honest, specific, actionable
       - List safeguards: explicit "no markdown" instruction + fallback remover
       - Explain why natural conversation beats formatting

    2. Streaming Implementation:
       - Explain SSE (Server-Sent Events) pattern used
       - Document event types: content_block_delta, message_stop
       - Show example stream flow and how component consumes it
       - Note: 150s timeout, 512 max_tokens are optimized for streaming

    3. Markdown Fallback Logic:
       - If response contains **, __, ```, |, [, ], etc., remove them
       - Why: 1-5% edge cases where Claude ignores explicit "no markdown" instruction
       - Tested: ensure fallback doesn't break actual content (e.g., email addresses)

    4. Testing Strategy:
       - Run test suite regularly (before each deployment)
       - Quarterly: test with diverse prompts to catch tone drift
       - Monitor production: log markdown detections to catch regressions

    5. Future Evolution:
       - If tone drifts, adjust system prompt (already tested approach)
       - If streaming causes issues, fallback is non-streaming mode
       - If 20+ tests start failing, investigate Claude API changes
  </action>
  <verify>
    <automated>
      1. Document file exists and is readable
      2. Contains all 5 sections above
      3. No broken markdown syntax
      4. File is saved to .planning/
    </automated>
  </verify>
  <done>
    System prompt guide created. Philosophy, implementation, safeguards, testing strategy, and future evolution documented. Ready for team handoff.
  </done>
</task>

<task type="auto">
  <name>Task 6: Integration test and performance measurement</name>
  <files>tests/chat-performance.spec.js</files>
  <action>
    Create end-to-end test to measure streaming performance improvement:

    1. Create test that sends a real question to the Edge Function
    2. Measure and log:
       - Time-to-first-token (how long before first character appears)
       - Time-to-complete (total response time)
       - Character count of response
       - Perceived latency (how long user waits before seeing text)

    3. Compare streaming vs non-streaming (send same question both ways if possible)
    4. Expected result: Streaming should show first token in <1s, non-streaming takes 3-5s to show full response
    5. Log results to console and generate simple report

    Note: This test requires real API access. Run locally or in CI/CD.
  </action>
  <verify>
    <automated>
      npm test -- tests/chat-performance.spec.js

      Output should show:
      - Time-to-first-token: <1s (streaming advantage)
      - Response appears progressively (user sees incremental updates)
      - No markdown in final response
      - Test completes in <30s
    </automated>
  </verify>
  <done>
    Performance test created. Streaming shows measurable improvement in perceived latency (first token appears in <1s vs 3-5s for non-streaming). Results logged. Performance improvement verified.
  </done>
</task>

</tasks>

<verification>
**Phase 7 Verification Checklist:**

Pre-deployment:
- [ ] All 6 tasks completed
- [ ] Edge Function returns proper SSE format
- [ ] Chat component accumulates streaming text without errors
- [ ] CSS applies streaming animations smoothly
- [ ] All 20+ tests passing
- [ ] System prompt documented
- [ ] Performance measured and improved
- [ ] No markdown artifacts in 20+ diverse test questions
- [ ] Zero console errors or warnings
- [ ] Responsive design works at 375px+

Visual verification:
- [ ] Chat text appears progressively (not all at once)
- [ ] Loading indicator shows "Claude is responding..." with character count
- [ ] No flickering or jumpy rendering
- [ ] Desktop and mobile layouts look polished
- [ ] Tone reads natural and warm (spot-check 5 responses)

Error scenarios:
- [ ] If stream closes unexpectedly, error is shown gracefully
- [ ] If API fails, fallback to standard response or error message
- [ ] Auth errors handled (401 → "Please log in")
- [ ] Network errors handled (timeout → "Request timed out")

Production readiness:
- [ ] All commits pushed to GitHub
- [ ] No hardcoded test data in production code
- [ ] Environment variables correct (ANTHROPIC_API_KEY server-side only)
- [ ] Edge Function timeout set to 150s
- [ ] max_tokens: 512 (optimal for streaming)
</verification>

<success_criteria>
1. **No Markdown Artifacts:** Zero markdown characters (**, __, `, |, [, ], {, }, etc.) visible in any production chat response. Validated across 20+ diverse questions.
2. **Streaming Performance:** Time-to-first-token < 1s (streaming visible to user immediately). Non-streaming would take 3-5s to show full response.
3. **Consistent Tone:** All responses read as natural prose from an executive coach. Warm, direct, honest, specific with numbers, actionable.
4. **Component Stability:** Chat component handles streaming SSE and non-streaming JSON responses. Errors are caught and displayed gracefully.
5. **Test Coverage:** Comprehensive test suite (20+ tests) covering markdown prevention, prose quality, tone, streaming behavior, and edge cases. All tests passing.
6. **Documentation:** System prompt philosophy and streaming implementation documented for future maintainers.
7. **Zero Regressions:** All existing functionality (auth, error handling, history persistence) works as before. No breaking changes.
8. **Production Deployment:** Code committed, built, tested, and ready for Vercel deployment. Edge Functions deployed with streaming support.
</success_criteria>

<output>
After completion, create:
- `.planning/PHASE-7-SUMMARY.md` — Execution summary with results
- `.planning/PHASE-7-VERIFICATION.md` — Test results and performance metrics
- Git commits with messages:
  - `feat(chat): add streaming support via Server-Sent Events`
  - `feat(chat): update component to consume streaming responses in real-time`
  - `style(chat): add streaming animation and progress indicator`
  - `test(chat): comprehensive streaming, format, and tone validation suite`
  - `docs(chat): system prompt philosophy and streaming implementation guide`
</output>
