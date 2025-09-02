-- SQL to update shipments table structure for new interface
-- Copy and paste this into Supabase SQL Editor

-- Add new columns to shipments table if they don't exist
DO $$
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='status') THEN
        ALTER TABLE shipments ADD COLUMN status VARCHAR(50);
        RAISE NOTICE 'Added status column';
    ELSE
        RAISE NOTICE 'status column already exists';
    END IF;
    
    -- Add pod column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='pod') THEN
        ALTER TABLE shipments ADD COLUMN pod VARCHAR(255);
        RAISE NOTICE 'Added pod column';
    ELSE
        RAISE NOTICE 'pod column already exists';
    END IF;
    
    -- Add vendor column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='vendor') THEN
        ALTER TABLE shipments ADD COLUMN vendor VARCHAR(255);
        RAISE NOTICE 'Added vendor column';
    ELSE
        RAISE NOTICE 'vendor column already exists';
    END IF;
    
    -- Add po column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='po') THEN
        ALTER TABLE shipments ADD COLUMN po VARCHAR(255);
        RAISE NOTICE 'Added po column';
    ELSE
        RAISE NOTICE 'po column already exists';
    END IF;
    
    -- Add pkg column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='pkg') THEN
        ALTER TABLE shipments ADD COLUMN pkg INTEGER DEFAULT 0;
        RAISE NOTICE 'Added pkg column';
    ELSE
        RAISE NOTICE 'pkg column already exists';
    END IF;
    
    -- Add kg column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='kg') THEN
        ALTER TABLE shipments ADD COLUMN kg DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE 'Added kg column';
    ELSE
        RAISE NOTICE 'kg column already exists';
    END IF;
    
    -- Add vol column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='vol') THEN
        ALTER TABLE shipments ADD COLUMN vol DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE 'Added vol column';
    ELSE
        RAISE NOTICE 'vol column already exists';
    END IF;
    
    -- Add pickup_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='pickup_date') THEN
        ALTER TABLE shipments ADD COLUMN pickup_date DATE;
        RAISE NOTICE 'Added pickup_date column';
    ELSE
        RAISE NOTICE 'pickup_date column already exists';
    END IF;
    
    -- Add note column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='note') THEN
        ALTER TABLE shipments ADD COLUMN note TEXT;
        RAISE NOTICE 'Added note column';
    ELSE
        RAISE NOTICE 'note column already exists';
    END IF;
    
    -- Add documents column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='documents') THEN
        ALTER TABLE shipments ADD COLUMN documents JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added documents column';
    ELSE
        RAISE NOTICE 'documents column already exists';
    END IF;
END $$;

-- Update existing records to populate new fields from old fields
UPDATE shipments SET
  status = COALESCE(NULLIF(status, ''), COALESCE(shipping_status, 'Processing')),
  pod = COALESCE(NULLIF(pod, ''), COALESCE(vessel_carrier, '')),
  vendor = COALESCE(NULLIF(vendor, ''), COALESCE(shipper, '')),
  po = COALESCE(NULLIF(po, ''), COALESCE(container_n, '')),
  pkg = COALESCE(NULLIF(pkg, 0), 1),
  kg = COALESCE(NULLIF(kg, 0), 100),
  vol = COALESCE(NULLIF(vol, 0), 1),
  pickup_date = CASE 
    WHEN pickup_date IS NOT NULL THEN pickup_date
    WHEN etd IS NOT NULL AND etd != '' THEN 
      CASE 
        WHEN etd ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN etd::date
        ELSE NULL  -- Set to NULL for invalid dates instead of CURRENT_DATE
      END
    ELSE NULL  -- Set to NULL instead of CURRENT_DATE for empty dates
  END,
  note = COALESCE(NULLIF(note, ''), COALESCE(description_of_goods, '')),
  documents = COALESCE(documents, '[]'::jsonb)
WHERE 
  status IS NULL OR status = '' OR
  pod IS NULL OR pod = '' OR
  vendor IS NULL OR vendor = '' OR
  po IS NULL OR po = '' OR
  pkg IS NULL OR pkg = 0 OR
  kg IS NULL OR kg = 0 OR
  vol IS NULL OR vol = 0 OR
  note IS NULL OR note = '' OR
  documents IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_pod ON shipments(pod);
CREATE INDEX IF NOT EXISTS idx_shipments_vendor ON shipments(vendor);
CREATE INDEX IF NOT EXISTS idx_shipments_po ON shipments(po);
CREATE INDEX IF NOT EXISTS idx_shipments_pickup_date ON shipments(pickup_date);
CREATE INDEX IF NOT EXISTS idx_shipments_documents ON shipments USING gin(documents);

-- Display the updated table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'shipments'
ORDER BY ordinal_position;

-- Show a sample of the updated data
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
  created_at
FROM shipments 
LIMIT 5;
