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