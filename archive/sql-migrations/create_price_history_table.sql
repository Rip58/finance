-- Create table for granular price history (hourly/dynamic)
CREATE TABLE IF NOT EXISTS public.asset_price_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol TEXT NOT NULL,
    price NUMERIC NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    cmc_rank INTEGER,
    volume_24h NUMERIC,
    percent_change_1h NUMERIC,
    percent_change_24h NUMERIC,
    percent_change_7d NUMERIC
);

-- Index for faster queries on symbol and time
CREATE INDEX IF NOT EXISTS idx_asset_price_history_symbol_time ON public.asset_price_history (symbol, timestamp DESC);

-- Enable RLS
ALTER TABLE public.asset_price_history ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.asset_price_history;
CREATE POLICY "Allow read access for authenticated users" 
ON public.asset_price_history FOR SELECT 
TO authenticated 
USING (true);

-- Allow insert access for service role only (Edge Functions)
DROP POLICY IF EXISTS "Allow service insert" ON public.asset_price_history;
CREATE POLICY "Allow service insert" 
ON public.asset_price_history FOR INSERT 
TO service_role 
WITH CHECK (true);

-- Clean up old data (Optional: keep only last 30 days for granularity, keep daily for long term in asset_prices)
-- We can add a periodic cleanup function later if storage becomes an issue.
