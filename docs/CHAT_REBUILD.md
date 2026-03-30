# Chat Coach Rebuild - Architecture Summary

## Overview

Time-tracking coach using dual-path execution:
- **Fast-path** (~50ms): Regex pattern matching + DB query
- **Full loop** (~5s): Claude reasoning + tool execution + streaming

## Files

### Edge Function (`supabase/functions/chat/`)
- `index.ts` - Main entry point, auth, routing
- `intent-classifier.ts` - Pattern matching for fast-path
- `tools.ts` - Tool definitions and execution
- `system-prompt.ts` - Claude system prompt builder
- `memory.ts` - User memory and context management
- `types.ts` - TypeScript interfaces

### Client (`src/`)
- `components/Chat.jsx` - Main chat component
  - Session management
  - Message rendering
  - SSE stream parsing
  - In-place message updates
- `lib/api-client.js` - SSE helpers (unused currently, for future)

## Key Patterns

### 1. Fire-and-Forget Persistence
Messages are saved to DB asynchronously. Don't block stream on DB writes.

### 2. In-Place Message Updates
Messages are added as placeholders, then updated as chunks arrive. No appending.

### 3. Intent Classification
Simple queries (fast-path) are identified by regex patterns before calling Claude.

### 4. Agentic Loop
Claude can call tools up to 5 times. Each tool result becomes context for next reasoning step.

## Testing

### Fast-Path Test
```
Message: "How much time on coding?"
Expected: Instant response, JSON result
```

### Full-Loop Test
```
Message: "Should I spend more time on coding?"
Expected: Streaming response with thinking, tool calls visible
```

## Future Improvements

- [ ] Web search tool (scaffold exists)
- [ ] Activity categories filtering
- [ ] Daily briefing generation
- [ ] User-defined time goals enforcement
- [ ] Export reports feature
