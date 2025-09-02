-- Migration to update shipments table structure for new columns
-- This adds the new columns needed for the updated shipments interface

-- First, check if the new columns exist and add them if they don't
DO $$
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='status') THEN
        ALTER TABLE shipments ADD COLUMN status VARCHAR(50);
    END IF;
    
    -- Add pod column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='pod') THEN
        ALTER TABLE shipments ADD COLUMN pod VARCHAR(255);
    END IF;
    
    -- Add vendor column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='vendor') THEN
        ALTER TABLE shipments ADD COLUMN vendor VARCHAR(255);
    END IF;
    
    -- Add po column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='po') THEN
        ALTER TABLE shipments ADD COLUMN po VARCHAR(255);
    END IF;
    
    -- Add pkg column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='pkg') THEN
        ALTER TABLE shipments ADD COLUMN pkg INTEGER DEFAULT 0;
    END IF;
    
    -- Add kg column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='kg') THEN
        ALTER TABLE shipments ADD COLUMN kg DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Add vol column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='vol') THEN
        ALTER TABLE shipments ADD COLUMN vol DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Add pickup_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='pickup_date') THEN
        ALTER TABLE shipments ADD COLUMN pickup_date DATE;
    END IF;
    
    -- Add note column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='note') THEN
        ALTER TABLE shipments ADD COLUMN note TEXT;
    END IF;
    
    -- Add documents column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='documents') THEN
        ALTER TABLE shipments ADD COLUMN documents JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Update existing records to populate new fields from old fields where needed
UPDATE shipments SET
  status = COALESCE(shipping_status, 'Processing'),
  pod = COALESCE(vessel_carrier, ''),
  vendor = COALESCE(shipper, ''),
  po = COALESCE(container_n, ''),
  pkg = 1, -- Default to 1 package
  kg = 100, -- Default weight
  vol = 1, -- Default volume
  pickup_date = CASE 
    WHEN etd IS NOT NULL AND etd != '' THEN 
      CASE 
        WHEN etd ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN etd::date
        ELSE CURRENT_DATE
      END
    ELSE CURRENT_DATE 
  END,
  note = COALESCE(description_of_goods, ''),
  documents = COALESCE(documents, '[]'::jsonb)
WHERE status IS NULL OR pod IS NULL OR vendor IS NULL OR po IS NULL OR documents IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_pod ON shipments(pod);
CREATE INDEX IF NOT EXISTS idx_shipments_vendor ON shipments(vendor);
CREATE INDEX IF NOT EXISTS idx_shipments_po ON shipments(po);
CREATE INDEX IF NOT EXISTS idx_shipments_pickup_date ON shipments(pickup_date);
CREATE INDEX IF NOT EXISTS idx_shipments_documents ON shipments USING gin(documents);