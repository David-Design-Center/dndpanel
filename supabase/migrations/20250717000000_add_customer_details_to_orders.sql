/*
  # Add Customer Detail Fields to Orders Table

  1. Changes
    - Add detailed customer information fields to the `orders` table
    - customer_address, customer_city, customer_state, customer_zip
    - customer_tel1, customer_tel2
    
  2. Purpose
    - Store complete customer information in orders for invoice generation
    - Ensure all necessary data is available when creating invoices from orders
    - Support the new invoice workflow where orders must be created first
*/

-- Add customer address fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_city TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_state TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_zip TEXT;

-- Add customer phone fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_tel1 TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_tel2 TEXT;

-- Add comments explaining the purpose of these columns
COMMENT ON COLUMN orders.customer_address IS 'Customer street address';
COMMENT ON COLUMN orders.customer_city IS 'Customer city';
COMMENT ON COLUMN orders.customer_state IS 'Customer state/province';
COMMENT ON COLUMN orders.customer_zip IS 'Customer zip/postal code';
COMMENT ON COLUMN orders.customer_tel1 IS 'Customer phone area code';
COMMENT ON COLUMN orders.customer_tel2 IS 'Customer phone number';
