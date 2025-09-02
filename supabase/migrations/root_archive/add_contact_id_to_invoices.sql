-- Step 1: Add contact_id column to invoices table
-- This needs to be run first before linking contacts to invoices

-- Add contact_id column to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_contact_id ON invoices(contact_id);

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'invoices' AND column_name = 'contact_id';
