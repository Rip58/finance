-- Create balance_snapshots table to track historical balance changes
CREATE TABLE public.balance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL,
  snapshot_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX idx_balance_snapshots_user_date ON public.balance_snapshots(user_id, snapshot_date DESC);
CREATE INDEX idx_balance_snapshots_account ON public.balance_snapshots(bank_account_id);

-- Enable RLS
ALTER TABLE public.balance_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own snapshots" ON public.balance_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own snapshots" ON public.balance_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own snapshots" ON public.balance_snapshots
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all snapshots" ON public.balance_snapshots
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add sort_order column to bank_accounts for drag & drop ordering
ALTER TABLE public.bank_accounts ADD COLUMN sort_order INTEGER DEFAULT 0;

-- Function to record balance snapshot on initial_balance change
CREATE OR REPLACE FUNCTION public.record_balance_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.initial_balance IS DISTINCT FROM NEW.initial_balance THEN
    INSERT INTO public.balance_snapshots (user_id, bank_account_id, balance, snapshot_date)
    VALUES (NEW.user_id, NEW.id, NEW.initial_balance, now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-record snapshots
CREATE TRIGGER on_bank_account_balance_change
  AFTER UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.record_balance_snapshot();

-- Insert initial snapshots for existing accounts
INSERT INTO public.balance_snapshots (user_id, bank_account_id, balance, snapshot_date)
SELECT user_id, id, initial_balance, COALESCE(created_at, now())
FROM public.bank_accounts
WHERE initial_balance != 0;