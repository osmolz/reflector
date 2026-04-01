# Chat Persistence & Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Save chat messages to the database immediately/after streaming completes, and display user messages right-aligned with distinct styling for legibility.

**Architecture:** Create a custom hook (`useChatPersistence`) that encapsulates the database save logic. This hook is imported and called in Chat.jsx at two key points: after user message is added to state, and after assistant streaming completes. CSS changes handle the right-aligned visual layout.

**Tech Stack:** React, Supabase (existing `chat_messages` table), Zustand (auth context)

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `src/hooks/useChatPersistence.js` | **Create** | Hook with `saveUserMessage` and `saveAssistantMessage` functions |
| `src/components/Chat.jsx` | **Modify** | Import hook, call save functions at message completion points |
| `src/components/Chat.css` | **Modify** | Right-align user messages, add distinct background styling |

---

## Task 1: Create the `useChatPersistence` Hook

**Files:**
- Create: `src/hooks/useChatPersistence.js`

- [ ] **Step 1: Create the hook file with both save functions**

Create `src/hooks/useChatPersistence.js`:

```javascript
import { supabase } from '../lib/supabase'

export function useChatPersistence() {
  const saveUserMessage = async (userId, sessionId, content) => {
    if (!userId || !sessionId || !content) {
      throw new Error('Missing required parameters: userId, sessionId, content')
    }

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: userId,
          session_id: sessionId,
          role: 'user',
          content: content,
          created_at: new Date().toISOString(),
        })

      if (error) throw error
    } catch (err) {
      console.error('[persistence] Failed to save user message:', err)
      throw err
    }
  }

  const saveAssistantMessage = async (
    userId,
    sessionId,
    content,
    thinking = null,
    toolCalls = null
  ) => {
    if (!userId || !sessionId || !content) {
      throw new Error('Missing required parameters: userId, sessionId, content')
    }

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: userId,
          session_id: sessionId,
          role: 'assistant',
          content: content,
          created_at: new Date().toISOString(),
        })

      if (error) throw error
    } catch (err) {
      console.error('[persistence] Failed to save assistant message:', err)
      throw err
    }
  }

  return {
    saveUserMessage,
    saveAssistantMessage,
  }
}
```

- [ ] **Step 2: Verify the hook exports correctly**

Run in browser console or via a quick test:
```javascript
import { useChatPersistence } from './hooks/useChatPersistence'
const { saveUserMessage, saveAssistantMessage } = useChatPersistence()
console.log(typeof saveUserMessage, typeof saveAssistantMessage) // Should print: function function
```

- [ ] **Step 3: Commit the new hook**

```bash
git add src/hooks/useChatPersistence.js
git commit -m "feat: create useChatPersistence hook for message persistence"
```

---

## Task 2: Integrate User Message Saving into Chat.jsx

**Files:**
- Modify: `src/components/Chat.jsx:1-10, 123-140`

- [ ] **Step 1: Import the hook at the top of Chat.jsx**

After line 4 (`import './Chat.css'`), add:

```javascript
import { useChatPersistence } from '../hooks/useChatPersistence'
```

The top of Chat.jsx should now look like:
```javascript
import React, { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { useChatPersistence } from '../hooks/useChatPersistence'
import './Chat.css'
```

- [ ] **Step 2: Call the hook inside the Chat component (after line 8)**

After `const { user } = useAuthStore()` (line 7), add:

```javascript
  const { saveUserMessage, saveAssistantMessage } = useChatPersistence()
```

Your Chat component should now have:
```javascript
const Chat = () => {
  const { user } = useAuthStore()
  const { saveUserMessage, saveAssistantMessage } = useChatPersistence()

  // Session state
  const [sessions, setSessions] = useState([])
  ...
```

- [ ] **Step 3: Call saveUserMessage after user message is added to state**

Find this block (around line 134-138):
```javascript
    // [1] Add user message
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setError(null)
```

Replace it with:
```javascript
    // [1] Add user message
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setError(null)

    // Save user message to DB
    try {
      await saveUserMessage(user.id, sessionId, userMessage.content)
    } catch (err) {
      console.error('[chat] Failed to persist user message:', err)
      setError('Failed to save your message. Please try again.')
      setLoading(false)
      return
    }
```

- [ ] **Step 4: Verify the integration by testing a message send**

1. Open the app in the browser
2. Send a message via the chat
3. Open the Supabase dashboard and check the `chat_messages` table
4. Verify that a row with `role: 'user'` and your message content appears
5. Expected: The message should appear in the DB within 1-2 seconds

- [ ] **Step 5: Commit the user message save integration**

```bash
git add src/components/Chat.jsx
git commit -m "feat: save user messages to database immediately on send"
```

---

## Task 3: Integrate Assistant Message Saving into Chat.jsx

**Files:**
- Modify: `src/components/Chat.jsx:235-240`

- [ ] **Step 1: Find the streaming completion point**

Locate this code block (around line 235-236):
```javascript
              } else if (event.type === 'done') {
                updateStreaming((m) => ({ ...m, isStreaming: false }))
```

- [ ] **Step 2: Add saveAssistantMessage after streaming completes**

Replace the `event.type === 'done'` block with:

```javascript
              } else if (event.type === 'done') {
                updateStreaming((m) => ({ ...m, isStreaming: false }))

                // After streaming completes, save the full assistant message to DB
                setMessages((prev) => {
                  const latestMessage = prev[prev.length - 1]
                  if (latestMessage && latestMessage.id === streamingId) {
                    // Save the completed message
                    saveAssistantMessage(
                      user.id,
                      sessionId,
                      latestMessage.content,
                      latestMessage.thinking || null,
                      latestMessage.toolCalls || null
                    ).catch((err) => {
                      console.error('[chat] Failed to persist assistant message:', err)
                      setError('Message sent but failed to save. Check your connection.')
                    })
                  }
                  return prev
                })
```

- [ ] **Step 3: Verify the integration by testing a full exchange**

1. Send a message in the chat
2. Wait for the streaming response to complete (the "●" indicator should disappear)
3. Check the Supabase dashboard `chat_messages` table
4. Verify that two rows appear:
   - One with `role: 'user'` (your message)
   - One with `role: 'assistant'` (the response)
5. Refresh the page
6. Expected: Both messages should reappear in the chat (loaded from DB)

- [ ] **Step 4: Test error scenarios**

1. Simulate a network error (DevTools Network tab → Offline)
2. Send a message
3. Expected: Error banner appears, message stays visible in chat
4. Go back online
5. Expected: You can continue sending messages normally

- [ ] **Step 5: Commit the assistant message save integration**

```bash
git add src/components/Chat.jsx
git commit -m "feat: save assistant messages to database after streaming completes"
```

---

## Task 4: Update Chat.css for Right-Aligned User Messages

**Files:**
- Modify: `src/components/Chat.css`

- [ ] **Step 1: Find or create the message styling section**

Look for the `.chat-message` class in Chat.css (should be around line 100+). You'll see something like:
```css
.chat-message {
  /* existing styles */
}
```

- [ ] **Step 2: Add flexbox layout to message container**

Find the `.chat-message` class and add/update it to:

```css
.chat-message {
  display: flex;
  margin-bottom: var(--space-md);
  width: 100%;
}

.chat-message.user {
  flex-direction: row-reverse;
  justify-content: flex-end;
}

.chat-message.assistant {
  flex-direction: row;
  justify-content: flex-start;
}
```

- [ ] **Step 3: Update the message bubble styles**

Find or create `.user-message` and `.claude-message` classes and update them:

```css
.user-message {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  max-width: 80%;
  padding: var(--space-md);
  border-radius: 0;
  text-align: left;
}

.claude-message {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  max-width: 80%;
  padding: var(--space-md);
  border-radius: 0;
  text-align: left;
}
```

- [ ] **Step 4: Verify the layout in the browser**

1. Send a few messages (user + assistant responses)
2. Expected: User messages appear on the right with `--bg-tertiary` background
3. Expected: Assistant messages appear on the left with `--bg-secondary` background
4. Expected: Both use `--text-primary` text color (same legible color)
5. Expected: Text is easy to read with sufficient contrast

- [ ] **Step 5: Test responsiveness**

1. Resize the browser to a narrow width (mobile size, ~375px)
2. Expected: Messages still render correctly, text wraps within the bubble
3. Expected: Right-aligned user messages align to the right edge
4. Expected: Left-aligned assistant messages align to the left edge

- [ ] **Step 6: Commit the CSS changes**

```bash
git add src/components/Chat.css
git commit -m "feat: right-align user messages with distinct background styling"
```

---

## Task 5: End-to-End Testing

**Files:**
- Test: Manual testing in the browser

- [ ] **Step 1: Full conversation persistence test**

1. Open the app and log in
2. Send 3-4 messages with responses
3. Note the messages and responses displayed
4. **Refresh the page** (Cmd+R or Ctrl+R)
5. Expected: All 3-4 messages and responses reappear in the chat
6. Expected: User messages on right (distinct background), assistant on left
7. Expected: Text is legible on both message types

- [ ] **Step 2: New session persistence test**

1. Create a new chat session (click "+ New" button)
2. Send a few messages in the new session
3. Refresh the page
4. Expected: New session messages appear correctly
5. Switch back to the previous session
6. Expected: Previous session messages still there (persistence didn't interfere)

- [ ] **Step 3: Error handling test**

1. Open DevTools (F12) → Network tab
2. Check the "Offline" checkbox to simulate no internet
3. Send a message
4. Expected: Error banner appears ("Failed to save your message")
5. Message stays visible in chat
6. Uncheck "Offline"
7. Expected: App recovers, you can send more messages

- [ ] **Step 4: Accessibility check**

1. Right-click on a user message → Inspect
2. Note the background and text color CSS variables
3. Check contrast using a tool like [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
4. Expected: Contrast ratio ≥ 4.5:1 (WCAG AA standard)
5. Do the same for assistant messages

---

## Summary of Changes

| Task | Files Modified | Key Changes |
|------|----------------|-------------|
| 1 | NEW: `useChatPersistence.js` | Hook with `saveUserMessage` and `saveAssistantMessage` functions |
| 2 | Chat.jsx (import + state + send handler) | Import hook, call `saveUserMessage` after user msg added |
| 3 | Chat.jsx (streaming completion) | Call `saveAssistantMessage` after streaming done |
| 4 | Chat.css (message styling) | Add flexbox layout, right-align user messages, distinct backgrounds |
| 5 | Manual testing | End-to-end verification |
