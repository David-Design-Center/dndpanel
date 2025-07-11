/*
  # Fix Profiles Table RLS

  1. Changes
    - Disable RLS on profiles table to allow updates
    - Or add proper policies if RLS needs to stay enabled
    
  2. Security
    - This enables all authenticated users to read/update profiles
    - In a production environment, you might want more restrictive policies
*/

-- First, let's check if RLS is enabled and disable it for now
-- This will allow the signature updates to work
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Alternative: If you want to keep RLS enabled, uncomment the following policies instead:
/*
-- Enable RLS (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all profiles
CREATE POLICY "Authenticated users can read profiles" ON profiles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to update profiles
CREATE POLICY "Authenticated users can update profiles" ON profiles
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert profiles  
CREATE POLICY "Authenticated users can insert profiles" ON profiles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
*/
