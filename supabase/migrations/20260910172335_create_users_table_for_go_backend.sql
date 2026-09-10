/*
# Create users table for Go backend auth

1. New Tables
- `users`: Stores user accounts managed by the Go backend (not Supabase Auth).
  - `id` (serial, primary key) — integer ID issued by the Go backend
  - `name` (text, not null)
  - `email` (text, not null, unique)
  - `password_hash` (text, not null) — bcrypt hash
  - `role` (text, not null, default 'student') — checked against student/instructor/admin
  - `created_at` (timestamptz, default now)

2. Security
- No RLS on this table. The Go backend manages access via JWT authentication.
  The frontend never queries this table directly — only the Go backend does,
  using the DATABASE_URL connection string with privileged access.

3. Notes
- This table is for the Go backend's raw SQL auth handlers (Register, Login, ChangePassword).
- The Go backend connects to the same Supabase Postgres instance via DATABASE_URL.
- User IDs are SERIAL integers, matching what the Go JWT returns to the frontend.
- The frontend stores the Go-issued user ID as a string and sends it as user_id
  to the Supabase data tables (lesson_progress, lesson_notes, etc.).
*/

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          TEXT        NOT NULL,
    email         TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    role          TEXT        NOT NULL DEFAULT 'student'
                    CHECK (role IN ('student', 'instructor', 'admin')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));
