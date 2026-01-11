-- 1. Create recurring_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.recurring_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  name text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'EUR',
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  cadence text NOT NULL CHECK (cadence IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  start_date date NOT NULL,
  next_occurrence_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  notes text NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

-- Add RLS policies (Dropping first to ensure idempotency)
DROP POLICY IF EXISTS "Users can view own recurring_transactions" ON public.recurring_transactions;
CREATE POLICY "Users can view own recurring_transactions" ON public.recurring_transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own recurring_transactions" ON public.recurring_transactions;
CREATE POLICY "Users can insert own recurring_transactions" ON public.recurring_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own recurring_transactions" ON public.recurring_transactions;
CREATE POLICY "Users can update own recurring_transactions" ON public.recurring_transactions FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own recurring_transactions" ON public.recurring_transactions;
CREATE POLICY "Users can delete own recurring_transactions" ON public.recurring_transactions FOR DELETE USING (auth.uid() = user_id);

-- 2. Create recurring_confirmations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.recurring_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_id uuid NOT NULL REFERENCES public.recurring_transactions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  occurrence_date date NOT NULL,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  confirmed_at timestamptz DEFAULT now(),
  UNIQUE(recurring_id, occurrence_date)
);

ALTER TABLE public.recurring_confirmations ENABLE ROW LEVEL SECURITY;

-- Policies for confirmations
DROP POLICY IF EXISTS "Users can view own recurring_confirmations" ON public.recurring_confirmations;
CREATE POLICY "Users can view own recurring_confirmations" ON public.recurring_confirmations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own recurring_confirmations" ON public.recurring_confirmations;
CREATE POLICY "Users can insert own recurring_confirmations" ON public.recurring_confirmations FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own recurring_confirmations" ON public.recurring_confirmations;
CREATE POLICY "Users can delete own recurring_confirmations" ON public.recurring_confirmations FOR DELETE USING (auth.uid() = user_id);

-- 3. Add extra columns if missing (from later migration)
ALTER TABLE public.recurring_transactions ADD COLUMN IF NOT EXISTS from_account_id uuid NULL;
ALTER TABLE public.recurring_transactions ADD COLUMN IF NOT EXISTS to_account_id uuid NULL;
ALTER TABLE public.recurring_transactions ADD COLUMN IF NOT EXISTS amount_to numeric NULL;
ALTER TABLE public.recurring_transactions ADD COLUMN IF NOT EXISTS currency_to text NULL;
ALTER TABLE public.recurring_transactions ADD COLUMN IF NOT EXISTS contributions JSONB DEFAULT '[]'::jsonb;

-- 4. RELAX CONSTRAINTS FOR DEBT (MANUAL) SUPPORT
-- Allow amount >= 0 (since manual debts have 0 recurring amount)
ALTER TABLE public.recurring_transactions DROP CONSTRAINT IF EXISTS recurring_transactions_amount_check;
ALTER TABLE public.recurring_transactions ADD CONSTRAINT recurring_transactions_amount_check CHECK (amount >= 0);

-- Allow 'manual' cadence
ALTER TABLE public.recurring_transactions DROP CONSTRAINT IF EXISTS recurring_transactions_cadence_check;
ALTER TABLE public.recurring_transactions ADD CONSTRAINT recurring_transactions_cadence_check CHECK (cadence IN ('weekly', 'monthly', 'quarterly', 'yearly', 'manual'));

-- 5. Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
