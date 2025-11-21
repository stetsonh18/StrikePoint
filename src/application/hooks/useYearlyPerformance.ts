import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { usePortfolioValue } from './usePortfolioValue';
import { PositionRepository } from '@/infrastructure/repositories/position.repository';
import { queryKeys } from '@/infrastructure/api/queryKeys';
import { getDateRangeForDays } from './utils/dateRange';

export interface YearlyPerformance {
  yearlyPL: number;
  yearlyPLPercent: number;
  realizedPL: number;
  unrealizedPL: number;
}

const DAYS_IN_YEAR = 365;

/**
 * Hook to calculate performance for the last 365 days (realized + unrealized, gross P&L)
 */
export function useYearlyPerformance(
  userId: string,
  options?: Omit<UseQueryOptions<YearlyPerformance, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const { portfolioValue, unrealizedPL } = usePortfolioValue(userId);
  const queryKey = queryKeys.analytics.yearlyPerformance(userId, portfolioValue, unrealizedPL);

  return useQuery<YearlyPerformance, Error>({
    queryKey,
    queryFn: async () => {
      const { start, end } = getDateRangeForDays(DAYS_IN_YEAR);

      // Get realized P&L from positions closed in last 365 days
      const realizedPositions = await PositionRepository.getRealizedPLByDateRange(userId, start, end);
      const realizedPL = realizedPositions.reduce((sum, position) => sum + Number(position.realized_pl || 0), 0);

      // Yearly P&L = realized + unrealized (gross, no fee deduction)
      const yearlyPL = realizedPL + unrealizedPL;
      const yearlyPLPercent = portfolioValue !== 0 ? (yearlyPL / Math.abs(portfolioValue)) * 100 : 0;

      return {
        yearlyPL,
        yearlyPLPercent,
        realizedPL,
        unrealizedPL,
      };
    },
    enabled: !!userId,
    staleTime: 120 * 1000, // Cache for 2 minutes
    ...options,
  });
}
