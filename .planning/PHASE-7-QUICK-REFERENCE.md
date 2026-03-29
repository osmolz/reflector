# Phase 7: Quick Reference for Execution

**Phase:** 07-chat-quality
**Status:** Planning Complete ✅
**Plan:** `.planning/PHASE-7-PLAN.md`
**Summary:** `.planning/PHASE-7-PLANNING-SUMMARY.md`

---

## What's Being Built

Fix chat output formatting, eliminate markdown artifacts (** __ ` | etc.), and add streaming support for 5-10x improvement in perceived response speed.

**Current State:**
- Chat responses occasionally leak markdown (1-5% edge cases)
- Responses load all-at-once (no streaming UX)
- System prompt forbids markdown but occasional artifacts still appear

**Target State:**
- Zero markdown artifacts in responses
- Streaming enabled (text appears progressively)
- Consistent executive coach tone
- Comprehensive test coverage (20+ tests)
- Documented system prompt and implementation

---

## Wave Structure (Execution Plan)

### Wave 1: Core Implementation (Parallel) — ~30-40 min

```
Task 1: Edge Function Streaming
├─ File: supabase/functions/chat/index.ts
├─ Change: Replace create() → stream(), return SSE events
├─ Add: Fallback markdown remover
└─ Verify: curl test returns text/event-stream

Task 2: Chat Component (Parallel with Task 1)
├─ File: src/components/Chat.jsx
├─ Change: Add EventSource handler, consume SSE stream
├─ Add: Real-time text accumulation
└─ Verify: npm run dev → text appears progressively

Task 3: CSS Styling (Parallel with Tasks 1-2)
├─ File: src/components/Chat.css
├─ Change: Add streaming animations, progress indicator
└─ Verify: npm run build succeeds, responsive at 375px+
```

**Can these run in parallel?** YES — no file conflicts.

### Wave 2: Testing & Polish (Sequential/Parallel) — ~40-50 min

```
Task 4: Test Suite (Critical)
├─ Files: tests/chat-streaming.spec.js, tests/chat-streaming-edge-cases.spec.js
├─ Create: 20+ tests (markdown, prose, tone, streaming, edge cases)
└─ Verify: npm test -- tests/chat-streaming.spec.js (all passing)

Task 5: Documentation (Parallel with Task 4)
├─ File: .planning/PHASE-7-SYSTEM-PROMPT-GUIDE.md
├─ Document: Philosophy, implementation, safeguards, testing, future evolution
└─ Verify: File created, all sections complete

Task 6: Performance Testing (Parallel with Tasks 4-5)
├─ File: tests/chat-performance.spec.js
├─ Measure: Time-to-first-token, total response time
└─ Verify: npm test -- tests/chat-performance.spec.js (streaming < 1s TTFT)
```

**Can these run in parallel?** YES — Tasks 4, 5, 6 don't conflict after Wave 1 is done.

---

## Key Implementation Details

### Task 1: Streaming Edge Function

**What to change:**
```typescript
// OLD (line 149):
const message = await anthropic.messages.create({...})

// NEW:
const stream = await anthropic.messages.stream({...})
```

**Return format (Server-Sent Events):**
```
data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Some "}}\n
data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"text "}}\n
data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"here"}}\n
data: {"type":"message_stop"}\n
```

**Fallback (if stream fails):** Return standard JSON response format.

**Safeguard:** If response contains **, __, ```, |, etc. → remove them.

---

### Task 2: Streaming Chat Component

**What to change:**
```javascript
// OLD (line 125):
const data = await response.json()  // Full response at once

// NEW:
const eventSource = new EventSource(...)  // Listen for streaming events
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  if (data.type === "content_block_delta") {
    appendTextToMessage(data.delta.text)  // Accumulate text in real-time
  } else if (data.type === "message_stop") {
    eventSource.close()
  }
}
```

**Real-time text accumulation:** Use setState to append chunks progressively.

**Fallback:** If not streaming (Content-Type: application/json), use old JSON handler.

---

### Task 3: CSS Animations

**What to add:**
```css
.streaming-text {
  animation: fadeIn 0.2s ease-in;
}

.loading-indicator {
  /* Update to show character count: "Claude is responding... 42 chars" */
}

.message-in-progress {
  /* Slightly muted color while streaming, normal when complete */
}
```

No fancy animations — keep restrained per Bauhaus philosophy.

---

### Task 4: Test Suite (20+ Tests)

**Test Categories:**

| Category | Tests | Examples |
|----------|-------|----------|
| Markdown Prevention | 5 | No **, no __, no `, no \|, no ``` |
| Prose Quality | 5 | No bullets, no numbered lists, no headers |
| Tone | 4 | Warm, direct, specific, actionable |
| Streaming | 4 | Valid SSE, no dups, completes, handles long responses |
| Edge Cases | 2 | No time entries, API errors |

**Run:** `npm test -- tests/chat-streaming.spec.js`
**Expected:** All 20+ tests passing, no failures.

---

## Acceptance Criteria (Definition of Done)

Wave 1 Complete:
- [ ] Edge Function returns SSE with proper format
- [ ] Chat component accumulates text in real-time
- [ ] CSS applies animations smoothly
- [ ] `npm run build` succeeds
- [ ] No console errors

Wave 2 Complete:
- [ ] All 20+ tests passing
- [ ] Performance: TTFT < 1s with streaming
- [ ] No markdown in 20+ diverse test responses
- [ ] System prompt guide documented
- [ ] All commits pushed to GitHub

Pre-Deployment:
- [ ] Manual spot-check: 5 chat responses look natural (no artifacts)
- [ ] Mobile layout responsive at 375px+
- [ ] Error handling works (network errors, API errors)
- [ ] Production env vars correct (ANTHROPIC_API_KEY server-side only)

---

## Common Issues & Troubleshooting

| Issue | Fix |
|-------|-----|
| Streaming shows "undefined" | EventSource not parsing JSON correctly — check event.data |
| Text appears all-at-once, not progressively | setState not batching updates — use functional setState |
| CSS animation jittery | Use `will-change: contents` sparingly, test on low-end device |
| Tests timeout at 30s | Stream taking too long — check Edge Function timeout setting (150s) |
| Markdown still appearing | Fallback remover not working — debug regex pattern |
| EventSource not connecting | Check CORS headers in Edge Function |

---

## Files to Modify

**3 files modified (Wave 1):**
- `supabase/functions/chat/index.ts` — Streaming support
- `src/components/Chat.jsx` — SSE handler
- `src/components/Chat.css` — Animations

**4 files created (Wave 2):**
- `tests/chat-streaming.spec.js` — Main test suite
- `tests/chat-streaming-edge-cases.spec.js` — Additional edge cases
- `tests/chat-performance.spec.js` — Performance measurement
- `.planning/PHASE-7-SYSTEM-PROMPT-GUIDE.md` — Documentation

---

## Commands Reference

**Local Testing:**
```bash
# Start dev server
npm run dev

# Start Edge Functions
supabase functions serve

# Run tests
npm test -- tests/chat-streaming.spec.js

# Build
npm run build
```

**Deployment:**
```bash
# Deploy Edge Function to Supabase
supabase functions deploy chat

# Deploy React to Vercel (automatic on push)
git push origin master
```

---

## Phase Duration Estimate

| Wave | Tasks | Duration |
|------|-------|----------|
| Wave 1 | 3 tasks (parallel) | 30-40 min |
| Wave 2 | 3 tasks (parallel) | 40-50 min |
| **Total** | **6 tasks** | **~70-90 min** |

---

## Success Looks Like

✅ No markdown artifacts in chat responses (zero ** __ ` | in 20+ test cases)
✅ Text streams in real-time (first character appears in <1s)
✅ Responses read naturally as if typed by executive coach
✅ All 20+ tests passing
✅ Documentation complete
✅ Performance measured and improved
✅ Ready for production deployment

---

## Questions Before Starting?

- **Why SSE and not WebSocket?** SSE is built-in, simpler, perfect for one-way streaming.
- **What if streaming fails?** Fallback to non-streaming JSON response automatically.
- **Will markdown still leak?** Unlikely (1-5% edge cases) but handled by fallback remover in Task 1.
- **How long to complete?** ~70-90 minutes total for full phase (both waves).
- **Can Wave 1 tasks run in parallel?** YES — no file conflicts.

---

**Ready to execute? Start with Task 1: Edge Function Streaming.**
