-- Create contacts table for better data management
-- Check if table already exists before creating
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contacts') THEN
        CREATE TABLE contacts (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            full_name VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            phone_1 VARCHAR(50),
            phone_2 VARCHAR(50),
            address TEXT,
            city VARCHAR(100),
            state VARCHAR(50),
            zip_code VARCHAR(20),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_by UUID REFERENCES auth.users(id)
        );

        -- Add unique constraint on email if provided
        ALTER TABLE contacts ADD CONSTRAINT unique_contact_email UNIQUE(email) WHERE email IS NOT NULL;

        -- Create indexes for faster lookups
        CREATE INDEX idx_contacts_email ON contacts(email) WHERE email IS NOT NULL;
        CREATE INDEX idx_contacts_full_name ON contacts(full_name);
        CREATE INDEX idx_contacts_created_by ON contacts(created_by);

        -- Add RLS (Row Level Security)
        ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

        -- Create policy for authenticated users to manage contacts
        CREATE POLICY "Users can manage contacts" ON contacts
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Add updated_at trigger if function doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_contacts_updated_at'
    ) THEN
        CREATE TRIGGER update_contacts_updated_at 
            BEFORE UPDATE ON contacts 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Add contact_id to invoices table if column doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'contact_id'
    ) THEN
        ALTER TABLE invoices ADD COLUMN contact_id UUID REFERENCES contacts(id);
        CREATE INDEX idx_invoices_contact_id ON invoices(contact_id);
    END IF;
END $$;

-- Optional: Migrate existing invoice contact data to contacts table
-- This can be run manually after the table is created
-- INSERT INTO contacts (full_name, email, phone_1, phone_2, address, city, state, zip_code)
-- SELECT DISTINCT 
--     customer_name,
--     customer_email,
--     customer_tel1,
--     customer_tel2,
--     customer_address,
--     customer_city,
--     customer_state,
--     customer_zip
-- FROM invoices 
-- WHERE customer_name IS NOT NULL 
-- AND customer_name != ''
-- ON CONFLICT (email) DO NOTHING;
