-- Add Google Drive document fields to shipments table
-- This replaces the need for a separate shipment_documents table

ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS documents_updated_at TIMESTAMPTZ DEFAULT now();

-- Add index for faster document queries
CREATE INDEX IF NOT EXISTS idx_shipments_documents ON shipments USING gin(documents);

-- Add trigger to update documents_updated_at when documents are modified
CREATE OR REPLACE FUNCTION update_documents_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.documents IS DISTINCT FROM NEW.documents THEN
        NEW.documents_updated_at = now();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_shipments_documents_timestamp ON shipments;
CREATE TRIGGER update_shipments_documents_timestamp
    BEFORE UPDATE ON shipments
    FOR EACH ROW
    EXECUTE FUNCTION update_documents_timestamp();

-- Example of document structure in the documents JSONB field:
-- [
--   {
--     "id": "uuid",
--     "file_name": "bill_of_lading.pdf",
--     "file_type": "application/pdf", 
--     "file_size": 2048576,
--     "drive_file_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
--     "drive_file_url": "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
--     "uploaded_by": "uuid",
--     "uploaded_at": "2025-08-23T12:00:00Z"
--   }
-- ]

COMMENT ON COLUMN shipments.documents IS 'JSONB array of uploaded Google Drive documents for this shipment';
COMMENT ON COLUMN shipments.documents_updated_at IS 'Timestamp when documents were last modified';
