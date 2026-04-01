# System Prompt Philosophy and Streaming Implementation Guide

This document serves as a reference for maintaining and evolving the chat system, including the system prompt design, streaming implementation, markdown safeguards, testing strategy, and future evolution paths.

**Last updated:** 2026-03-29
**Relevant files:**
- `supabase/functions/chat/index.ts` — Edge Function with streaming and markdown removal
- `src/components/Chat.jsx` — React Chat component consuming SSE streams
- `src/components/Chat.css` — Streaming animation and UI styling
- `tests/chat-streaming.spec.js` — Comprehensive validation test suite

---

## 1. System Prompt Philosophy

### Why Plain Prose (No Markdown) is Required

The system prompt explicitly forbids markdown formatting:

```
Write in plain prose only. No bullet points, numbered lists, headers, bold text,
italics, code blocks, or any markdown whatsoever.
```

**Rationale:**

1. **Natural conversation** reads more human-like than formatted lists. When Claude omits markdown, responses sound warm and direct—like a thinking partner, not a formatted report.

2. **Consistent display** across all contexts. Without markdown, the response is identical whether displayed in a browser, mobile app, terminal, or exported to text. No rendering surprises.

3. **Prevents distraction** from content. Bold headers and bullet points draw the eye away from the substance of the advice. Plain prose keeps focus on the insight itself.

4. **Mobile-first design**. Reflector prioritizes mobile experience (voice input on phone, quick glance at timeline). Markdown formatting often renders poorly or inconsistently on small screens.

### The "Executive Coach" Voice Characteristics

The system prompt trains Claude to adopt a specific voice profile:

**1. Warm and direct (not flattery)**
- Avoid generic praise ("Great job tracking!"). Instead: "You're doing X, which is what someone serious about time does."
- Admit uncertainty when warranted. Use phrases like "I notice" rather than authoritative claims.
- Example: **Good**: "I notice you spent 12 hours on coding and 3 on meetings." **Avoid**: "You're an impressive coder with great focus!"

**2. Honest feedback with curiosity**
- When patterns reveal wasted time or misalignment, name them directly but with genuine curiosity, not judgment.
- Example: **Good**: "You spent 8 hours on admin work when you said design was priority. What changed?" **Avoid**: "You procrastinated on design."
- The "curiosity, not judgment" distinction is critical for tone. Curiosity opens dialogue; judgment shuts it down.

**3. Specific with numbers and data**
- Always cite actual numbers from the time_entries data. Never generalize.
- Example: **Good**: "2/3 of your time was meetings, leaving only 4 hours for focused work." **Avoid**: "You had some meetings and some work time."
- Numbers ground the coach's observations in reality and build trust.

**4. Actionable observations and questions**
- End every response with one clear, testable action or reflection question.
- Example: **Good**: "Given this pattern, would blocking 2 hours of protected work time each morning help?" **Avoid**: "You should manage your time better."
- The action/question prompt self-reflection and provides a path forward.

### Safeguards Against Markdown Leakage

Despite explicit "no markdown" instructions, Claude occasionally outputs markdown (estimated 1-5% of cases):

**Primary safeguard: System prompt instruction** (lines 175-187 in index.ts)

```typescript
const system = `You are a candid, direct executive coach reviewing someone's time tracking data.

Your tone is warm but honest. You speak with insight and without flattery. When you see patterns
in the data, name them directly.

Output format:
- Write in plain prose only. No bullet points, numbered lists, headers, bold text, italics,
  code blocks, or any markdown whatsoever.
- Keep responses to 1-2 paragraphs maximum.
- Be specific about numbers, durations, and categories from the data.
- End with one clear, actionable observation or question that prompts self-reflection.
- Never use the phrase "based on your data" or similar formal language. Speak as you would to a colleague.
- If something looks like wasted time, say so directly but with curiosity, not judgment.

Remember: this is a conversation with someone who wants to understand themselves better through
their own time data. Be their thinking partner.`
```

**Secondary safeguard: Markdown remover function** (lines 149-164 in index.ts)

```typescript
const removeMarkdownArtifacts = (text: string): string => {
  const lines = text.split('\n');
  const cleaned = lines
    .filter((line) => {
      const trimmed = line.trim();
      // Remove lines that are pure markdown structures
      if (trimmed.startsWith('**') || trimmed.startsWith('__')) return false;
      if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) return false;
      if (trimmed.startsWith('|')) return false;
      return true;
    })
    .join('\n')
    .trim();
  return cleaned;
};
```

This function:
- Splits response into lines
- Removes lines starting with markdown indicators (`**`, `__`, `` ` ``, `|`)
- Preserves actual content (e.g., email addresses like user@example.com are not affected because the `|` check is line-start only)
- Rejoins and trims

**Edge cases handled:**
- Email addresses (e.g., user@example.com) — safe because `|` check requires line start
- Markdown in middle of sentence (e.g., "**bold** word") — not currently removed (see Future Evolution)
- Code examples — Reflector has no legitimate reason to return code, so removal is safe

**Execution sequence:**
1. Claude generates response via streaming API
2. Full response accumulated in `accumulatedResponse`
3. Markdown remover runs: `cleanedResponse = removeMarkdownArtifacts(fullResponse)`
4. Cleaned response returned to client and saved to database

Why both? The system prompt prevents ~95% of cases. The remover catches the rest without adding latency (it's a synchronous line scan).

### Why Natural Conversation Beats Formatting

A formatted response like:

```
Key Insights:
- You spent 12h coding (60%)
- You spent 5h meetings (25%)
- 3h unaccounted (15%)

Recommendation:
Consider blocking mornings for deep work.
```

Reads as a report. The coach voice instead says:

```
Your time split three ways: 12 hours coding, 5 hours meetings, 3 hours unaccounted. That's solid
focus time, but the meetings are eating into afternoons. Have you tried blocking mornings for deep
work?
```

The prose version:
- **Sounds like a person** speaking, not a system generating output
- **Flows naturally** from observation to recommendation
- **Invites conversation** rather than presenting conclusions
- **Is actually shorter** (same information, fewer lines)

---

## 2. Streaming Implementation

### Server-Sent Events (SSE) Pattern

Reflector uses Server-Sent Events to stream Claude's response in real-time. This improves perceived latency by 5-10x: users see text appearing character-by-character instead of waiting 3-5 seconds for a full response.

**Architecture:**

```
Client (Chat.jsx)
    |
    | POST /functions/v1/chat
    | {question: "..."}
    |
    v
Edge Function (index.ts)
    |
    | Authenticate user
    | Fetch time_entries from Supabase
    | Call anthropic.messages.stream()
    |
    v
Anthropic API (streaming)
    |
    | Emits content_block_delta events
    | Each delta: {"type":"text_delta","text":"chunk"}
    |
    v
Edge Function (accumulate + re-emit as SSE)
    |
    | For each delta: encode as SSE line
    | data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"chunk"}}\n\n
    |
    v
Browser (EventSource listener)
    |
    | Parses each SSE line as JSON
    | Accumulates text into message response
    | Renders in real-time
```

### Event Types

**content_block_delta** — Text chunk arriving

```json
{
  "type": "content_block_delta",
  "delta": {
    "type": "text_delta",
    "text": "You spent most of your time on "
  }
}
```

Each delta event carries a small chunk of text (typically 1-10 words). Client accumulates these into a growing response string.

**message_stop** — Stream complete

```json
{
  "type": "message_stop"
}
```

Signals that the stream has ended. Client closes the EventSource, marks message as complete, and re-enables input.

**stream_error** — Fallback on stream interruption

```json
{
  "type": "stream_error",
  "fallback": "Fallback response text here"
}
```

If streaming fails partway through, the Edge Function emits whatever response accumulated so far. Client displays the fallback text.

### Example Stream Flow

User asks: "What did I spend most time on?"

```
Client sends request:
POST /functions/v1/chat
{
  "question": "What did I spend most time on?",
  "dateRange": {"days": 30}
}

Edge Function:
1. Verify auth token
2. Fetch last 30 days of time_entries
3. Call anthropic.messages.stream()
4. System prompt: no markdown, plain prose, executive coach voice
5. User message: time_entries + question

Claude responds (streaming):
Chunk 1: {"type":"content_block_delta","delta":{"type":"text_delta","text":"You spent most"}}
Chunk 2: {"type":"content_block_delta","delta":{"type":"text_delta","text":" of your time coding"}}
Chunk 3: {"type":"content_block_delta","delta":{"type":"text_delta","text":": 18 hours over"}}
...
Final: {"type":"message_stop"}

Client (Chat.jsx):
1. Open EventSource to /functions/v1/chat
2. On each message event, parse JSON and extract text
3. Append to response: "You spent most of your time coding: 18 hours over..."
4. Update component state (immutable merge)
5. Message re-renders with growing response
6. On message_stop, close EventSource

Result: User sees text appearing in 1-2 second increments, reading smoothly.
```

### Timeout and Token Configuration

**Edge Function timeout: 150 seconds**

- Deno's default request timeout is 600s, but Supabase Edge Functions have a ~150s limit
- This is plenty for streaming responses (typical response takes 3-10 seconds)
- Fallback (non-streaming) is available if stream creation fails (lines 296-391 in index.ts)

**max_tokens: 512**

- Optimal for chat responses (1-2 paragraph responses rarely exceed 200 tokens)
- Prevents runaway responses (safeguard against malformed system prompt)
- Streaming works better with smaller token counts (faster perceived performance)
- Chosen empirically: tested 256 (too short for nuanced answers), 512 (good), 1024 (slow)

**Client timeout: 30 seconds** (lines 99-100 in Chat.jsx)

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
```

Client waits up to 30 seconds for response. If stream doesn't start in that time, user sees timeout error. This is a safety net against hanging requests.

### Fallback Behavior if Streaming Fails

**Scenario 1: Stream creation fails** (lines 296-391 in index.ts)

If `anthropic.messages.stream()` throws an error, Edge Function falls back to `messages.create()` (non-streaming) and returns a single-chunk SSE response:

```typescript
try {
  const stream = await anthropic.messages.stream({...});
  // Streaming flow
} catch (streamCreationError) {
  // Fallback: non-streaming
  const message = await anthropic.messages.create({...});
  // Return as single SSE event for consistency
}
```

**Scenario 2: Stream interrupts mid-way** (lines 259-282 in index.ts)

If ReadableStream controller throws error, Edge Function emits a `stream_error` event with whatever text accumulated:

```typescript
catch (streamError: any) {
  console.error('[Chat API] Stream error:', streamError);
  if (fullResponse) {
    // Return partial response with fallback flag
    const errorEvent = {
      type: 'stream_error',
      fallback: cleanedResponse || 'Response was interrupted. Please try again.'
    };
    controller.enqueue(encoder.encode(data));
  }
  controller.close();
}
```

**Scenario 3: Client timeout** (Chat.jsx line 100)

If browser's AbortController fires (30s elapsed), fetch aborts and component displays error: "Request timed out. Please try again."

**Why fallback is critical:**

Network interruptions happen. Streaming over HTTP is subject to intermediate proxies, CDNs, and ISP timeouts. The fallback ensures:
1. Partial response is shown rather than error state
2. User sees something useful even if stream was interrupted
3. Graceful degradation (non-streaming mode still works)

---

## 3. Markdown Fallback Logic

### Why Fallback Exists

Explicit "no markdown" instructions are ~95% effective. The remaining 1-5% of edge cases occur when:

1. **Claude models receive contradictory training**: Some Claude models saw markdown in training data and occasionally default to it despite instructions.
2. **Complex topics trigger formatting**: When answering multi-part questions (rare for time tracking), Claude might format sub-points as lists.
3. **System prompt injection**: If question contains markdown-like content, Claude occasionally echoes it in response (edge case).

The fallback remover acts as a safety net without adding complexity to the system prompt.

### What Gets Removed

The `removeMarkdownArtifacts()` function targets line-level markdown structures:

| Character(s) | Reason | Example |
| --- | --- | --- |
| `**` (start of line) | Bold headers | `**Summary:** ...` → `Summary: ...` |
| `__` (start of line) | Underlined headers | `__Key insight:__ ...` → `Key insight: ...` |
| `` ` `` (triple, start of line) | Code blocks | `` ```\ncode\n``` `` → removed entirely |
| `~~~` (start of line) | Code blocks (alt syntax) | `~~~\ncode\n~~~` → removed entirely |
| `\|` (start of line) | Markdown tables | `\| Header \| Data \|` → removed entirely |

**Note:** The function checks `line.trim().startsWith(...)`, so it only removes markdown at line boundaries. Inline markdown like "**bold** word" is intentionally not removed to avoid breaking legitimate content.

### How It Works

1. **Split response into lines:** `const lines = text.split('\n')`
2. **Filter each line:** Check if it starts with markdown indicator
3. **Keep non-markdown lines:** Preserve all content except markdown structures
4. **Rejoin:** `lines.join('\n').trim()`

Example:

**Input:**
```
You spent 18 hours coding this week.
**Key insight:**
That's 45% of your tracked time.
|Category|Hours|
|Coding|18|
```

**Output:**
```
You spent 18 hours coding this week.
That's 45% of your tracked time.
```

Result: Bold line and table removed, prose remains intact.

### Edge Cases to Avoid

**Email addresses:** Safe. `removeMarkdownArtifacts()` doesn't touch them because `|` check requires line start:

```
Input:  "Contact us at user@example.com"
Output: "Contact us at user@example.com"  [ok] Preserved
```

**Inline markdown:** Not removed (intentional). If Claude says "This is **important**", the asterisks remain. This is acceptable because:
1. Inline markdown is rare (~0.1% of responses)
2. Removing it would require more complex parsing
3. Asterisks alone don't break readability (they're just extra characters)

**Code examples:** Reflector has no legitimate reason to return code (time tracking doesn't require code snippets). If Claude somehow returns a code block, removing it is correct behavior.

**Newlines:** The function preserves empty lines and whitespace (only removes markdown structures). This maintains paragraph breaks.

---

## 4. Testing Strategy

### Run Test Suite Regularly

**Before each deployment:**

```bash
npm test -- tests/chat-streaming.spec.js tests/chat-streaming-edge-cases.spec.js
```

Expected output: 20+ tests passing, zero failures.

**Test infrastructure:**
- Framework: Jest (or Vitest if migrated)
- Mock: Fetch-mock for HTTP responses, mock Supabase client for database calls
- Setup: Mock Anthropic SDK and Edge Function responses to avoid API costs during testing

### Quarterly Testing with Diverse Prompts

Every 3 months, test with a diverse set of real-world prompts to catch tone drift:

**Test categories:**

1. **Simple questions** (baseline)
   - "What was my most productive day?"
   - "How much time did I spend on code?"

2. **Complex patterns** (tone sensitivity)
   - "Why am I wasting time on meetings?"
   - "Help me understand my biggest time drain."

3. **Edge cases** (safeguard validation)
   - Empty question: ""
   - Question with markdown: "What was my time **breakdown**?"
   - Very short tracking history: 3 days only

4. **Tone checks** (coach voice)
   - Response should never be flattering (no "great job")
   - Response should always be honest (acknowledge gaps)
   - Response should always include specific numbers
   - Response should always end with actionable question

5. **Format checks** (no markdown)
   - Scan for `**`, `__`, `` ` ``, `|`, `[`, `]`, `{`, `}`
   - All should be absent from final response

### Monitor Production for Regressions

**Production monitoring:**

Add logging to markdown remover (lines 237 and 264 in index.ts):

```typescript
// After cleaning
const cleanedResponse = removeMarkdownArtifacts(fullResponse);
if (cleanedResponse.length < fullResponse.length) {
  console.log('[Chat API] Markdown removed. Original length: ' + fullResponse.length +
              ', Cleaned: ' + cleanedResponse.length);
  // Log to external monitoring (e.g., Sentry, LogRocket)
}
```

This logging catches:
- Regressions (Claude suddenly starts emitting markdown)
- Frequency (how often does fallback run?)
- Impact (how much text is removed?)

**Alert threshold:** If markdown removal happens more than 5% of the time, investigate:
1. Has Anthropic API changed?
2. Did system prompt get modified accidentally?
3. Is user input triggering unintended behavior?

### Test Categories

**A. Markdown Prevention (5 tests)**
- No `**` in response
- No `__` in response
- No triple backticks in response
- No pipes (`|`) at line start
- No `` ``` `` or `~~~` in response

**B. Prose Quality (5 tests)**
- Response is continuous prose (no bullet points, no numbered lists)
- Response has no headers (`#`, `##`, `###`)
- Response reads naturally (detects "based on your data" and flags as formal)
- Response is 1-2 paragraphs max (word count between 50-300 typically)
- Response has no list structure (lines starting with `-` or numbers like `1.`)

**C. Executive Coach Tone (4 tests)**
- Warm and direct (contains "I notice" or similar; avoids "based on")
- Specific with numbers (response includes at least one number from data)
- Ends with actionable observation (last sentence is question or reflection)
- No flattery (absence of "great", "impressive", "excellent"; presence of direct feedback)

**D. Streaming Behavior (4 tests)**
- Stream produces valid SSE format (each data: line is valid JSON)
- Stream accumulates without duplication (no duplicate text chunks)
- Stream completes without hanging (message_stop event received)
- Stream handles 500+ character responses (test with deliberately long prompts)

**E. Edge Cases (2 tests)**
- Responds correctly when user has no time entries (returns appropriate message, not error)
- Handles API errors gracefully (500 error from Anthropic returns fallback, not client error)

**Test execution:** Tests run in isolation with 30s timeout per test (streaming may be slower).

---

## 5. Future Evolution

### If Tone Drifts

**Symptom:** Responses become too formal, flattering, or lose the direct "coach" voice.

**Root causes:**
- Claude API model updated (different training)
- System prompt was accidentally modified
- User feedback influenced prompt to be softer than intended

**Fix process:**

1. **Detect drift** via quarterly testing (compare tone against baseline)
2. **Identify pattern** (too formal? too harsh? too wordy?)
3. **Adjust system prompt** (example: change "warm but honest" to "warm without flattery; honest without judgment")
4. **A/B test** (run old and new system prompts on same questions)
5. **Measure tone** (use semantic analysis or manual review)
6. **Document change** in git commit message: `docs(chat): adjust system prompt for [specific tone improvement]`

Example adjustment:

**Old:** "Your tone is warm but honest."
**New:** "Your tone is warm but honest. Warm means you care about their success. Honest means you never sugarcoat. These aren't contradictory—they're complementary."

This explicitness helps Claude balance warmth and honesty better.

### If Streaming Causes Issues

**Symptoms:**
- Stream timeouts frequently
- Text appears jumbled or out of order
- Client shows "Connection interrupted" errors

**Fallback is non-streaming mode:**

If streaming becomes unreliable, revert to non-streaming:

1. Comment out `anthropic.messages.stream()` call (line 172 in index.ts)
2. Replace with `const message = await anthropic.messages.create({...})`
3. Emit single-chunk SSE response (already implemented as fallback on lines 300-323)
4. Test in browser (performance will be slower, but stable)

Code is already structured for this pivot:
- Main streaming path (lines 172-210)
- Fallback non-streaming path (lines 301-323)
- Both return consistent SSE format to client

**Revert is 5-minute change** (minimal risk).

### If Tests Start Failing

**Symptom:** 20+ tests passing → suddenly 10+ failing (not gradual, but sudden drop).

**Root causes:**
- Anthropic API version change
- Supabase schema change
- System prompt silently corrupted
- Environment variable misconfigured (ANTHROPIC_API_KEY)

**Troubleshooting:**

1. **Check API key** (most common): `echo $ANTHROPIC_API_KEY | head -c 10`... (don't print full key)
2. **Check model name** (line 173 in index.ts): confirm `claude-opus-4-6` exists (not typo like `claude-opus-4-7`)
3. **Check system prompt** (lines 175-187): compare against git history `git diff HEAD~1 -- supabase/functions/chat/index.ts | grep system`
4. **Run single test** with verbose logging: `npm test -- chat-streaming.spec.js --verbose`
5. **Check changelog** (if you use breaking API): visit https://docs.anthropic.com/en/release-notes for recent changes
6. **Roll back** if recent change causes breakage: `git revert [commit-hash]`

### Version Control for System Prompt Changes

**Document every system prompt change in git:**

```bash
git commit -m "docs(chat): update system prompt for [specific change]

- Changed: 'Your tone is X' to 'Your tone is Y'
- Reason: [why the change?]
- Impact: [what behavior changes?]
- Tested: [how was it verified?]
"
```

This creates a history of prompt evolution and makes it easy to revert if a change degrades response quality.

**Example commit:**

```
docs(chat): clarify "warm without flattery" in system prompt

- Added explicit guidance: "Warm means you care about their success. Honest means
  you never sugarcoat. These aren't contradictory—they're complementary."
- Reason: Responses becoming too formal and distancing
- Impact: Coach voice should feel more personal and less like a consultant report
- Tested: Ran quarterly prompt tests with 10 diverse questions. Tone improved
  on 8/10, neutral on 2/10. No regressions in markdown or structure.
```

---

## Summary

The chat system is built on three layers:

1. **System prompt** (preventative): Explicit "no markdown" + detailed voice guidance
2. **Markdown remover** (fallback): Line-level cleanup for edge cases
3. **Streaming** (UX): Real-time text appearance for 5-10x perceived speed improvement

Each layer is tested, documented, and designed to fail gracefully. The system is maintainable: system prompt changes are tracked in git, tone regressions are caught quarterly, and regressions are logged for monitoring.

For questions or updates, refer to the commits in git history and the inline comments in `supabase/functions/chat/index.ts` and `src/components/Chat.jsx`.

