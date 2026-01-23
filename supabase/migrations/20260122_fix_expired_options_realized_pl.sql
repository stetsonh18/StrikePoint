-- Fix realized_pl for expired options that currently have realized_pl = 0
-- For expired options, the realized P&L equals the total cost basis:
-- Short options: total_cost_basis is positive (credit received = profit when expired worthless)
-- Long options: total_cost_basis is negative (debit paid = loss when expired worthless)

UPDATE positions
SET
  realized_pl = total_cost_basis,
  unrealized_pl = 0,
  current_quantity = 0,
  total_closing_amount = 0
WHERE status = 'expired'
  AND asset_type = 'option'
  AND (realized_pl IS NULL OR realized_pl = 0)
  AND total_cost_basis IS NOT NULL
  AND total_cost_basis != 0;

-- Also update any associated strategies that have positions which are now all closed/expired
WITH strategy_totals AS (
  SELECT
    strategy_id,
    SUM(realized_pl) as total_realized_pl,
    MAX(closed_at) as latest_closed_at,
    COUNT(*) FILTER (WHERE status NOT IN ('closed', 'expired', 'assigned', 'exercised')) as open_count
  FROM positions
  WHERE strategy_id IS NOT NULL
  GROUP BY strategy_id
  HAVING COUNT(*) FILTER (WHERE status NOT IN ('closed', 'expired', 'assigned', 'exercised')) = 0
)
UPDATE strategies s
SET
  status = 'closed',
  realized_pl = st.total_realized_pl,
  unrealized_pl = 0,
  closed_at = st.latest_closed_at
FROM strategy_totals st
WHERE s.id = st.strategy_id
  AND s.status = 'open';
