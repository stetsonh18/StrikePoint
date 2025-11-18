import { useQuery } from '@tanstack/react-query';
import { PerformanceMetricsService, type MonthlyPerformance } from '@/infrastructure/services/performanceMetricsService';
import type { AssetType } from '@/domain/types/asset.types';

/**
 * Hook to fetch monthly performance metrics for a specific asset type
 * If assetType is undefined, aggregates across all asset types
 */
export function useMonthlyPerformance(
  userId: string,
  assetType?: AssetType,
  months: number = 12 // Number of months to include
) {
  return useQuery<MonthlyPerformance[], Error>({
    queryKey: ['monthly-performance', userId, assetType, months],
    queryFn: () => PerformanceMetricsService.calculateMonthlyPerformance(userId, assetType, months),
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
  });
}

