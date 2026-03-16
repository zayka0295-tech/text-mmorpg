-- Reputation Votes Table Migration
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS reputation_votes (
  voter_id   uuid NOT NULL,
  target_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type  text NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (voter_id, target_id)
);

ALTER TABLE reputation_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for service role" ON reputation_votes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
