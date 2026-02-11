-- Migration to modify log_account_change function
-- Fixes 409 Conflict on account deletion by removing the INSERT on DELETE trigger logic
-- We don't need a snapshot if the account is being hard deleted (cascade)

CREATE OR REPLACE FUNCTION public.log_account_change()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.account_events (account_id, user_id, occurred_at, type, balance_after, currency, delta_amount)
    VALUES (
      NEW.id,
      NEW.user_id,
      now(),
      'INITIAL',
      NEW.initial_balance,
      NEW.currency,
      NEW.initial_balance
    );
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF (OLD.initial_balance IS DISTINCT FROM NEW.initial_balance) THEN
       INSERT INTO public.account_events (account_id, user_id, occurred_at, type, balance_after, currency, delta_amount)
       VALUES (
         NEW.id,
         NEW.user_id,
         now(),
         'MANUAL_ADJUSTMENT',
         NEW.initial_balance,
         NEW.currency,
         NEW.initial_balance - OLD.initial_balance
       );
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
      -- REMOVED: Do not insert DELETION_SNAPSHOT because the parent account is gone.
      -- If we want to keep history, we shouldn't hard delete the account (is_archived instead).
      -- But if the user requests hard delete, we must respect it and not violate FKs.
       RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
