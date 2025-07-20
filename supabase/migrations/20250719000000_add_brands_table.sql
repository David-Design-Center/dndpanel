-- Create brands table for storing custom furniture brands
CREATE TABLE IF NOT EXISTS brands (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index to prevent duplicate brand names per user
CREATE UNIQUE INDEX IF NOT EXISTS brands_user_name_unique 
ON brands(user_id, LOWER(name));

-- Add RLS policies
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own brands
CREATE POLICY "Users can view own brands" ON brands
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own brands
CREATE POLICY "Users can insert own brands" ON brands
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own brands
CREATE POLICY "Users can update own brands" ON brands
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own brands
CREATE POLICY "Users can delete own brands" ON brands
    FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_brands_updated_at 
    BEFORE UPDATE ON brands 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- Add brand column to invoice_line_items table if it doesn't exist
ALTER TABLE invoice_line_items 
ADD COLUMN IF NOT EXISTS brand VARCHAR(255);

-- Add brand column to orders table teams field (this will be handled in the JSON structure)
-- No schema change needed as teams is already a JSONB field
