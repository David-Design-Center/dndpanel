/*
  # Create Suppliers Table

  - Adds suppliers master table linked optionally to contacts
  - Enables updated_at trigger and permissive RLS policies for authenticated users
*/

begin;

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  company_name text,
  email text,
  phone_primary text,
  phone_secondary text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text,
  notes text,
  contact_id uuid references public.contacts(id) on delete set null,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger suppliers_updated_at
  before update on public.suppliers
  for each row
  execute function public.update_updated_at_column();

create index if not exists suppliers_display_name_idx on public.suppliers (display_name);
create index if not exists suppliers_contact_idx on public.suppliers (contact_id);

alter table public.suppliers enable row level security;

create policy "Suppliers Select" on public.suppliers
  for select using (auth.role() = 'authenticated');

create policy "Suppliers Insert" on public.suppliers
  for insert with check (auth.role() = 'authenticated');

create policy "Suppliers Update" on public.suppliers
  for update using (auth.role() = 'authenticated');

create policy "Suppliers Delete" on public.suppliers
  for delete using (auth.role() = 'authenticated');

commit;
