-- ============================================================================
-- Stock Cash Transaction Codes Setup
-- ============================================================================
-- This script adds stock-related cash transaction codes to the transaction_codes table
-- These codes are used when stock trades generate corresponding cash movements
-- Run this in your Supabase SQL editor
-- ============================================================================

-- Insert STOCK_BUY transaction code (cash debit when buying stocks)
INSERT INTO transaction_codes (trans_code, category, description, in_your_file)
VALUES (
  'STOCK_BUY',
  'Stock Trade',
  'Cash debit from stock purchase',
  true
)
ON CONFLICT (trans_code) DO UPDATE
SET
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  in_your_file = EXCLUDED.in_your_file;

-- Insert STOCK_SELL transaction code (cash credit when selling stocks)
INSERT INTO transaction_codes (trans_code, category, description, in_your_file)
VALUES (
  'STOCK_SELL',
  'Stock Trade',
  'Cash credit from stock sale',
  true
)
ON CONFLICT (trans_code) DO UPDATE
SET
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  in_your_file = EXCLUDED.in_your_file;

-- Verify the inserts
SELECT trans_code, category, description
FROM transaction_codes
WHERE trans_code IN ('STOCK_BUY', 'STOCK_SELL')
ORDER BY trans_code;

-- ============================================================================
-- Expected Output:
-- ============================================================================
-- STOCK_BUY  | Stock Trade | Cash debit from stock purchase
-- STOCK_SELL | Stock Trade | Cash credit from stock sale
-- ============================================================================
