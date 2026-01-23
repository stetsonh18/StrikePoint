import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { usePortfolioValue } from './usePortfolioValue';
import { getRealizedPLForDateRange } from './utils/realizedPL';
import { queryKeys } from '@/infrastructure/api/queryKeys';
import { getDateRangeForDays } from './utils/dateRange';

export interface MonthlyPerformance {
  monthlyPL: number;
  monthlyPLPercent: number;
  realizedPL: number;
  unrealizedPL: number;
}

const DAYS_IN_MONTH = 30;

/**
 * Hook to calculate performance for the last 30 days (realized + unrealized, gross P&L)
 */
export function useMonthlyPerformanceDashboard(
  userId: string,
  options?: Omit<UseQueryOptions<MonthlyPerformance, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const { portfolioValue, unrealizedPL } = usePortfolioValue(userId);
  const queryKey = queryKeys.analytics.monthlyDashboard(userId, portfolioValue, unrealizedPL);

  return useQuery<MonthlyPerformance, Error>({
    queryKey,
    queryFn: async () => {
      const { start, end } = getDateRangeForDays(DAYS_IN_MONTH);

      const realizedPL = await getRealizedPLForDateRange(userId, start, end);

      // Monthly P&L = realized + unrealized (gross, no fee deduction)
      const monthlyPL = realizedPL + unrealizedPL;
      const monthlyPLPercent = portfolioValue !== 0 ? (monthlyPL / Math.abs(portfolioValue)) * 100 : 0;

      return {
        monthlyPL,
        monthlyPLPercent,
        realizedPL,
        unrealizedPL,
      };
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
    ...options,
  });
}

