import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { usePortfolioValue } from './usePortfolioValue';
import { PortfolioSnapshotRepository } from '@/infrastructure/repositories/portfolioSnapshot.repository';
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
 * Hook to calculate performance for the last 30 days using snapshot comparison.
 * Compares current portfolio value to snapshot from 30 days ago (includes fees).
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
      // Get snapshot from 30 days ago
      const { start } = getDateRangeForDays(DAYS_IN_MONTH);
      const monthAgoDate = new Date(start).toISOString().split('T')[0];
      const monthAgoSnapshot = await PortfolioSnapshotRepository.getByDate(userId, monthAgoDate);

      let monthlyPL: number;
      let monthlyPLPercent: number;

      if (monthAgoSnapshot) {
        // Calculate monthly P&L as change from 30 days ago snapshot to current value (includes fees)
        monthlyPL = portfolioValue - monthAgoSnapshot.portfolio_value;
        monthlyPLPercent = monthAgoSnapshot.portfolio_value !== 0
          ? (monthlyPL / Math.abs(monthAgoSnapshot.portfolio_value)) * 100
          : 0;
      } else {
        // Fallback: use current unrealized only if no snapshot exists
        monthlyPL = unrealizedPL;
        monthlyPLPercent = portfolioValue !== 0 ? (monthlyPL / Math.abs(portfolioValue)) * 100 : 0;
      }

      return {
        monthlyPL,
        monthlyPLPercent,
        realizedPL: monthlyPL, // Total change (includes fees)
        unrealizedPL: 0, // No breakdown when using snapshot comparison
      };
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
    ...options,
  });
}

