import { useQuery } from '@tanstack/react-query';
import { PerformanceMetricsService } from '@/infrastructure/services/performanceMetricsService';

export interface EntryTimePerformanceData {
  timeBucket: string;
  pl: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

/**
 * Hook to fetch entry time performance data
 */
export function useEntryTimePerformance(userId: string, assetType: 'option' | 'futures', dateRange?: { startDate: string; endDate: string }) {
  return useQuery<EntryTimePerformanceData[], Error>({
    queryKey: ['entry-time-performance', userId, assetType, dateRange],
    queryFn: () => PerformanceMetricsService.calculateEntryTimePerformance(userId, assetType, dateRange),
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
  });
}

export interface EntryTimeByStrategyData {
  [strategyType: string]: EntryTimePerformanceData[];
}

/**
 * Hook to fetch entry time performance by strategy (for Options)
 */
export function useEntryTimeByStrategy(userId: string, dateRange?: { startDate: string; endDate: string }) {
  return useQuery<EntryTimeByStrategyData, Error>({
    queryKey: ['entry-time-by-strategy', userId, dateRange],
    queryFn: () => PerformanceMetricsService.calculateEntryTimeByStrategy(userId, dateRange),
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
  });
}

