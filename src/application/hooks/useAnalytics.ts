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
  options?: Omit<UseQueryOptions<WinRateMetrics, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = queryKeys.analytics.winRate(userId, assetType);

  return useQuery<WinRateMetrics, Error>({
    queryKey,
    queryFn: () => {
      if (assetType) {
        return PerformanceMetricsService.calculateWinRateByAssetType(userId, assetType);
      }
      return PerformanceMetricsService.calculateWinRate(userId);
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
    ...options,
  });
}

