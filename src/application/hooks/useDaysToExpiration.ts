import { useQuery } from '@tanstack/react-query';
import { PerformanceMetricsService } from '@/infrastructure/services/performanceMetricsService';

export interface DaysToExpirationData {
  dteBucket: string;
  pl: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

/**
 * Hook to fetch options performance by days to expiration
 */
export function useDaysToExpiration(userId: string, dateRange?: { startDate: string; endDate: string }) {
  return useQuery<DaysToExpirationData[], Error>({
    queryKey: ['days-to-expiration', userId, dateRange],
    queryFn: () => PerformanceMetricsService.calculateDaysToExpiration(userId, dateRange),
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
  });
}

