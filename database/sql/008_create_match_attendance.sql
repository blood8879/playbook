-- <ai_context>
-- This file creates a new table 'match_attendance' to store user attendance for each match.
-- </ai_context>

CREATE TYPE attendance_status AS ENUM ('attending', 'absent', 'maybe');

CREATE TABLE IF NOT EXISTS match_attendance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status attendance_status NOT NULL DEFAULT 'maybe',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(match_id, user_id)
);

-- Update trigger
CREATE OR REPLACE FUNCTION update_match_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_match_attendance_modtime
BEFORE UPDATE ON match_attendance
FOR EACH ROW
EXECUTE PROCEDURE update_match_attendance_updated_at();