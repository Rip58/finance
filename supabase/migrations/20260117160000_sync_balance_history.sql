-- Create function to sync balance history
CREATE OR REPLACE FUNCTION public.sync_balance_history()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_total_balance numeric;
  v_savings_balance numeric;
  v_investments_balance numeric;
  v_crypto_balance numeric;
  v_date timestamptz;
BEGIN
  -- Determine user_id based on operation
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
  ELSE
    v_user_id := NEW.user_id;
  END IF;

  v_date := now();

  -- Calculate current balances
  -- 1. Savings & Investments (from bank_accounts)
  SELECT 
    COALESCE(SUM(CASE 
      WHEN c.name ILIKE '%ahorro%' THEN ba.initial_balance 
      ELSE 0 
    END), 0),
    COALESCE(SUM(CASE 
      WHEN c.name ILIKE '%inversi%' THEN ba.initial_balance 
      ELSE 0 
    END), 0)
  INTO v_savings_balance, v_investments_balance
  FROM public.bank_accounts ba
  LEFT JOIN public.categories c ON ba.category_id = c.id
  WHERE ba.user_id = v_user_id AND ba.is_archived = false;

  -- Default unrecognized accounts to savings to maintain total correctness
  SELECT COALESCE(SUM(initial_balance), 0) - v_savings_balance - v_investments_balance
  INTO v_total_balance -- Temporary use of var
  FROM public.bank_accounts
  WHERE user_id = v_user_id AND is_archived = false;
  
  v_savings_balance := v_savings_balance + v_total_balance;

  -- 2. Crypto (from account_holdings + latest prices)
  -- Note: This is an estimation using latest known prices. 
  -- For precise historical graphs, we rely on the daily snapshots/backfill.
  -- This trigger ensures that meaningful account actions (deposits, frequent trades)
  -- create a checkpoint in the history.
  WITH latest_prices AS (
    SELECT DISTINCT ON (symbol) symbol, close_price
    FROM public.asset_prices
    ORDER BY symbol, price_date DESC
  ),
  user_holdings AS (
    SELECT symbol, quantity
    FROM public.account_holdings
    WHERE user_id = v_user_id
  )
  SELECT COALESCE(SUM(h.quantity * p.close_price), 0)
  INTO v_crypto_balance
  FROM user_holdings h
  LEFT JOIN latest_prices p ON h.symbol = p.symbol;

  -- Get USDT rate
  DECLARE
    v_usdt_rate numeric;
  BEGIN
    SELECT rate INTO v_usdt_rate FROM public.fx_rates WHERE pair = 'USDT_EUR' ORDER BY as_of DESC LIMIT 1;
    v_usdt_rate := COALESCE(v_usdt_rate, 1);
    v_crypto_balance := v_crypto_balance * v_usdt_rate;
  END;

  v_total_balance := v_savings_balance + v_investments_balance + v_crypto_balance;

  -- Insert snapshot
  INSERT INTO public.balance_history (
    user_id,
    date,
    total_balance,
    savings_balance,
    investments_balance,
    crypto_balance,
    currency
  ) VALUES (
    v_user_id,
    v_date,
    v_total_balance,
    v_savings_balance,
    v_investments_balance,
    v_crypto_balance,
    'EUR'
  );

  RETURN NULL; -- Result is ignored for after triggers
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS on_account_change_sync_history ON public.bank_accounts;
CREATE TRIGGER on_account_change_sync_history
  AFTER INSERT OR UPDATE OF initial_balance OR DELETE
  ON public.bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_balance_history();

DROP TRIGGER IF EXISTS on_transaction_change_sync_history ON public.transactions;
CREATE TRIGGER on_transaction_change_sync_history
  AFTER INSERT OR UPDATE OF amount, type OR DELETE
  ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_balance_history();

DROP TRIGGER IF EXISTS on_holding_change_sync_history ON public.account_holdings;
CREATE TRIGGER on_holding_change_sync_history
  AFTER INSERT OR UPDATE OF quantity OR DELETE
  ON public.account_holdings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_balance_history();
