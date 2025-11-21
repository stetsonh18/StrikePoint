import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { usePortfolioValue } from './usePortfolioValue';
import { PositionRepository } from '@/infrastructure/repositories/position.repository';
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
      const { start, end } = getDateRangeForDays(DAYS_IN_DAY);

      // Get realized P&L from positions closed today
      const realizedPositions = await PositionRepository.getRealizedPLByDateRange(userId, start, end);
      const realizedPL = realizedPositions.reduce((sum, position) => sum + Number(position.realized_pl || 0), 0);

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

