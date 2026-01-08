# Strategy Auto-Update Implementation

## Problem

When closing all legs of a multi-leg option strategy, the individual position records were correctly updated with `realized_pl` and `closed_at`, but the strategy record itself remained with:
- `status = 'open'`
- `realized_pl = null`
- `closed_at = null`

This caused strategies not to appear in daily/weekly performance calculations, even though all positions were closed.

## Solution

Implemented automatic strategy update when all positions in a strategy are closed.

### Code Changes

#### 1. Position Repository ([src/infrastructure/repositories/position.repository.ts](src/infrastructure/repositories/position.repository.ts))

**Added `checkAndUpdateStrategy()` method** (lines 329-397):
- Private method that checks if all positions in a strategy are closed
- Calculates total `realized_pl` from all position legs
- Determines the latest `closed_at` timestamp
- Updates strategy with correct status, P&L, and closing date

**Modified `closePosition()` method** (lines 282-327):
- Added strategy update trigger after position is closed (lines 321-324)
- Calls `checkAndUpdateStrategy()` if position is part of a strategy

**Modified `updateStatus()` method** (lines 401-416):
- Added strategy update trigger after status change (lines 410-414)
- Handles expired, assigned, and exercised positions

### How It Works

```typescript
// When you close a position:
PositionRepository.closePosition(...)
  ↓
  Updates position with status='closed', realized_pl, closed_at
  ↓
  Checks if position.strategy_id exists
  ↓
  Calls checkAndUpdateStrategy(strategy_id)
    ↓
    Queries all positions for this strategy
    ↓
    If ALL positions are closed:
      - Sums up realized_pl from all legs
      - Finds latest closed_at timestamp
      - Determines final status (closed/expired/assigned)
      - Updates strategy record
```

### Triggered By

The strategy update is automatically triggered when:

1. **Manual sell through UI** - `SellPositionForm.tsx` → creates transaction → `PositionMatchingService` → `PositionRepository.closePosition()`

2. **Transaction import** - CSV import → `PositionMatchingService.matchTransactions()` → `PositionRepository.closePosition()`

3. **Expiration handling** - `PositionMatchingService.expireOptions()` → `PositionRepository.updateStatus(position, 'expired')`

4. **Assignment/Exercise** - `PositionMatchingService` → `PositionRepository.updateStatus(position, 'assigned'|'exercised')`

### Strategy Status Logic

The final strategy status is determined by position statuses:

```typescript
if (any position is 'expired')        → strategy status = 'expired'
else if (any position is 'assigned')  → strategy status = 'assigned'
else if (any position is 'exercised') → strategy status = 'assigned' // treated as assigned
else                                  → strategy status = 'closed'
```

### Fields Updated

When all positions are closed, the strategy record is updated with:

| Field | Value |
|-------|-------|
| `status` | 'closed', 'expired', or 'assigned' |
| `realized_pl` | Sum of all position `realized_pl` values |
| `unrealized_pl` | Set to `0` (no unrealized P&L on closed strategy) |
| `closed_at` | Latest `closed_at` timestamp from all positions |
| `total_opening_cost` | Sum of absolute `total_cost_basis` from all positions |
| `total_closing_proceeds` | Sum of absolute `total_closing_amount` from all positions |

## Testing

Unit tests added in [src/infrastructure/repositories/__tests__/position.repository.test.ts](src/infrastructure/repositories/__tests__/position.repository.test.ts):

- ✅ Updates strategy when last position is closed
- ✅ Does NOT update strategy if positions are still open
- ✅ Sets correct strategy status based on position statuses
- ✅ Calculates correct total realized P&L
- ✅ Uses latest closed_at timestamp

## One-Time Data Fix

For existing strategies that were already closed but not updated, a fix utility is available:

**Option 1: Browser Console** (while logged in)
```javascript
import('/src/infrastructure/utils/fixClosedStrategies.js').then(module => {
  const userId = JSON.parse(localStorage.getItem('sb-...-auth-token')).user.id;
  module.fixClosedStrategies(userId);
});
```

**Option 2: Supabase SQL** (via MCP or SQL editor)
```sql
WITH closed_strategy_positions AS (
  SELECT
    s.id as strategy_id,
    COUNT(p.id) as total_positions,
    COUNT(CASE WHEN p.status IN ('closed', 'expired', 'assigned', 'exercised') THEN 1 END) as closed_positions,
    SUM(p.realized_pl) as total_realized_pl,
    MAX(p.closed_at) as latest_closed_at,
    BOOL_OR(p.status = 'expired') as has_expired,
    BOOL_OR(p.status IN ('assigned', 'exercised')) as has_assigned,
    SUM(ABS(p.total_cost_basis)) as total_opening_cost,
    SUM(ABS(p.total_closing_amount)) as total_closing_proceeds
  FROM strategies s
  LEFT JOIN positions p ON p.strategy_id = s.id
  WHERE s.status = 'open'
  GROUP BY s.id
  HAVING COUNT(p.id) > 0
    AND COUNT(p.id) = COUNT(CASE WHEN p.status IN ('closed', 'expired', 'assigned', 'exercised') THEN 1 END)
)
UPDATE strategies s
SET
  status = CASE
    WHEN csp.has_expired THEN 'expired'
    WHEN csp.has_assigned THEN 'assigned'
    ELSE 'closed'
  END,
  realized_pl = csp.total_realized_pl,
  unrealized_pl = 0,
  closed_at = csp.latest_closed_at,
  total_opening_cost = csp.total_opening_cost,
  total_closing_proceeds = csp.total_closing_proceeds
FROM closed_strategy_positions csp
WHERE s.id = csp.strategy_id;
```

## Impact on Performance Calculations

With this fix, the following hooks/queries now correctly include closed strategies:

- ✅ `useDailyPerformance` - Shows P&L for strategies closed today
- ✅ `useWeeklyPerformance` - Includes strategies closed this week
- ✅ `useMonthlyPerformance` - Includes strategies closed this month
- ✅ Dashboard performance summary - All time periods now accurate
- ✅ Win rate calculations - Multi-leg strategies counted as single trades
- ✅ Analytics charts - Historical performance includes all closed strategies

## Verification

After the fix, verify strategies are updating correctly:

1. Close all legs of a multi-leg strategy through the UI
2. Check the `strategies` table in Supabase:
   - `status` should change from 'open' to 'closed' (or 'expired'/'assigned')
   - `realized_pl` should equal sum of position realized P&Ls
   - `closed_at` should be set to the latest position close timestamp
3. Refresh the dashboard - strategy should appear in today's performance
4. Check Options page - strategy should show in "Closed" tab

## Future Considerations

### Potential Enhancements

1. **Partial close handling**: Currently only updates when ALL positions are closed. Could add logic to mark strategy as 'partially_closed' when some (but not all) legs are closed.

2. **Event logging**: Add audit trail when strategy status is auto-updated for debugging and reconciliation.

3. **Batch updates**: If importing large CSV files, could batch strategy updates to improve performance.

4. **Real-time updates**: Consider using Supabase realtime subscriptions to push strategy updates to UI immediately.

### Edge Cases Handled

- ✅ Mixed position statuses (closed/expired/assigned) - chooses most relevant status
- ✅ Null timestamps - falls back to current timestamp if no closed_at dates exist
- ✅ Strategy with no positions - skips update (shouldn't happen in normal use)
- ✅ Database errors - logs error but doesn't fail position update
- ✅ Partial closes - only updates strategy when ALL positions are closed

## Rollback

If issues occur, the changes can be safely rolled back:

1. Revert [src/infrastructure/repositories/position.repository.ts](src/infrastructure/repositories/position.repository.ts):
   - Remove `checkAndUpdateStrategy()` method
   - Remove strategy update calls from `closePosition()` and `updateStatus()`

2. Strategy records will remain in their current state (no data loss)

3. Manual strategy updates can be done via SQL or admin panel

## Related Files

- `src/infrastructure/repositories/position.repository.ts` - Main implementation
- `src/infrastructure/repositories/strategy.repository.ts` - Strategy update method
- `src/infrastructure/services/positionMatchingService.ts` - Triggers position closes
- `src/presentation/components/SellPositionForm.tsx` - UI trigger for manual sells
- `src/application/hooks/useDailyPerformance.ts` - Queries strategies by closed_at
- `src/infrastructure/utils/fixClosedStrategies.ts` - One-time fix utility

---

**Date Implemented**: January 6, 2026
**Issue**: Multi-leg strategies not appearing in daily performance
**Status**: ✅ Fixed and tested
