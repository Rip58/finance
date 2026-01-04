-- Add initial_balance column to bank_accounts
ALTER TABLE bank_accounts 
ADD COLUMN initial_balance numeric NOT NULL DEFAULT 0;