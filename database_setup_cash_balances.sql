-- ============================================================================
-- Cash Balances Table Setup
-- ============================================================================
-- This table tracks cash balance snapshots over time
-- Each row represents a balance snapshot for a specific date
-- ============================================================================

-- Create cash_balances table
CREATE TABLE IF NOT EXISTS public.cash_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Balance snapshot date
  balance_date DATE NOT NULL,
  
  -- Cash amounts
  available_cash NUMERIC(15, 2) NOT NULL DEFAULT 0,
  pending_deposits NUMERIC(15, 2) NOT NULL DEFAULT 0,
  pending_withdrawals NUMERIC(15, 2) NOT NULL DEFAULT 0,
  margin_used NUMERIC(15, 2) NOT NULL DEFAULT 0,
  buying_power NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_cash NUMERIC(15, 2) NOT NULL DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT cash_balances_user_date_unique UNIQUE (user_id, balance_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cash_balances_user_id ON public.cash_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_balances_balance_date ON public.cash_balances(balance_date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_balances_user_date ON public.cash_balances(user_id, balance_date DESC);

-- Enable Row Level Security
ALTER TABLE public.cash_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own cash balances
CREATE POLICY "Users can view their own cash balances"
  ON public.cash_balances
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own cash balances
CREATE POLICY "Users can insert their own cash balances"
  ON public.cash_balances
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own cash balances
CREATE POLICY "Users can update their own cash balances"
  ON public.cash_balances
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own cash balances
CREATE POLICY "Users can delete their own cash balances"
  ON public.cash_balances
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comments
COMMENT ON TABLE public.cash_balances IS 'Tracks cash balance snapshots over time for each user';
COMMENT ON COLUMN public.cash_balances.balance_date IS 'Date of the balance snapshot (YYYY-MM-DD)';
COMMENT ON COLUMN public.cash_balances.available_cash IS 'Cash available for trading';
COMMENT ON COLUMN public.cash_balances.pending_deposits IS 'Deposits not yet settled';
COMMENT ON COLUMN public.cash_balances.pending_withdrawals IS 'Withdrawals not yet settled';
COMMENT ON COLUMN public.cash_balances.margin_used IS 'Margin currently used';
COMMENT ON COLUMN public.cash_balances.buying_power IS 'Total buying power';
COMMENT ON COLUMN public.cash_balances.total_cash IS 'Total cash including pending transactions';

