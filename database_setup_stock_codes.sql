-- ============================================================================
-- Stock Transaction Codes Setup
-- ============================================================================
-- This script adds stock buy/sell transaction codes to the transaction_codes table
-- Run this in your Supabase SQL editor
-- ============================================================================

-- Insert BUY transaction code
INSERT INTO transaction_codes (trans_code, category, description, in_your_file)
VALUES (
  'BUY',
  'Stock Trade',
  'Stock purchase transaction',
  true
)
ON CONFLICT (trans_code) DO UPDATE
SET
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  in_your_file = EXCLUDED.in_your_file;

-- Insert SELL transaction code
INSERT INTO transaction_codes (trans_code, category, description, in_your_file)
VALUES (
  'SELL',
  'Stock Trade',
  'Stock sale transaction',
  true
)
ON CONFLICT (trans_code) DO UPDATE
SET
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  in_your_file = EXCLUDED.in_your_file;

-- Also support common variants
INSERT INTO transaction_codes (trans_code, category, description, in_your_file)
VALUES (
  'Buy',
  'Stock Trade',
  'Stock purchase transaction (lowercase variant)',
  true
)
ON CONFLICT (trans_code) DO UPDATE
SET
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  in_your_file = EXCLUDED.in_your_file;

INSERT INTO transaction_codes (trans_code, category, description, in_your_file)
VALUES (
  'Sell',
  'Stock Trade',
  'Stock sale transaction (lowercase variant)',
  true
)
ON CONFLICT (trans_code) DO UPDATE
SET
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  in_your_file = EXCLUDED.in_your_file;

-- Insert BOT (Bought) and SLD (Sold) - common broker abbreviations
INSERT INTO transaction_codes (trans_code, category, description, in_your_file)
VALUES (
  'BOT',
  'Stock Trade',
  'Stock bought (broker abbreviation)',
  true
)
ON CONFLICT (trans_code) DO UPDATE
SET
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  in_your_file = EXCLUDED.in_your_file;

INSERT INTO transaction_codes (trans_code, category, description, in_your_file)
VALUES (
  'SLD',
  'Stock Trade',
  'Stock sold (broker abbreviation)',
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
WHERE category = 'Stock Trade'
ORDER BY trans_code;

-- ============================================================================
-- Expected Output:
-- ============================================================================
-- BOT   | Stock Trade | Stock bought (broker abbreviation)
-- BUY   | Stock Trade | Stock purchase transaction
-- Buy   | Stock Trade | Stock purchase transaction (lowercase variant)
-- SELL  | Stock Trade | Stock sale transaction
-- SLD   | Stock Trade | Stock sold (broker abbreviation)
-- Sell  | Stock Trade | Stock sale transaction (lowercase variant)
-- ============================================================================
