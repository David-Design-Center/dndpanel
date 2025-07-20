-- Add fields to support invoice editing functionality
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_invoice_id TEXT;

-- Create index for faster lookups of edited invoices
CREATE INDEX IF NOT EXISTS idx_orders_is_edited ON public.orders (is_edited);
CREATE INDEX IF NOT EXISTS idx_orders_original_invoice_id ON public.orders (original_invoice_id);

-- Add comments to document the new fields
COMMENT ON COLUMN public.orders.is_edited IS 'Indicates whether this order is an edited version of an original invoice';
COMMENT ON COLUMN public.orders.original_invoice_id IS 'Reference to the original invoice ID when this is an edited version';
