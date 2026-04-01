# Chat Message Persistence & Visibility Design
**Date:** 2026-03-30
**Status:** Approved
**Priority:** P1 (Blocking Use)

---

## Overview

This spec addresses two critical chat UX issues:
1. **Messages disappear on page refresh** — User and assistant messages aren't being saved to the database
2. **White-on-white text** — User messages are invisible due to lack of visual differentiation from assistant messages

## Current State

**Issue #2 Analysis:**
- Chat component loads messages from Supabase correctly on mount
- When user sends a message, it appears in the chat UI (React state)
- Assistant response streams and renders (SSE handling works)
- **Problem:** Neither the user message nor the assistant response are being saved to the `chat_messages` table
- On page refresh, the messages are gone (React state is cleared, and they're not in DB to reload)

**Issue #3 Analysis:**
- User message bubbles have white text on white/light background
- No visual distinction between user and assistant messages
- Layout is linear (both left-aligned), making it hard to scan who said what

---

## Solution

### Part 1: Message Persistence Layer

**New File: `src/hooks/useChatPersistence.js`**

Export a custom hook with two functions:

```typescript
const { saveUserMessage, saveAssistantMessage } = useChatPersistence()

// Signature:
saveUserMessage(userId: string, sessionId: string, content: string)
  → Promise<void>
  → Throws on DB error

saveAssistantMessage(
  userId: string,
  sessionId: string,
  content: string,
  thinking?: string,
  toolCalls?: Array
)
  → Promise<void>
  → Throws on DB error
```

**Behavior:**
- Both functions insert a record into the `chat_messages` table with:
  - `user_id`, `session_id`, `role` ('user' or 'assistant')
  - `content` (the message text)
  - `created_at` (ISO timestamp)
  - `thinking` and `toolCalls` (assistant only, can be null)
- If the insert fails, the function throws an error (caller handles it)
- No retries or silent failures — errors bubble up to Chat component

**Why separate functions?**
- User messages save immediately when sent (line 135 in Chat.jsx)
- Assistant messages save only after streaming completes (line 235 in Chat.jsx)
- Keeps logic focused and reusable

---

### Part 2: Chat Component Integration

**File: `src/components/Chat.jsx`**

**Changes at message creation (line 123-139):**
1. After the user message is added to state (`setMessages((prev) => [...prev, userMessage])`)
2. Call `saveUserMessage(user.id, sessionId, userMessage.content)`
3. If it throws, set an error but keep the message visible (it's already in UI state)

**Changes at streaming completion (line 235):**
1. When `event.type === 'done'`, the placeholder message is marked as no longer streaming
2. Call `saveAssistantMessage(user.id, sessionId, placeholder.content, placeholder.thinking, placeholder.toolCalls)`
3. If it throws, set an error but keep the message visible

**Error handling:**
- If save fails, display an error banner (existing error UI)
- Message stays in chat (user doesn't lose their work)
- User can retry by refreshing (message will load from DB if save succeeded partially)

---

### Part 3: Message Visibility (Right-Aligned Layout)

**File: `src/components/Chat.css`**

**CSS changes:**

1. **Message container:** Update `.chat-message` to support directional layout
   ```css
   .chat-message {
     display: flex;
     margin-bottom: var(--space-md);
   }

   .chat-message.user {
     flex-direction: row-reverse;  /* Align bubble to the right */
     justify-content: flex-end;     /* Push to right edge */
   }

   .chat-message.assistant {
     flex-direction: row;           /* Left-aligned (default) */
     justify-content: flex-start;
   }
   ```

2. **Message bubble styling:**
   ```css
   .user-message {
     background-color: var(--bg-tertiary);  /* Distinct from default background */
     color: var(--text-primary);            /* Same text color as assistant messages */
     max-width: 80%;
     padding: var(--space-md);
     border-radius: 0;
     text-align: left;
   }

   .claude-message {
     background-color: var(--bg-secondary);  /* Current background */
     color: var(--text-primary);
     max-width: 80%;
     padding: var(--space-md);
     border-radius: 0;
     text-align: left;
   }
   ```

3. **Accessibility:** Text color is the same across both messages (`--text-primary`). Distinction comes from background color only. Verify backgrounds have sufficient contrast with the text.

**In Chat.jsx (line 331):**
- The JSX already renders `className={`chat-message ${msg.role}`}`
- This automatically applies `.chat-message.user` or `.chat-message.assistant`
- No JSX changes needed—CSS alone handles the layout

**Result:** User messages appear on the right with distinct styling. Assistant messages on the left. Conversation becomes easy to scan.

---

## Files Modified

| File | Change | Type |
|------|--------|------|
| `src/hooks/useChatPersistence.js` | Create new persistence hook | New |
| `src/components/Chat.jsx` | Import hook, call save functions at right points | Edit |
| `src/components/Chat.css` | Update message styling for right-aligned layout | Edit |

---

## Data Flow

```
User sends message
  ↓
[Chat.jsx] Add to state immediately
  ↓
[useChatPersistence] saveUserMessage() → Insert to DB
  ↓
[Chat.jsx] Send to API, stream response
  ↓
[Chat.jsx] Streaming completes (event.type === 'done')
  ↓
[useChatPersistence] saveAssistantMessage() → Insert to DB
  ↓
Message persists; reloading the page reloads it from DB
```

---

## Testing

**Manual tests:**
1. Send a message → Refresh page → Verify message appears
2. Send multiple messages → Close and reopen browser → Verify full conversation loads
3. Check message styling: user on right, assistant on left
4. Verify contrast ratio for user/assistant message text (WCAG AA)

**Error scenarios:**
- Simulate DB error → Verify error banner appears, message stays visible
- Check that streaming still works while save is in flight

---

## Notes

- **Styling:** CSS variables (`--accent-color-light`, `--bg-tertiary`) must exist in the global CSS. If they don't, define them or use existing variables.
- **No breaking changes:** The hook is new; Chat.jsx changes are additive (no existing logic removed).
- **Persistence is unidirectional:** We save messages, but don't auto-delete them. User can manage history via sessions.

