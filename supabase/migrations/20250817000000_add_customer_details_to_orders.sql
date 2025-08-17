-- Add missing customer detail columns to orders table

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_address TEXT,
ADD COLUMN IF NOT EXISTS customer_city TEXT,
ADD COLUMN IF NOT EXISTS customer_state TEXT,
ADD COLUMN IF NOT EXISTS customer_zip TEXT,
ADD COLUMN IF NOT EXISTS customer_tel1 TEXT,
ADD COLUMN IF NOT EXISTS customer_tel2 TEXT,
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_invoice_id TEXT;

-- Add comments for documentation
COMMENT ON COLUMN orders.customer_address IS 'Customer street address';
COMMENT ON COLUMN orders.customer_city IS 'Customer city';
COMMENT ON COLUMN orders.customer_state IS 'Customer state/province';
COMMENT ON COLUMN orders.customer_zip IS 'Customer postal/zip code';
COMMENT ON COLUMN orders.customer_tel1 IS 'Customer primary phone number';
COMMENT ON COLUMN orders.customer_tel2 IS 'Customer secondary phone number';
COMMENT ON COLUMN orders.is_edited IS 'Flag indicating if order has been modified';
COMMENT ON COLUMN orders.original_invoice_id IS 'Reference to original invoice if this is an edit';
