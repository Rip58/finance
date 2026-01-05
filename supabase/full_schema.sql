
-- Migration: supabase/migrations/20260103152224_3190cdf7-1f85-4a28-a4bd-0c04eaa54445.sql --

-- Create asset_transactions table for buy/sell operations
CREATE TABLE public.asset_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  quantity DECIMAL(20, 8) NOT NULL CHECK (quantity > 0),
  price_eur DECIMAL(20, 8) NOT NULL CHECK (price_eur >= 0),
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create asset_prices table for historical price data
CREATE TABLE public.asset_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  price_date DATE NOT NULL,
  open_price DECIMAL(20, 8),
  high_price DECIMAL(20, 8),
  low_price DECIMAL(20, 8),
  close_price DECIMAL(20, 8) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(symbol, price_date)
);

-- Create cash_transactions table for income/expense tracking
CREATE TABLE public.cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount_eur DECIMAL(20, 2) NOT NULL CHECK (amount_eur > 0),
  category TEXT,
  description TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.asset_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for asset_transactions (user-specific)
CREATE POLICY "Users can view their own asset transactions"
  ON public.asset_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own asset transactions"
  ON public.asset_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own asset transactions"
  ON public.asset_transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own asset transactions"
  ON public.asset_transactions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for asset_prices (public read, admin write via service role)
CREATE POLICY "Anyone can view asset prices"
  ON public.asset_prices FOR SELECT
  USING (true);

-- RLS policies for cash_transactions (user-specific)
CREATE POLICY "Users can view their own cash transactions"
  ON public.cash_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cash transactions"
  ON public.cash_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cash transactions"
  ON public.cash_transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cash transactions"
  ON public.cash_transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_asset_transactions_user_id ON public.asset_transactions(user_id);
CREATE INDEX idx_asset_transactions_symbol ON public.asset_transactions(symbol);
CREATE INDEX idx_asset_transactions_date ON public.asset_transactions(transaction_date);
CREATE INDEX idx_asset_prices_symbol_date ON public.asset_prices(symbol, price_date);
CREATE INDEX idx_cash_transactions_user_id ON public.cash_transactions(user_id);
CREATE INDEX idx_cash_transactions_date ON public.cash_transactions(transaction_date);
-- Migration: supabase/migrations/20260103163634_8958fbb1-9ce7-4204-9842-e8bbbe8e93d6.sql --

-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table for proper role management
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 1.1 Settings table (1 per user)
CREATE TABLE public.settings (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    base_currency text NOT NULL DEFAULT 'EUR',
    timezone text NOT NULL DEFAULT 'Europe/Madrid',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON public.settings
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.settings
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.settings
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all settings" ON public.settings
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 1.2 Categories table
CREATE TABLE public.categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    scope text NOT NULL CHECK (scope IN ('expense', 'income', 'subscription', 'account', 'asset')),
    name text NOT NULL,
    sort_order int DEFAULT 0,
    is_archived boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, scope, name)
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories" ON public.categories
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories" ON public.categories
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories" ON public.categories
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories" ON public.categories
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all categories" ON public.categories
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 1.3 Bank accounts table
CREATE TABLE public.bank_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    currency text NOT NULL DEFAULT 'EUR',
    is_archived boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bank_accounts" ON public.bank_accounts
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bank_accounts" ON public.bank_accounts
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bank_accounts" ON public.bank_accounts
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bank_accounts" ON public.bank_accounts
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all bank_accounts" ON public.bank_accounts
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 1.4 Transactions table (replaces cash_transactions)
CREATE TABLE public.transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type text NOT NULL CHECK (type IN ('income', 'expense')),
    amount numeric NOT NULL CHECK (amount > 0),
    currency text NOT NULL DEFAULT 'EUR',
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
    description text,
    date timestamptz NOT NULL,
    value_date timestamptz,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.transactions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.transactions
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON public.transactions
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON public.transactions
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all transactions" ON public.transactions
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, date);
CREATE INDEX idx_transactions_type ON public.transactions(type);

-- 1.5 Subscriptions table
CREATE TABLE public.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    amount numeric NOT NULL CHECK (amount > 0),
    currency text NOT NULL DEFAULT 'EUR',
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
    cadence text NOT NULL CHECK (cadence IN ('weekly', 'monthly', 'quarterly', 'yearly')),
    start_date date NOT NULL,
    next_charge_date date NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    notes text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON public.subscriptions
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions" ON public.subscriptions
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions" ON public.subscriptions
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Subscription charges for idempotency
CREATE TABLE public.subscription_charges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE CASCADE NOT NULL,
    charge_date date NOT NULL,
    transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(subscription_id, charge_date)
);

ALTER TABLE public.subscription_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription_charges" ON public.subscription_charges
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription_charges" ON public.subscription_charges
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscription_charges" ON public.subscription_charges
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 1.7 Transfers table
CREATE TABLE public.transfers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    from_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
    to_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
    amount_from numeric NOT NULL CHECK (amount_from > 0),
    currency_from text NOT NULL,
    amount_to numeric NOT NULL CHECK (amount_to > 0),
    currency_to text NOT NULL,
    fx_rate numeric,
    date timestamptz NOT NULL,
    value_date timestamptz,
    description text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transfers" ON public.transfers
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transfers" ON public.transfers
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transfers" ON public.transfers
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transfers" ON public.transfers
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all transfers" ON public.transfers
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 1.8 FX Rates table
CREATE TABLE public.fx_rates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pair text NOT NULL,
    rate numeric NOT NULL,
    as_of timestamptz NOT NULL,
    source text NOT NULL DEFAULT 'coinmarketcap',
    UNIQUE(pair, as_of)
);

ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;

-- FX rates are publicly readable
CREATE POLICY "Anyone can view fx_rates" ON public.fx_rates
FOR SELECT USING (true);

CREATE POLICY "Admins can manage fx_rates" ON public.fx_rates
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Modify asset_transactions to add new columns
ALTER TABLE public.asset_transactions 
ADD COLUMN IF NOT EXISTS asset_type text DEFAULT 'crypto',
ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS value_date timestamptz;

-- Update asset_transactions to use 'side' instead of 'type' and add asset_type constraint
ALTER TABLE public.asset_transactions 
RENAME COLUMN type TO side;

-- Add check constraint for side
ALTER TABLE public.asset_transactions 
ADD CONSTRAINT asset_transactions_side_check CHECK (side IN ('buy', 'sell'));

-- Add check constraint for asset_type
ALTER TABLE public.asset_transactions 
ADD CONSTRAINT asset_transactions_asset_type_check CHECK (asset_type IN ('crypto', 'commodity', 'other'));

-- Create trigger for settings updated_at
CREATE OR REPLACE FUNCTION public.update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER settings_updated_at_trigger
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.update_settings_updated_at();

-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
-- Migration: supabase/migrations/20260103183001_17af338b-4210-429d-81ff-e482c23e31cf.sql --

-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
-- Migration: supabase/migrations/20260103200056_6a06bbec-0f69-42c3-bb48-6e813a1230aa.sql --

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
-- Migration: supabase/migrations/20260103224805_6cfc7478-eb04-456e-b998-ab5296d7173f.sql --

-- Create loans table for pending payments (prestamos)
CREATE TABLE public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  total_amount numeric NOT NULL,
  monthly_payment numeric NOT NULL,
  total_installments integer NOT NULL,
  paid_installments integer NOT NULL DEFAULT 0,
  start_date date NOT NULL,
  end_date date NOT NULL,
  next_payment_date date NOT NULL,
  category_id uuid NULL,
  bank_account_id uuid NULL,
  currency text NOT NULL DEFAULT 'EUR',
  notes text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- RLS policies for loans
CREATE POLICY "Users can view own loans" 
ON public.loans FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loans" 
ON public.loans FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own loans" 
ON public.loans FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own loans" 
ON public.loans FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all loans" 
ON public.loans FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add columns to recurring_transactions for transfer support
ALTER TABLE public.recurring_transactions 
ADD COLUMN IF NOT EXISTS from_account_id uuid NULL,
ADD COLUMN IF NOT EXISTS to_account_id uuid NULL,
ADD COLUMN IF NOT EXISTS amount_to numeric NULL,
ADD COLUMN IF NOT EXISTS currency_to text NULL;
-- Migration: supabase/migrations/20260104003435_47b900ca-98a8-4caf-bc05-de3dd84aae73.sql --

-- Add initial_balance column to bank_accounts
ALTER TABLE bank_accounts 
ADD COLUMN initial_balance numeric NOT NULL DEFAULT 0;
-- Migration: supabase/migrations/20260104005542_203867d6-90e0-4f0b-ac63-3c15e87a1658.sql --

-- Create dca_portfolios table
CREATE TABLE public.dca_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  symbol text NOT NULL,
  asset_type text DEFAULT 'crypto',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dca_portfolios ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own dca_portfolios" 
  ON public.dca_portfolios FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dca_portfolios" 
  ON public.dca_portfolios FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dca_portfolios" 
  ON public.dca_portfolios FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dca_portfolios" 
  ON public.dca_portfolios FOR DELETE 
  USING (auth.uid() = user_id);

-- Add dca_portfolio_id to asset_transactions
ALTER TABLE public.asset_transactions 
ADD COLUMN dca_portfolio_id uuid REFERENCES public.dca_portfolios(id) ON DELETE SET NULL;
-- Migration: supabase/migrations/20260104094241_eae6ef07-94f0-4908-8a57-27fb597e8190.sql --

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
-- Migration: supabase/migrations/20260104184311_12962d85-7df9-4590-a977-97bf22972be2.sql --

-- Create balance_snapshots table to track historical balance changes
CREATE TABLE public.balance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL,
  snapshot_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX idx_balance_snapshots_user_date ON public.balance_snapshots(user_id, snapshot_date DESC);
CREATE INDEX idx_balance_snapshots_account ON public.balance_snapshots(bank_account_id);

-- Enable RLS
ALTER TABLE public.balance_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own snapshots" ON public.balance_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own snapshots" ON public.balance_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own snapshots" ON public.balance_snapshots
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all snapshots" ON public.balance_snapshots
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add sort_order column to bank_accounts for drag & drop ordering
ALTER TABLE public.bank_accounts ADD COLUMN sort_order INTEGER DEFAULT 0;

-- Function to record balance snapshot on initial_balance change
CREATE OR REPLACE FUNCTION public.record_balance_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.initial_balance IS DISTINCT FROM NEW.initial_balance THEN
    INSERT INTO public.balance_snapshots (user_id, bank_account_id, balance, snapshot_date)
    VALUES (NEW.user_id, NEW.id, NEW.initial_balance, now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-record snapshots
CREATE TRIGGER on_bank_account_balance_change
  AFTER UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.record_balance_snapshot();

-- Insert initial snapshots for existing accounts
INSERT INTO public.balance_snapshots (user_id, bank_account_id, balance, snapshot_date)
SELECT user_id, id, initial_balance, COALESCE(created_at, now())
FROM public.bank_accounts
WHERE initial_balance != 0;