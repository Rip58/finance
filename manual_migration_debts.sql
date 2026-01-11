-- Migration to add 'person' column for Debt Management
-- This allows tracking debts owed to/by a specific person instead of a bank account.

ALTER TABLE public.recurring_transactions 
ADD COLUMN IF NOT EXISTS person text DEFAULT NULL;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
