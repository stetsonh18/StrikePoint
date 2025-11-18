import { useQuery } from '@tanstack/react-query';
import { PerformanceMetricsService } from '@/infrastructure/services/performanceMetricsService';
import type { AssetType } from '@/domain/types/asset.types';

export interface PLOverTimeData {
  date: string;
  cumulativePL: number;
  realizedPL: number;
  unrealizedPL: number;
}

/**
 * Hook to fetch P&L over time data
 */
export function usePLOverTime(
  userId: string,
  assetType?: AssetType,
  days?: number
) {
  return useQuery<PLOverTimeData[], Error>({
    queryKey: ['pl-over-time', userId, assetType, days],
    queryFn: () => PerformanceMetricsService.calculatePLOverTime(userId, assetType, days),
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
  });
}

