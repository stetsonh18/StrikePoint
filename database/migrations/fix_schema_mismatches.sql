-- Migration: Fix Schema Mismatches Between Code and Database
-- This migration adds missing columns and views that are referenced in the application code
-- but don't exist in the current database schema.

-- ============================================================================
-- SECTION 1: Fix Positions Table
-- ============================================================================

-- Add status column (enum) to replace/supplement is_open boolean
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) CHECK (status IN ('open', 'closed', 'assigned', 'exercised', 'expired'));

-- Set status based on is_open for existing rows
UPDATE positions
SET status = CASE
  WHEN is_open = true THEN 'open'
  ELSE 'closed'
END
WHERE status IS NULL;

-- Make status NOT NULL after setting defaults
ALTER TABLE positions
  ALTER COLUMN status SET DEFAULT 'open',
  ALTER COLUMN status SET NOT NULL;

-- Add opened_at timestamp (separate from created_at for tracking when position was actually opened)
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;

-- Set opened_at from created_at for existing rows
UPDATE positions
SET opened_at = created_at
WHERE opened_at IS NULL;

-- Make opened_at NOT NULL after setting defaults
ALTER TABLE positions
  ALTER COLUMN opened_at SET DEFAULT NOW(),
  ALTER COLUMN opened_at SET NOT NULL;

-- Add current_quantity (tracks remaining quantity after partial closes)
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS current_quantity DECIMAL(18, 8);

-- Set current_quantity from quantity for existing rows
UPDATE positions
SET current_quantity = quantity
WHERE current_quantity IS NULL;

-- Make current_quantity NOT NULL after setting defaults
ALTER TABLE positions
  ALTER COLUMN current_quantity SET NOT NULL;

-- Add total_cost_basis (for FIFO tracking)
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS total_cost_basis DECIMAL(18, 2) NOT NULL DEFAULT 0;

-- Calculate initial cost basis from existing data
UPDATE positions
SET total_cost_basis = quantity * average_price
WHERE total_cost_basis = 0;

-- Add total_closing_amount (tracks total proceeds from closing transactions)
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS total_closing_amount DECIMAL(18, 2) NOT NULL DEFAULT 0;

-- Add closing_transaction_ids array (for audit trail)
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS closing_transaction_ids UUID[] DEFAULT '{}';

-- Add side column (long/short)
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS side VARCHAR(10) CHECK (side IN ('long', 'short'));

-- Set default side based on quantity (positive = long, negative = short)
-- Note: This is a best guess - you may need to adjust based on your data
UPDATE positions
SET side = CASE
  WHEN quantity > 0 THEN 'long'
  WHEN quantity < 0 THEN 'short'
  ELSE 'long'
END
WHERE side IS NULL;

-- Make side NOT NULL after setting defaults
ALTER TABLE positions
  ALTER COLUMN side SET DEFAULT 'long',
  ALTER COLUMN side SET NOT NULL;

-- Add unrealized_pl (for tracking unrealized profit/loss)
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS unrealized_pl DECIMAL(18, 2) NOT NULL DEFAULT 0;

-- Rename average_price to average_opening_price for clarity
-- (Keep both for backward compatibility initially)
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS average_opening_price DECIMAL(18, 8);

-- Copy data from average_price
UPDATE positions
SET average_opening_price = average_price
WHERE average_opening_price IS NULL;

-- Make average_opening_price NOT NULL after copying
ALTER TABLE positions
  ALTER COLUMN average_opening_price SET NOT NULL;

-- Add closed_at timestamp
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);
CREATE INDEX IF NOT EXISTS idx_positions_opened_at ON positions(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_positions_side ON positions(side);
CREATE INDEX IF NOT EXISTS idx_positions_closed_at ON positions(closed_at) WHERE closed_at IS NOT NULL;

-- ============================================================================
-- SECTION 2: Fix Transactions Table
-- ============================================================================

-- Add activity_date (may be different from transaction_date in some brokers)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS activity_date DATE;

-- Set activity_date from transaction_date for existing rows
UPDATE transactions
SET activity_date = transaction_date
WHERE activity_date IS NULL;

-- Make activity_date NOT NULL after setting defaults
ALTER TABLE transactions
  ALTER COLUMN activity_date SET DEFAULT CURRENT_DATE,
  ALTER COLUMN activity_date SET NOT NULL;

-- Add underlying_symbol (for options, this is the stock symbol)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS underlying_symbol VARCHAR(20);

-- Set underlying_symbol from symbol for existing rows (for options)
-- For stocks, underlying_symbol = symbol
UPDATE transactions
SET underlying_symbol = symbol
WHERE underlying_symbol IS NULL;

-- Add is_opening flag (true for BTO/STO, false for BTC/STC)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS is_opening BOOLEAN;

-- Infer is_opening from transaction_code
UPDATE transactions
SET is_opening = CASE
  WHEN transaction_code IN ('BTO', 'STO', 'Buy') THEN true
  WHEN transaction_code IN ('BTC', 'STC', 'Sell') THEN false
  ELSE NULL
END
WHERE is_opening IS NULL;

-- Add is_long flag (true for BTO/BTC, false for STO/STC)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS is_long BOOLEAN;

-- Infer is_long from transaction_code
UPDATE transactions
SET is_long = CASE
  WHEN transaction_code IN ('BTO', 'BTC', 'Buy') THEN true
  WHEN transaction_code IN ('STO', 'STC', 'Sell') THEN false
  ELSE NULL
END
WHERE is_long IS NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_transactions_activity_date ON transactions(activity_date);
CREATE INDEX IF NOT EXISTS idx_transactions_underlying_symbol ON transactions(underlying_symbol) WHERE underlying_symbol IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_is_opening ON transactions(is_opening) WHERE is_opening IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_is_long ON transactions(is_long) WHERE is_long IS NOT NULL;

-- Composite index for FIFO matching queries
CREATE INDEX IF NOT EXISTS idx_transactions_fifo_matching ON transactions(user_id, underlying_symbol, expiration_date, strike_price, option_type, is_opening, is_long, activity_date)
WHERE is_opening = true AND position_id IS NULL;

-- ============================================================================
-- SECTION 3: Fix Cash Transactions Table
-- ============================================================================

-- Add activity_date (may be different from transaction_date)
ALTER TABLE cash_transactions
  ADD COLUMN IF NOT EXISTS activity_date DATE;

-- Set activity_date from transaction_date for existing rows
UPDATE cash_transactions
SET activity_date = transaction_date
WHERE activity_date IS NULL;

-- Make activity_date NOT NULL after setting defaults
ALTER TABLE cash_transactions
  ALTER COLUMN activity_date SET DEFAULT CURRENT_DATE,
  ALTER COLUMN activity_date SET NOT NULL;

-- Create index for new column
CREATE INDEX IF NOT EXISTS idx_cash_transactions_activity_date ON cash_transactions(activity_date);

-- ============================================================================
-- SECTION 4: Fix Views
-- ============================================================================

-- Fix v_strategy_summary view to use is_open instead of status
CREATE OR REPLACE VIEW v_strategy_summary AS
SELECT 
  s.*,
  COALESCE(COUNT(p.id) FILTER (WHERE p.is_open = true), 0)::INTEGER as position_count,
  COALESCE(SUM(p.realized_pnl + COALESCE(p.unrealized_pl, 0)) FILTER (WHERE p.is_open = true), 0)::NUMERIC(15, 2) as total_position_pl,
  (s.realized_pl + s.unrealized_pl)::NUMERIC(15, 2) as current_pl
FROM strategies s
LEFT JOIN positions p ON p.strategy_id = s.id
GROUP BY s.id;

-- Create v_open_positions view (referenced in PositionRepository)
CREATE OR REPLACE VIEW v_open_positions AS
SELECT 
  p.*,
  s.strategy_type,
  s.direction as strategy_direction,
  s.max_risk as strategy_max_risk,
  s.max_profit as strategy_max_profit,
  COUNT(DISTINCT t.id)::INTEGER as transaction_count,
  COALESCE(SUM(t.amount), 0)::NUMERIC(15, 2) as total_transacted
FROM positions p
LEFT JOIN strategies s ON s.id = p.strategy_id
LEFT JOIN transactions t ON t.position_id = p.id
WHERE p.is_open = true
GROUP BY p.id, s.id;

-- Grant permissions on views
GRANT SELECT ON v_strategy_summary TO authenticated;
GRANT SELECT ON v_open_positions TO authenticated;

-- Add comments
COMMENT ON VIEW v_strategy_summary IS 'Summary view of strategies with aggregated position counts and P/L';
COMMENT ON VIEW v_open_positions IS 'Open positions with strategy information and transaction counts';

-- ============================================================================
-- SECTION 5: Add Comments for Documentation
-- ============================================================================

COMMENT ON COLUMN positions.status IS 'Position status: open, closed, assigned, exercised, or expired';
COMMENT ON COLUMN positions.opened_at IS 'Timestamp when position was opened (may differ from created_at)';
COMMENT ON COLUMN positions.current_quantity IS 'Current remaining quantity after partial closes';
COMMENT ON COLUMN positions.total_cost_basis IS 'Total cost basis for FIFO tracking';
COMMENT ON COLUMN positions.total_closing_amount IS 'Total proceeds from closing transactions';
COMMENT ON COLUMN positions.closing_transaction_ids IS 'Array of transaction IDs for closing transactions';
COMMENT ON COLUMN positions.side IS 'Position side: long or short';
COMMENT ON COLUMN positions.unrealized_pl IS 'Unrealized profit/loss for open positions';
COMMENT ON COLUMN positions.average_opening_price IS 'Average price when position was opened';

COMMENT ON COLUMN transactions.activity_date IS 'Activity date (may differ from transaction_date for some brokers)';
COMMENT ON COLUMN transactions.underlying_symbol IS 'Underlying symbol for options (stock symbol)';
COMMENT ON COLUMN transactions.is_opening IS 'True for opening transactions (BTO/STO), false for closing (BTC/STC)';
COMMENT ON COLUMN transactions.is_long IS 'True for long positions (BTO/BTC), false for short (STO/STC)';

COMMENT ON COLUMN cash_transactions.activity_date IS 'Activity date (may differ from transaction_date for some brokers)';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

