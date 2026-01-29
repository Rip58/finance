-- Fix Row Level Security policies for asset_prices table
-- This allows the application to insert/update institutional asset prices

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Allow asset price inserts for authenticated users" ON asset_prices;

-- Create new INSERT policy that allows all authenticated users to insert
CREATE POLICY "Allow asset price inserts for authenticated users"
ON asset_prices
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Drop existing UPDATE policy if it exists
DROP POLICY IF EXISTS "Allow asset price updates for authenticated users" ON asset_prices;

-- Create new UPDATE policy that allows all authenticated users to update
CREATE POLICY "Allow asset price updates for authenticated users"
ON asset_prices
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Verify current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'asset_prices';
