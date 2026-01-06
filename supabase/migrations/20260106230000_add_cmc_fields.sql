-- Add new columns for enhanced CoinMarketCap data
ALTER TABLE public.asset_prices 
ADD COLUMN IF NOT EXISTS cmc_rank INTEGER,
ADD COLUMN IF NOT EXISTS volume_24h DECIMAL(20, 8),
ADD COLUMN IF NOT EXISTS percent_change_1h DECIMAL(20, 8),
ADD COLUMN IF NOT EXISTS percent_change_24h DECIMAL(20, 8),
ADD COLUMN IF NOT EXISTS percent_change_7d DECIMAL(20, 8),
ADD COLUMN IF NOT EXISTS percent_change_30d DECIMAL(20, 8);
