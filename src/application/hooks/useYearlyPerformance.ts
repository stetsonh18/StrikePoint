import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { usePortfolioValue } from './usePortfolioValue';
import { getRealizedPLForDateRange } from './utils/realizedPL';
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

      const realizedPL = await getRealizedPLForDateRange(userId, start, end);

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
