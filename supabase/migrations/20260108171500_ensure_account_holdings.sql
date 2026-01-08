CREATE TABLE IF NOT EXISTS public.account_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id uuid NOT NULL,
  symbol text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(bank_account_id, symbol)
);

ALTER TABLE public.account_holdings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own account_holdings" ON public.account_holdings;
CREATE POLICY "Users can view own account_holdings" ON public.account_holdings FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own account_holdings" ON public.account_holdings;
CREATE POLICY "Users can insert own account_holdings" ON public.account_holdings FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own account_holdings" ON public.account_holdings;
CREATE POLICY "Users can update own account_holdings" ON public.account_holdings FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own account_holdings" ON public.account_holdings;
CREATE POLICY "Users can delete own account_holdings" ON public.account_holdings FOR DELETE USING (auth.uid() = user_id);
