/*
  # Create Orders Table

  1. New Tables
    - `orders`
      - `id` (uuid, primary key)
      - `project_name` (text, required)
      - `type` (text, required, default 'Price Request')
      - `status` (text, required, default 'Sent')
      - `created_by` (text, required)
      - `created_at` (timestamptz, default now())
      - `order_number` (text)
      - `customer_name` (text)
      - `order_date` (date)
      - `expected_due_date` (date)
      - `order_amount` (numeric)
      - `payment_option` (text)
      - `payment_status` (text)
      - `product_details` (text)
      - `user_email` (text)
      - `teams` (jsonb, for storing PriceRequestTeam array)
      - `description` (text)
      - `due_date` (timestamptz)
      - `thread_id` (text)

  2. Security
    - Enable RLS on `orders` table
    - Add policies for authenticated users to manage orders
*/

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name text NOT NULL,
  type text NOT NULL DEFAULT 'Price Request',
  status text NOT NULL DEFAULT 'Sent',
  created_by text NOT NULL,
  created_at timestamptz DEFAULT now(),
  order_number text,
  customer_name text,
  order_date date,
  expected_due_date date,
  order_amount numeric,
  payment_option text,
  payment_status text,
  product_details text,
  user_email text,
  teams jsonb,
  description text,
  due_date timestamptz,
  thread_id text
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all orders
CREATE POLICY "Authenticated users can read orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert orders
CREATE POLICY "Authenticated users can insert orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update orders
CREATE POLICY "Authenticated users can update orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (true);

-- Allow authenticated users to delete orders
CREATE POLICY "Authenticated users can delete orders"
  ON orders
  FOR DELETE
  TO authenticated
  USING (true);