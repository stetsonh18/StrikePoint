import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { usePortfolioValue } from './usePortfolioValue';
import { PortfolioSnapshotRepository } from '@/infrastructure/repositories/portfolioSnapshot.repository';
import { queryKeys } from '@/infrastructure/api/queryKeys';

export interface DailyPerformance {
  dailyPL: number;
  dailyPLPercent: number;
  todayValue: number;
  yesterdayValue: number | null;
}

/**
 * Hook to compare today's portfolio value vs yesterday's snapshot
 */
export function useDailyPerformance(
  userId: string,
  options?: Omit<UseQueryOptions<DailyPerformance, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const { portfolioValue } = usePortfolioValue(userId);
  const queryKey = queryKeys.analytics.dailyPerformance(userId, portfolioValue);

  return useQuery<DailyPerformance, Error>({
    queryKey,
    queryFn: async () => {
      const todayValue = portfolioValue;
      
      // Get yesterday's snapshot
      const yesterdaySnapshot = await PortfolioSnapshotRepository.getFromDaysAgo(userId, 1);
      
      if (!yesterdaySnapshot) {
        return {
          dailyPL: 0,
          dailyPLPercent: 0,
          todayValue,
          yesterdayValue: null,
        };
      }

      const yesterdayValue = yesterdaySnapshot.portfolio_value;
      const dailyPL = todayValue - yesterdayValue;
      const dailyPLPercent = yesterdayValue !== 0
        ? ((dailyPL / Math.abs(yesterdayValue)) * 100)
        : 0;

      return {
        dailyPL,
        dailyPLPercent,
        todayValue,
        yesterdayValue,
      };
    },
    enabled: !!userId && portfolioValue !== undefined,
    staleTime: 30 * 1000, // Cache for 30 seconds
    ...options,
  });
}

