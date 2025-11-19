-- Migration: Remove unused position_matches table
-- 
-- WARNING: This permanently deletes the position_matches table.
-- 
-- This table was designed for detailed FIFO matching records, but the current
-- implementation uses opening_transaction_ids and closing_transaction_ids arrays
-- in the positions table instead. The table is not referenced anywhere in the
-- application code.
--
-- If you need detailed FIFO audit trails in the future, you can recreate this
-- table and implement a PositionMatchRepository.
--
-- Before running: Verify the table has no data you need:
--   SELECT COUNT(*) FROM position_matches;

-- Drop the table (CASCADE will automatically handle foreign key constraints)
DROP TABLE IF EXISTS position_matches CASCADE;

