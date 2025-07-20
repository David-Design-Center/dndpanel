-- SQL queries to run in Supabase for Invoice Generator improvements

-- 1. Create items table to store item descriptions and their brands
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL UNIQUE,
  brand_name TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for items table
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for items table
CREATE POLICY "Authenticated users can view items"
ON items FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "Authenticated users can insert items"
ON items FOR INSERT
TO authenticated
WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can update items"
ON items FOR UPDATE
TO authenticated
USING (TRUE);

CREATE POLICY "Authenticated users can delete items"
ON items FOR DELETE
TO authenticated
USING (TRUE);

-- 2. Add discount field to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0 NOT NULL;

-- 3. Add auto-increment PO number tracking
CREATE TABLE IF NOT EXISTS po_number_sequence (
  id SERIAL PRIMARY KEY,
  current_number INTEGER NOT NULL DEFAULT 10772,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial value if table is empty
INSERT INTO po_number_sequence (current_number) 
SELECT 10772 
WHERE NOT EXISTS (SELECT 1 FROM po_number_sequence);

-- Function to get next PO number
CREATE OR REPLACE FUNCTION get_next_po_number()
RETURNS INTEGER AS $$
DECLARE
    next_number INTEGER;
BEGIN
    UPDATE po_number_sequence 
    SET current_number = current_number + 1,
        updated_at = NOW()
    WHERE id = 1
    RETURNING current_number INTO next_number;
    
    RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- 4. Fix brands table for default brands and insert default brands
-- First, make sure the brands table allows NULL user_id for default brands
ALTER TABLE brands ALTER COLUMN user_id DROP NOT NULL;

-- Clear any existing default brands that might have invalid user_id
DELETE FROM brands WHERE user_id = 'default';

-- Insert default brands with NULL user_id (system defaults)
INSERT INTO brands (name, user_id) VALUES
('Visionnaire', NULL),
('Arketipo', NULL), 
('Aster', NULL),
('Cattelanitalia', NULL),
('Gamma', NULL),
('Longhi', NULL),
('Kulik Systems', NULL),
('Prestige', NULL),
('Vittoriafrigerio', NULL)
ON CONFLICT (name) DO NOTHING;

-- 5. Add brand column to invoice_line_items if not exists (already done in previous migration)
ALTER TABLE invoice_line_items 
ADD COLUMN IF NOT EXISTS brand TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_items_description ON items (description);
CREATE INDEX IF NOT EXISTS idx_items_brand_name ON items (brand_name);
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items (user_id);
