-- Make legacy columns nullable to support new role/content model
ALTER TABLE chat_messages
  ALTER COLUMN question DROP NOT NULL,
  ALTER COLUMN response DROP NOT NULL;
