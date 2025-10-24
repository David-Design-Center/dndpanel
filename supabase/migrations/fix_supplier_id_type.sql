-- Fix supplier_id type mismatch
-- The brands table uses bigint for id, but orders.supplier_id expects uuid
-- This causes "invalid input syntax for type uuid: "12"" error

-- Step 1: Drop the foreign key constraint if it exists
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_supplier_id_fkey;

-- Step 2: Change supplier_id type from uuid to bigint with explicit casting
ALTER TABLE orders 
ALTER COLUMN supplier_id TYPE bigint USING supplier_id::text::bigint;

-- Step 3: Add back the foreign key constraint with correct types
ALTER TABLE orders
ADD CONSTRAINT orders_supplier_id_fkey 
FOREIGN KEY (supplier_id) REFERENCES brands(id);

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'supplier_id';
