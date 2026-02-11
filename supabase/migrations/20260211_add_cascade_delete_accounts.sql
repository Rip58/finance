-- Migration to add ON DELETE CASCADE to foreign keys referencing bank_accounts

-- DANGER: This will delete all associated data when a bank account is deleted
-- This is desired behavior for this application to prevent orphan records

BEGIN;

-- 1. Transactions
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS transactions_bank_account_id_fkey;

ALTER TABLE transactions
ADD CONSTRAINT transactions_bank_account_id_fkey
FOREIGN KEY (bank_account_id)
REFERENCES bank_accounts(id)
ON DELETE CASCADE;

-- 2. Account Holdings
ALTER TABLE account_holdings
DROP CONSTRAINT IF EXISTS account_holdings_bank_account_id_fkey;

ALTER TABLE account_holdings
ADD CONSTRAINT account_holdings_bank_account_id_fkey
FOREIGN KEY (bank_account_id)
REFERENCES bank_accounts(id)
ON DELETE CASCADE;

-- 3. Asset Transactions (SKIPPED - No direct link to bank_accounts)
-- asset_transactions does not have bank_account_id column

-- 4. Transfers (Handle both from and to accounts)
ALTER TABLE transfers
DROP CONSTRAINT IF EXISTS transfers_from_account_id_fkey;

ALTER TABLE transfers
ADD CONSTRAINT transfers_from_account_id_fkey
FOREIGN KEY (from_account_id)
REFERENCES bank_accounts(id)
ON DELETE CASCADE;

ALTER TABLE transfers
DROP CONSTRAINT IF EXISTS transfers_to_account_id_fkey;

ALTER TABLE transfers
ADD CONSTRAINT transfers_to_account_id_fkey
FOREIGN KEY (to_account_id)
REFERENCES bank_accounts(id)
ON DELETE CASCADE;

-- 5. Account Events
-- Note: Reference column is 'account_id', not 'bank_account_id'
ALTER TABLE account_events
DROP CONSTRAINT IF EXISTS account_events_account_id_fkey;

ALTER TABLE account_events
ADD CONSTRAINT account_events_account_id_fkey
FOREIGN KEY (account_id)
REFERENCES bank_accounts(id)
ON DELETE CASCADE;

COMMIT;
