-- Fix RLS policy for contacts table to allow all authenticated users to see all contacts
-- Drop existing policy and create a more permissive one

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can manage contacts" ON contacts;

-- Create new policy that allows all authenticated users to see and manage all contacts
CREATE POLICY "Authenticated users can manage all contacts" ON contacts
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Alternative: If you want to be even more permissive, you can use this policy instead:
-- CREATE POLICY "Authenticated users can manage all contacts" ON contacts
--     FOR ALL USING (true);
