-- Migration to update shipments table structure
-- Run this in Supabase SQL Editor

-- Add new columns for the updated structure
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS status VARCHAR(50),
ADD COLUMN IF NOT EXISTS pod VARCHAR(255),
ADD COLUMN IF NOT EXISTS vendor VARCHAR(255),
ADD COLUMN IF NOT EXISTS po VARCHAR(255),
ADD COLUMN IF NOT EXISTS pkg INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS kg DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS vol DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pickup_date DATE,
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;

-- Update existing records to populate new fields from old fields
UPDATE shipments SET
  status = COALESCE(shipping_status, 'PENDING'),
  pod = COALESCE(vessel_carrier, ''),
  vendor = COALESCE(shipper, ''),
  po = COALESCE(container_n, ''),
  pkg = 1, -- Default to 1 package
  kg = 100, -- Default weight
  vol = 1, -- Default volume
  pickup_date = CASE 
    WHEN etd IS NOT NULL AND etd != '' THEN etd::date 
    ELSE CURRENT_DATE 
  END,
  note = COALESCE(description_of_goods, '')
WHERE status IS NULL OR status = '';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_pod ON shipments(pod);
CREATE INDEX IF NOT EXISTS idx_shipments_vendor ON shipments(vendor);
CREATE INDEX IF NOT EXISTS idx_shipments_po ON shipments(po);
CREATE INDEX IF NOT EXISTS idx_shipments_pickup_date ON shipments(pickup_date);
CREATE INDEX IF NOT EXISTS idx_shipments_documents ON shipments USING gin(documents);

-- Test that the migration worked
SELECT 
  id, 
  ref, 
  status, 
  pod, 
  vendor, 
  po, 
  pkg, 
  kg, 
  vol, 
  pickup_date, 
  note,
  -- Show old fields for verification
  shipping_status, 
  shipper, 
  vessel_carrier, 
  container_n, 
  etd, 
  description_of_goods
FROM shipments 
LIMIT 5;
