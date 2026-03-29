# Chat Streaming & Sessions Migration

All code changes are complete. You need to run **one SQL migration** in your Supabase dashboard to enable sessions.

## Step 1: Run the Migration (Manual - Supabase Dashboard)

1. Go to **Supabase Dashboard** → Your Project
2. Click **SQL Editor** (left sidebar)
3. Click **+ New Query**
4. Copy and paste this SQL:

```sql
-- Create chat_sessions table for multi-session support
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient session list queries
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user
  ON chat_sessions(user_id, created_at DESC);

-- Enable RLS on chat_sessions
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: users can only manage their own sessions
CREATE POLICY "Users can manage own sessions"
  ON chat_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Extend chat_messages table with session support
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('user', 'assistant')),
  ADD COLUMN IF NOT EXISTS content TEXT;

-- Index for efficient session message queries (combined with user_id for RLS)
CREATE INDEX IF NOT EXISTS idx_chat_messages_session
  ON chat_messages(user_id, session_id, created_at);
```

5. Click **Run** (or Ctrl+Enter)
6. You should see "Success" message

## Step 2: Verify Changes

The app should now:
1. **Show chat sessions** — Thin strip at the top with "+ New" button and previous chat titles
2. **Stream real-time** — Text appears character-by-character as Claude generates it (not waiting for full response)
3. **Keep context** — Follow-up questions reference previous messages in the session
4. **Auto-title sessions** — First message content becomes the session title
5. **Persist across refresh** — Sessions and messages reload when you refresh the page

## What Changed

### Backend (Edge Function - `supabase/functions/chat/index.ts`)
- ✅ **True streaming** — chunks forward immediately instead of buffering all of them first
- ✅ **Session support** — accepts `sessionId` in request body
- ✅ **Context loading** — loads last 20 messages from session before calling Claude
- ✅ **Auto-titling** — sets session title to first 60 chars of first message (UTF-8 safe)
- ✅ **Dual persistence** — saves user message before Claude, assistant message after (fire-and-forget)
- ✅ **Backward compatible** — old Q&A pairs (no session) still work

### Frontend (React - `src/components/Chat.jsx`)
- ✅ **Session management** — loads sessions on mount, creates new sessions, switches between them
- ✅ **Message model** — unified format: `{ id, role, content, created_at }` works with both old and new messages
- ✅ **Session switcher UI** — horizontal tabs at top showing session titles
- ✅ **Streaming display** — properly handles real-time text updates from Edge Function

### Database (`supabase/migrations/20260329_001000_add_chat_sessions.sql`)
- ✅ **chat_sessions table** — stores session metadata (title, created_at)
- ✅ **chat_messages extended** — adds `session_id`, `role`, `content` columns (keeps legacy `question`/`response` for backward compat)
- ✅ **RLS enabled** — users can only access their own sessions/messages
- ✅ **Proper indexing** — efficient queries for session lists and message history

## Testing Checklist

- [ ] Run migration in Supabase dashboard SQL editor
- [ ] App loads without errors
- [ ] Chat page shows "+ New" button and session strip
- [ ] Type a question → text flows in real-time (character by character)
- [ ] Ask follow-up question → Claude references previous message
- [ ] Refresh page → session persists, messages reload
- [ ] Click "+ New" → creates new empty session
- [ ] Session title auto-populated from first message
- [ ] Click old session → shows its message history

## Notes

- **No new libraries** — all done with existing Supabase client + fetch
- **Model unchanged** — still using `claude-opus-4-6` with 512 max tokens
- **Time entries context** — still included (last 30 days of activities)
- **Persona unchanged** — "executive coach" system prompt intact
- **Backward compatible** — old messages (legacy Q&A format) still load and display correctly
