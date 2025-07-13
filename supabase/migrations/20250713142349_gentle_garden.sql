/*
  # Add Order ID Column to Invoices Table

  1. Changes
    - Add `order_id` (uuid, nullable) column to the `invoices` table
    - This creates a relationship between invoices and orders
    
  2. Purpose
    - Enable tracking which customer order an invoice is associated with
    - Allow fetching invoices by order ID
    - Support dashboard reporting for deposit compliance
*/

-- Add order_id column to invoices table if it doesn't exist
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS order_id UUID;

-- Add comment explaining the purpose of this column
COMMENT ON COLUMN invoices.order_id IS 'References an order in the orders table';

-- Create an index to improve performance of lookups by order_id
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);