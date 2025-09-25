/*
  # Create Orders Line Items Table

  - Stores items for supplier orders and cascades with parent order
*/

begin;

create table if not exists public.orders_line_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  line_index integer,
  item_code text,
  description text not null,
  quantity numeric not null default 1,
  unit_price numeric,
  line_total numeric,
  brand text,
  created_at timestamptz default now()
);

create index if not exists orders_line_items_order_idx on public.orders_line_items (order_id);
create index if not exists orders_line_items_line_idx on public.orders_line_items (order_id, line_index);

alter table public.orders_line_items enable row level security;

create policy "Order Items Select" on public.orders_line_items
  for select using (auth.role() = 'authenticated');

create policy "Order Items Insert" on public.orders_line_items
  for insert with check (auth.role() = 'authenticated');

create policy "Order Items Update" on public.orders_line_items
  for update using (auth.role() = 'authenticated');

create policy "Order Items Delete" on public.orders_line_items
  for delete using (auth.role() = 'authenticated');

commit;
