import { useQuery } from '@tanstack/react-query';
import { PerformanceMetricsService } from '@/infrastructure/services/performanceMetricsService';
import type { Position } from '@/domain/types';
import type { AssetType } from '@/domain/types/asset.types';

/**
 * Hook to fetch positions closed on a specific date
 */
export function usePositionsByDate(
  userId: string,
  date: string,
  assetType?: AssetType,
  enabled: boolean = true
) {
  return useQuery<Position[], Error>({
    queryKey: ['positions-by-date', userId, date, assetType],
    queryFn: () => PerformanceMetricsService.getPositionsByClosedDate(userId, date, assetType),
    enabled: enabled && !!userId && !!date,
    staleTime: 60 * 1000, // Cache for 1 minute
  });
}

