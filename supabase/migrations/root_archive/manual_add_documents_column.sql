-- Simple manual migration to add documents column
-- Run this in Supabase SQL Editor

-- Add the documents column to shipments table
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_shipments_documents ON shipments USING gin(documents);

-- Test that the column exists
SELECT id, ref, documents FROM shipments LIMIT 5;
