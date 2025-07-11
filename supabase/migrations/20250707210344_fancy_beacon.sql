/*
  # Add User Sessions Table for Authentication Tracking

  1. New Tables
    - `user_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, reference to auth.users)
      - `device_info` (jsonb)
      - `last_active` (timestamptz)
      - `created_at` (timestamptz)
      - `ip_address` (text)
      - `user_agent` (text)

  2. Security
    - Enable RLS on `user_sessions` table
    - Add policies for users to manage their own sessions
*/

-- Create the user sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  device_info jsonb DEFAULT '{}'::jsonb,
  last_active timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text,
  
  -- Extra fields for additional context
  location text,
  status text DEFAULT 'active'
);

-- Enable Row Level Security
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON user_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON user_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON user_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Add function to automatically update the last_active timestamp
CREATE OR REPLACE FUNCTION update_session_last_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update last_active on session update
CREATE TRIGGER update_session_last_active_trigger
  BEFORE UPDATE ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_last_active();