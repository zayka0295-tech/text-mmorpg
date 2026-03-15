-- Add session_token column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS session_token text;
