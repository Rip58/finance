CREATE TABLE IF NOT EXISTS trading_journal (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    symbol TEXT NOT NULL,
    direction TEXT CHECK (direction IN ('LONG', 'SHORT')) NOT NULL,
    entry_date TIMESTAMPTZ NOT NULL,
    entry_price NUMERIC NOT NULL,
    quantity NUMERIC NOT NULL,
    leverage NUMERIC DEFAULT 1,
    stop_loss NUMERIC,
    take_profit_1 NUMERIC,
    take_profit_2 NUMERIC,
    take_profit_3 NUMERIC,
    exit_date TIMESTAMPTZ,
    exit_price NUMERIC,
    status TEXT CHECK (status IN ('OPEN', 'CLOSED')) DEFAULT 'OPEN' NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE trading_journal ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own trades" ON trading_journal
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trades" ON trading_journal
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trades" ON trading_journal
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trades" ON trading_journal
    FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at (reusing function if exists, or creating if not)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_trading_journal_updated_at ON trading_journal;
CREATE TRIGGER update_trading_journal_updated_at
    BEFORE UPDATE ON trading_journal
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
