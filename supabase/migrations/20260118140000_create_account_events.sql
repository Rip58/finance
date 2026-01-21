-- Create account_events table for Event Sourcing
create table if not exists public.account_events (
  event_id uuid default gen_random_uuid() primary key,
  account_id uuid not null references public.bank_accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  type text not null check (type in ('INITIAL', 'BALANCE_UPDATE', 'MANUAL_ADJUSTMENT', 'DELETION_SNAPSHOT')),
  balance_after numeric not null,
  currency text not null,
  delta_amount numeric, -- Optional, useful for auditing
  metadata jsonb default '{}'::jsonb
);

-- Enable RLS
alter table public.account_events enable row level security;

create policy "Users can view their own account events"
  on public.account_events for select
  using (auth.uid() = user_id);

create policy "Users can insert their own account events"
  on public.account_events for insert
  with check (auth.uid() = user_id);

-- Trigger Function to log changes automatically
create or replace function public.log_account_change()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    insert into public.account_events (account_id, user_id, occurred_at, type, balance_after, currency, delta_amount)
    values (
      NEW.id,
      NEW.user_id,
      now(),
      'INITIAL',
      NEW.initial_balance, -- Or current balance if migrated, assuming initial_balance is the starting state
      NEW.currency,
      NEW.initial_balance
    );
    return NEW;
  elsif (TG_OP = 'UPDATE') then
    -- Detect balance change if we add a 'balance' column to bank_accounts, 
    -- BUT bank_accounts currently only has 'initial_balance'.
    -- If the user edits 'initial_balance', we treat it as a correction/adjustment event.
    -- If the user edits the account NAME, we do not log a financial event.
    
    if (OLD.initial_balance is distinct from NEW.initial_balance) then
       insert into public.account_events (account_id, user_id, occurred_at, type, balance_after, currency, delta_amount)
       values (
         NEW.id,
         NEW.user_id,
         now(),
         'MANUAL_ADJUSTMENT',
         NEW.initial_balance,
         NEW.currency,
         NEW.initial_balance - OLD.initial_balance
       );
    end if;
    return NEW;
  elsif (TG_OP = 'DELETE') then
      -- Log final state as 0 to drop the chart line
       insert into public.account_events (account_id, user_id, occurred_at, type, balance_after, currency, delta_amount)
       values (
         OLD.id,
         OLD.user_id,
         now(),
         'DELETION_SNAPSHOT',
         0,
         OLD.currency,
         -OLD.initial_balance
       );
       return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Trigger
drop trigger if exists on_account_change on public.bank_accounts;
create trigger on_account_change
  after insert or update or delete
  on public.bank_accounts
  for each row execute function public.log_account_change();

-- Backfill: Insert current state of all accounts as 'INITIAL' events (idempotent-ish check ideally but for fresh table it's fine)
insert into public.account_events (account_id, user_id, occurred_at, type, balance_after, currency, delta_amount)
select 
  id, 
  user_id, 
  coalesce(created_at, now()), 
  'INITIAL', 
  initial_balance, 
  currency, 
  initial_balance
from public.bank_accounts
where not exists (select 1 from public.account_events where account_id = bank_accounts.id);
