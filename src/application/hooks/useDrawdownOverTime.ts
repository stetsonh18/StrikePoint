import { useQuery } from '@tanstack/react-query';
import { PerformanceMetricsService } from '@/infrastructure/services/performanceMetricsService';
import type { AssetType } from '@/domain/types/asset.types';

export interface DrawdownOverTimeData {
  date: string;
  drawdown: number;
  peak: number;
  current: number;
}

/**
 * Hook to fetch drawdown over time data
 */
export function useDrawdownOverTime(
  userId: string,
  assetType?: AssetType,
  days?: number
) {
  return useQuery<DrawdownOverTimeData[], Error>({
    queryKey: ['drawdown-over-time', userId, assetType, days],
    queryFn: () => PerformanceMetricsService.calculateDrawdownOverTime(userId, assetType, days),
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
  });
}

