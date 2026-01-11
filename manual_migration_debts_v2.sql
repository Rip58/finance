-- Migration to add 'loan_amount_paid' for variable debt payments
-- This allows tracking the exact total amount paid/received for a debt, supporting irregular contributions.

ALTER TABLE public.recurring_transactions 
ADD COLUMN IF NOT EXISTS loan_amount_paid DECIMAL(12,2) DEFAULT 0;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
