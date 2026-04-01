# Session Persistence Issues - Root Cause Analysis

**Created:** 2026-03-29
**Status:** ROOT CAUSES FOUND

---

## Summary

Two related bugs found in Chat.jsx + Edge Function related to async timing and fire-and-forget operations:

1. **Session titles never auto-generate** (always show "New Chat")
2. **Messages disappear when switching sessions** (not visible after reload)

Both issues stem from fire-and-forget async operations that don't properly synchronize between server and client.

---

## Issue 1: Session Titles Not Auto-Generating

### The Expected Flow
1. User sends first message to new session
2. Edge Function receives message + sessionId
3. Edge Function extracts first 60 chars of message, sets as session title
4. Client reloads session list and displays new title

### What Actually Happens
1. [ok] User sends message
2. [ok] Edge Function receives message + sessionId
3. [ok] Edge Function tries to set title BUT...
   - Title update is fire-and-forget (not awaited)
   - May succeed or fail silently
   - Streaming response is returned immediately
4. ✗ Client never reloads session list
   - Chat.jsx loads sessions ONCE on mount (useEffect line 26-58)
   - No re-fetch after message is sent
   - Session title object in state stays unchanged
   - UI displays stale "New Chat" value

### Root Cause Chain

**Cause 1 (Server):** Edge Function lines 172-176 don't await the title update
```typescript
supabase
  .from('chat_sessions')
  .update({ title })
  .eq('id', sessionId)
  .catch((err: any) => console.error('[Chat API] Error setting title:', err));
// ^ Not awaited! Stream response returned before this completes
```

**Cause 2 (Client):** Chat.jsx never reloads sessions after a message
- Sessions loaded once: `useEffect(..., [user])` at line 26
- No dependency on messages or timing of message sends
- No trigger to refresh sessions.list after message completes
- Even if server title update succeeds, client doesn't know about it

**Cause 3 (UX):** Session's `title` field is null initially
- When `title` is null, `getSessionTitle()` returns "New Chat" (line 327-329)
- Title update should change `title` from null to the message content
- But client never refetches session list to see the change

---

## Issue 2: Messages Not Persisting Across Session Switches

### The Expected Flow
1. User sends message in session A → message saved with session_id
2. User switches to session B
3. User switches back to session A
4. Chat.jsx queries `.eq('session_id', sessionA_id)` → finds all messages
5. Messages display

### What Actually Happens
1. [ok] User sends message
2. [ok] User message is saved (with session_id) - awaited at line 180
3. [ok] Claude response is streamed successfully
4. ✗ Assistant message save is fire-and-forget (not awaited)
   - Happens in streaming response handler (lines 301-315)
   - Stream completes and response is returned
   - But message insert may still be pending or fail
5. [ok] User switches sessions (messageState is cleared)
6. [ok] User switches back to session A
7. ✗ Query returns 0 messages because:
   - Assistant message never saved (timing race)
   - OR assistant message saved without session_id
   - OR assistant message save failed silently

### Root Cause Chain

**Cause 1 (Server - Critical):** Assistant message save is fire-and-forget
```typescript
// Line 301-315 - inside streaming response handler
if (sessionId) {
  supabase
    .from('chat_messages')
    .insert({
      user_id: user.id,
      session_id: sessionId,
      role: 'assistant',
      content: finalResponse,
      question: null,
      response: finalResponse,
      created_at: new Date().toISOString(),
    })
    .catch((saveError: any) => {
      console.error('[Chat API] Error saving assistant message:', saveError);
    });
  // ^ NOT AWAITED! Stream is closed right after
}
```

Problem: Stream closes (controller.close() at line 288) BEFORE the message insert completes. If the database is slow or the insert fails, the message never saves.

**Cause 2 (Server - Fallback Bug):** Backward compatibility code saves without session_id
```typescript
// Lines 316-328 - if sessionId is falsy
else {
  supabase
    .from('chat_messages')
    .insert({
      user_id: user.id,
      // NO session_id field!
      question,
      response: finalResponse,
      created_at: new Date().toISOString(),
    })
    .catch((saveError: any) => {
      console.error('[Chat API] Error saving chat message:', saveError);
    });
}
```

If sessionId somehow becomes falsy (should not happen, but...), message saves with NULL session_id. Then Chat.jsx's query `.eq('session_id', sessionId)` finds zero rows.

**Cause 3 (Client):** No error handling for silent failures
- If message save fails, user sees the message in the UI (optimistic update at line 171)
- But database never persists it
- User doesn't know it's not saved
- Next time they switch sessions and back, message is gone

---

## Why This Wasn't Caught Earlier

1. **Optimistic updates hide the problem**
   - Chat.jsx adds messages to state immediately (line 171, 286)
   - User sees messages in UI immediately
   - Doesn't realize they're not in database
   - Only discovered when switching sessions (state is cleared and reloaded)

2. **Single-session testing**
   - If you stay in one session, you don't discover persistence issue
   - Only manifests when switching sessions (triggers reload from DB)

3. **Title update is silent**
   - Fire-and-forget update that sometimes succeeds, sometimes doesn't
   - Even if it succeeds, client never reloads to see it
   - No error or warning to indicate failure

---

## Evidence

### Issue 1 - Title Not Updating

**Code evidence:**
- Chat.jsx: Sessions loaded once at line 26-58, useEffect dependency is `[user]`
- Edge Function: Title update at line 172 is not awaited
- getSessionTitle at line 327-329 returns "New Chat" if title is null

**Test sequence:**
1. New session created (title is NULL in database)
2. Send message
3. Edge Function updates title (may or may not complete before stream returns)
4. Chat.jsx has already loaded sessions (before title update)
5. Session object in state still has title: null
6. UI displays "New Chat"

### Issue 2 - Messages Disappearing

**Code evidence:**
- Edge Function: User message saved at line 180 (awaited)
- Edge Function: Assistant message saved at line 302 (NOT awaited)
- Streaming response closes at line 288
- Chat.jsx: Message reload triggered only when sessionId changes (line 61-94)

**Test sequence:**
1. Send message in session A
2. User message saved successfully (awaited, database has it)
3. Assistant response streams successfully (UI shows message)
4. Assistant message save is initiated but not awaited
5. Stream closes immediately
6. Database is still processing the insert OR insert fails
7. Switch to session B (triggers reloadMessages with sessionId=null)
8. Switch back to session A (triggers reloadMessages with sessionId=A)
9. Query returns only the user message, assistant message not found

---

## Fixes Required

### For Issue 1: Auto-Generate Titles

**Option A (Simple):** Reload sessions after each message
- In Chat.jsx handleSend: After streaming completes, reload sessions list
- Shows user the updated title immediately

**Option B (Better):** Update title in response
- Edge Function: Return updated session object in response
- Chat.jsx: Update local session state with new title
- No extra database query

**Option C (Best):** Await title update before streaming
- Edge Function: Move title update BEFORE starting streaming
- Ensure title is updated and persisted before stream begins
- Reduces race conditions

**Recommended:** Option C + Option A (belt-and-braces)

### For Issue 2: Ensure Message Persistence

**Required change:** Await message saves before closing stream

**In Edge Function:**
1. Keep user message save as-is (already awaited at line 180)
2. Move assistant message save BEFORE stream completion:
   ```typescript
   // Inside streaming handler, BEFORE controller.close()
   if (sessionId) {
     await supabase.from('chat_messages').insert({...});
   }
   ```
3. Add error handling: if save fails, close stream with error signal

**In Chat.jsx:**
1. After streaming completes, reload messages for the session
2. Add error detection: if assistant message not in reloaded messages, show error
3. Display clear error message if persistence fails

**Key principle:** Don't return streaming response until messages are persisted.

---

## Files to Modify

1. `supabase/functions/chat/index.ts`
   - Lines 163-177: Title update - add await
   - Lines 301-315: Assistant message save - add await
   - Line 288: Move before message saves

2. `src/components/Chat.jsx`
   - Line 208: After handleStreamingResponse completes, reload messages
   - Add error state for persistence failures
   - Consider reloading sessions list after message send

---

## Testing Verification

After fixes:
1. Send message to new session → title should update within 2 seconds
2. Send message in session A → switch to B → switch back to A → message still there
3. Refresh page → messages persist
4. Offline message send, then go online → should persist when connection restored
