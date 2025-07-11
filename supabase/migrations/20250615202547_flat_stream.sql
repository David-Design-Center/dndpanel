/*
  # Add Gmail Token Fields to Profiles

  1. New Columns
    - `gmail_access_token` (text, nullable)
    - `gmail_refresh_token` (text, nullable) 
    - `gmail_token_expiry` (timestamptz, nullable)

  2. Security
    - These fields will store Gmail authentication tokens per profile
    - Access tokens are short-lived (1 hour)
    - Refresh tokens are long-lived and used to get new access tokens
*/

DO $$
BEGIN
  -- Add gmail_access_token column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'gmail_access_token'
  ) THEN
    ALTER TABLE profiles ADD COLUMN gmail_access_token text;
  END IF;

  -- Add gmail_refresh_token column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'gmail_refresh_token'
  ) THEN
    ALTER TABLE profiles ADD COLUMN gmail_refresh_token text;
  END IF;

  -- Add gmail_token_expiry column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'gmail_token_expiry'
  ) THEN
    ALTER TABLE profiles ADD COLUMN gmail_token_expiry timestamptz;
  END IF;
END $$;