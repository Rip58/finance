-- 1. Add is_validated to transfers
ALTER TABLE public.transfers ADD COLUMN is_validated boolean NOT NULL DEFAULT false;

-- 2. Add is_validated to transactions
ALTER TABLE public.transactions ADD COLUMN is_validated boolean NOT NULL DEFAULT false;

-- 3. Create account_holdings table for multi-asset balances per bank account
CREATE TABLE public.account_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id uuid NOT NULL,
  symbol text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(bank_account_id, symbol)
);

-- Enable RLS on account_holdings
ALTER TABLE public.account_holdings ENABLE ROW LEVEL SECURITY;

-- RLS policies for account_holdings
CREATE POLICY "Users can view own account_holdings"
ON public.account_holdings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own account_holdings"
ON public.account_holdings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own account_holdings"
ON public.account_holdings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own account_holdings"
ON public.account_holdings
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all account_holdings"
ON public.account_holdings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Create crypto_assets table for user-defined crypto assets
CREATE TABLE public.crypto_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  name text NOT NULL,
  asset_type text NOT NULL DEFAULT 'crypto',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, symbol)
);

-- Enable RLS on crypto_assets
ALTER TABLE public.crypto_assets ENABLE ROW LEVEL SECURITY;

-- RLS policies for crypto_assets
CREATE POLICY "Users can view own crypto_assets"
ON public.crypto_assets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own crypto_assets"
ON public.crypto_assets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crypto_assets"
ON public.crypto_assets
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own crypto_assets"
ON public.crypto_assets
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all crypto_assets"
ON public.crypto_assets
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));