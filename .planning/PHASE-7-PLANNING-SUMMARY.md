# Phase 7: Chat Output Quality & Executive Coach Formatting — Planning Summary

**Generated:** 2026-03-29
**Status:** PLANNING COMPLETE ✅
**Plan Location:** `.planning/PHASE-7-PLAN.md`

---

## Executive Summary

Phase 7 plan created to fix chat output formatting, eliminate markdown artifacts, and add streaming support for better perceived performance. The plan decomposites into 6 focused tasks across the Edge Function backend, React component, styling, and testing layers.

**Key Objectives:**
1. Fix markdown artifact leakage (1-5% edge cases where ** __ ` | etc. appear in responses)
2. Enable streaming responses for 5-10x improvement in perceived latency
3. Ensure consistent executive coach tone across all responses
4. Comprehensive testing (20+ test cases) and documentation

---

## Planning Approach

### Discovery Level: **Level 0** (Existing Patterns Only)

No discovery phase needed:
- Anthropic SDK v0.80.0 already installed with streaming support
- Supabase Edge Functions proven in Phase 6
- React SSE (EventSource API) is standard browser API
- System prompt strategy already established (explicit "no markdown" instruction)

### Task Breakdown Strategy

Decomposed Phase 7 into **6 parallel/sequential tasks** organized by system layer:

| Wave | Tasks | Rationale |
|------|-------|-----------|
| **Wave 1** | Task 1 (Edge Function streaming) | Backend foundation for streaming |
| **Wave 1** | Task 2 (Chat component streaming handler) | Frontend parallelizable with Task 1 |
| **Wave 1** | Task 3 (CSS styling for streaming) | Parallelizable with Tasks 1-2 |
| **Wave 2** | Task 4 (Test suite creation) | Depends on Tasks 1-3 working |
| **Wave 2** | Task 5 (Documentation) | Independent, parallelizable with Task 4 |
| **Wave 2** | Task 6 (Performance measurement) | Depends on all streaming working |

**Parallelism Opportunity:** Tasks 1, 2, 3 can run in parallel (Wave 1) because:
- Task 1 (Edge Function) modifies `supabase/functions/chat/index.ts`
- Task 2 (Chat component) modifies `src/components/Chat.jsx`
- Task 3 (CSS) modifies `src/components/Chat.css`
- No file overlap → no merge conflicts

Tasks 4, 5 can run in parallel (Wave 2) — both depend on Wave 1 completion but don't conflict.

### Task Specificity & Verification

Each task includes:
- **<action>** — Specific implementation instructions (not "add streaming" but "replace `create()` with `stream()`, return SSE events in JSON format, etc.")
- **<verify>** — Automated command that can be run locally (no manual inspection required)
- **<done>** — Acceptance criteria (observable state changes)

Example specificity (Task 1):
- Replace `anthropic.messages.create()` with `anthropic.messages.stream()`
- Return Server-Sent Events with exact format: `data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"chunk"}}\n\n`
- Fallback handler for stream interruption
- Database save after stream completes

### Must-Haves Derivation (Goal-Backward)

**Phase Goal:** Fix chat output formatting, eliminate markdown artifacts, add streaming support.

**Observable Truths (User Perspective):**
1. Chat responses display without markdown artifacts
2. Responses read as natural prose from an executive coach
3. Text appears progressively (streaming) not all-at-once
4. Tone is warm, direct, honest across all responses
5. Fallback handler gracefully cleans any leaked markdown

**Required Artifacts:**
- `supabase/functions/chat/index.ts` — Streaming response generation + markdown safeguards
- `src/components/Chat.jsx` — Real-time SSE stream consumption
- `src/components/Chat.css` — Streaming animation styling
- `tests/chat-streaming.spec.js` — 20+ test cases for format, tone, edge cases

**Key Links (Where Breakage Occurs):**
- Edge Function → Anthropic SDK: if `stream()` not used, no streaming
- Chat Component → Edge Function: if SSE not consumed, text doesn't appear in real-time
- System Prompt → Response: if prompt doesn't forbid markdown, artifacts leak through

### Context & Constraints

**From Phase 6 Summary:**
- Edge Function security is solid (API key server-side only)
- System prompt is in place with explicit markdown forbidding
- Chat component architecture proven and working
- Build succeeds, security audit passed

**From Project Philosophy:**
- Design is Bauhaus/Joe Gebbia: typography-first, minimal color, zero decoration
- No framework bloat (custom CSS, no Tailwind)
- Streaming animations should be subtle, not distracting

**Technical Constraints:**
- Edge Function timeout: 150s (streaming is within budget)
- max_tokens: 512 (recommended for chat)
- Browser EventSource API: built-in, no external library needed
- CORS headers: already configured in Phase 6

**Requirements Mapping:**
- `CHAT-STREAMING` — Tasks 1, 2, 3 (Edge Function, Component, CSS)
- `CHAT-FORMAT` — Task 4 (20+ tests for markdown prevention)
- `COACH-TONE` — Task 4 (4 tests for tone consistency)

---

## Scope & Context Budget

**Total Context Used:** ~45-50% (within target)

| Task | Files | Complexity | Context Impact |
|------|-------|-----------|-----------------|
| Task 1 | 1 file (Edge Function) | Medium (streaming + fallback) | ~15% |
| Task 2 | 1 file (Chat component) | Medium (SSE handler) | ~15% |
| Task 3 | 1 file (CSS) | Low (styling only) | ~10% |
| Task 4 | 2 files (test suite) | High (20+ tests, setup) | ~20% |
| Task 5 | 1 file (documentation) | Low (guide writing) | ~10% |
| Task 6 | 1 file (performance test) | Medium (measurement) | ~10% |
| **Total** | **7 files** | **Mixed** | **~80% (across Wave 1+2)** |

**Context distribution:**
- Per-task execution: ~15-20% per task
- Parallel execution of 3 Wave 1 tasks: ~45% combined
- Wave 2 tasks: ~30-40% combined
- Total for entire phase: ~50% (well within healthy range)

---

## Wave Structure & Execution Order

```
Wave 1 (Parallel - Can execute simultaneously):
  ├─ Task 1: Edge Function Streaming (supabase/functions/chat/index.ts)
  ├─ Task 2: Chat Component SSE Handler (src/components/Chat.jsx)
  └─ Task 3: CSS Streaming Styling (src/components/Chat.css)

Wave 2 (Sequential after Wave 1, can run in parallel with each other):
  ├─ Task 4: Test Suite (tests/chat-streaming.spec.js)
  ├─ Task 5: Documentation (.planning/PHASE-7-SYSTEM-PROMPT-GUIDE.md)
  └─ Task 6: Performance Testing (tests/chat-performance.spec.js)
```

**Execution Strategy:**
1. Start all Wave 1 tasks in parallel (if using multi-threaded executor or multiple Claude instances)
2. After Wave 1 completes, start Wave 2 tasks (can be parallel or sequential)
3. Task 4 (tests) is critical path — blocks deployment
4. Task 5 (docs) and Task 6 (perf testing) are non-blocking

**Estimated Execution Time:**
- Wave 1: ~30-40 minutes (parallel execution)
- Wave 2: ~40-50 minutes (sequential or parallel)
- Total: ~70-90 minutes for full phase

---

## Key Decisions & Tradeoffs

### Decision 1: Streaming Implementation via Server-Sent Events (SSE)

**Why SSE over WebSocket or other?**
- SSE is unidirectional (client listens, server sends) — perfect for chat
- Built-in browser EventSource API (no library needed)
- Works with standard HTTP (no port conflicts)
- Easier debugging (just text in Network tab)

**Alternative Considered:** WebSocket — but adds complexity, requires more infrastructure, not needed for one-directional streaming.

### Decision 2: Markdown Fallback Handler

**Why keep system prompt + fallback instead of relying on prompt alone?**
- System prompt is ~95-99% effective, but 1-5% edge cases exist
- Claude sometimes ignores explicit formatting instructions under certain conditions
- Fallback is cheap (string replacement) and prevents user-facing issue
- Cost of not having fallback: user sees ** | ``` artifacts (bad UX)

**Implementation:** Simple regex to strip markdown characters from response. Tested to avoid breaking real content (e.g., email addresses).

### Decision 3: Keep Both Streaming and Non-Streaming Pathways

**Why not force streaming?**
- Provides graceful degradation if streaming fails
- Easier to debug issues (can test non-streaming path)
- Backward compatible with existing infrastructure
- Some network conditions may not support streaming well (can fall back)

---

## Testing Strategy

**Test Coverage: 20+ test cases organized by concern**

1. **Markdown Prevention (5 tests)**
   - No **, __, `, |, ``` in responses
   - Validates system prompt effectiveness

2. **Prose Quality (5 tests)**
   - No bullet points, no numbered lists, no headers
   - Validates format consistency

3. **Executive Coach Tone (4 tests)**
   - Warm and direct language
   - Specific with numbers
   - Actionable observations
   - Honest feedback (no flattery)

4. **Streaming Behavior (4 tests)**
   - Valid SSE format
   - Text accumulation without duplication
   - Stream completion without hanging
   - 500+ character responses

5. **Edge Cases (2 tests)**
   - No time entries (graceful message)
   - API errors (error handling)

**Test Execution:**
- All tests run via `npm test -- tests/chat-streaming.spec.js`
- Each test has <30s timeout (streaming may be slow)
- Tests can use real API (requires ANTHROPIC_API_KEY) or mocked responses

---

## Deployment & Rollout

**Deployment Order:**
1. Deploy Edge Function to Supabase: `supabase functions deploy chat`
2. Deploy React component and CSS to Vercel: `git push origin master` (auto-deploys)
3. Verify in production: test 5-10 chat requests manually
4. Monitor: watch for any markdown artifacts in logs (should be zero)

**Rollback Plan:**
- If streaming causes issues, revert to non-streaming code (git revert)
- Fallback in Chat component ensures we can serve non-streaming responses
- If markdown still appears, adjust system prompt (proven approach from Phase 6)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Stream interruption (network) | User sees incomplete text | Timeout handler + error message |
| Streaming not supported by browser | Chat doesn't work | Fallback to non-streaming JSON response |
| Markdown still leaks through | Bad UX (user sees artifacts) | Fallback markdown remover in Task 1 |
| Performance worse than expected | User disappointed | Measure in Task 6, optimize if needed |
| Tests too flaky (timeout issues) | Can't deploy confidently | Use generous timeouts (30s), mock when needed |

---

## Files Modified/Created

**New Files:**
- `.planning/PHASE-7-PLAN.md` — Detailed execution plan
- `tests/chat-streaming.spec.js` — Comprehensive test suite
- `tests/chat-streaming-edge-cases.spec.js` — Additional edge case tests
- `tests/chat-performance.spec.js` — Performance measurement tests
- `.planning/PHASE-7-SYSTEM-PROMPT-GUIDE.md` — Documentation for maintainers

**Modified Files:**
- `supabase/functions/chat/index.ts` — Add streaming support
- `src/components/Chat.jsx` — Add SSE stream consumption
- `src/components/Chat.css` — Add streaming animations

---

## Acceptance Criteria

✅ **All phase goals met:**
1. No markdown artifacts visible in any response (validated by 20+ tests)
2. Streaming enabled and working (SSE format verified)
3. Consistent executive coach tone (4 tone tests passing)
4. Component handles streaming + non-streaming gracefully
5. Performance improved (time-to-first-token < 1s with streaming)
6. Comprehensive test suite (20+ tests, all passing)
7. Documentation complete (system prompt guide created)
8. Code committed and ready for deployment

---

## Next Steps

**Immediate (after planning):**
1. Execute Wave 1 tasks in parallel (Edge Function, Component, CSS)
2. Verify no build errors: `npm run build`
3. Test locally: `npm run dev` and `supabase functions serve`

**After Wave 1 completes:**
4. Execute Wave 2 tasks (Tests, Docs, Performance)
5. Run full test suite: `npm test`
6. Review performance metrics

**Pre-deployment:**
7. All tests passing
8. Zero console errors
9. Responsive design verified (mobile + desktop)
10. System prompt guide reviewed

**Deployment:**
11. Deploy to Vercel
12. Deploy Edge Functions to Supabase
13. Run production verification (5-10 manual chat tests)
14. Monitor for regressions

---

## Success Metrics

| Metric | Target | Validation |
|--------|--------|-----------|
| Markdown artifacts | 0% (0 in 20+ tests) | Test suite |
| Prose quality | 100% valid prose | Test suite + manual review |
| Tone consistency | 100% executive coach | 4 tone tests passing |
| Streaming latency (TTFT) | <1s | Task 6 performance test |
| Test coverage | 20+ tests, 100% passing | npm test output |
| Build success | 100% | `npm run build` |
| No regressions | 0 breaking changes | Compare Phase 6 functionality |

---

## Estimated Effort

- **Wave 1:** 30-40 minutes (parallel execution)
- **Wave 2:** 40-50 minutes (includes test setup, documentation)
- **Total:** ~70-90 minutes for complete phase
- **Model:** Claude Haiku 4.5 (optimized for streaming + testing)

---

## Phase 7 Planning Complete ✅

Plan is detailed, scoped, verified, and ready for execution. All 6 tasks decomposed with clear actions, verifications, and acceptance criteria. Requirements mapped to tasks. Testing strategy comprehensive (20+ tests). No dependencies on external research or user decisions.

**Proceed to:** `/gsd:execute-phase 07-chat-quality`
