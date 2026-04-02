---
phase: 07-chat-quality
plan: 01
task: 5
name: "Document system prompt philosophy and streaming implementation"
status: COMPLETE
completed_at: 2026-03-29T12:30:00Z
duration_minutes: 15
author: Claude Haiku
---

# Task 5 Summary: System Prompt Philosophy and Streaming Implementation Guide

## Objective

Create comprehensive internal documentation for maintaining and evolving the chat system, covering system prompt design, streaming implementation, markdown safeguards, testing strategy, and future evolution paths.

## What Was Built

**File Created:** `.planning/PHASE-7-SYSTEM-PROMPT-GUIDE.md`
- **Size:** 632 lines
- **Format:** Markdown documentation
- **Sections:** 5 required sections + subsections with examples

## Implementation Details

### 1. System Prompt Philosophy (125 lines)

Documented the rationale for plain prose (no markdown) output:
- **Natural conversation** - reads more human-like than formatted lists
- **Consistent display** - identical across browser, mobile, terminal, text export
- **Prevents distraction** - keeps focus on insight, not formatting
- **Mobile-first design** - markdown often renders poorly on small screens

Detailed the "executive coach" voice characteristics:
1. **Warm and direct** (not flattery) - with examples of good vs. bad phrasing
2. **Honest feedback with curiosity** - direct but non-judgmental approach
3. **Specific with numbers and data** - grounding observations in actual data
4. **Actionable observations and questions** - ending with reflection prompts

Documented safeguards:
- Primary: System prompt instruction (explicit "no markdown" in 13-line detailed prompt)
- Secondary: `removeMarkdownArtifacts()` function for 1-5% edge cases
- Explained why natural conversation beats formatting with comparative example

### 2. Streaming Implementation (140 lines)

Explained Server-Sent Events (SSE) pattern:
- Complete architecture diagram from Client → Edge Function → Anthropic API → Browser
- Detailed flow showing how chunks are accumulated and re-emitted

Documented event types:
- **content_block_delta** - text chunk events with JSON structure example
- **message_stop** - stream completion signal
- **stream_error** - fallback on stream interruption

Provided example stream flow:
- User question through Edge Function processing to browser rendering
- Shows real-time text accumulation behavior

Documented configuration:
- **Edge Function timeout:** 150 seconds (Supabase Edge Function limit)
- **max_tokens:** 512 (optimal for 1-2 paragraph responses)
- **Client timeout:** 30 seconds (AbortController safety net)

Explained fallback behavior for three scenarios:
1. Stream creation fails → non-streaming fallback with SSE wrapper
2. Stream interrupts mid-way → partial response with fallback flag
3. Client timeout → network error handling

### 3. Markdown Fallback Logic (120 lines)

Explained why 1-5% fallback exists:
- Contradictory training data in Claude models
- Complex topics triggering formatting
- System prompt injection edge cases

Detailed what gets removed:
- Line-level markdown structures (** , __, ``` , ~~~ , |)
- Preserves inline content (email addresses, legitimate content)
- Table showing removal patterns with examples

Provided step-by-step how it works:
1. Split response into lines
2. Filter lines starting with markdown indicators
3. Keep non-markdown lines
4. Rejoin and trim

Covered edge cases:
- Email addresses (safe - | check is line-start only)
- Inline markdown (not removed to avoid complexity)
- Code examples (Prohairesis has no legitimate code return)
- Newlines (preserved for paragraph breaks)

### 4. Testing Strategy (120 lines)

Detailed regular testing approach:
- Run before each deployment: `npm test -- tests/chat-streaming.spec.js`
- Quarterly testing with diverse prompts for tone drift detection
- Production monitoring with markdown removal logging

Specified test categories (20+ tests):
- **Markdown Prevention** (5 tests) - No **, __, ` , | in responses
- **Prose Quality** (5 tests) - Continuous prose, no lists/headers, natural reading, 1-2 paragraphs
- **Executive Coach Tone** (4 tests) - Warmth, specificity with numbers, actionable, no flattery
- **Streaming Behavior** (4 tests) - Valid SSE format, no duplication, completes, handles long responses
- **Edge Cases** (2 tests) - No time entries, API errors

Provided monitoring approach:
- Log markdown removal frequency to Sentry/LogRocket
- Alert threshold: > 5% markdown removal indicates regression

### 5. Future Evolution (115 lines)

Documented evolution paths:

**If Tone Drifts:**
- Symptom detection via quarterly testing
- Root cause analysis (API model change, accidental prompt modification, user feedback)
- Fix process: detect → identify → adjust → A/B test → measure → document
- Example adjustment with explicit "warm without flattery" clarification

**If Streaming Causes Issues:**
- Fallback to non-streaming mode (code already structured for this)
- Revert is 5-minute change with minimal risk
- Both streaming and non-streaming return consistent SSE format

**If Tests Start Failing:**
- Troubleshooting steps (check API key, model name, system prompt, environment)
- Single test verbose logging for debugging
- Check API documentation for breaking changes
- Rollback capability with git revert

**Version Control Practices:**
- Document every system prompt change in git
- Include in commit messages: what changed, why, impact, testing verification
- Example commit provided showing proper format

## Verification

All acceptance criteria met:

- [x] File exists and is readable: `.planning/PHASE-7-SYSTEM-PROMPT-GUIDE.md`
- [x] Contains all 5 required sections with comprehensive content
- [x] No broken markdown syntax (proper code blocks, links, formatting)
- [x] Well-organized with clear section hierarchy (5 main sections, 22 subsections)
- [x] Saves to .planning/ directory
- [x] Includes code examples from actual implementation
- [x] References actual files (supabase/functions/chat/index.ts, src/components/Chat.jsx)
- [x] Provides actionable guidance for maintainers
- [x] Documents edge cases and troubleshooting

## Key Achievements

1. **Comprehensive Philosophy Documentation** - Explained not just what the system does, but why, with clear rationale for every design decision

2. **Practical Implementation Guide** - Grounded in actual code (lines referenced, TypeScript examples provided), not theoretical

3. **Maintainability Focus** - Written for future developers who need to understand, debug, or evolve the system

4. **Testing and Monitoring** - Provided concrete testing strategy with 5 categories and 20+ test cases referenced

5. **Future-Proofing** - Covered evolution scenarios (tone drift, API changes, streaming issues) with specific troubleshooting steps

## File Links

- Created: `.planning/PHASE-7-SYSTEM-PROMPT-GUIDE.md`
- Commit: `754fbdf` - docs(07-chat-quality-01): system prompt philosophy and streaming implementation guide
- References:
  - `supabase/functions/chat/index.ts` - Streaming implementation with markdown remover
  - `src/components/Chat.jsx` - SSE stream consumer
  - `src/components/Chat.css` - Streaming UI styling

## Quality Notes

- Documentation is substantive: 632 lines covering philosophy, architecture, implementation details, testing, and evolution
- Includes both conceptual explanations and practical code examples
- Aligned with project's high-taste design philosophy (restrained, purposeful)
- Structured for quick reference (section numbers, subsection hierarchy, tables for comparison)
- Each section is self-contained but cross-references other sections

## Next Steps

This guide is ready for:
1. Team handoff and knowledge transfer
2. Future system prompt adjustments
3. Debugging markdown issues or tone problems
4. Validating streaming implementation changes
5. On-boarding new developers to the chat system

The guide forms the foundation for maintaining chat quality and enabling future evolution without losing the carefully-tuned voice and streaming behavior.

---

**Task Status:** COMPLETE
**Acceptance Criteria:** ALL MET
**Quality:** PRODUCTION READY
