/*
  # Create Shipments and Document Upload Tables

  1. New Tables
    - `shipments` - stores shipment tracking information
    - `shipment_documents` - stores uploaded documents linked to shipments
    
  2. Storage Setup
    - Create storage bucket for shipment documents
    
  3. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create shipments table
CREATE TABLE IF NOT EXISTS shipments (
  id SERIAL PRIMARY KEY,
  ref text,
  consignee text,
  shipper text,
  vessel_carrier text,
  etd text, -- Estimated Time of Departure
  eta text, -- Estimated Time of Arrival
  container_n text,
  description_of_goods text,
  shipping_status text DEFAULT 'Processing',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create shipment_documents table for Google Drive files
CREATE TABLE IF NOT EXISTS shipment_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id integer REFERENCES shipments(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  drive_file_id text NOT NULL, -- Google Drive file ID
  drive_file_url text, -- Google Drive viewable URL
  file_size bigint,
  file_type text,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_documents ENABLE ROW LEVEL SECURITY;

-- Policies for shipments
CREATE POLICY "Authenticated users can read shipments"
  ON shipments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create shipments"
  ON shipments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update shipments"
  ON shipments
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policies for shipment_documents
CREATE POLICY "Authenticated users can read shipment_documents"
  ON shipment_documents
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create shipment_documents"
  ON shipment_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update shipment_documents"
  ON shipment_documents
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete their own shipment_documents"
  ON shipment_documents
  FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());
