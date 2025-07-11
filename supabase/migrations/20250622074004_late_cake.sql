/*
  # Add installment payment fields to orders table

  1. New Columns
    - `deposit_amount` (numeric, nullable) - stores the deposit amount for installment payments
    - `payments_history` (jsonb, nullable) - stores array of payment objects with date and amount

  2. Purpose
    - Support installment payment tracking for customer orders
    - Store payment history for invoice generation
*/

DO $$
BEGIN
  -- Add deposit_amount column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'deposit_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN deposit_amount numeric;
  END IF;

  -- Add payments_history column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payments_history'
  ) THEN
    ALTER TABLE orders ADD COLUMN payments_history jsonb;
  END IF;
END $$;