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

-- Note: question and response columns remain for backward compatibility with legacy messages
