# Database Schema Fix Guide

## Quick Summary

The application code references database columns and views that don't exist in the current schema. This guide provides step-by-step instructions to fix these issues.

## Critical Issues Found

1. **Positions table** - Missing 8 columns and 1 view
2. **Transactions table** - Missing 4 columns  
3. **Cash transactions table** - Missing 1 column
4. **Views** - 1 view needs fixing, 1 view needs creation

## Solution

A migration file has been created: `database/migrations/fix_schema_mismatches.sql`

## How to Apply the Fix

### Option 1: Using Supabase Dashboard (Recommended)

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file: `database/migrations/fix_schema_mismatches.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** to execute

### Option 2: Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push
```

Or manually:

```bash
psql -h your-db-host -U postgres -d postgres -f database/migrations/fix_schema_mismatches.sql
```

## What the Migration Does

### Positions Table
- ✅ Adds `status` column (enum: open, closed, assigned, exercised, expired)
- ✅ Adds `opened_at` timestamp
- ✅ Adds `current_quantity` for partial closes
- ✅ Adds `total_cost_basis` for FIFO tracking
- ✅ Adds `total_closing_amount` for closing proceeds
- ✅ Adds `closing_transaction_ids` array for audit trail
- ✅ Adds `side` column (long/short)
- ✅ Adds `unrealized_pl` for P/L tracking
- ✅ Adds `average_opening_price` (keeps `average_price` for compatibility)
- ✅ Adds `closed_at` timestamp
- ✅ Creates indexes for new columns

### Transactions Table
- ✅ Adds `activity_date` (may differ from `transaction_date`)
- ✅ Adds `underlying_symbol` (for options)
- ✅ Adds `is_opening` flag (BTO/STO vs BTC/STC)
- ✅ Adds `is_long` flag (BTO/BTC vs STO/STC)
- ✅ Creates indexes including composite index for FIFO matching

### Cash Transactions Table
- ✅ Adds `activity_date` column
- ✅ Creates index

### Views
- ✅ Fixes `v_strategy_summary` to use `is_open` instead of `status`
- ✅ Creates `v_open_positions` view

## Verification Steps

After running the migration, verify:

1. **Check columns exist:**
```sql
-- Check positions table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'positions' 
ORDER BY ordinal_position;

-- Check transactions table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;

-- Check cash_transactions table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cash_transactions' 
ORDER BY ordinal_position;
```

2. **Check views exist:**
```sql
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN ('v_strategy_summary', 'v_open_positions');
```

3. **Test queries:**
```sql
-- Test v_strategy_summary
SELECT * FROM v_strategy_summary LIMIT 5;

-- Test v_open_positions
SELECT * FROM v_open_positions LIMIT 5;

-- Test positions with new columns
SELECT id, status, opened_at, current_quantity, side 
FROM positions 
LIMIT 5;

-- Test transactions with new columns
SELECT id, activity_date, underlying_symbol, is_opening, is_long 
FROM transactions 
LIMIT 5;
```

## Rollback (If Needed)

If you need to rollback this migration, you can:

1. **Drop the views:**
```sql
DROP VIEW IF EXISTS v_open_positions;
DROP VIEW IF EXISTS v_strategy_summary;
```

2. **Remove columns (be careful - this will lose data):**
```sql
-- Only do this if you're sure you want to remove the columns
ALTER TABLE positions 
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS opened_at,
  DROP COLUMN IF EXISTS current_quantity,
  DROP COLUMN IF EXISTS total_cost_basis,
  DROP COLUMN IF EXISTS total_closing_amount,
  DROP COLUMN IF EXISTS closing_transaction_ids,
  DROP COLUMN IF EXISTS side,
  DROP COLUMN IF EXISTS unrealized_pl,
  DROP COLUMN IF EXISTS average_opening_price,
  DROP COLUMN IF EXISTS closed_at;

ALTER TABLE transactions
  DROP COLUMN IF EXISTS activity_date,
  DROP COLUMN IF EXISTS underlying_symbol,
  DROP COLUMN IF EXISTS is_opening,
  DROP COLUMN IF EXISTS is_long;

ALTER TABLE cash_transactions
  DROP COLUMN IF EXISTS activity_date;
```

**Note:** The migration sets default values for existing rows, so rollback will lose that data.

## Next Steps After Migration

1. **Update TypeScript types** in `src/domain/types/database.types.ts` to match the new schema
2. **Test all repository methods** to ensure they work correctly
3. **Update any services** that use these repositories
4. **Consider deprecating old columns** (like `average_price` if you're using `average_opening_price`)

## Important Notes

- The migration is **idempotent** - safe to run multiple times
- Existing data is preserved and migrated to new columns
- Default values are set for all new columns
- Indexes are created for performance
- Views are recreated with correct logic

## Questions?

If you encounter any issues:

1. Check the migration logs in Supabase
2. Verify all columns exist using the verification queries above
3. Check that RLS policies are still working (they should be unaffected)
4. Review the detailed analysis in `DATABASE_ANALYSIS_REPORT.md`

## Testing Checklist

After migration, test these features:

- [ ] Create a new position
- [ ] Update a position
- [ ] Close a position (partial and full)
- [ ] Create a transaction
- [ ] Query transactions by activity_date
- [ ] Query transactions by underlying_symbol
- [ ] View strategy summary
- [ ] View open positions
- [ ] Import CSV transactions
- [ ] FIFO matching logic

