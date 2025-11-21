import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { usePortfolioValue } from './usePortfolioValue';
import { PositionRepository } from '@/infrastructure/repositories/position.repository';
import { PortfolioSnapshotRepository } from '@/infrastructure/repositories/portfolioSnapshot.repository';
import { queryKeys } from '@/infrastructure/api/queryKeys';
import { getDateRangeForDays } from './utils/dateRange';

export interface DailyPerformance {
  dailyPL: number;
  dailyPLPercent: number;
  realizedPL: number;
  unrealizedPL: number;
}

const DAYS_IN_DAY = 1;

/**
 * Hook to calculate today's performance using real-time portfolio value vs yesterday's snapshot.
 * This correctly accounts for:
 * - Realized P&L from positions closed today
 * - Changes in unrealized P&L from price movements on open positions
 * - Uses real-time current portfolio value compared to yesterday's snapshot baseline
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
      // Get today's realized P&L (from positions closed today)
      const { start, end } = getDateRangeForDays(DAYS_IN_DAY);
      const realizedPositions = await PositionRepository.getRealizedPLByDateRange(userId, start, end);
      const realizedPL = realizedPositions.reduce((sum, position) => sum + Number(position.realized_pl || 0), 0);

      // Get yesterday's portfolio snapshot as baseline
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDate = yesterday.toISOString().split('T')[0];
      const yesterdaySnapshot = await PortfolioSnapshotRepository.getByDate(userId, yesterdayDate);

      let dailyPL: number;
      let dailyPLPercent: number;

      if (yesterdaySnapshot) {
        // Calculate daily P&L as change from yesterday's snapshot to current real-time value
        // This captures: realized P&L + change in unrealized P&L + deposits/withdrawals
        dailyPL = portfolioValue - yesterdaySnapshot.portfolio_value;
        dailyPLPercent = yesterdaySnapshot.portfolio_value !== 0
          ? (dailyPL / Math.abs(yesterdaySnapshot.portfolio_value)) * 100
          : 0;
      } else {
        // Fallback: If no yesterday snapshot exists, use current realized + unrealized
        // This won't be accurate but ensures dashboard shows something
        dailyPL = realizedPL + unrealizedPL;
        dailyPLPercent = portfolioValue !== 0 ? (dailyPL / Math.abs(portfolioValue)) * 100 : 0;
      }

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

