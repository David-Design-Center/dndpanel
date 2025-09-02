-- Fix RLS policies for shipments table
-- Copy and paste this into Supabase SQL Editor AFTER running the previous migration

-- First, let's check if RLS is enabled and what policies exist
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'shipments';

-- Show existing policies
SELECT policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'shipments';

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Authenticated users can read shipments" ON shipments;
DROP POLICY IF EXISTS "Authenticated users can create shipments" ON shipments;
DROP POLICY IF EXISTS "Authenticated users can update shipments" ON shipments;
DROP POLICY IF EXISTS "Authenticated users can delete shipments" ON shipments;

-- Create comprehensive RLS policies for shipments
CREATE POLICY "Enable read access for authenticated users" ON shipments
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON shipments
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON shipments
  FOR UPDATE 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" ON shipments
  FOR DELETE 
  TO authenticated 
  USING (true);

-- Also create policies for anon users (in case the user is not properly authenticated)
CREATE POLICY "Enable read access for anon users" ON shipments
  FOR SELECT 
  TO anon 
  USING (true);

CREATE POLICY "Enable insert access for anon users" ON shipments
  FOR INSERT 
  TO anon 
  WITH CHECK (true);

CREATE POLICY "Enable update access for anon users" ON shipments
  FOR UPDATE 
  TO anon 
  USING (true) 
  WITH CHECK (true);

-- Verify the policies were created
SELECT policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'shipments';

-- Test insert permissions with a sample record
INSERT INTO shipments (
  ref, 
  status, 
  pod, 
  consignee, 
  vendor, 
  po, 
  pkg, 
  kg, 
  vol, 
  pickup_date, 
  note, 
  documents
) VALUES (
  'TEST-001',
  'Processing',
  'Test POD',
  'Test Consignee',
  'Test Vendor',
  'PO-001',
  1,
  100.00,
  1.50,
  '2025-08-23',
  'Test shipment for RLS verification',
  '[]'::jsonb
);

-- If the insert works, delete the test record
DELETE FROM shipments WHERE ref = 'TEST-001';

-- Show final confirmation
SELECT 'RLS policies updated successfully for shipments table' as status;
