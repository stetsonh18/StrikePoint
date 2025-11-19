-- Migration: Align Database Schema with Application Code
-- This migration updates the database schema to match what the application code expects.
-- The app code is the source of truth - this brings the database up to date.

-- ============================================================================
-- SECTION 1: Fix Positions Table - Add All Missing Fields
-- ============================================================================

-- Add status column (enum) - app code uses PositionStatus enum
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) CHECK (status IN ('open', 'closed', 'assigned', 'exercised', 'expired'));

-- Set status based on is_open for existing rows
UPDATE positions
SET status = CASE
  WHEN is_open = true THEN 'open'
  ELSE 'closed'
END
WHERE status IS NULL;

-- Make status NOT NULL with default
ALTER TABLE positions
  ALTER COLUMN status SET DEFAULT 'open',
  ALTER COLUMN status SET NOT NULL;

-- Add opened_at timestamp (app code expects this separate from created_at)
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;

-- Set opened_at from created_at for existing rows
UPDATE positions
SET opened_at = created_at
WHERE opened_at IS NULL;

-- Make opened_at NOT NULL with default
ALTER TABLE positions
  ALTER COLUMN opened_at SET DEFAULT NOW(),
  ALTER COLUMN opened_at SET NOT NULL;

-- Add side column (long/short) - required by app code
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS side VARCHAR(10) CHECK (side IN ('long', 'short'));

-- Infer side from quantity (positive = long, negative = short)
UPDATE positions
SET side = CASE
  WHEN quantity > 0 THEN 'long'
  WHEN quantity < 0 THEN 'short'
  ELSE 'long'
END
WHERE side IS NULL;

-- Make side NOT NULL with default
ALTER TABLE positions
  ALTER COLUMN side SET DEFAULT 'long',
  ALTER COLUMN side SET NOT NULL;

-- Add opening_quantity (app code tracks this separately from current_quantity)
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS opening_quantity DECIMAL(18, 8);

-- Set opening_quantity from quantity for existing rows
UPDATE positions
SET opening_quantity = ABS(quantity)
WHERE opening_quantity IS NULL;

-- Make opening_quantity NOT NULL
ALTER TABLE positions
  ALTER COLUMN opening_quantity SET NOT NULL;

-- Add current_quantity (app code uses this for partial closes)
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS current_quantity DECIMAL(18, 8);

-- Set current_quantity from quantity for existing rows
UPDATE positions
SET current_quantity = ABS(quantity)
WHERE current_quantity IS NULL;

-- Make current_quantity NOT NULL
ALTER TABLE positions
  ALTER COLUMN current_quantity SET NOT NULL;

-- Add average_opening_price (app code expects this name)
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS average_opening_price DECIMAL(18, 8);

-- Copy from average_price if it exists
UPDATE positions
SET average_opening_price = average_price
WHERE average_opening_price IS NULL AND average_price IS NOT NULL;

-- Set default if still null
UPDATE positions
SET average_opening_price = 0
WHERE average_opening_price IS NULL;

-- Make average_opening_price NOT NULL
ALTER TABLE positions
  ALTER COLUMN average_opening_price SET NOT NULL;

-- Add total_cost_basis (app code uses for FIFO tracking)
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS total_cost_basis DECIMAL(18, 2) NOT NULL DEFAULT 0;

-- Calculate from existing data
UPDATE positions
SET total_cost_basis = COALESCE(quantity * average_price, 0)
WHERE total_cost_basis = 0;

-- Add total_closing_amount (app code tracks closing proceeds)
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS total_closing_amount DECIMAL(18, 2) NOT NULL DEFAULT 0;

-- Add realized_pl (app code expects this name, schema has realized_pnl)
-- Keep both for compatibility, but add realized_pl
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS realized_pl DECIMAL(18, 2);

-- Copy from realized_pnl if it exists
UPDATE positions
SET realized_pl = realized_pnl
WHERE realized_pl IS NULL AND realized_pnl IS NOT NULL;

-- Set default
UPDATE positions
SET realized_pl = 0
WHERE realized_pl IS NULL;

-- Make realized_pl NOT NULL with default
ALTER TABLE positions
  ALTER COLUMN realized_pl SET DEFAULT 0;
ALTER TABLE positions
  ALTER COLUMN realized_pl SET NOT NULL;

-- Add unrealized_pl (app code requires this)
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS unrealized_pl DECIMAL(18, 2) NOT NULL DEFAULT 0;

-- Add opening_transaction_ids array (app code uses for FIFO tracking)
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS opening_transaction_ids UUID[] DEFAULT '{}';

-- Add closing_transaction_ids array (app code uses for audit trail)
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS closing_transaction_ids UUID[] DEFAULT '{}';

-- Add closed_at timestamp (app code expects this)
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Add notes field (app code expects this)
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add tags array (app code expects this)
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add futures-specific fields (app code expects these)
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS contract_month VARCHAR(10),
  ADD COLUMN IF NOT EXISTS contract_year INTEGER,
  ADD COLUMN IF NOT EXISTS multiplier DECIMAL(18, 8),
  ADD COLUMN IF NOT EXISTS tick_size DECIMAL(18, 8),
  ADD COLUMN IF NOT EXISTS tick_value DECIMAL(18, 8),
  ADD COLUMN IF NOT EXISTS margin_requirement DECIMAL(18, 2);

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);
CREATE INDEX IF NOT EXISTS idx_positions_opened_at ON positions(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_positions_side ON positions(side);
CREATE INDEX IF NOT EXISTS idx_positions_closed_at ON positions(closed_at) WHERE closed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_positions_opening_transaction_ids ON positions USING GIN(opening_transaction_ids);
CREATE INDEX IF NOT EXISTS idx_positions_closing_transaction_ids ON positions USING GIN(closing_transaction_ids);
CREATE INDEX IF NOT EXISTS idx_positions_tags ON positions USING GIN(tags);

-- ============================================================================
-- SECTION 2: Fix Transactions Table - Add All Missing Fields
-- ============================================================================

-- Add activity_date (app code uses this, schema has transaction_date)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS activity_date DATE;

-- Set activity_date from transaction_date for existing rows
UPDATE transactions
SET activity_date = transaction_date
WHERE activity_date IS NULL;

-- Make activity_date NOT NULL with default
ALTER TABLE transactions
  ALTER COLUMN activity_date SET DEFAULT CURRENT_DATE,
  ALTER COLUMN activity_date SET NOT NULL;

-- Add process_date (app code expects this)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS process_date DATE;

-- Set process_date from transaction_date for existing rows
UPDATE transactions
SET process_date = transaction_date
WHERE process_date IS NULL;

-- Add settle_date (app code expects this)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS settle_date DATE;

-- Set settle_date from transaction_date for existing rows (can be adjusted later)
UPDATE transactions
SET settle_date = transaction_date
WHERE settle_date IS NULL;

-- Add underlying_symbol (app code uses this for options)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS underlying_symbol VARCHAR(20);

-- Set underlying_symbol from symbol for existing rows
UPDATE transactions
SET underlying_symbol = symbol
WHERE underlying_symbol IS NULL;

-- Add instrument field (app code expects broker's symbol notation)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS instrument VARCHAR(100);

-- Add description field (app code expects this)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Set description from notes if available
UPDATE transactions
SET description = notes
WHERE description IS NULL AND notes IS NOT NULL;

-- Add is_opening flag (app code uses this)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS is_opening BOOLEAN;

-- Infer is_opening from transaction_code
UPDATE transactions
SET is_opening = CASE
  WHEN transaction_code IN ('BTO', 'STO', 'Buy', 'STOCK_BUY') THEN true
  WHEN transaction_code IN ('BTC', 'STC', 'Sell', 'STOCK_SELL') THEN false
  ELSE NULL
END
WHERE is_opening IS NULL;

-- Add is_long flag (app code uses this)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS is_long BOOLEAN;

-- Infer is_long from transaction_code
UPDATE transactions
SET is_long = CASE
  WHEN transaction_code IN ('BTO', 'BTC', 'Buy', 'STOCK_BUY') THEN true
  WHEN transaction_code IN ('STO', 'STC', 'Sell', 'STOCK_SELL') THEN false
  ELSE NULL
END
WHERE is_long IS NULL;

-- Add tags array (app code expects this)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_transactions_activity_date ON transactions(activity_date);
CREATE INDEX IF NOT EXISTS idx_transactions_process_date ON transactions(process_date);
CREATE INDEX IF NOT EXISTS idx_transactions_settle_date ON transactions(settle_date);
CREATE INDEX IF NOT EXISTS idx_transactions_underlying_symbol ON transactions(underlying_symbol) WHERE underlying_symbol IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_instrument ON transactions(instrument) WHERE instrument IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_is_opening ON transactions(is_opening) WHERE is_opening IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_is_long ON transactions(is_long) WHERE is_long IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_tags ON transactions USING GIN(tags);

-- Composite index for FIFO matching queries (used by app code)
CREATE INDEX IF NOT EXISTS idx_transactions_fifo_matching ON transactions(user_id, underlying_symbol, expiration_date, strike_price, option_type, is_opening, is_long, activity_date)
WHERE is_opening = true AND position_id IS NULL;

-- ============================================================================
-- SECTION 3: Fix Cash Transactions Table - Add All Missing Fields
-- ============================================================================

-- Add activity_date (app code uses this)
ALTER TABLE cash_transactions
  ADD COLUMN IF NOT EXISTS activity_date DATE;

-- Set activity_date from transaction_date for existing rows
UPDATE cash_transactions
SET activity_date = transaction_date
WHERE activity_date IS NULL;

-- Make activity_date NOT NULL with default
ALTER TABLE cash_transactions
  ALTER COLUMN activity_date SET DEFAULT CURRENT_DATE,
  ALTER COLUMN activity_date SET NOT NULL;

-- Add process_date (app code expects this)
ALTER TABLE cash_transactions
  ADD COLUMN IF NOT EXISTS process_date DATE;

-- Set process_date from transaction_date for existing rows
UPDATE cash_transactions
SET process_date = transaction_date
WHERE process_date IS NULL;

-- Add settle_date (app code expects this)
ALTER TABLE cash_transactions
  ADD COLUMN IF NOT EXISTS settle_date DATE;

-- Set settle_date from transaction_date for existing rows
UPDATE cash_transactions
SET settle_date = transaction_date
WHERE settle_date IS NULL;

-- Add notes field (app code expects this)
ALTER TABLE cash_transactions
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add tags array (app code expects this)
ALTER TABLE cash_transactions
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_cash_transactions_activity_date ON cash_transactions(activity_date);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_process_date ON cash_transactions(process_date);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_settle_date ON cash_transactions(settle_date);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_tags ON cash_transactions USING GIN(tags);

-- ============================================================================
-- SECTION 4: Fix Views - Match App Code Expectations
-- ============================================================================

-- Fix v_strategy_summary view to use status instead of is_open
CREATE OR REPLACE VIEW v_strategy_summary AS
SELECT 
  s.*,
  COALESCE(COUNT(p.id) FILTER (WHERE p.status = 'open'), 0)::INTEGER as position_count,
  COALESCE(SUM(p.realized_pl + COALESCE(p.unrealized_pl, 0)) FILTER (WHERE p.status = 'open'), 0)::NUMERIC(15, 2) as total_position_pl,
  (s.realized_pl + s.unrealized_pl)::NUMERIC(15, 2) as current_pl
FROM strategies s
LEFT JOIN positions p ON p.strategy_id = s.id
GROUP BY s.id;

-- Create v_open_positions view (app code expects this)
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
WHERE p.status = 'open'
GROUP BY p.id, s.id;

-- Grant permissions on views
GRANT SELECT ON v_strategy_summary TO authenticated;
GRANT SELECT ON v_open_positions TO authenticated;

-- Add comments
COMMENT ON VIEW v_strategy_summary IS 'Summary view of strategies with aggregated position counts and P/L';
COMMENT ON VIEW v_open_positions IS 'Open positions with strategy information and transaction counts';

-- ============================================================================
-- SECTION 5: Add Documentation Comments
-- ============================================================================

COMMENT ON COLUMN positions.status IS 'Position status: open, closed, assigned, exercised, or expired';
COMMENT ON COLUMN positions.opened_at IS 'Timestamp when position was opened (may differ from created_at)';
COMMENT ON COLUMN positions.side IS 'Position side: long or short';
COMMENT ON COLUMN positions.opening_quantity IS 'Original quantity when position was opened';
COMMENT ON COLUMN positions.current_quantity IS 'Current remaining quantity after partial closes';
COMMENT ON COLUMN positions.average_opening_price IS 'Average price when position was opened';
COMMENT ON COLUMN positions.total_cost_basis IS 'Total cost basis for FIFO tracking';
COMMENT ON COLUMN positions.total_closing_amount IS 'Total proceeds from closing transactions';
COMMENT ON COLUMN positions.realized_pl IS 'Realized profit/loss';
COMMENT ON COLUMN positions.unrealized_pl IS 'Unrealized profit/loss for open positions';
COMMENT ON COLUMN positions.opening_transaction_ids IS 'Array of transaction IDs for opening transactions';
COMMENT ON COLUMN positions.closing_transaction_ids IS 'Array of transaction IDs for closing transactions';

COMMENT ON COLUMN transactions.activity_date IS 'Activity date (may differ from transaction_date for some brokers)';
COMMENT ON COLUMN transactions.process_date IS 'Process date when transaction was processed';
COMMENT ON COLUMN transactions.settle_date IS 'Settlement date when transaction settles';
COMMENT ON COLUMN transactions.underlying_symbol IS 'Underlying symbol for options (stock symbol)';
COMMENT ON COLUMN transactions.instrument IS 'Broker''s symbol notation';
COMMENT ON COLUMN transactions.description IS 'Transaction description';
COMMENT ON COLUMN transactions.is_opening IS 'True for opening transactions (BTO/STO), false for closing (BTC/STC)';
COMMENT ON COLUMN transactions.is_long IS 'True for long positions (BTO/BTC), false for short (STO/STC)';

COMMENT ON COLUMN cash_transactions.activity_date IS 'Activity date (may differ from transaction_date for some brokers)';
COMMENT ON COLUMN cash_transactions.process_date IS 'Process date when transaction was processed';
COMMENT ON COLUMN cash_transactions.settle_date IS 'Settlement date when transaction settles';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

