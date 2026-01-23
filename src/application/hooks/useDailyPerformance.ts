import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { usePortfolioValue } from './usePortfolioValue';
import { PositionRepository } from '@/infrastructure/repositories/position.repository';
import { StrategyRepository } from '@/infrastructure/repositories/strategy.repository';
import { TransactionRepository } from '@/infrastructure/repositories/transaction.repository';
import { queryKeys } from '@/infrastructure/api/queryKeys';
import { getLocalDateRangeForDays, getLocalDateString } from './utils/dateRange';
import { getAdjustedPositionRealizedPL, getRealizedPLForDateRange } from './utils/realizedPL';

export interface DailyPerformance {
  dailyPL: number;
  dailyPLPercent: number;
  realizedPL: number;
  unrealizedPL: number;
}

const DAYS_IN_DAY = 1;

/**
 * Hook to calculate today's performance (realized + unrealized, gross P&L).
 * Matches the calculation method used in Dashboard cards and Analytics pages.
 */
export function useDailyPerformance(
  userId: string,
  options?: Omit<UseQueryOptions<DailyPerformance, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const { portfolioValue, unrealizedPL } = usePortfolioValue(userId);
  const queryKey = queryKeys.analytics.dailyPerformance(userId, portfolioValue, unrealizedPL);

  return useQuery<DailyPerformance, Error>({
    queryKey,
    queryFn: async () => {
      const { start, end } = getLocalDateRangeForDays(DAYS_IN_DAY);
      const todayDateStr = getLocalDateString(); // YYYY-MM-DD local date

      let realizedPL = 0;
      
      try {
        realizedPL = await getRealizedPLForDateRange(userId, start, end);
      } catch (error) {
        console.error('Error getting realized P&L from date range:', error);
      }

      // Method 2: Fallback - Get positions and strategies that were updated today and closed today
      // This catches cases where closed_at might have timezone issues or wasn't set correctly
      if (realizedPL === 0) {
        try {
          // Get positions updated today
          const positionsUpdatedToday = await PositionRepository.getByActivityDate(userId, todayDateStr);
          const closedToday = positionsUpdatedToday.filter(p => {
            const isClosed = ['closed', 'expired', 'assigned', 'exercised'].includes(p.status);
            if (!isClosed) return false;
            
            // Check if closed_at matches today's date (handle both date strings and timestamps)
            if (p.closed_at) {
              const closedAtDateStr = new Date(p.closed_at).toISOString().split('T')[0];
              return closedAtDateStr === todayDateStr;
            }
            return false;
          });
          
          const closedPositions = closedToday.filter((position) => position.current_quantity === 0);
          const strategyPositionPLMap = new Map<string, number>();
          closedPositions.forEach((position) => {
            if (!position.strategy_id) return;
            const adjustedPL = getAdjustedPositionRealizedPL(position);
            strategyPositionPLMap.set(
              position.strategy_id,
              (strategyPositionPLMap.get(position.strategy_id) ?? 0) + adjustedPL
            );
          });

          const allStrategies = await StrategyRepository.getAll(userId);
          const strategiesClosedToday = allStrategies.filter((strategy) => {
            const isClosed = ['closed', 'expired', 'assigned', 'exercised'].includes(strategy.status);
            if (!isClosed || !strategy.closed_at) return false;
            const closedAtDateStr = new Date(strategy.closed_at).toISOString().split('T')[0];
            return closedAtDateStr === todayDateStr;
          });

          const excludedStrategyIds = new Set<string>();
          let strategyPL = 0;
          strategiesClosedToday.forEach((strategy) => {
            const strategyRealizedPL = Number(strategy.realized_pl || 0);
            if (strategyRealizedPL !== 0) {
              strategyPL += strategyRealizedPL;
              excludedStrategyIds.add(strategy.id);
            }
          });

          const positionPL = closedPositions
            .filter((position) => !position.strategy_id || !excludedStrategyIds.has(position.strategy_id))
            .reduce((sum, position) => sum + getAdjustedPositionRealizedPL(position), 0);

          realizedPL = positionPL + strategyPL;
        } catch (error) {
          console.error('Error getting realized P&L from activity date:', error);
        }
      }

      // Method 3: Final fallback - Calculate from closing transactions today
      // This uses transaction dates which are more reliable
      if (realizedPL === 0) {
        try {
          // Get all closing transactions from today
          const closingCodes = ['Sell', 'SELL', 'STOCK_SELL', 'STC', 'BTC'];
          const todayTransactions = await TransactionRepository.getAll(userId, {
            start_date: todayDateStr,
            end_date: todayDateStr,
          });

          const closingTxs = todayTransactions.filter(tx => 
            closingCodes.includes(tx.transaction_code || '') &&
            tx.position_id // Must be linked to a position (means it closed one)
          );

          // Get unique position IDs to avoid double counting
          const positionIds = new Set(closingTxs.map(tx => tx.position_id).filter(Boolean) as string[]);
          
          // For each position closed today, get the realized P&L
          // If position was fully closed today, use its total realized_pl
          for (const positionId of positionIds) {
            const position = await PositionRepository.getById(positionId);
            if (position && position.status !== 'open' && position.closed_at) {
              const closedAtDateStr = new Date(position.closed_at).toISOString().split('T')[0];
              if (closedAtDateStr === todayDateStr && position.current_quantity === 0) {
                // Position was fully closed today, use its adjusted realized P&L
                realizedPL += getAdjustedPositionRealizedPL(position);
              }
            }
          }
        } catch (error) {
          console.error('Error calculating realized P&L from transactions:', error);
        }
      }

      // Daily P&L = realized + unrealized (gross, no fee deduction)
      const dailyPL = realizedPL + unrealizedPL;
      const dailyPLPercent = portfolioValue !== 0 ? (dailyPL / Math.abs(portfolioValue)) * 100 : 0;

      return {
        dailyPL,
        dailyPLPercent,
        realizedPL,
        unrealizedPL,
      };
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // Cache for 30 seconds
    ...options,
  });
}

