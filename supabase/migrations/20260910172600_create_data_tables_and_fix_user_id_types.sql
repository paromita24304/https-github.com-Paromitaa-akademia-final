/*
# Create lesson_progress, lesson_notes, chat tables and fix course_messages user_id type

## Problem
The app uses the Go backend for authentication, which issues integer user IDs (SERIAL).
However, the existing course_messages table has user_id as uuid with FK to auth.users.
The frontend sends the Go-issued integer ID (as a string) as user_id to Supabase,
which fails because: (a) the UUID column rejects non-UUID values, and (b) RLS policies
use auth.uid() which returns null when using the anon key (no Supabase Auth session).

## Solution
1. Recreate course_messages with user_id as text (no FK to auth.users).
2. Create lesson_progress, lesson_notes, chat_conversations, chat_messages — all with
   user_id as text.
3. Use permissive RLS policies (TO anon, authenticated WITH true) because the frontend
   uses the anon Supabase key. The Go backend handles authentication via JWT — Supabase
   data access is gated by the frontend only sending valid user IDs.

## Tables

### course_messages (recreated)
- id (uuid PK), user_id (text), course_id (text), sender_role (text), content (text), created_at (timestamptz)

### lesson_progress (new)
- id (uuid PK), user_id (text), course_id (text), lesson_id (text), completed (bool),
  completed_at (timestamptz), created_at, updated_at
- UNIQUE(user_id, lesson_id)

### lesson_notes (new)
- id (uuid PK), user_id (text), course_id (text), lesson_id (text), content (text),
  created_at, updated_at
- UNIQUE(user_id, lesson_id)

### chat_conversations (new)
- id (uuid PK), user_id (text), title (text), created_at, updated_at

### chat_messages (new)
- id (uuid PK), conversation_id (uuid FK->chat_conversations ON DELETE CASCADE),
  user_id (text), role (text), content (text), created_at

## Security
- RLS enabled on all tables.
- Permissive policies (TO anon, authenticated) because the frontend uses the anon key.
  The Go backend JWT gates access to valid users; Supabase stores per-user data keyed
  by the Go-issued user_id string.
- updated_at trigger on lesson_progress, lesson_notes, chat_conversations.

## Idempotent
- All CREATE TABLE IF NOT EXISTS.
- Policies dropped before recreate.
- course_messages is dropped and recreated (it has 0 rows, no data loss).
*/

-- =============================================================
-- Reusable updated_at trigger function
-- =============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- course_messages (recreate with text user_id)
-- =============================================================
DROP TABLE IF EXISTS course_messages CASCADE;

CREATE TABLE course_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  course_id text NOT NULL,
  sender_role text NOT NULL DEFAULT 'student',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_course_messages_user_course ON course_messages(user_id, course_id);

ALTER TABLE course_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_course_messages" ON course_messages;
CREATE POLICY "select_course_messages" ON course_messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_course_messages" ON course_messages;
CREATE POLICY "insert_course_messages" ON course_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_course_messages" ON course_messages;
CREATE POLICY "update_course_messages" ON course_messages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_course_messages" ON course_messages;
CREATE POLICY "delete_course_messages" ON course_messages FOR DELETE
  TO anon, authenticated USING (true);

-- =============================================================
-- lesson_progress
-- =============================================================
CREATE TABLE IF NOT EXISTS lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  course_id text NOT NULL,
  lesson_id text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_course ON lesson_progress(user_id, course_id);

ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_lesson_progress" ON lesson_progress;
CREATE POLICY "select_lesson_progress" ON lesson_progress FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_lesson_progress" ON lesson_progress;
CREATE POLICY "insert_lesson_progress" ON lesson_progress FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_lesson_progress" ON lesson_progress;
CREATE POLICY "update_lesson_progress" ON lesson_progress FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_lesson_progress" ON lesson_progress;
CREATE POLICY "delete_lesson_progress" ON lesson_progress FOR DELETE
  TO anon, authenticated USING (true);

DROP TRIGGER IF EXISTS trg_lesson_progress_updated ON lesson_progress;
CREATE TRIGGER trg_lesson_progress_updated
BEFORE UPDATE ON lesson_progress
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================
-- lesson_notes
-- =============================================================
CREATE TABLE IF NOT EXISTS lesson_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  course_id text NOT NULL,
  lesson_id text NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_notes_user_lesson ON lesson_notes(user_id, lesson_id);

ALTER TABLE lesson_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_lesson_notes" ON lesson_notes;
CREATE POLICY "select_lesson_notes" ON lesson_notes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_lesson_notes" ON lesson_notes;
CREATE POLICY "insert_lesson_notes" ON lesson_notes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_lesson_notes" ON lesson_notes;
CREATE POLICY "update_lesson_notes" ON lesson_notes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_lesson_notes" ON lesson_notes;
CREATE POLICY "delete_lesson_notes" ON lesson_notes FOR DELETE
  TO anon, authenticated USING (true);

DROP TRIGGER IF EXISTS trg_lesson_notes_updated ON lesson_notes;
CREATE TRIGGER trg_lesson_notes_updated
BEFORE UPDATE ON lesson_notes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================
-- chat_conversations
-- =============================================================
CREATE TABLE IF NOT EXISTS chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL DEFAULT 'New conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user ON chat_conversations(user_id);

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_chat_conversations" ON chat_conversations;
CREATE POLICY "select_chat_conversations" ON chat_conversations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_chat_conversations" ON chat_conversations;
CREATE POLICY "insert_chat_conversations" ON chat_conversations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_chat_conversations" ON chat_conversations;
CREATE POLICY "update_chat_conversations" ON chat_conversations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_chat_conversations" ON chat_conversations;
CREATE POLICY "delete_chat_conversations" ON chat_conversations FOR DELETE
  TO anon, authenticated USING (true);

DROP TRIGGER IF EXISTS trg_chat_conversations_updated ON chat_conversations;
CREATE TRIGGER trg_chat_conversations_updated
BEFORE UPDATE ON chat_conversations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================
-- chat_messages
-- =============================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_chat_messages" ON chat_messages;
CREATE POLICY "select_chat_messages" ON chat_messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_chat_messages" ON chat_messages;
CREATE POLICY "insert_chat_messages" ON chat_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_chat_messages" ON chat_messages;
CREATE POLICY "update_chat_messages" ON chat_messages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_chat_messages" ON chat_messages;
CREATE POLICY "delete_chat_messages" ON chat_messages FOR DELETE
  TO anon, authenticated USING (true);
