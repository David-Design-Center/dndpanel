-- Populate contacts table and establish relationship with invoices
-- Run this AFTER adding contact_id column to invoices table

-- First, ensure contact_id column exists
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id);
CREATE INDEX IF NOT EXISTS idx_invoices_contact_id ON invoices(contact_id);

-- Insert unique contacts from invoices (if not already present)
INSERT INTO contacts (full_name, email, phone_1, phone_2, address, city, state, zip_code)
SELECT DISTINCT 
    customer_name as full_name,
    customer_email as email,
    customer_tel1 as phone_1,
    customer_tel2 as phone_2,
    customer_address as address,
    customer_city as city,
    customer_state as state,
    customer_zip as zip_code
FROM invoices 
WHERE customer_name IS NOT NULL 
AND customer_name != ''
AND NOT EXISTS (
    SELECT 1 FROM contacts 
    WHERE (contacts.email = invoices.customer_email AND invoices.customer_email IS NOT NULL AND invoices.customer_email != '')
    OR (contacts.full_name = invoices.customer_name AND (invoices.customer_email IS NULL OR invoices.customer_email = ''))
);

-- Update invoices to link to contacts by email (primary match)
UPDATE invoices 
SET contact_id = contacts.id
FROM contacts
WHERE invoices.customer_email = contacts.email
AND invoices.customer_email IS NOT NULL
AND invoices.customer_email != ''
AND invoices.contact_id IS NULL;

-- Update remaining invoices to link to contacts by name (fallback match)
UPDATE invoices 
SET contact_id = contacts.id
FROM contacts
WHERE invoices.customer_name = contacts.full_name
AND invoices.contact_id IS NULL
AND invoices.customer_name IS NOT NULL
AND invoices.customer_name != '';

-- Create index for better performance on PO number queries
CREATE INDEX IF NOT EXISTS idx_invoices_po_number ON invoices(po_number) WHERE po_number IS NOT NULL;
