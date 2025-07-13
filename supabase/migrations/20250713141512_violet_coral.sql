/*
  # Create Invoices and Invoice Line Items Tables

  1. New Tables
    - `invoices`
      - `id` (uuid, primary key)
      - `po_number` (text)
      - `invoice_date` (date, required)
      - `customer_name` (text, required)
      - `customer_address` (text)
      - Additional customer fields
      - `subtotal` (numeric, required)
      - `tax_amount` (numeric, required)
      - `total_amount` (numeric, required)
      - `deposit_amount` (numeric, required, default 0)
      - `balance_due` (numeric, required)
      - `payments_history` (jsonb) - Array of payment objects with date, amount, method
      - `created_at` and `updated_at` timestamps
      
    - `invoice_line_items`
      - `id` (uuid, primary key)
      - `invoice_id` (uuid, foreign key to invoices.id)
      - `item_code` (text)
      - `description` (text, required)
      - `quantity` (numeric, required)
      - `unit_price` (numeric, required)
      - `line_total` (numeric, required)
      - `created_at` timestamp

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage invoices and line items
*/

-- Create the invoices table to store main invoice details
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT,
  invoice_date DATE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_address TEXT,
  customer_city TEXT,
  customer_state TEXT,
  customer_zip TEXT,
  customer_tel1 TEXT,
  customer_tel2 TEXT,
  customer_email TEXT,
  subtotal NUMERIC NOT NULL,
  tax_amount NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  deposit_amount NUMERIC DEFAULT 0 NOT NULL,
  balance_due NUMERIC NOT NULL,
  payments_history JSONB, -- Stores an array of payment objects { date, amount, method }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add a function to automatically update the 'updated_at' column on changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to call the update_updated_at_column function before each update on the invoices table
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for the invoices table
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to view all invoices
CREATE POLICY "Authenticated users can view invoices"
ON invoices FOR SELECT
TO authenticated
USING (TRUE);

-- RLS Policy: Allow authenticated users to insert new invoices
CREATE POLICY "Authenticated users can insert invoices"
ON invoices FOR INSERT
TO authenticated
WITH CHECK (TRUE);

-- RLS Policy: Allow authenticated users to update existing invoices
CREATE POLICY "Authenticated users can update invoices"
ON invoices FOR UPDATE
TO authenticated
USING (TRUE);

-- RLS Policy: Allow authenticated users to delete invoices
CREATE POLICY "Authenticated users can delete invoices"
ON invoices FOR DELETE
TO authenticated
USING (TRUE);

-- Create the invoice_line_items table to store individual items for each invoice
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE, -- Foreign key linking to the invoices table
  item_code TEXT,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  line_total NUMERIC NOT NULL, -- Calculated as quantity * unit_price
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) for the invoice_line_items table
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to view all invoice line items
CREATE POLICY "Authenticated users can view invoice line items"
ON invoice_line_items FOR SELECT
TO authenticated
USING (TRUE);

-- RLS Policy: Allow authenticated users to insert new invoice line items
CREATE POLICY "Authenticated users can insert invoice line items"
ON invoice_line_items FOR INSERT
TO authenticated
WITH CHECK (TRUE);

-- RLS Policy: Allow authenticated users to update existing invoice line items
CREATE POLICY "Authenticated users can update invoice line items"
ON invoice_line_items FOR UPDATE
TO authenticated
USING (TRUE);

-- RLS Policy: Allow authenticated users to delete invoice line items
CREATE POLICY "Authenticated users can delete invoice line items"
ON invoice_line_items FOR DELETE
TO authenticated
USING (TRUE);