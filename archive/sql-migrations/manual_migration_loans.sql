-- Migration to add Loan Tracking columns to recurring_transactions table

ALTER TABLE recurring_transactions 
ADD COLUMN IF NOT EXISTS loan_total_amount DECIMAL(12,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS loan_total_payments INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS loan_payments_made INTEGER DEFAULT NULL;

-- Notify schema cache reload
NOTIFY pgrst, 'reload schema';
