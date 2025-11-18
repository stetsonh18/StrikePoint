import { useQuery } from '@tanstack/react-query';
import { PerformanceMetricsService } from '@/infrastructure/services/performanceMetricsService';
import type { AssetType } from '@/domain/types/asset.types';

export interface DayOfWeekPerformance {
  dayOfWeek: string;
  pl: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

/**
 * Hook to fetch P&L by day of week data
 */
export function useDayOfWeekPerformance(userId: string, assetType?: AssetType) {
  return useQuery<DayOfWeekPerformance[], Error>({
    queryKey: ['day-of-week-performance', userId, assetType],
    queryFn: () => PerformanceMetricsService.calculateDayOfWeekPerformance(userId, assetType),
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
  });
}

