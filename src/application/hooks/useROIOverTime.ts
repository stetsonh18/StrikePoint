import { useQuery } from '@tanstack/react-query';
import { PerformanceMetricsService } from '@/infrastructure/services/performanceMetricsService';
import type { AssetType } from '@/domain/types/asset.types';

export interface ROIOverTimeData {
  date: string;
  roi: number;
  portfolioValue: number;
  netCashFlow: number;
}

/**
 * Hook to fetch ROI % over time data
 */
export function useROIOverTime(
  userId: string,
  assetType?: AssetType,
  days?: number
) {
  return useQuery<ROIOverTimeData[], Error>({
    queryKey: ['roi-over-time', userId, assetType, days],
    queryFn: () => PerformanceMetricsService.calculateROIOverTime(userId, assetType, days),
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
  });
}

