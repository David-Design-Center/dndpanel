-- Check current RLS policies on brands table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'brands';

-- Drop existing problematic policies if any
DROP POLICY IF EXISTS "Users can insert their own brands" ON brands;
DROP POLICY IF EXISTS "Users can view their own brands" ON brands;
DROP POLICY IF EXISTS "Users can update their own brands" ON brands;
DROP POLICY IF EXISTS "Users can delete their own brands" ON brands;

-- Create new RLS policies that allow authenticated users to work with brands
-- Allow authenticated users to view all brands (including default ones with user_id = null)
CREATE POLICY "Users can view all brands" ON brands
    FOR SELECT USING (
        user_id IS NULL OR 
        user_id = auth.uid()
    );

-- Allow authenticated users to insert new brands
CREATE POLICY "Users can insert brands" ON brands
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        user_id = auth.uid()
    );

-- Allow users to update their own brands
CREATE POLICY "Users can update own brands" ON brands
    FOR UPDATE USING (
        user_id = auth.uid()
    ) WITH CHECK (
        user_id = auth.uid()
    );

-- Allow users to delete their own brands
CREATE POLICY "Users can delete own brands" ON brands
    FOR DELETE USING (
        user_id = auth.uid()
    );

-- Ensure RLS is enabled
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
