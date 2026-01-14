-- Migration: 20260114_gmail_sync
-- Description: Create tables for Gmail backend sync (Accounts, Labels)

--------------------------------------------------------------------------------
-- 1. Gmail Accounts Table
-- Tracks sync state per Profile (since Profiles hold the Gmail credentials)
--------------------------------------------------------------------------------
create table if not exists public.gmail_accounts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade not null,
  email text not null, -- Cached from profile.userEmail for easy access
  
  -- Sync State
  history_id_checkpoint text,
  watch_expiration timestamptz,
  last_full_sync_at timestamptz,
  last_incremental_sync_at timestamptz,
  sync_status text default 'idle' check (sync_status in ('idle', 'syncing', 'error')),
  sync_error text,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Ensure one account entry per profile
  unique(profile_id)
);

-- RLS: Users can see accounts if they have access to the profile
-- (Simplification: If they can see the profile, they can see the account)
alter table public.gmail_accounts enable row level security;

create policy "Users can view gmail_accounts for accessible profiles"
  on public.gmail_accounts for select
  using (
    exists (
      select 1 from public.profiles
      where id = gmail_accounts.profile_id
      -- implicitly relies on profiles RLS
    )
  );

create policy "Users can insert gmail_accounts for accessible profiles"
  on public.gmail_accounts for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = gmail_accounts.profile_id
    )
  );
  
create policy "Users can update gmail_accounts for accessible profiles"
  on public.gmail_accounts for update
  using (
    exists (
      select 1 from public.profiles
      where id = gmail_accounts.profile_id
    )
  );

--------------------------------------------------------------------------------
-- 2. Gmail Labels Table (Counters)
--------------------------------------------------------------------------------
create table if not exists public.gmail_labels (
  id uuid primary key default gen_random_uuid(),
  gmail_account_id uuid references public.gmail_accounts(id) on delete cascade not null,
  
  label_id text not null,
  name text not null,
  type text not null, -- 'system' or 'user'
  
  -- Counters
  messages_total int default 0,
  messages_unread int default 0,
  threads_total int default 0,
  threads_unread int default 0,
  
  last_synced_at timestamptz default now(),
  
  -- Constraints
  unique(gmail_account_id, label_id)
);

-- RLS: Inherit access from gmail_accounts
alter table public.gmail_labels enable row level security;

create policy "Users can view labels for accessible accounts"
  on public.gmail_labels for select
  using (
    exists (
      select 1 from public.gmail_accounts
      where id = gmail_labels.gmail_account_id
      -- implicit recursion to profiles check
    )
  );

create policy "Users can update labels for accessible accounts"
  on public.gmail_labels for all
  using (
    exists (
      select 1 from public.gmail_accounts
      where id = gmail_labels.gmail_account_id
    )
  );

-- Indexes for performance
create index if not exists idx_gmail_labels_account on public.gmail_labels(gmail_account_id);
create index if not exists idx_gmail_accounts_profile on public.gmail_accounts(profile_id);
