# Database Schema Verification and Testing Guide

## Overview

This guide helps you verify that the database schema matches your application code and test all functionality after applying the migration.

## Pre-Migration Checklist

Before running the migration, verify your current state:

```sql
-- Check current positions table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'positions'
ORDER BY ordinal_position;

-- Check current transactions table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;

-- Check current cash_transactions table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'cash_transactions'
ORDER BY ordinal_position;

-- Check existing views
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public';
```

## Apply Migration

Run the migration file: `database/migrations/align_schema_with_app_code.sql`

**In Supabase Dashboard:**
1. Go to SQL Editor
2. Open the migration file
3. Copy and paste into SQL Editor
4. Click "Run"

## Post-Migration Verification

### 1. Verify All Required Columns Exist

```sql
-- Verify positions table has all required columns
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'positions' AND column_name = 'status'
  ) THEN '✓ status' ELSE '✗ status' END as status_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'positions' AND column_name = 'opened_at'
  ) THEN '✓ opened_at' ELSE '✗ opened_at' END as opened_at_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'positions' AND column_name = 'side'
  ) THEN '✓ side' ELSE '✗ side' END as side_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'positions' AND column_name = 'opening_quantity'
  ) THEN '✓ opening_quantity' ELSE '✗ opening_quantity' END as opening_quantity_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'positions' AND column_name = 'current_quantity'
  ) THEN '✓ current_quantity' ELSE '✗ current_quantity' END as current_quantity_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'positions' AND column_name = 'average_opening_price'
  ) THEN '✓ average_opening_price' ELSE '✗ average_opening_price' END as avg_opening_price_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'positions' AND column_name = 'total_cost_basis'
  ) THEN '✓ total_cost_basis' ELSE '✗ total_cost_basis' END as cost_basis_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'positions' AND column_name = 'total_closing_amount'
  ) THEN '✓ total_closing_amount' ELSE '✗ total_closing_amount' END as closing_amount_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'positions' AND column_name = 'realized_pl'
  ) THEN '✓ realized_pl' ELSE '✗ realized_pl' END as realized_pl_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'positions' AND column_name = 'unrealized_pl'
  ) THEN '✓ unrealized_pl' ELSE '✗ unrealized_pl' END as unrealized_pl_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'positions' AND column_name = 'opening_transaction_ids'
  ) THEN '✓ opening_transaction_ids' ELSE '✗ opening_transaction_ids' END as opening_tx_ids_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'positions' AND column_name = 'closing_transaction_ids'
  ) THEN '✓ closing_transaction_ids' ELSE '✗ closing_transaction_ids' END as closing_tx_ids_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'positions' AND column_name = 'closed_at'
  ) THEN '✓ closed_at' ELSE '✗ closed_at' END as closed_at_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'positions' AND column_name = 'notes'
  ) THEN '✓ notes' ELSE '✗ notes' END as notes_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'positions' AND column_name = 'tags'
  ) THEN '✓ tags' ELSE '✗ tags' END as tags_check;

-- Verify transactions table has all required columns
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'activity_date'
  ) THEN '✓ activity_date' ELSE '✗ activity_date' END as activity_date_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'process_date'
  ) THEN '✓ process_date' ELSE '✗ process_date' END as process_date_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'settle_date'
  ) THEN '✓ settle_date' ELSE '✗ settle_date' END as settle_date_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'underlying_symbol'
  ) THEN '✓ underlying_symbol' ELSE '✗ underlying_symbol' END as underlying_symbol_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'instrument'
  ) THEN '✓ instrument' ELSE '✗ instrument' END as instrument_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'description'
  ) THEN '✓ description' ELSE '✗ description' END as description_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'is_opening'
  ) THEN '✓ is_opening' ELSE '✗ is_opening' END as is_opening_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'is_long'
  ) THEN '✓ is_long' ELSE '✗ is_long' END as is_long_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'tags'
  ) THEN '✓ tags' ELSE '✗ tags' END as tags_check;

-- Verify cash_transactions table has all required columns
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cash_transactions' AND column_name = 'activity_date'
  ) THEN '✓ activity_date' ELSE '✗ activity_date' END as activity_date_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cash_transactions' AND column_name = 'process_date'
  ) THEN '✓ process_date' ELSE '✗ process_date' END as process_date_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cash_transactions' AND column_name = 'settle_date'
  ) THEN '✓ settle_date' ELSE '✗ settle_date' END as settle_date_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cash_transactions' AND column_name = 'notes'
  ) THEN '✓ notes' ELSE '✗ notes' END as notes_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cash_transactions' AND column_name = 'tags'
  ) THEN '✓ tags' ELSE '✗ tags' END as tags_check;
```

### 2. Verify Views Exist and Work

```sql
-- Test v_strategy_summary view
SELECT COUNT(*) as strategy_count FROM v_strategy_summary;

-- Test v_open_positions view
SELECT COUNT(*) as open_position_count FROM v_open_positions;

-- Check view definitions
SELECT 
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('v_strategy_summary', 'v_open_positions');
```

### 3. Verify Data Migration

```sql
-- Check that existing positions have status set
SELECT 
  status,
  COUNT(*) as count
FROM positions
GROUP BY status;

-- Check that existing positions have side set
SELECT 
  side,
  COUNT(*) as count
FROM positions
GROUP BY side;

-- Check that existing transactions have activity_date set
SELECT 
  COUNT(*) as total,
  COUNT(activity_date) as with_activity_date,
  COUNT(underlying_symbol) as with_underlying_symbol
FROM transactions;

-- Check that existing cash_transactions have activity_date set
SELECT 
  COUNT(*) as total,
  COUNT(activity_date) as with_activity_date
FROM cash_transactions;
```

### 4. Verify Indexes

```sql
-- Check indexes on positions
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'positions'
ORDER BY indexname;

-- Check indexes on transactions
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'transactions'
ORDER BY indexname;

-- Check indexes on cash_transactions
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'cash_transactions'
ORDER BY indexname;
```

## Application Testing Checklist

After migration, test these features in your application:

### Position Management
- [ ] Create a new position
- [ ] Update a position
- [ ] Close a position (full close)
- [ ] Partially close a position
- [ ] View open positions
- [ ] View closed positions
- [ ] Filter positions by status
- [ ] Filter positions by side (long/short)
- [ ] Filter positions by symbol
- [ ] Filter positions by asset type

### Transaction Management
- [ ] Create a new transaction
- [ ] Import transactions from CSV
- [ ] Query transactions by activity_date
- [ ] Query transactions by underlying_symbol
- [ ] Filter transactions by is_opening
- [ ] Filter transactions by is_long
- [ ] View transaction details
- [ ] Update transaction
- [ ] Delete transaction

### Cash Transaction Management
- [ ] Create a cash transaction
- [ ] Query cash transactions by activity_date
- [ ] Filter cash transactions by date range
- [ ] View cash transaction details
- [ ] Update cash transaction
- [ ] Delete cash transaction

### Strategy Management
- [ ] View strategy summary
- [ ] Create a strategy
- [ ] Link positions to strategy
- [ ] View strategies with position counts
- [ ] Filter strategies by status
- [ ] View strategy P/L

### Position Matching (FIFO)
- [ ] Import transactions
- [ ] Run position matching
- [ ] Verify positions are created correctly
- [ ] Verify opening_transaction_ids are set
- [ ] Verify closing_transaction_ids are set when closing
- [ ] Verify current_quantity decreases on partial close
- [ ] Verify total_cost_basis is calculated correctly
- [ ] Verify realized_pl is calculated correctly

### Views
- [ ] Query v_strategy_summary
- [ ] Query v_open_positions
- [ ] Verify view data is correct
- [ ] Test view performance

## Common Issues and Solutions

### Issue: "Column does not exist" errors

**Solution:** Run the migration again. The migration uses `IF NOT EXISTS` so it's safe to run multiple times.

### Issue: Views return no data

**Solution:** Check that positions have `status = 'open'` instead of `is_open = true`. The migration should have set this, but verify:

```sql
-- Check positions status
SELECT id, is_open, status FROM positions LIMIT 10;

-- If status is NULL, update it
UPDATE positions SET status = CASE WHEN is_open THEN 'open' ELSE 'closed' END WHERE status IS NULL;
```

### Issue: Transactions missing activity_date

**Solution:** The migration should have set this, but if not:

```sql
UPDATE transactions 
SET activity_date = transaction_date 
WHERE activity_date IS NULL;
```

### Issue: Positions missing side

**Solution:** The migration should have set this, but if not:

```sql
UPDATE positions 
SET side = CASE 
  WHEN quantity > 0 THEN 'long' 
  WHEN quantity < 0 THEN 'short' 
  ELSE 'long' 
END 
WHERE side IS NULL;
```

## Performance Testing

After migration, test query performance:

```sql
-- Test position queries
EXPLAIN ANALYZE
SELECT * FROM positions 
WHERE user_id = 'your-user-id' 
AND status = 'open'
ORDER BY opened_at DESC;

-- Test transaction queries
EXPLAIN ANALYZE
SELECT * FROM transactions 
WHERE user_id = 'your-user-id' 
AND activity_date >= '2024-01-01'
ORDER BY activity_date DESC;

-- Test view queries
EXPLAIN ANALYZE
SELECT * FROM v_open_positions 
WHERE user_id = 'your-user-id';
```

## Rollback Plan

If you need to rollback (not recommended after data migration):

1. **Backup your data first:**
```sql
-- Export data
COPY positions TO '/tmp/positions_backup.csv' CSV HEADER;
COPY transactions TO '/tmp/transactions_backup.csv' CSV HEADER;
COPY cash_transactions TO '/tmp/cash_transactions_backup.csv' CSV HEADER;
```

2. **Drop views:**
```sql
DROP VIEW IF EXISTS v_open_positions;
DROP VIEW IF EXISTS v_strategy_summary;
```

3. **Remove columns (WARNING: This will lose data):**
```sql
-- Only if absolutely necessary
ALTER TABLE positions DROP COLUMN IF EXISTS status, opened_at, side, ...;
ALTER TABLE transactions DROP COLUMN IF EXISTS activity_date, underlying_symbol, ...;
ALTER TABLE cash_transactions DROP COLUMN IF EXISTS activity_date, ...;
```

## Next Steps

1. ✅ Run the migration
2. ✅ Verify all columns exist
3. ✅ Verify views work
4. ✅ Test application functionality
5. ✅ Monitor for any errors
6. ✅ Update application code if needed (shouldn't be necessary)

## Support

If you encounter issues:

1. Check the migration logs in Supabase
2. Run the verification queries above
3. Check application console for specific errors
4. Review the detailed analysis in `DATABASE_ANALYSIS_REPORT.md`

