-- Add market_closed column to asset_prices table
-- This indicates whether the stock market was closed when the price was fetched

ALTER TABLE asset_prices
ADD COLUMN IF NOT EXISTS market_closed BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN asset_prices.market_closed IS 'Indicates if the stock market was closed when this price was fetched (for institutional assets only)';
