-- Migration: Remove signature column from profiles table
-- Reason: Signatures are now fetched directly from Gmail API (single source of truth)
-- This column was a duplicate of data stored in Gmail sendAs settings

-- Drop the signature column
ALTER TABLE profiles DROP COLUMN IF EXISTS signature;

-- Add a comment for documentation
COMMENT ON TABLE profiles IS 'User profiles. Email signatures are now managed via Gmail API directly.';
