-- ============================================================================
-- CHECK UNUSED TABLES SCRIPT
-- ============================================================================
-- Purpose: Identify empty or unused tables in Supabase database
-- Run this in your Supabase SQL Editor to see which tables can be dropped
-- ============================================================================

-- ============================================================================
-- SECTION 1: TABLE ROW COUNTS
-- ============================================================================
-- Shows how many rows are in each table

SELECT
  'Table Row Counts' as analysis_type,
  '' as table_name,
  NULL as row_count,
  '' as recommendation
UNION ALL

-- Core tables (should have data)
SELECT 'Core Tables', 'positions', COUNT(*)::BIGINT,
  CASE WHEN COUNT(*) = 0 THEN '⚠️ EMPTY - Should have data' ELSE '✅ In use' END
FROM positions
UNION ALL
SELECT '', 'strategies', COUNT(*)::BIGINT,
  CASE WHEN COUNT(*) = 0 THEN '⚠️ EMPTY - Should have data' ELSE '✅ In use' END
FROM strategies
UNION ALL
SELECT '', 'transactions', COUNT(*)::BIGINT,
  CASE WHEN COUNT(*) = 0 THEN '⚠️ EMPTY - Should have data' ELSE '✅ In use' END
FROM transactions
UNION ALL
SELECT '', 'cash_transactions', COUNT(*)::BIGINT,
  CASE WHEN COUNT(*) = 0 THEN '⚠️ EMPTY - Should have data' ELSE '✅ In use' END
FROM cash_transactions
UNION ALL
SELECT '', 'cash_balances', COUNT(*)::BIGINT,
  CASE WHEN COUNT(*) = 0 THEN 'ℹ️ May be empty' ELSE '✅ In use' END
FROM cash_balances
UNION ALL
SELECT '', 'journal_entries', COUNT(*)::BIGINT,
  CASE WHEN COUNT(*) = 0 THEN 'ℹ️ May be empty' ELSE '✅ In use' END
FROM journal_entries
UNION ALL
SELECT '', 'portfolio_snapshots', COUNT(*)::BIGINT,
  CASE WHEN COUNT(*) = 0 THEN 'ℹ️ May be empty' ELSE '✅ In use' END
FROM portfolio_snapshots
UNION ALL
SELECT '', 'imports', COUNT(*)::BIGINT,
  CASE WHEN COUNT(*) = 0 THEN 'ℹ️ May be empty' ELSE '✅ In use' END
FROM imports

UNION ALL
SELECT '', '', NULL, ''
UNION ALL

-- Reference tables (may be empty)
SELECT 'Reference Tables', 'transaction_codes', COUNT(*)::BIGINT,
  CASE WHEN COUNT(*) = 0 THEN '⚠️ EMPTY - Should be seeded' ELSE '✅ Has reference data' END
FROM transaction_codes
UNION ALL
SELECT '', 'futures_contract_specs', COUNT(*)::BIGINT,
  CASE WHEN COUNT(*) = 0 THEN '💡 EMPTY - Can drop if not using futures' ELSE '✅ Has data' END
FROM futures_contract_specs
UNION ALL
SELECT '', 'user_preferences', COUNT(*)::BIGINT,
  CASE WHEN COUNT(*) = 0 THEN 'ℹ️ May be empty' ELSE '✅ In use' END
FROM user_preferences

UNION ALL
SELECT '', '', NULL, ''
UNION ALL

-- Subscription/billing tables
SELECT 'Subscription Tables', 'discount_codes', COUNT(*)::BIGINT,
  CASE WHEN COUNT(*) = 0 THEN 'ℹ️ No codes created yet' ELSE '✅ Has codes' END
FROM discount_codes
UNION ALL
SELECT '', 'discount_code_redemptions', COUNT(*)::BIGINT,
  CASE WHEN COUNT(*) = 0 THEN 'ℹ️ No redemptions yet' ELSE '✅ Has redemptions' END
FROM discount_code_redemptions

UNION ALL
SELECT '', '', NULL, ''
UNION ALL

-- AI/Advanced features (may not be implemented)
SELECT 'AI Features', 'ai_insights', COUNT(*)::BIGINT,
  CASE WHEN COUNT(*) = 0 THEN '💡 EMPTY - Drop if feature not planned' ELSE '✅ Feature in use' END
FROM ai_insights
UNION ALL
SELECT '', 'trading_strategy_plans', COUNT(*)::BIGINT,
  CASE WHEN COUNT(*) = 0 THEN '💡 EMPTY - Drop if feature not planned' ELSE '✅ Feature in use' END
FROM trading_strategy_plans
UNION ALL
SELECT '', 'strategy_alignment_snapshots', COUNT(*)::BIGINT,
  CASE WHEN COUNT(*) = 0 THEN '💡 EMPTY - Drop if feature not planned' ELSE '✅ Feature in use' END
FROM strategy_alignment_snapshots

UNION ALL
SELECT '', '', NULL, ''
UNION ALL

-- Backup tables (should be dropped after verification)
SELECT 'Backup Tables', 'strategies_backup_20250125', COUNT(*)::BIGINT,
  CASE WHEN COUNT(*) > 0 THEN '🗑️ DROP AFTER VERIFYING CLEANUP' ELSE '✅ Already dropped' END
FROM strategies_backup_20250125;

-- ============================================================================
-- SECTION 2: CHECK FOR ORPHANED VIEWS
-- ============================================================================
-- Lists all views and their dependencies

SELECT
  schemaname,
  viewname,
  viewowner,
  definition
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

-- ============================================================================
-- SECTION 3: DETAILED ANALYSIS - EMPTY TABLES
-- ============================================================================
-- Shows only completely empty tables that might be candidates for removal

WITH table_counts AS (
  SELECT 'ai_insights' as table_name, COUNT(*) as row_count FROM ai_insights
  UNION ALL
  SELECT 'trading_strategy_plans', COUNT(*) FROM trading_strategy_plans
  UNION ALL
  SELECT 'strategy_alignment_snapshots', COUNT(*) FROM strategy_alignment_snapshots
  UNION ALL
  SELECT 'futures_contract_specs', COUNT(*) FROM futures_contract_specs
  UNION ALL
  SELECT 'discount_codes', COUNT(*) FROM discount_codes
  UNION ALL
  SELECT 'discount_code_redemptions', COUNT(*) FROM discount_code_redemptions
)
SELECT
  table_name,
  row_count,
  CASE
    WHEN table_name LIKE '%ai%' OR table_name LIKE '%strategy_plan%' OR table_name LIKE '%alignment%'
      THEN 'AI Feature - Drop if not planned'
    WHEN table_name LIKE '%futures%'
      THEN 'Futures Feature - Drop if not using futures trading'
    WHEN table_name LIKE '%discount%'
      THEN 'Subscription Feature - Keep for future use'
    ELSE 'Review needed'
  END as recommendation,
  CASE
    WHEN row_count = 0 THEN 'Yes - Safe to drop if feature unused'
    ELSE 'No - Has data'
  END as safe_to_drop
FROM table_counts
WHERE row_count = 0
ORDER BY table_name;

-- ============================================================================
-- SECTION 4: TABLE SIZE ANALYSIS
-- ============================================================================
-- Shows disk space used by each table

SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- SECTION 5: RECOMMENDED DROP STATEMENTS
-- ============================================================================
-- Copy and execute these after reviewing the results above
-- ============================================================================

-- Step 1: Drop backup table (SAFE - after verifying cleanup worked)
-- DROP TABLE IF EXISTS strategies_backup_20250125;

-- Step 2: Drop AI feature tables (if not planned)
-- WARNING: Only run if you're certain you won't use these features
/*
DROP TABLE IF EXISTS strategy_alignment_snapshots CASCADE;
DROP TABLE IF EXISTS trading_strategy_plans CASCADE;
DROP TABLE IF EXISTS ai_insights CASCADE;
*/

-- Step 3: Drop futures specs (if not using futures)
-- WARNING: Only drop if you're not trading futures
/*
DROP TABLE IF EXISTS futures_contract_specs CASCADE;
*/

-- Step 4: Check for and drop unused views
-- Run Section 2 first to see what views exist
/*
DROP VIEW IF EXISTS v_open_positions CASCADE;
DROP VIEW IF EXISTS v_strategy_summary CASCADE;
*/

-- ============================================================================
-- SECTION 6: VERIFICATION QUERIES
-- ============================================================================
-- Run these after dropping tables to verify everything still works

-- Check that positions still work
-- SELECT COUNT(*) FROM positions;

-- Check that strategies still work
-- SELECT COUNT(*) FROM strategies;

-- Check that transactions still work
-- SELECT COUNT(*) FROM transactions;

-- Check that cash transactions still work
-- SELECT COUNT(*) FROM cash_transactions;

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================

-- SUMMARY:
-- 1. Run SECTION 1 to see row counts for all tables
-- 2. Run SECTION 2 to see what views exist
-- 3. Run SECTION 3 to see empty tables that are candidates for removal
-- 4. Run SECTION 4 to see which tables are taking up the most space
-- 5. Review the results and decide what to drop
-- 6. Execute the DROP statements from SECTION 5
-- 7. Run SECTION 6 to verify everything still works
