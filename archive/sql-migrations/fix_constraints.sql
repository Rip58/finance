-- FIX DATABASE CONSTRAINTS FOR MANUAL DEBTS
-- This script fixes "recurring_transactions_amount_check" and "recurring_transactions_cadence_check" errors.

-- 1. Allow 'manual' in cadence check
ALTER TABLE public.recurring_transactions DROP CONSTRAINT IF EXISTS recurring_transactions_cadence_check;
ALTER TABLE public.recurring_transactions ADD CONSTRAINT recurring_transactions_cadence_check 
    CHECK (cadence IN ('weekly', 'monthly', 'quarterly', 'yearly', 'manual'));

-- 2. Allow amount >= 0 (needed for manual debts which have 0 recurring amount)
ALTER TABLE public.recurring_transactions DROP CONSTRAINT IF EXISTS recurring_transactions_amount_check;
ALTER TABLE public.recurring_transactions ADD CONSTRAINT recurring_transactions_amount_check 
    CHECK (amount >= 0);

-- 3. Ensure contributions column exists (just in case)
ALTER TABLE public.recurring_transactions ADD COLUMN IF NOT EXISTS contributions JSONB DEFAULT '[]'::jsonb;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
