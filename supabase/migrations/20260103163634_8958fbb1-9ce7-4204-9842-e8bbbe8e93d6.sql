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