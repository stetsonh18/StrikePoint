import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { PerformanceMetricsService, type PortfolioHistoryData } from '@/infrastructure/services/performanceMetricsService';
import { queryKeys } from '@/infrastructure/api/queryKeys';

export type TimePeriod = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';

/**
 * Hook to fetch portfolio history for charting
 * Supports time period filters: 1D, 1W, 1M, 3M, 1Y, ALL
 */
export function usePortfolioHistory(
  userId: string,
  timePeriod: TimePeriod = '1M',
  options?: Omit<UseQueryOptions<PortfolioHistoryData[], Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = queryKeys.portfolio.history(userId, timePeriod);

  return useQuery<PortfolioHistoryData[], Error>({
    queryKey,
    queryFn: async () => {
      return PerformanceMetricsService.calculatePortfolioHistory(userId, timePeriod);
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
    ...options,
  });
}

