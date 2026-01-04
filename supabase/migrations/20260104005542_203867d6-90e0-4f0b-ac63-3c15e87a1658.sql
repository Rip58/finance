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