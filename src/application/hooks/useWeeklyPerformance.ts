import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { usePortfolioValue } from './usePortfolioValue';
import { PortfolioSnapshotRepository } from '@/infrastructure/repositories/portfolioSnapshot.repository';
import { queryKeys } from '@/infrastructure/api/queryKeys';

export interface WeeklyPerformance {
  weeklyPL: number;
  weeklyPLPercent: number;
  currentValue: number;
  weekAgoValue: number | null;
}

/**
 * Hook to compare current portfolio value vs 7 days ago snapshot
 */
export function useWeeklyPerformance(
  userId: string,
  options?: Omit<UseQueryOptions<WeeklyPerformance, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const { portfolioValue } = usePortfolioValue(userId);
  const queryKey = queryKeys.analytics.weeklyPerformance(userId, portfolioValue);

  return useQuery<WeeklyPerformance, Error>({
    queryKey,
    queryFn: async () => {
      const currentValue = portfolioValue;
      
      // Get snapshot from 7 days ago
      const weekAgoSnapshot = await PortfolioSnapshotRepository.getFromDaysAgo(userId, 7);
      
      if (!weekAgoSnapshot) {
        return {
          weeklyPL: 0,
          weeklyPLPercent: 0,
          currentValue,
          weekAgoValue: null,
        };
      }

      const weekAgoValue = weekAgoSnapshot.portfolio_value;
      const weeklyPL = currentValue - weekAgoValue;
      const weeklyPLPercent = weekAgoValue !== 0
        ? ((weeklyPL / Math.abs(weekAgoValue)) * 100)
        : 0;

      return {
        weeklyPL,
        weeklyPLPercent,
        currentValue,
        weekAgoValue,
      };
    },
    enabled: !!userId && portfolioValue !== undefined,
    staleTime: 60 * 1000, // Cache for 1 minute
    ...options,
  });
}

