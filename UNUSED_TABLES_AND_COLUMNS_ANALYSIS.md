# Unused Tables and Columns Analysis

## Summary

After analyzing the database schema and application code, here are the findings for unused tables and columns that can potentially be removed.

---

## Tables Analysis

### ✅ **USED Tables** (Keep These)

All of these tables are actively used in the application:

1. **transaction_codes** - ✅ Used in `TransactionCodeRepository` (44 rows)
2. **cash_transactions** - ✅ Used in `CashTransactionRepository`
3. **transactions** - ✅ Used in `TransactionRepository`
4. **positions** - ✅ Used in `PositionRepository`
5. **cash_balances** - ✅ Used in `CashBalanceRepository`
6. **futures_contract_specs** - ✅ Used in `FuturesContractSpecRepository` (28 rows)
7. **user_preferences** - ✅ Used in `UserPreferencesRepository`
8. **journal_entries** - ✅ Used in `JournalRepository`
9. **strategies** - ✅ Used in `StrategyRepository`
10. **imports** - ✅ Used (referenced via `import_id` in transactions, used in `TransactionRepository.getByImportId()`)
11. **ai_insights** - ✅ Used in `AIInsightRepository`
12. **portfolio_snapshots** - ✅ Used in `PortfolioSnapshotRepository`

### ⚠️ **POTENTIALLY UNUSED Table**

#### **position_matches** Table

**Status:** ⚠️ **NOT USED IN CODE**

**Evidence:**
- Table exists in database (0 rows)
- Type definition exists in `database.types.ts` (`PositionMatch` interface)
- **NO repository** - No `PositionMatchRepository` exists
- **NO code references** - No `.from('position_matches')` calls found
- **NO service usage** - Not used in `PositionMatchingService` or anywhere else

**Purpose (from schema):** 
- Stores FIFO matching records between opening and closing transactions
- Tracks `matched_quantity` and `realized_pnl` per match

**Current Implementation:**
- The app uses `opening_transaction_ids` and `closing_transaction_ids` arrays in the `positions` table instead
- FIFO matching is handled in-memory in `PositionMatchingService`
- P/L is calculated and stored directly in positions table

**Recommendation:**
- **Option 1 (Recommended):** Keep the table for future audit trail functionality
- **Option 2:** Remove if you're certain you won't need detailed FIFO match records

**If Removing:**
```sql
-- WARNING: This will permanently delete the table
DROP TABLE IF EXISTS position_matches CASCADE;
```

---

## Columns Analysis

### ✅ **All Columns Are Used**

After checking the codebase, **all columns in active tables are referenced** in the application code. However, there are some notes:

### 📝 **Notes on Specific Columns**

#### **transactions.asset_type** - Includes 'cash' but...

- The `asset_type` column includes `'cash'` as a valid value
- However, cash transactions are stored in the separate `cash_transactions` table
- The `transactions` table is used for stock/option/crypto/futures trades
- **Status:** Keep - The constraint allows 'cash' but it's not used in practice

#### **positions.status** - Limited values

- Current constraint: `CHECK (status IN ('open', 'closed'))`
- Type definition includes: `'open' | 'closed' | 'assigned' | 'exercised' | 'expired'`
- **Issue:** Database constraint is more restrictive than TypeScript types
- **Recommendation:** Update constraint to match TypeScript types if you plan to use those statuses

#### **positions.contract_year** - Exists but rarely used

- Column exists in positions table
- Used for futures contracts
- **Status:** Keep - Needed for futures trading

---

## Detailed Column Usage by Table

### **positions** Table
All columns are used:
- ✅ `id`, `user_id`, `strategy_id` - Foreign keys
- ✅ `symbol`, `asset_type`, `option_type`, `strike_price`, `expiration_date` - Position identification
- ✅ `contract_month`, `multiplier`, `tick_size`, `tick_value`, `margin_requirement` - Futures fields
- ✅ `side`, `opening_quantity`, `current_quantity` - Position tracking
- ✅ `average_opening_price`, `total_cost_basis`, `total_closing_amount` - Pricing
- ✅ `realized_pl`, `unrealized_pl` - P/L tracking
- ✅ `status`, `opening_transaction_ids`, `closing_transaction_ids` - Status and audit
- ✅ `opened_at`, `closed_at`, `notes`, `tags` - Metadata
- ✅ `created_at`, `updated_at` - Timestamps

### **transactions** Table
All columns are used:
- ✅ `id`, `user_id`, `import_id` - Foreign keys
- ✅ `activity_date`, `process_date`, `settle_date` - Dates
- ✅ `instrument`, `description`, `transaction_code` - Transaction details
- ✅ `asset_type`, `option_type`, `strike_price`, `expiration_date`, `underlying_symbol` - Asset identification
- ✅ `quantity`, `price`, `amount`, `fees` - Pricing
- ✅ `is_opening`, `is_long` - Classification
- ✅ `position_id`, `strategy_id` - Relationships
- ✅ `notes`, `tags` - Metadata
- ✅ `created_at`, `updated_at` - Timestamps

### **cash_transactions** Table
All columns are used:
- ✅ `id`, `user_id`, `transaction_id` - Foreign keys
- ✅ `transaction_code`, `amount`, `description`, `notes` - Transaction details
- ✅ `activity_date`, `process_date`, `settle_date` - Dates
- ✅ `symbol`, `tags` - Metadata
- ✅ `created_at`, `updated_at` - Timestamps

### **strategies** Table
All columns are used:
- ✅ All columns referenced in `StrategyRepository` and `StrategyDetectionService`

### **Other Tables**
All columns in other tables are actively used by their respective repositories.

---

## Recommendations

### 1. **position_matches Table**

**Decision Needed:** Do you want detailed FIFO match records?

- **If YES:** Keep the table, create a repository, and use it in `PositionMatchingService`
- **If NO:** Remove the table (it's currently unused)

**Current State:** The app tracks matches via arrays in positions table, which is simpler but less detailed.

### 2. **positions.status Constraint**

**Action:** Update the constraint to match TypeScript types:

```sql
ALTER TABLE positions
  DROP CONSTRAINT IF EXISTS positions_status_check;

ALTER TABLE positions
  ADD CONSTRAINT positions_status_check 
  CHECK (status IN ('open', 'closed', 'assigned', 'exercised', 'expired'));
```

### 3. **No Other Cleanup Needed**

All other tables and columns are actively used and should be kept.

---

## Migration Script (If Removing position_matches)

```sql
-- Migration: Remove unused position_matches table
-- WARNING: This permanently deletes the table and all data

-- Drop the table (CASCADE will handle foreign key constraints)
DROP TABLE IF EXISTS position_matches CASCADE;

-- Note: If you have foreign keys referencing this table, 
-- they will be automatically dropped with CASCADE
```

---

## Summary

- **Unused Tables:** 1 (`position_matches`) - but may be kept for future use
- **Unused Columns:** 0 - all columns are used
- **Action Items:**
  1. Decide on `position_matches` table (keep or remove)
  2. Update `positions.status` constraint to match TypeScript types
  3. No other cleanup needed

---

## Verification Queries

Run these to verify current state:

```sql
-- Check if position_matches has any data
SELECT COUNT(*) FROM position_matches;

-- Check positions.status constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'positions'::regclass
AND conname LIKE '%status%';

-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

