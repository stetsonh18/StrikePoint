import { useQuery } from '@tanstack/react-query';
import { PerformanceMetricsService } from '@/infrastructure/services/performanceMetricsService';
import type { AssetType } from '@/domain/types/asset.types';

export interface DailyPerformanceCalendarData {
  date: string;
  pl: number;
  trades: number;
}

/**
 * Hook to fetch daily performance calendar data
 * Returns all data so calendar can navigate through months
 */
export function useDailyPerformanceCalendar(
  userId: string,
  assetType?: AssetType,
  dateRange?: { startDate: string; endDate: string }
) {
  return useQuery<DailyPerformanceCalendarData[], Error>({
    queryKey: ['daily-performance-calendar', userId, assetType, dateRange],
    queryFn: () => PerformanceMetricsService.calculateDailyPerformanceCalendar(userId, assetType, dateRange),
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
  });
}

