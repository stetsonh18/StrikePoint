# ROI Calculation Fix Summary

## Problems Fixed

### 1. Asset-Specific ROI (Options, Stocks, Crypto, Futures)
**Problem**: ROI dropped sharply when positions were closed because realized P&L wasn't included.

**Before:**
```typescript
investmentBase = total cost basis of ALL positions (open + closed)
portfolioValue = market value of OPEN positions only
ROI = (portfolioValue - investmentBase) / investmentBase * 100
```

When you closed a profitable position:
- `investmentBase` stayed high (included closed position's cost)
- `portfolioValue` dropped (only open positions)
- ROI incorrectly plummeted ❌

**After:**
```typescript
totalCostBasis = cost basis of ALL positions (open + closed)
investmentBase = cost basis of OPEN positions only
totalRealizedPL = realized P&L from all CLOSED positions + strategies
unrealizedPL = portfolioValue - investmentBase
ROI = (totalRealizedPL + unrealizedPL) / totalCostBasis * 100
```

Now when you close a profitable position:
- `totalRealizedPL` increases by the profit
- `unrealizedPL` decreases (position no longer open)
- Total P&L stays the same, ROI correct ✅

### 2. Overall Portfolio ROI
**Problem**: Withdrawals made ROI appear negative even with profits.

**Example:**
- Deposit $10,000
- Make $1,000 profit → Portfolio = $11,000
- Withdraw $5,000 → Portfolio = $6,000
- Old ROI = ($6,000 - $10,000) / $10,000 = **-40%** ❌

**Before:**
```typescript
investmentBase = total deposits
ROI = (portfolioValue - deposits) / deposits * 100
// Withdrawals incorrectly reduced ROI!
```

**After:**
```typescript
investmentBase = total deposits
netCashFlow = deposits - withdrawals (from snapshot)
ROI = (portfolioValue - netCashFlow) / deposits * 100
    = (portfolioValue + withdrawals - deposits) / deposits * 100
```

**Example (corrected):**
- Portfolio = $6,000
- Net Cash Flow = $10,000 - $5,000 = $5,000
- ROI = ($6,000 - $5,000) / $10,000 = **+10%** ✅

## Code Changes

### File: `src/infrastructure/services/performanceMetricsService.ts`

**Lines 1665-1736**: Fixed investment base and realized P&L calculation
- Asset-specific: Calculate `totalCostBasis`, `investmentBase`, and `totalRealizedPL` separately
- Overall portfolio: Use total deposits as base, track withdrawals

**Lines 1755-1781**: Fixed ROI formula
- Asset-specific: `ROI = (totalRealizedPL + unrealizedPL) / totalCostBasis * 100`
- Overall portfolio: `ROI = (portfolioValue - netCashFlow) / deposits * 100`

## Impact

### What's Fixed
- ✅ ROI chart no longer drops when you close profitable positions
- ✅ ROI correctly accounts for both realized and unrealized P&L
- ✅ Withdrawals don't incorrectly reduce your ROI
- ✅ Works for all asset types (stocks, options, crypto, futures)
- ✅ Works for both individual positions and multi-leg strategies

### Before & After Examples

**Scenario 1: Close a profitable option**
- Before: ROI drops from +20% to -10% ❌
- After: ROI stays at +20% ✅

**Scenario 2: Withdraw profits**
- Deposit $10k, profit $2k, withdraw $5k
- Before: ROI = -30% ❌
- After: ROI = +20% ✅

**Scenario 3: Multiple asset types**
- Options ROI: Includes all closed option strategies
- Stocks ROI: Includes all closed stock positions
- Overall ROI: Accounts for deposits/withdrawals correctly

## How ROI is Calculated Now

### For Specific Asset Types (Options, Stocks, etc.)
```
Total P&L = Realized P&L (from closed) + Unrealized P&L (from open)
ROI = Total P&L / Total Cost Basis * 100

Where:
- Realized P&L = sum of realized_pl from closed positions + closed strategies
- Unrealized P&L = current market value - cost basis of open positions
- Total Cost Basis = sum of cost basis from all positions (open + closed)
```

### For Overall Portfolio
```
ROI = (Portfolio Value - Net Cash Flow) / Total Deposits * 100
    = (Portfolio Value + Withdrawals - Deposits) / Deposits * 100

Where:
- Portfolio Value = current total portfolio value
- Net Cash Flow = deposits - withdrawals (from snapshot)
- Total Deposits = sum of all deposit transactions
```

## Testing

To verify the fix works:
1. Check your Analytics page ROI chart
2. Verify the ROI percentages make sense
3. Close a profitable position and confirm ROI doesn't drop
4. Check that your overall ROI accounts for any withdrawals you've made

---

**Date Fixed**: January 6, 2026
**Related Issues**:
- Multi-leg strategy auto-update (STRATEGY_AUTO_UPDATE.md)
- Timezone fix for closed_at timestamps
