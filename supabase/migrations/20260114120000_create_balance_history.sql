-- Create balance_history table
create table if not exists public.balance_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  total_balance numeric not null,
  savings_balance numeric default 0,
  investments_balance numeric default 0,
  crypto_balance numeric default 0,
  currency text default 'EUR',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for querying history by date range
create index if not exists idx_balance_history_user_date on public.balance_history(user_id, date);

-- Add RLS policies
alter table public.balance_history enable row level security;

create policy "Users can view their own balance history"
  on public.balance_history for select
  using (auth.uid() = user_id);

create policy "Users can insert their own balance history"
  on public.balance_history for insert
  with check (auth.uid() = user_id);
