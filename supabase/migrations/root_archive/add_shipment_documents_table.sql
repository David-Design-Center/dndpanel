-- Create shipment_documents table for Google Drive integration
-- Run this migration in your Supabase SQL Editor

CREATE TABLE shipment_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id INTEGER NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  drive_file_id TEXT NOT NULL UNIQUE,
  drive_file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_shipment_documents_shipment_id ON shipment_documents(shipment_id);
CREATE INDEX idx_shipment_documents_uploaded_at ON shipment_documents(uploaded_at);
CREATE INDEX idx_shipment_documents_drive_file_id ON shipment_documents(drive_file_id);

-- Enable Row Level Security
ALTER TABLE shipment_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust based on your existing security setup)
CREATE POLICY "Users can view their own shipment documents" ON shipment_documents
  FOR SELECT USING (
    uploaded_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM shipments 
      WHERE shipments.id = shipment_documents.shipment_id 
      AND shipments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own shipment documents" ON shipment_documents
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM shipments 
      WHERE shipments.id = shipment_documents.shipment_id 
      AND shipments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own shipment documents" ON shipment_documents
  FOR UPDATE USING (
    uploaded_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM shipments 
      WHERE shipments.id = shipment_documents.shipment_id 
      AND shipments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own shipment documents" ON shipment_documents
  FOR DELETE USING (
    uploaded_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM shipments 
      WHERE shipments.id = shipment_documents.shipment_id 
      AND shipments.user_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_shipment_documents_updated_at 
    BEFORE UPDATE ON shipment_documents 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
