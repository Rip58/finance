-- Create recurring_transactions table for templates
CREATE TABLE public.recurring_transactions (
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

-- RLS policies for recurring_transactions
CREATE POLICY "Users can view own recurring_transactions"
ON public.recurring_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recurring_transactions"
ON public.recurring_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurring_transactions"
ON public.recurring_transactions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurring_transactions"
ON public.recurring_transactions FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all recurring_transactions"
ON public.recurring_transactions FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create recurring_confirmations table to track confirmed occurrences
CREATE TABLE public.recurring_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_id uuid NOT NULL REFERENCES public.recurring_transactions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  occurrence_date date NOT NULL,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  confirmed_at timestamptz DEFAULT now(),
  UNIQUE(recurring_id, occurrence_date)
);

-- Enable RLS
ALTER TABLE public.recurring_confirmations ENABLE ROW LEVEL SECURITY;

-- RLS policies for recurring_confirmations
CREATE POLICY "Users can view own recurring_confirmations"
ON public.recurring_confirmations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recurring_confirmations"
ON public.recurring_confirmations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurring_confirmations"
ON public.recurring_confirmations FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all recurring_confirmations"
ON public.recurring_confirmations FOR ALL
USING (has_role(auth.uid(), 'admin'));