-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.brands (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL UNIQUE,
  user_id text DEFAULT 'default'::text,
  created_at timestamp with time zone DEFAULT now(),
  email text,
  phone_primary text,
  address_line1 text,
  city text,
  state text,
  postal_code text,
  CONSTRAINT brands_pkey PRIMARY KEY (id)
);
CREATE TABLE public.contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text UNIQUE,
  phone_1 text,
  phone_2 text,
  address text,
  city text,
  state text,
  zip_code text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by text,
  CONSTRAINT contacts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.documents (
  id text NOT NULL,
  shipment_id integer,
  file_name text NOT NULL,
  drive_file_id text NOT NULL UNIQUE,
  drive_file_url text,
  file_size integer,
  file_type text,
  uploaded_by text,
  uploaded_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT documents_pkey PRIMARY KEY (id),
  CONSTRAINT documents_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.shipments(id)
);
CREATE TABLE public.invoice_line_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  item_code text,
  description text NOT NULL,
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  line_total numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  brand character varying,
  CONSTRAINT invoice_line_items_pkey PRIMARY KEY (id),
  CONSTRAINT invoice_line_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id)
);
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  po_number text,
  invoice_date date NOT NULL,
  customer_name text NOT NULL,
  customer_address text,
  customer_city text,
  customer_state text,
  customer_zip text,
  customer_tel1 text,
  customer_tel2 text,
  customer_email text,
  subtotal numeric NOT NULL,
  tax_amount numeric NOT NULL,
  total_amount numeric NOT NULL,
  deposit_amount numeric NOT NULL DEFAULT 0,
  balance_due numeric NOT NULL,
  payments_history jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_edited text,
  original_invoice_id text,
  discount_amount numeric NOT NULL DEFAULT 0,
  created_by text,
  contact_id uuid,
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id)
);
CREATE TABLE public.items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  description text NOT NULL UNIQUE,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT items_pkey PRIMARY KEY (id),
  CONSTRAINT items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_number text UNIQUE,
  order_date date NOT NULL,
  supplier_id bigint NOT NULL,
  currency text DEFAULT 'USD'::text,
  subtotal numeric,
  discount_amount numeric,
  tax_amount numeric,
  shipping_amount numeric,
  total_amount numeric,
  deposit_amount numeric,
  balance_due numeric,
  notes text,
  attachments jsonb,
  payments_history jsonb,
  created_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.brands(id)
);
CREATE TABLE public.orders_line_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  line_index integer,
  item_code text,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric,
  line_total numeric,
  brand text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT orders_line_items_pkey PRIMARY KEY (id),
  CONSTRAINT orders_line_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  passcode text,
  avatar text,
  created_at timestamp with time zone DEFAULT now(),
  gmail_access_token text,
  gmail_refresh_token text,
  gmail_token_expiry timestamp with time zone,
  signature text,
  out_of_office_settings text,
  userEmail text,
  is_admin boolean DEFAULT false,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.shipments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  ref text,
  etd text,
  eta text,
  container_n text,
  documents jsonb DEFAULT '[]'::jsonb,
  created_at date,
  updated_at date,
  user_id uuid,
  CONSTRAINT shipments_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  username text NOT NULL UNIQUE,
  profile_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_credentials_pkey PRIMARY KEY (id),
  CONSTRAINT user_credentials_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);