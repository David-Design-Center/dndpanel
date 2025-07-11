/*
  # Add Email Signature to Profiles

  1. New Columns
    - `signature` (text, nullable) - stores the HTML signature for each profile
    
  2. Purpose
    - Enable each user profile to have a custom email signature
    - Support HTML content including iframe embeds
    - Automatically append signatures to outgoing emails
*/

DO $$
BEGIN
  -- Add signature column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'signature'
  ) THEN
    ALTER TABLE profiles ADD COLUMN signature text;
  END IF;
END $$;