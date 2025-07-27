-- Add userEmail column to profiles table
-- This migration adds a userEmail field to store the associated email for each profile

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS userEmail TEXT;

-- Create index for userEmail lookups
CREATE INDEX IF NOT EXISTS idx_profiles_userEmail ON profiles(userEmail);

-- Update existing profiles with the user's email from auth.users
-- This assumes profiles are linked to users via user_id
UPDATE profiles 
SET userEmail = auth.users.email 
FROM auth.users 
WHERE profiles.user_id = auth.users.id 
AND profiles.userEmail IS NULL;

-- If profiles don't have user_id, you'll need to manually set emails
-- or use a different approach to link profiles to users
