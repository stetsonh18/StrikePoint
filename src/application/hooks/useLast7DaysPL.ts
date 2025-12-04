import { useQuery } from '@tanstack/react-query';
import { PerformanceMetricsService } from '@/infrastructure/services/performanceMetricsService';
import type { AssetType } from '@/domain/types/asset.types';

export interface Last7DaysPLData {
  date: string;
  pl: number;
}

/**
 * Hook to fetch last 7 days P&L data
 */
export function useLast7DaysPL(userId: string, assetType?: AssetType, dateRange?: { startDate: string; endDate: string }) {
  return useQuery<Last7DaysPLData[], Error>({
    queryKey: ['last-7-days-pl', userId, assetType, dateRange],
    queryFn: () => PerformanceMetricsService.calculateLast7DaysPL(userId, assetType, dateRange),
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
  });
}

