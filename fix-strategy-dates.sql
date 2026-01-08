-- Fix strategy closed_at dates that were shifted due to timezone conversion
-- This updates strategies to use the activity_date from their closing transactions
-- instead of the UTC-converted timestamp that caused dates to shift backward

WITH strategy_closing_transactions AS (
  SELECT DISTINCT
    p.strategy_id,
    p.id as position_id,
    p.closed_at as position_closed_at,
    t.activity_date,
    t.id as transaction_id,
    -- Get the date from activity_date and append end-of-day time
    (t.activity_date || 'T23:59:59.999Z')::timestamptz as corrected_timestamp
  FROM positions p
  INNER JOIN transactions t ON t.position_id = p.id
  WHERE p.strategy_id IS NOT NULL
    AND p.status IN ('closed', 'expired', 'assigned', 'exercised')
    AND p.closed_at IS NOT NULL
    AND t.is_opening = false -- Closing transaction
    AND t.transaction_code IN ('Sell', 'SELL', 'STC', 'BTC', 'STOCK_SELL')
),
latest_closing_per_strategy AS (
  SELECT
    strategy_id,
    MAX(corrected_timestamp) as latest_corrected_closed_at
  FROM strategy_closing_transactions
  GROUP BY strategy_id
)
UPDATE strategies s
SET closed_at = lc.latest_corrected_closed_at
FROM latest_closing_per_strategy lc
WHERE s.id = lc.strategy_id
  AND s.status IN ('closed', 'expired', 'assigned')
  AND s.closed_at IS NOT NULL
  -- Only update if the date part is different (indicating timezone shift)
  AND DATE(s.closed_at) != DATE(lc.latest_corrected_closed_at);

-- Show what was updated
SELECT
  s.id,
  s.underlying_symbol,
  s.strategy_type,
  s.realized_pl,
  s.closed_at as new_closed_at,
  DATE(s.closed_at) as new_closed_date
FROM strategies s
WHERE s.status IN ('closed', 'expired', 'assigned')
  AND s.closed_at IS NOT NULL
ORDER BY s.closed_at DESC
LIMIT 20;
