import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { usePortfolioValue } from './usePortfolioValue';
import { PortfolioSnapshotRepository } from '@/infrastructure/repositories/portfolioSnapshot.repository';
import { queryKeys } from '@/infrastructure/api/queryKeys';
import { getDateRangeForDays } from './utils/dateRange';

export interface WeeklyPerformance {
  weeklyPL: number;
  weeklyPLPercent: number;
  realizedPL: number;
  unrealizedPL: number;
}

const DAYS_IN_WEEK = 7;

/**
 * Hook to calculate performance for the last 7 days using snapshot comparison.
 * Compares current portfolio value to snapshot from 7 days ago (includes fees).
 */
export function useWeeklyPerformance(
  userId: string,
  options?: Omit<UseQueryOptions<WeeklyPerformance, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const { portfolioValue, unrealizedPL } = usePortfolioValue(userId);
  const queryKey = queryKeys.analytics.weeklyPerformance(userId, portfolioValue, unrealizedPL);

  return useQuery<WeeklyPerformance, Error>({
    queryKey,
    queryFn: async () => {
      // Get snapshot from 7 days ago
      const { start } = getDateRangeForDays(DAYS_IN_WEEK);
      const weekAgoDate = new Date(start).toISOString().split('T')[0];
      const weekAgoSnapshot = await PortfolioSnapshotRepository.getByDate(userId, weekAgoDate);

      let weeklyPL: number;
      let weeklyPLPercent: number;

      if (weekAgoSnapshot) {
        // Calculate weekly P&L as change from 7 days ago snapshot to current value (includes fees)
        weeklyPL = portfolioValue - weekAgoSnapshot.portfolio_value;
        weeklyPLPercent = weekAgoSnapshot.portfolio_value !== 0
          ? (weeklyPL / Math.abs(weekAgoSnapshot.portfolio_value)) * 100
          : 0;
      } else {
        // Fallback: use current unrealized only if no snapshot exists
        weeklyPL = unrealizedPL;
        weeklyPLPercent = portfolioValue !== 0 ? (weeklyPL / Math.abs(portfolioValue)) * 100 : 0;
      }

      return {
        weeklyPL,
        weeklyPLPercent,
        realizedPL: weeklyPL, // Total change (includes fees)
        unrealizedPL: 0, // No breakdown when using snapshot comparison
      };
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
    ...options,
  });
}

