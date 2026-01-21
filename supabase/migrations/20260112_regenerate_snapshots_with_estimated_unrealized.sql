-- Regenerate portfolio snapshots with estimated historical unrealized P&L
-- For positions that were open on a date but later closed, we estimate their unrealized P&L
-- by prorating the final realized P&L based on time elapsed

DO $$
DECLARE
  v_user_id uuid;
  v_date date;
  v_dates date[];
BEGIN
  -- Get the user ID
  SELECT DISTINCT user_id INTO v_user_id FROM transactions LIMIT 1;

  -- Get all unique transaction dates
  SELECT ARRAY_AGG(DISTINCT activity_date ORDER BY activity_date)
  INTO v_dates
  FROM transactions
  WHERE user_id = v_user_id AND activity_date IS NOT NULL;

  -- Loop through each date and generate snapshot
  FOREACH v_date IN ARRAY v_dates
  LOOP
    WITH cash_data AS (
      SELECT
        COALESCE(SUM(CASE WHEN transaction_code NOT IN ('FUTURES_MARGIN', 'FUTURES_MARGIN_RELEASE')
                     THEN amount ELSE 0 END), 0) AS net_cash_flow
      FROM cash_transactions
      WHERE user_id = v_user_id AND activity_date <= v_date
    ),
    position_data AS (
      SELECT
        -- Realized P&L from positions closed on or before this date
        SUM(CASE WHEN status IN ('closed', 'expired', 'assigned', 'exercised')
                  AND closed_at IS NOT NULL
                  AND DATE(closed_at) <= v_date
             THEN COALESCE(realized_pl, 0) +
                  CASE WHEN status = 'expired' AND side = 'short' AND COALESCE(realized_pl, 0) = 0 AND COALESCE(total_cost_basis, 0) != 0
                       THEN ABS(total_cost_basis) ELSE 0 END
             ELSE 0
            END) AS total_realized_pl,

        -- Estimated unrealized P&L for positions that were open on this date
        -- For truly open positions: use 0 (no way to know historical market value)
        -- For positions that were open but later closed: estimate based on final realized P&L
        SUM(CASE
            WHEN status = 'open'
                 AND opened_at IS NOT NULL
                 AND DATE(opened_at) <= v_date
            THEN 0  -- Current open positions - can't estimate without market data

            WHEN status IN ('closed', 'expired', 'assigned', 'exercised')
                 AND opened_at IS NOT NULL
                 AND closed_at IS NOT NULL
                 AND DATE(opened_at) <= v_date
                 AND DATE(closed_at) > v_date
            THEN
              -- Position was open on this date but closed later
              -- Estimate unrealized P&L by prorating the final realized P&L
              -- Formula: realized_pl * (days_elapsed / total_days)
              CASE
                WHEN DATE(closed_at) > DATE(opened_at) THEN
                  (COALESCE(realized_pl, 0) +
                   CASE WHEN status = 'expired' AND side = 'short' AND COALESCE(realized_pl, 0) = 0 AND COALESCE(total_cost_basis, 0) != 0
                        THEN ABS(total_cost_basis) ELSE 0 END) *
                  (v_date - DATE(opened_at))::numeric /
                  GREATEST((DATE(closed_at) - DATE(opened_at))::numeric, 1)
                ELSE 0
              END
            ELSE 0
        END) AS total_unrealized_pl,

        -- Market value (currently open or was open on this date)
        SUM(CASE WHEN (status = 'open' OR (status IN ('closed', 'expired', 'assigned', 'exercised') AND DATE(closed_at) > v_date))
                  AND opened_at IS NOT NULL
                  AND DATE(opened_at) <= v_date
             THEN (CASE WHEN side = 'long'
                        THEN ABS(COALESCE(total_cost_basis, 0)) + COALESCE(unrealized_pl, 0)
                        ELSE -ABS(COALESCE(total_cost_basis, 0)) + COALESCE(unrealized_pl, 0)
                   END)
             ELSE 0
            END) AS total_market_value,

        COUNT(CASE WHEN (status = 'open' OR (status IN ('closed', 'expired', 'assigned', 'exercised') AND DATE(closed_at) > v_date))
                     AND opened_at IS NOT NULL
                     AND DATE(opened_at) <= v_date
              THEN 1 END) AS open_positions_count,
        COUNT(CASE WHEN opened_at IS NOT NULL AND DATE(opened_at) <= v_date THEN 1 END) AS total_positions_count,

        -- Asset breakdowns (simplified - just market value)
        SUM(CASE WHEN (status = 'open' OR (status IN ('closed', 'expired', 'assigned', 'exercised') AND DATE(closed_at) > v_date))
                  AND opened_at IS NOT NULL
                  AND DATE(opened_at) <= v_date
                  AND asset_type = 'stock'
             THEN (CASE WHEN side = 'long'
                        THEN ABS(COALESCE(total_cost_basis, 0)) + COALESCE(unrealized_pl, 0)
                        ELSE -ABS(COALESCE(total_cost_basis, 0)) + COALESCE(unrealized_pl, 0)
                   END)
             ELSE 0 END) AS stocks_value,
        COUNT(CASE WHEN (status = 'open' OR (status IN ('closed', 'expired', 'assigned', 'exercised') AND DATE(closed_at) > v_date))
                     AND asset_type = 'stock'
                     AND opened_at IS NOT NULL
                     AND DATE(opened_at) <= v_date
              THEN 1 END) AS stocks_count,
        SUM(CASE WHEN (status = 'open' OR (status IN ('closed', 'expired', 'assigned', 'exercised') AND DATE(closed_at) > v_date))
                  AND asset_type = 'option'
                  AND opened_at IS NOT NULL
                  AND DATE(opened_at) <= v_date
             THEN (CASE WHEN side = 'long'
                        THEN ABS(COALESCE(total_cost_basis, 0)) + COALESCE(unrealized_pl, 0)
                        ELSE -ABS(COALESCE(total_cost_basis, 0)) + COALESCE(unrealized_pl, 0)
                   END)
             ELSE 0 END) AS options_value,
        COUNT(CASE WHEN (status = 'open' OR (status IN ('closed', 'expired', 'assigned', 'exercised') AND DATE(closed_at) > v_date))
                    AND opened_at IS NOT NULL
                    AND DATE(opened_at) <= v_date
                    AND asset_type = 'option' THEN 1 END) AS options_count,
        SUM(CASE WHEN (status = 'open' OR (status IN ('closed', 'expired', 'assigned', 'exercised') AND DATE(closed_at) > v_date))
                  AND opened_at IS NOT NULL
                  AND DATE(opened_at) <= v_date
                  AND asset_type = 'crypto'
             THEN (CASE WHEN side = 'long'
                        THEN ABS(COALESCE(total_cost_basis, 0)) + COALESCE(unrealized_pl, 0)
                        ELSE -ABS(COALESCE(total_cost_basis, 0)) + COALESCE(unrealized_pl, 0)
                   END)
             ELSE 0 END) AS crypto_value,
        COUNT(CASE WHEN (status = 'open' OR (status IN ('closed', 'expired', 'assigned', 'exercised') AND DATE(closed_at) > v_date))
                     AND asset_type = 'crypto'
                     AND opened_at IS NOT NULL
                     AND DATE(opened_at) <= v_date
              THEN 1 END) AS crypto_count,
        SUM(CASE WHEN (status = 'open' OR (status IN ('closed', 'expired', 'assigned', 'exercised') AND DATE(closed_at) > v_date))
                  AND opened_at IS NOT NULL
                  AND DATE(opened_at) <= v_date
                  AND asset_type = 'futures'
             THEN COALESCE(unrealized_pl, 0) ELSE 0 END) AS futures_value,
        COUNT(CASE WHEN (status = 'open' OR (status IN ('closed', 'expired', 'assigned', 'exercised') AND DATE(closed_at) > v_date))
                     AND opened_at IS NOT NULL
                     AND DATE(opened_at) <= v_date
                     AND asset_type = 'futures'
              THEN 1 END) AS futures_count
      FROM positions
      WHERE user_id = v_user_id
    )
    INSERT INTO portfolio_snapshots (
      user_id,
      snapshot_date,
      portfolio_value,
      net_cash_flow,
      total_market_value,
      total_realized_pl,
      total_unrealized_pl,
      open_positions_count,
      total_positions_count,
      positions_breakdown
    )
    SELECT
      v_user_id,
      v_date,
      (SELECT net_cash_flow FROM cash_data) + total_realized_pl + total_market_value AS portfolio_value,
      (SELECT net_cash_flow FROM cash_data),
      total_market_value,
      total_realized_pl,
      total_unrealized_pl,
      open_positions_count,
      total_positions_count,
      jsonb_build_object(
        'stocks', jsonb_build_object('count', stocks_count, 'value', stocks_value),
        'options', jsonb_build_object('count', options_count, 'value', options_value),
        'crypto', jsonb_build_object('count', crypto_count, 'value', crypto_value),
        'futures', jsonb_build_object('count', futures_count, 'value', futures_value)
      ) AS positions_breakdown
    FROM position_data
    ON CONFLICT (user_id, snapshot_date) DO UPDATE SET
      portfolio_value = EXCLUDED.portfolio_value,
      net_cash_flow = EXCLUDED.net_cash_flow,
      total_market_value = EXCLUDED.total_market_value,
      total_realized_pl = EXCLUDED.total_realized_pl,
      total_unrealized_pl = EXCLUDED.total_unrealized_pl,
      open_positions_count = EXCLUDED.open_positions_count,
      total_positions_count = EXCLUDED.total_positions_count,
      positions_breakdown = EXCLUDED.positions_breakdown,
      updated_at = NOW();

    RAISE NOTICE 'Generated snapshot for % with estimated unrealized P&L', v_date;
  END LOOP;

  RAISE NOTICE 'Completed regeneration of % snapshots', array_length(v_dates, 1);
END $$;
