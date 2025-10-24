-- Add vendor/supplier fields to brands table for consolidation
-- This migration enhances the brands table to support vendor information

-- Add vendor contact columns to brands table
ALTER TABLE brands ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS phone_primary TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS phone_secondary TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Update the brands table comments to reflect new purpose
COMMENT ON TABLE brands IS 'Unified table for product brands and vendor/supplier information. Each brand represents both a product line and the vendor company.';

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS brands_email_idx ON brands(email);

-- Create index on company_name for searching vendors
CREATE INDEX IF NOT EXISTS brands_company_name_idx ON brands(company_name);
