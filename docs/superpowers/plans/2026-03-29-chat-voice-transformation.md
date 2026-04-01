# Chat Voice Transformation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform chat responses from AI-formal with emoji/markdown to direct, ask-first Ray Dalio executive coach voice.

**Architecture:** Replace system prompt with ask-first principles-based instructions. Add a response sanitizer that strips emoji, markdown tables, bold, and decorative elements. Integrate sanitizer into SSE event stream before emitting to client.

**Tech Stack:** TypeScript/Deno, existing Anthropic SDK, existing Supabase client

---

### Task 1: Rewrite System Prompt for Ray Dalio Voice

**Files:**
- Modify: `supabase/functions/chat/system-prompt.ts`

- [ ] **Step 1: Read current system prompt to understand full context**

Already done — the current prompt is at lines 24-36 of system-prompt.ts.

- [ ] **Step 2: Replace system prompt logic with ask-first voice**

```typescript
import type { UserMemory } from './types.ts'

export function buildSystemPrompt(userMemory: UserMemory | null): string {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  let memoryContext = ''
  if (userMemory) {
    if (userMemory.goals && userMemory.goals.length > 0) {
      memoryContext += `\n## Your Goals\n${userMemory.goals.map((g) => `- ${g.goal} (${g.hours_per_week}h/week, priority: ${g.priority})`).join('\n')}`
    }
    if (userMemory.preferences && userMemory.preferences.length > 0) {
      memoryContext += `\n## Your Preferences\n${userMemory.preferences.map((p) => `- ${p.preference}`).join('\n')}`
    }
    if (userMemory.facts && userMemory.facts.length > 0) {
      memoryContext += `\n## Facts About You\n${userMemory.facts.map((f) => `- ${f.fact}`).join('\n')}`
    }
  }

  return `You are a time-tracking coach trained in systems thinking. You help users see patterns in their time allocation and challenge assumptions.

Today is ${today}.
${memoryContext}

## How you operate
- Lead with a diagnostic question based on their time data before showing numbers
- Query real time data with your tools before answering — never guess
- You can call multiple tools in parallel when needed
- When data is missing, tell the user plainly — never fabricate
- When you learn something important, use update_user_memory to remember it
- Show actual numbers without decoration (no emoji, no markdown tables, no bold)
- State one clear principle or insight plainly
- Sound like you are texting a coach, not an AI
- Keep it direct and concise (2-3 sentences max for insights, 1 sentence for simple answers)`
}
```

- [ ] **Step 3: Verify the new prompt is valid TypeScript**

Run: `deno check supabase/functions/chat/system-prompt.ts`

Expected: No type errors.

- [ ] **Step 4: Commit the system prompt change**

```bash
git add supabase/functions/chat/system-prompt.ts
git commit -m "refactor(chat): rewrite system prompt for ask-first Ray Dalio voice"
```

---

### Task 2: Create Response Sanitizer Utility

**Files:**
- Create: `supabase/functions/chat/response-sanitizer.ts`

- [ ] **Step 1: Create sanitizer with tests for emoji stripping**

```typescript
// supabase/functions/chat/response-sanitizer.ts

/**
 * Strip emoji, markdown tables, bold, and decorative elements from Claude response.
 * Preserves paragraph breaks and plain text readability.
 */
export function sanitizeResponse(text: string): string {
  let result = text

  // Strip emoji (including skin tone variants)
  result = result.replace(/[\p{Emoji}]/gu, '')

  // Strip markdown tables (| pattern)
  result = result.replace(/^\s*\|[\s\S]*?\|\s*$/gm, '')

  // Strip bold (**text** → text)
  result = result.replace(/\*\*([^*]+)\*\*/g, '$1')

  // Strip italics (*text* → text)
  result = result.replace(/\*([^*]+)\*/g, '$1')

  // Strip markdown headers (## Header → Header)
  result = result.replace(/^#+\s+/gm, '')

  // Strip markdown links [text](url) → text
  result = result.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')

  // Clean up excessive whitespace but preserve intentional paragraph breaks
  result = result.replace(/\n{3,}/g, '\n\n')
  result = result.trim()

  return result
}

/**
 * Test the sanitizer function.
 */
export function testSanitizer(): void {
  const testCases = [
    {
      input: 'Work is **dominant** [work] — 41.5 hours is a full workweek.',
      expected: 'Work is dominant — 41.5 hours is a full workweek.',
    },
    {
      input: '| Category | Hours |\n|---|---|\n| [work] Work | 41.5h |',
      expected: '',
    },
    {
      input: 'You logged 41.5 hours. *Is that intentional?*',
      expected: 'You logged 41.5 hours. Is that intentional?',
    },
    {
      input: '## Here\'s your week\n\nWork 41.5h, Exercise 1.5h.',
      expected: 'Here\'s your week\n\nWork 41.5h, Exercise 1.5h.',
    },
    {
      input: 'Check [your goals](https://example.com) for details.',
      expected: 'Check your goals for details.',
    },
  ]

  for (const { input, expected } of testCases) {
    const result = sanitizeResponse(input)
    if (result !== expected) {
      throw new Error(
        `Sanitizer test failed.\nInput: ${input}\nExpected: ${expected}\nGot: ${result}`
      )
    }
  }

  console.log('[sanitizer] All tests passed')
}
```

- [ ] **Step 2: Run sanitizer tests to verify they pass**

Run: `deno test --allow-all supabase/functions/chat/response-sanitizer.ts`

Expected: "All tests passed" message.

- [ ] **Step 3: Commit the sanitizer**

```bash
git add supabase/functions/chat/response-sanitizer.ts
git commit -m "feat(chat): add response sanitizer to strip emoji and markdown"
```

---

### Task 3: Integrate Sanitizer into Chat Stream

**Files:**
- Modify: `supabase/functions/chat/index.ts:171-173` (text event emission)

- [ ] **Step 1: Add import for sanitizer at top of index.ts**

Find line 1-8 (imports section) and add:

```typescript
import { sanitizeResponse } from './response-sanitizer.ts'
```

Full imports section should look like:
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.80.0'

import { classifyIntent } from './intent-classifier.ts'
import { TOOL_DEFINITIONS, executeTool } from './tools.ts'
import { buildSystemPrompt } from './system-prompt.ts'
import { loadConversationContext, saveMessage, maybeSetSessionTitle, createSession } from './memory.ts'
import { sanitizeResponse } from './response-sanitizer.ts'
import type { SSEEvent } from './types.ts'
```

- [ ] **Step 2: Sanitize text before emitting in stream**

Find line 171-173 (the `stream.on('text', ...)` handler):

```typescript
          stream.on('text', (delta: string) => {
            finalText += delta
            emit({ type: 'text', text: delta })
          })
```

Replace with:

```typescript
          stream.on('text', (delta: string) => {
            finalText += delta
            const sanitized = sanitizeResponse(delta)
            emit({ type: 'text', text: sanitized })
          })
```

- [ ] **Step 3: Verify file compiles**

Run: `deno check supabase/functions/chat/index.ts`

Expected: No type errors.

- [ ] **Step 4: Commit the integration**

```bash
git add supabase/functions/chat/index.ts
git commit -m "feat(chat): integrate response sanitizer into SSE stream"
```

---

### Task 4: Sanitize Final Response Before Saving

**Files:**
- Modify: `supabase/functions/chat/index.ts:254-257`

- [ ] **Step 1: Sanitize finalText before saving to database**

Find line 254-257:

```typescript
          // Save assistant message before closing stream
          if (finalText) {
            await saveMessage(supabase, userId, 'assistant', finalText, sessionId)
            await maybeSetSessionTitle(supabase, sessionId, message)
          }
```

Replace with:

```typescript
          // Save assistant message before closing stream
          if (finalText) {
            const sanitizedFinalText = sanitizeResponse(finalText)
            await saveMessage(supabase, userId, 'assistant', sanitizedFinalText, sessionId)
            await maybeSetSessionTitle(supabase, sessionId, message)
          }
```

- [ ] **Step 2: Also sanitize fast-path responses**

Find line 99-102 (fast-path response formatting):

```typescript
      // Build assistant response
      const responseContent =
        toolResult.status === 'ok'
          ? JSON.stringify(toolResult.data)
          : toolResult.message || 'Unable to retrieve data'
```

Replace with:

```typescript
      // Build assistant response
      let responseContent =
        toolResult.status === 'ok'
          ? JSON.stringify(toolResult.data)
          : toolResult.message || 'Unable to retrieve data'
      responseContent = sanitizeResponse(responseContent)
```

- [ ] **Step 3: Verify file compiles**

Run: `deno check supabase/functions/chat/index.ts`

Expected: No type errors.

- [ ] **Step 4: Commit the changes**

```bash
git add supabase/functions/chat/index.ts
git commit -m "feat(chat): sanitize responses before saving to database"
```

---

### Task 5: Format Tool Results as Plain Text (No Markdown Tables)

**Files:**
- Modify: `supabase/functions/chat/tools.ts` (check current output format)

- [ ] **Step 1: Read tools.ts to see how tool results are formatted**

Already have access — need to check if any tools format with markdown tables.

- [ ] **Step 2: Review tools.ts for markdown table formatting**

```bash
grep -n "^\|" supabase/functions/chat/tools.ts
```

Expected: Either find markdown table patterns or confirm none exist.

- [ ] **Step 3: If tables found, reformat as plain text**

For example, if a tool returns:
```
| Activity | Hours |
|---|---|
| Work | 40 |
```

Reformat to:
```
Activity: Work, Hours: 40
```

(Exact changes depend on step 2 findings — if no tables found, skip to step 4)

- [ ] **Step 4: Commit any tool formatting changes**

```bash
git add supabase/functions/chat/tools.ts
git commit -m "refactor(chat): format tool results as plain text, no markdown tables"
```

---

### Task 6: Manual Testing — Verify Ray Dalio Voice in Practice

**Files:**
- None (manual testing)

- [ ] **Step 1: Deploy chat function locally**

Run: `supabase functions serve` (in a terminal)

Expected: Chat function serving on http://localhost:54321/functions/v1/chat

- [ ] **Step 2: Test with sample data**

Send a test request:
```bash
curl -X POST http://localhost:54321/functions/v1/chat \
  -H "Authorization: Bearer YOUR_TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "How did I spend my time this week?"}'
```

Expected: Response should be plain text, no emoji, no markdown tables, starts with a diagnostic question.

- [ ] **Step 3: Verify no emoji in response**

Check response output manually — should contain zero emoji characters.

- [ ] **Step 4: Verify ask-first structure**

Response should lead with a question like "Are you tracking everything you meant to?" before showing data.

- [ ] **Step 5: No step needed — testing complete**

Manual testing validates the voice works as intended.

---

## Self-Review

**Spec coverage:**
- [ok] Rewrite system-prompt.ts for ask-first voice — Task 1
- [ok] Add response sanitization to strip emoji/markdown — Task 2
- [ok] Integrate sanitizer into SSE stream — Task 3
- [ok] Sanitize saved responses — Task 4
- [ok] Format tool results as plain text — Task 5
- [ok] Manual testing for voice validation — Task 6

**Placeholder scan:**
- No "TBD", "TODO", or vague instructions
- All code blocks complete and exact
- All test cases concrete

**Type consistency:**
- `sanitizeResponse()` defined in Task 2, used consistently in Task 3 and 4
- Import path matches file creation
- No undefined functions

**No gaps found.**
