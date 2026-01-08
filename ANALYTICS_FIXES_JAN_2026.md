# Analytics Page Fixes - January 6, 2026

## Issues Reported
1. **ROI not displaying** - Shows 0% even when there are open positions with unrealized P&L
2. **Current Balance wrong** - Not reflecting real-time market values
3. **Multi-leg options not showing on calendar** - Strategy closed on Jan 6th not appearing in calendar modal

## Root Causes & Fixes

### 1. ROI Displaying 0% When No Closed Trades

**Problem:**  
When a user had only open positions but no closed trades (`totalTrades === 0`), the ROI was hardcoded to return `0` instead of calculating based on unrealized P&L.

**Location:** `src/infrastructure/services/performanceMetricsService.ts`

**Fix Applied:**
- Lines 359-380: Changed `roi: 0` to `roi` (use calculated value)
- Lines 534-555: Changed `roi: 0` to `roi` (use calculated value)

The ROI calculation happens BEFORE the `if (totalTrades === 0)` check:
- For overall portfolio (line 344-353): `ROI = (portfolioValue - netCashFlow) / deposits * 100`
- For asset-specific (line 524-527): `ROI = (realizedPL + unrealizedPL) / totalCostBasis * 100`

Now even with zero closed trades, the ROI correctly reflects unrealized gains/losses from open positions.

### 2. Current Balance Not Reflecting Real-Time Values

**Problem:**  
The Analytics page was using `currentBalance` from portfolio snapshots, which may not reflect current market prices for stocks, crypto, and options.

**Location:** `src/presentation/pages/Analytics.tsx`

**Fix Applied:**
1. Added `usePortfolioValue` hook import (line 52)
2. Called the hook to get real-time portfolio value (line 169)
3. Modified metrics override to use real-time data for "All Assets" tab (lines 315-325):

```typescript
const metricsWithUnrealizedPL = useMemo(() => {
  if (!metrics) return metrics;
  // For "All Assets" tab, use real-time portfolio value
  // For asset-specific tabs, use the value from metrics
  const currentBalance = activeTab === 'all' 
    ? realtimePortfolioValue 
    : metrics.currentBalance;
  return {
    ...metrics,
    unrealizedPL: calculatedUnrealizedPL,
    currentBalance,
  };
}, [metrics, calculatedUnrealizedPL, activeTab, realtimePortfolioValue]);
```

The `usePortfolioValue` hook:
- Fetches real-time quotes for stocks, crypto, and options
- Calculates current market value based on live prices
- Adds net cash flow to get total portfolio value

### 3. Multi-Leg Options Not Showing on Calendar

**Problem:**  
When clicking on a date in the calendar, the modal only showed individual positions. Multi-leg option strategies (like spreads, iron condors, etc.) were not displayed even though they were closed on that date.

**Root Cause:**  
The `getPositionsByClosedDate()` function only fetched positions, not strategies. When a multi-leg strategy is closed, all its legs are part of that strategy, but the function wasn't checking for strategies closed on that date.

**Location:** `src/infrastructure/services/performanceMetricsService.ts`

**Fix Applied (lines 1883-1973):**
1. Added logic to fetch all strategies for the user
2. Filter strategies closed on the target date
3. Extract position IDs from strategy legs
4. Fetch those positions and include them in the results
5. Remove duplicates and return combined list

```typescript
// Get all strategies and check if any were closed on this date
const allStrategies = await StrategyRepository.getAll(userId);
const strategiesClosedOnDate = allStrategies.filter((strategy) => {
  if (!strategy.closed_at) return false;
  const strategyClosedDate = this.formatLocalDate(new Date(strategy.closed_at));
  return strategyClosedDate === dateStr;
});

// Get all position IDs that are part of strategies closed on this date
const strategyPositionIds = new Set<string>();
strategiesClosedOnDate.forEach((strategy) => {
  strategy.legs.forEach((leg) => {
    if (leg.position_id) {
      strategyPositionIds.add(leg.position_id);
    }
  });
});

// Fetch and include those positions
```

Now when you click on January 6th (or any date), the modal will show:
- Individual positions closed on that date
- All legs of multi-leg strategies closed on that date
- Partially closed positions with realized P&L

## Testing Recommendations

1. **ROI Test:**
   - Open a position with unrealized gain (e.g., buy stock that goes up)
   - Check Analytics "All Assets" tab
   - Verify ROI shows positive percentage (not 0%)

2. **Current Balance Test:**
   - Open positions in stocks/crypto/options
   - Wait for market price changes
   - Verify "Current Balance" updates with real-time prices
   - Compare with Dashboard portfolio value (should match)

3. **Calendar Test:**
   - Close a multi-leg option strategy (e.g., iron condor, spread)
   - Go to Analytics page, view calendar
   - Click on the date the strategy was closed
   - Verify all legs of the strategy appear in the modal
   - Verify the total P&L matches the strategy's realized P&L

## Files Modified

1. `src/infrastructure/services/performanceMetricsService.ts`
   - Fixed ROI calculation when no closed trades exist
   - Enhanced `getPositionsByClosedDate()` to include strategy positions

2. `src/presentation/pages/Analytics.tsx`
   - Added real-time portfolio value for current balance
   - Integrated `usePortfolioValue` hook

## Impact

✅ ROI now correctly displays for users with only open positions  
✅ Current balance reflects real-time market values  
✅ Multi-leg strategies properly appear in calendar modals  
✅ No breaking changes to existing functionality  
✅ Consistent with Dashboard calculations  

## Notes

- The ROI calculation already existed and was correct; we just needed to use it instead of hardcoding 0
- Real-time portfolio value is only used for "All Assets" tab; asset-specific tabs still use their calculated values
- Calendar now properly handles both individual positions and multi-leg strategies
- All changes maintain backward compatibility


