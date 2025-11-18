import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { PerformanceMetricsService, type WinRateMetrics } from '@/infrastructure/services/performanceMetricsService';
import { queryKeys } from '@/infrastructure/api/queryKeys';

/**
 * Hook to fetch and calculate win rate metrics from closed positions
 */
export function useWinRateMetrics(
  userId: string,
  options?: Omit<UseQueryOptions<WinRateMetrics, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = queryKeys.analytics.winRate(userId);

  return useQuery<WinRateMetrics, Error>({
    queryKey,
    queryFn: () => PerformanceMetricsService.calculateWinRate(userId),
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
    ...options,
  });
}

