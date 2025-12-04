import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { PerformanceMetricsService, type WinRateMetrics } from '@/infrastructure/services/performanceMetricsService';
import { queryKeys } from '@/infrastructure/api/queryKeys';
import type { AssetType } from '@/domain/types/asset.types';

/**
 * Hook to fetch and calculate analytics metrics for a specific asset type
 */
export function useAnalytics(
  userId: string,
  assetType?: AssetType,
  dateRange?: { startDate: string; endDate: string },
  options?: Omit<UseQueryOptions<WinRateMetrics, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = queryKeys.analytics.winRate(userId, assetType, dateRange);

  return useQuery<WinRateMetrics, Error>({
    queryKey,
    queryFn: () => {
      if (assetType) {
        return PerformanceMetricsService.calculateWinRateByAssetType(userId, assetType, dateRange);
      }
      return PerformanceMetricsService.calculateWinRate(userId, dateRange);
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
    ...options,
  });
}

