/*
  # Create General Documents Table

  1. New Tables
    - `general_documents`
      - `id` (uuid, primary key)
      - `file_name` (text, required)
      - `document_url` (text, required) - URL to the Google Drive PDF
      - `uploaded_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `general_documents` table
    - Add policy for authenticated users to read all documents
*/

CREATE TABLE IF NOT EXISTS general_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  document_url text NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE general_documents ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all documents
CREATE POLICY "Authenticated users can read general_documents"
  ON general_documents
  FOR SELECT
  TO authenticated
  USING (true);