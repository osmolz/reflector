# Chat Coach Rebuild: Streaming Agentic Architecture

**Date:** 2026-03-29
**Status:** Design Approved
**Author:** Claude Code

---

## Executive Summary

Complete rebuild of the Reflector chat system using proven osmPosm architecture patterns. Creates a time-tracking coach that analyzes personal activity data via agentic reasoning, streaming responses, and persistent multi-turn conversations.

**Key characteristics:**
- Dual-path execution: Fast-path regex (~50ms) for simple stats, full LLM agentic loop (~4-8s) for reasoning
- Real-time SSE streaming with visible thinking and tool calls
- Persistent 20-message context window + user memory (goals, preferences, facts)
- 4 core tools (activity summaries, daily logs, trends, memory updates)
- Fire-and-forget persistence (no blocking on DB writes)
- In-place message updates (no appending, no flicker)

---

## Part 1: Architecture Overview

### System Layers

```
React Client (Chat.jsx)
  ↓ (SSE connection)
Supabase Edge Function (chat endpoint)
  ↓ (calls)
Claude API + Tool Execution
  ↓ (returns)
Streamed SSE events
  ↓ (updates)
Single placeholder message (in-place)
```

### Two Execution Paths

**Path 1: Fast-Path (~50ms)**
- Pattern: Simple stat queries ("How much time on coding?", "What did I do today?")
- Process: Regex pattern match → Direct DB query → Instant response
- No LLM call needed

Example patterns:
```regex
/how much time.*coding|coding.*hours/i → get_activity_summary
/time on|hours on|spent.*time/i → get_activity_summary
/today|my activities|what did i do/i → get_daily_log
```

**Path 2: Full Agentic Loop (~4-8s)**
- Pattern: Advisory/reasoning queries ("Should I spend more time on X?", "What patterns do you see?")
- Process: Load context → Claude thinks (extended thinking) → Calls tools → Tool execution → Synthesis → Stream response
- Max 5 reasoning hops (prevents infinite loops)

Trigger: Questions with advisory keywords (should, why, how to, recommend, improve, strategy)

### Core Principle: Fire-and-Forget Persistence

- **Don't block the stream on database writes.** Message saves happen asynchronously.
- Errors logged but not thrown — conversation continues even if DB save fails.
- Streaming latency is critical for UX (50-100ms matters to users).
- Message persistence is not critical (eventual consistency is acceptable).

---

## Part 2: Data Model

### Tables (No schema changes needed)

**chat_messages** (existing)
```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL
role TEXT ('user' | 'assistant')
content TEXT NOT NULL
session_id UUID REFERENCES chat_sessions(id)
created_at TIMESTAMPTZ DEFAULT NOW()

-- Indexes
CREATE INDEX idx_chat_messages_user_created ON chat_messages(user_id, created_at DESC)
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at DESC)
```

**chat_sessions** (existing)
```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL
title TEXT  -- Auto-set from first message, UTF-8 truncated to 60 bytes
created_at TIMESTAMPTZ DEFAULT NOW()

-- Index
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id, created_at DESC)
```

**user_memory** (existing, will populate)
```sql
user_id UUID PRIMARY KEY
goals JSONB DEFAULT '[]'          -- [{goal: string, hours_per_week: int, priority: string, saved_at: timestamp}, ...]
preferences JSONB DEFAULT '[]'    -- [{preference: string, saved_at: timestamp}, ...]
facts JSONB DEFAULT '[]'          -- [{fact: string, context: string, saved_at: timestamp}, ...]
updated_at TIMESTAMPTZ DEFAULT NOW()
```

**time_entries** (existing, used for all queries)
```sql
-- Already exists, no changes needed
-- Fields used: activity_name, category, duration_minutes, start_time, created_at
```

### Why This Model

- **JSONB for user_memory**: Flexible appending without schema migrations. Coach learns about user over time.
- **session_id in chat_messages**: Groups messages by conversation, supports multi-session history.
- **created_at indexes**: Always query most recent messages first (critical for loading context).
- **Reuse existing time_entries**: No new tables needed; all activity queries come from this table.

---

## Part 3: Client Architecture (React Component)

### Chat.jsx Structure

**State variables:**
```typescript
const [sessions, setSessions] = useState([])        // List of chat sessions
const [sessionId, setSessionId] = useState(null)    // Currently selected session
const [messages, setMessages] = useState([])        // Messages in current session
const [input, setInput] = useState('')              // Input box text
const [loading, setLoading] = useState(false)       // Disable input while streaming
const [error, setError] = useState(null)            // Error banner
```

**UI Layout:**
```
┌─────────────────────────────────┐
│ Session List (sidebar)          │
│ [+ New] [Session 1] [Session 2] │
├─────────────────────────────────┤
│ Chat History                    │
│ You: How much time coding?      │
│ Claude: [thinking...]           │
│         [Analyzing activities]  │
│         Based on your data...   │
├─────────────────────────────────┤
│ [Input box] [Send]              │
└─────────────────────────────────┘
```

### Streaming Pattern (Critical)

**Never append. Always update in-place.**

```typescript
const sendMessage = useCallback(async (text: string) => {
  // [1] Create placeholder with UNIQUE ID
  const streamingId = new Date(Date.now() + 1).toISOString()
  const placeholder = {
    id: streamingId,
    role: 'assistant',
    content: '',
    created_at: streamingId,
    thinking: '',
    toolCalls: [],
    isStreaming: true,
  }

  // [2] Add to messages
  setMessages((prev) => [
    ...prev,
    { role: 'user', content: text, created_at: new Date().toISOString() },
    placeholder,
  ])

  // [3] Define updater that targets ONLY this message
  const updateStreaming = (updater) => {
    setMessages((prev) =>
      prev.map((m) => (m.created_at === streamingId ? updater(m) : m))
    )
  }

  // [4] Fetch with SSE
  const res = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message: text, sessionId }),
  })

  // [5] Parse SSE stream
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''  // Keep incomplete line

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const event = JSON.parse(line.slice(6))

      // [6] Update placeholder (NOT append)
      if (event.type === 'thinking') {
        updateStreaming((m) => ({ ...m, thinking: m.thinking + event.text }))
      } else if (event.type === 'tool_use') {
        updateStreaming((m) => ({
          ...m,
          toolCalls: [...(m.toolCalls ?? []), { tool: event.tool }],
        }))
      } else if (event.type === 'text') {
        updateStreaming((m) => ({ ...m, content: m.content + event.text }))
      } else if (event.type === 'done') {
        updateStreaming((m) => ({ ...m, isStreaming: false }))
      }
    }
  }
}, [sessionId])
```

**Why in-place updates:**
- Single DOM node updates (cheap)
- No flicker (thinking + tools + text in same bubble)
- Atomic rendering
- User sees message grow, not cascade

### SSE Buffer Pattern

Network chunks don't align with line boundaries. Keep incomplete lines in buffer:

```typescript
let buffer = ''

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  buffer += decoder.decode(value, { stream: true })
  const lines = buffer.split('\n')
  buffer = lines.pop() ?? ''  // Incomplete line back to buffer

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue
    const event = JSON.parse(line.slice(6))
    // ... handle event ...
  }
}
```

---

## Part 4: Edge Function Architecture

### High-Level Flow

```
[1] Auth: Validate JWT via getClaims()
[2] Extract user_id from token claims
[3] Classify intent (regex patterns)
[4] If fast-path matches:
    → Execute tool directly
    → Return response (no stream needed)
[5] If full loop needed:
    → Load conversation context (last 20 messages + user_memory)
    → Build system prompt
    → Save user message (fire-and-forget)
    → Initialize SSE ReadableStream
    → Loop (max 5 hops):
       a. Call Claude with tools + extended thinking
       b. Emit thinking deltas
       c. Emit tool_use events
       d. Execute tools in parallel
       e. Append tool results
       f. Check stop_reason
       g. If more hops needed, continue loop
    → Save assistant message (fire-and-forget)
    → Emit done event
    → Close stream
```

### Intent Classification (Fast-Path)

**Pattern matching (regex):**
```typescript
const SIMPLE_PATTERNS = [
  {
    pattern: /how much time.*coding|coding.*hours|time.*coding/i,
    handler: 'get_activity_summary',
    params: { activity: 'coding' },
  },
  {
    pattern: /time on|hours on|spent.*time/i,
    handler: 'get_activity_summary',
    params: null,  // Extract from message
  },
  {
    pattern: /today|my activities|what did i do|today's.*log/i,
    handler: 'get_daily_log',
    params: { date: new Date().toISOString().split('T')[0] },
  },
]

const ADVISORY_KEYWORDS = /\b(should|why|how\s+to|recommend|improve|strategy|pattern|trend)\b/i

function classifyIntent(message: string) {
  // If any advisory keyword present, skip fast-path
  if (ADVISORY_KEYWORDS.test(message)) return null

  // Try pattern matching
  for (const { pattern, handler, params } of SIMPLE_PATTERNS) {
    if (pattern.test(message)) {
      return { handler, params }
    }
  }

  return null  // Fall through to full loop
}
```

### System Prompt

```typescript
function buildSystemPrompt(userMemory: UserMemory): string {
  return `You are a time-tracking coach. You help users understand their time allocation and suggest improvements.

## What you know about this user
Goals: ${JSON.stringify(userMemory?.goals ?? [])}
Preferences: ${JSON.stringify(userMemory?.preferences ?? [])}
Facts: ${JSON.stringify(userMemory?.facts ?? [])}

## How you operate
- Use your tools to query real time data before answering — never guess numbers
- You can call multiple tools in parallel
- When data is missing, tell the user — never fabricate data
- When you learn something important, use update_user_memory to remember it
- Be specific with numbers and durations from the data
- End with one actionable insight or question that prompts reflection

Today is ${new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })}.`
}
```

### Tool Definitions

**Tool 1: get_activity_summary**
```typescript
{
  name: 'get_activity_summary',
  description: 'Query total time spent on an activity or category within a date range',
  input_schema: {
    type: 'object',
    properties: {
      activity: { type: 'string', description: 'Activity name (e.g., coding, exercise, writing)' },
      start_date: { type: 'string', description: 'YYYY-MM-DD (optional, defaults to 7 days ago)' },
      end_date: { type: 'string', description: 'YYYY-MM-DD (optional, defaults to today)' },
    },
    required: ['activity'],
  },
}
```

**Tool 2: get_daily_log**
```typescript
{
  name: 'get_daily_log',
  description: 'Get all activities logged for a specific date with durations',
  input_schema: {
    type: 'object',
    properties: {
      date: { type: 'string', description: 'YYYY-MM-DD' },
    },
    required: ['date'],
  },
}
```

**Tool 3: get_time_breakdown**
```typescript
{
  name: 'get_time_breakdown',
  description: 'Analyze time spent across categories and date ranges to identify patterns and trends',
  input_schema: {
    type: 'object',
    properties: {
      start_date: { type: 'string', description: 'YYYY-MM-DD' },
      end_date: { type: 'string', description: 'YYYY-MM-DD' },
      group_by: { type: 'string', enum: ['activity', 'category', 'day'], description: 'How to group results' },
    },
    required: ['start_date', 'end_date'],
  },
}
```

**Tool 4: update_user_memory**
```typescript
{
  name: 'update_user_memory',
  description: 'Save important information about the user (goals, preferences, facts) to long-term memory',
  input_schema: {
    type: 'object',
    properties: {
      memory_type: { type: 'string', enum: ['goal', 'preference', 'fact'] },
      content: { type: 'string', description: 'The information to save' },
    },
    required: ['memory_type', 'content'],
  },
}
```

### Agentic Loop (Detailed)

```typescript
let maxHops = 5
let finalText = ''
let currentMessages = [
  ...contextMessages,  // Last 20 messages
  { role: 'user', content: message }
]

while (maxHops > 0) {
  emit({ type: 'status', status: 'thinking' })

  // Call Claude with streaming
  const stream = anthropic.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    tools: TOOLS,
    messages: currentMessages,
    thinking: { type: 'enabled', budget_tokens: 2048 },
  })

  // Attach listeners BEFORE awaiting
  stream.on('thinking', (delta: string) => {
    emit({ type: 'thinking', text: delta })
  })

  stream.on('text', (delta: string) => {
    finalText += delta
    emit({ type: 'text', text: delta })
  })

  const response = await stream.finalMessage()

  // Check if done
  if (response.stop_reason === 'end_turn') {
    break
  }

  // Process tool calls
  const toolCalls = response.content.filter((b) => b.type === 'tool_use')

  for (const toolCall of toolCalls) {
    emit({
      type: 'tool_use',
      tool: toolCall.name,
    })
  }

  // Execute tools in parallel
  const toolResults = await Promise.all(
    toolCalls.map(async (call) => ({
      type: 'tool_result',
      tool_use_id: call.id,
      content: JSON.stringify(await executeTool(call.name, call.input)),
    }))
  )

  // Append to conversation and continue
  currentMessages = [
    ...currentMessages,
    { role: 'assistant', content: response.content },
    { role: 'user', content: toolResults },
  ]

  maxHops--
}

// Save message (fire-and-forget)
await saveMessage(userId, 'assistant', finalText, sessionId)
emit({ type: 'done' })
controller.close()
```

### SSE Event Types

```typescript
type SSEEvent =
  | { type: 'status'; status: 'thinking' }
  | { type: 'thinking'; text: string }           // Extended thinking deltas
  | { type: 'tool_use'; tool: string }           // Tool being called
  | { type: 'text'; text: string }               // Response text deltas
  | { type: 'done' }                             // Stream complete
  | { type: 'error'; message: string }           // Error occurred
```

---

## Part 5: Error Handling

### Graceful Degradation

| Scenario | Response |
|----------|----------|
| No time_entries data | "You haven't logged any activities yet. Start tracking to enable analysis." |
| Tool execution fails | Log error, emit to user, continue (don't throw) |
| Stream timeout (55s) | Emit error, close gracefully |
| Auth fails (invalid token) | Return 401, no retry |
| DB save fails | Log, don't throw (conversation continues) |
| Missing user_memory | Continue with defaults, don't error |

### Session Management

- **Auto-create session:** If sessionId not provided, create new session on first message
- **Auto-title:** Set title to first message (UTF-8 safe truncate to 60 bytes)
- **Idempotent title update:** Only set title if null (never overwrite)
- **Context window:** Always load last 20 messages, reverse DESC query to chronological order

---

## Part 6: Implementation Phases

### Phase 1: Foundation (Day 1)
- New Edge Function: Auth, intent classification, SSE setup
- Tool implementations: get_activity_summary, get_daily_log
- Client streaming: Placeholder pattern, SSE parsing
- Session management: Create/load sessions

### Phase 2: Agentic Loop (Day 2)
- Full Claude integration with extended thinking
- Tool execution in agentic loop (max 5 hops)
- get_time_breakdown tool
- update_user_memory tool

### Phase 3: Polish (Day 3)
- Error handling & edge cases
- Web search capability (optional)
- Testing & debugging
- Performance optimization

---

## Part 7: Success Criteria

✅ Fast-path queries respond in <100ms
✅ Full agentic queries complete in 4-8s
✅ Streaming text flows progressively (no blocks)
✅ Thinking visible to user
✅ Tool calls visible ("Analyzing activities...")
✅ Messages persist (fire-and-forget pattern)
✅ Session titles auto-set correctly
✅ Multi-turn context loads properly
✅ No flicker or appending behavior
✅ Graceful error handling

---

## Part 8: Key Differences from Broken System

| Old System | New System |
|-----------|-----------|
| Tried to force JWT validation with getUser() | Uses getClaims() (no env vars needed) |
| SSE events dropped at chunk boundaries | Buffer pattern keeps incomplete lines |
| Messages appended (flicker) | In-place updates (clean growth) |
| Naive string truncation for titles | UTF-8 safe truncation |
| All queries went through Claude | Fast-path regex for simple queries |
| Message saves could fail silently | Fire-and-forget with logging |
| No reasoning transparency | Extended thinking streamed to user |

---

## Appendix: File Structure

```
src/
├── components/
│   └── Chat.jsx                    # Client component (streaming pattern)
├── lib/
│   ├── supabase.js                 # Existing Supabase client
│   └── api-client.js               # New: SSE fetch wrapper
├── store/
│   └── authStore.js                # Existing auth
supabase/
└── functions/
    └── chat/
        ├── index.ts                # New: Edge Function
        ├── intent-classifier.ts    # New: Pattern matching
        ├── tools.ts                # New: Tool implementations
        ├── system-prompt.ts        # New: Prompt builder
        └── memory.ts               # New: User memory helpers
```

---

**Status:** Ready for implementation planning.
