import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { usePortfolioValue } from './usePortfolioValue';
import { PortfolioSnapshotRepository } from '@/infrastructure/repositories/portfolioSnapshot.repository';
import { queryKeys } from '@/infrastructure/api/queryKeys';

export interface MonthlyPerformance {
  monthlyPL: number;
  monthlyPLPercent: number;
  currentValue: number;
  monthAgoValue: number | null;
}

/**
 * Hook to compare current portfolio value vs 30 days ago snapshot
 */
export function useMonthlyPerformanceDashboard(
  userId: string,
  options?: Omit<UseQueryOptions<MonthlyPerformance, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const { portfolioValue } = usePortfolioValue(userId);
  const queryKey = queryKeys.analytics.monthlyDashboard(userId, portfolioValue);

  return useQuery<MonthlyPerformance, Error>({
    queryKey,
    queryFn: async () => {
      const currentValue = portfolioValue;
      
      // Get snapshot from 30 days ago
      const monthAgoSnapshot = await PortfolioSnapshotRepository.getFromDaysAgo(userId, 30);
      
      if (!monthAgoSnapshot) {
        return {
          monthlyPL: 0,
          monthlyPLPercent: 0,
          currentValue,
          monthAgoValue: null,
        };
      }

      const monthAgoValue = monthAgoSnapshot.portfolio_value;
      const monthlyPL = currentValue - monthAgoValue;
      const monthlyPLPercent = monthAgoValue !== 0
        ? ((monthlyPL / Math.abs(monthAgoValue)) * 100)
        : 0;

      return {
        monthlyPL,
        monthlyPLPercent,
        currentValue,
        monthAgoValue,
      };
    },
    enabled: !!userId && portfolioValue !== undefined,
    staleTime: 60 * 1000, // Cache for 1 minute
    ...options,
  });
}

