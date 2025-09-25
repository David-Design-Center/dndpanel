/*
  # Create Orders Table (Supplier Invoices)

  - Stores supplier-facing invoices
  - References suppliers table and keeps monetary + logistics fields
*/

begin;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique,
  order_date date not null,
  due_date date,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  external_ref text,
  status text default 'pending',
  terms text,
  currency text default 'USD',
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
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger orders_updated_at
  before update on public.orders
  for each row
  execute function public.update_updated_at_column();

create index if not exists orders_supplier_idx on public.orders (supplier_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_by_idx on public.orders (created_by);

alter table public.orders enable row level security;

create policy "Orders Select" on public.orders
  for select using (auth.role() = 'authenticated');

create policy "Orders Insert" on public.orders
  for insert with check (auth.role() = 'authenticated');

create policy "Orders Update" on public.orders
  for update using (auth.role() = 'authenticated');

create policy "Orders Delete" on public.orders
  for delete using (auth.role() = 'authenticated');

commit;
