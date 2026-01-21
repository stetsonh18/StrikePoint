-- Fix total_cost_basis for option positions that have it set to 0 or null
-- For options: total_cost_basis = opening_quantity * average_opening_price * multiplier
-- Sign convention:
--   Long positions (buy): negative (debit paid)
--   Short positions (sell): positive (credit received)

UPDATE positions
SET total_cost_basis =
  CASE
    WHEN side = 'short'
    THEN opening_quantity * average_opening_price * COALESCE(multiplier, 100)
    ELSE -(opening_quantity * average_opening_price * COALESCE(multiplier, 100))
  END
WHERE
  asset_type = 'option'
  AND (total_cost_basis IS NULL OR total_cost_basis = 0)
  AND opening_quantity > 0
  AND average_opening_price > 0;
