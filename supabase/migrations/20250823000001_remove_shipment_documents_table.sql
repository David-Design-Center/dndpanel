-- Drop the shipment_documents table since we're not using it anymore
-- This script removes the unnecessary table and migrates any existing data

-- First, check if there's any data in shipment_documents that needs to be migrated
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'shipment_documents') THEN
    -- If you have existing data, uncomment and run this migration query first:
    -- UPDATE shipments 
    -- SET documents = (
    --   SELECT jsonb_agg(
    --     jsonb_build_object(
    --       'id', sd.id,
    --       'file_name', sd.file_name,
    --       'file_type', sd.file_type,
    --       'file_size', sd.file_size,
    --       'drive_file_id', sd.drive_file_id,
    --       'drive_file_url', sd.drive_file_url,
    --       'uploaded_by', sd.uploaded_by,
    --       'uploaded_at', sd.uploaded_at
    --     )
    --   )
    --   FROM shipment_documents sd
    --   WHERE sd.shipment_id = shipments.id
    -- )
    -- WHERE EXISTS (
    --   SELECT 1 FROM shipment_documents sd WHERE sd.shipment_id = shipments.id
    -- );
    
    -- Drop the table after migration (if any)
    DROP TABLE IF EXISTS shipment_documents CASCADE;
    RAISE NOTICE 'Dropped shipment_documents table';
  ELSE
    RAISE NOTICE 'shipment_documents table does not exist';
  END IF;
END $$;
