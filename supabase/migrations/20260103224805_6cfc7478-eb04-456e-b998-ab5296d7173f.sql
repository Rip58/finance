-- Create loans table for pending payments (prestamos)
CREATE TABLE public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  total_amount numeric NOT NULL,
  monthly_payment numeric NOT NULL,
  total_installments integer NOT NULL,
  paid_installments integer NOT NULL DEFAULT 0,
  start_date date NOT NULL,
  end_date date NOT NULL,
  next_payment_date date NOT NULL,
  category_id uuid NULL,
  bank_account_id uuid NULL,
  currency text NOT NULL DEFAULT 'EUR',
  notes text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- RLS policies for loans
CREATE POLICY "Users can view own loans" 
ON public.loans FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loans" 
ON public.loans FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own loans" 
ON public.loans FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own loans" 
ON public.loans FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all loans" 
ON public.loans FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add columns to recurring_transactions for transfer support
ALTER TABLE public.recurring_transactions 
ADD COLUMN IF NOT EXISTS from_account_id uuid NULL,
ADD COLUMN IF NOT EXISTS to_account_id uuid NULL,
ADD COLUMN IF NOT EXISTS amount_to numeric NULL,
ADD COLUMN IF NOT EXISTS currency_to text NULL;