-- Fix RLS policies for contacts table
-- Run this directly in Supabase SQL Editor

-- First, let's see what policies currently exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'contacts';

-- Drop all existing policies on contacts table
DROP POLICY IF EXISTS "Users can manage contacts" ON contacts;
DROP POLICY IF EXISTS "Authenticated users can manage all contacts" ON contacts;

-- Create a new permissive policy that allows all authenticated users to see all contacts
CREATE POLICY "Allow authenticated users full access to contacts" ON contacts
    FOR ALL 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

-- Verify the new policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'contacts';
