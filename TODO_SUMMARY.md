# TODO Summary

This document tracks all TODO comments and future improvements identified in the codebase.

## High Priority

### Error Tracking Integration
- **File**: `src/shared/utils/logger.ts:57`
- **Description**: Integrate with error tracking service (e.g., Sentry)
- **Impact**: Production error monitoring and debugging
- **Status**: Pending

### Market Data Integration
- **Files**: 
  - `src/shared/utils/positionTransformers.ts:29,98,104,144,252`
- **Description**: Fetch current price from market data instead of using `average_opening_price`
- **Impact**: Accurate real-time position values
- **Status**: Pending

### Strategy Risk/Profit Calculations
- **File**: `src/infrastructure/services/strategyDetectionService.ts:543-544`
- **Description**: Calculate `max_risk` and `max_profit` based on strategy type
- **Impact**: Better risk management and strategy analysis
- **Status**: Pending

## Medium Priority

### CSV Export Feature
- **File**: `src/presentation/pages/CashTransactions.tsx:177`
- **Description**: Implement CSV export functionality for cash transactions
- **Impact**: User convenience for data analysis
- **Status**: Pending

## Notes

- All console.log/error statements have been replaced with centralized logger utility
- Logger utility is ready for production error tracking integration
- Market data fetching is partially implemented but needs completion for all position types

