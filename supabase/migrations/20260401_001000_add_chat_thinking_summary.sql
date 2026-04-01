-- One-line persisted summary of extended thinking (UI only; not sent to the model)
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS thinking_summary text;
