import { useQuery } from '@tanstack/react-query';
import { PerformanceMetricsService } from '@/infrastructure/services/performanceMetricsService';

export interface ExpirationStatusData {
  expired: {
    pl: number;
    winRate: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
  };
  closed: {
    pl: number;
    winRate: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
  };
}

/**
 * Hook to fetch options expiration status data
 */
export function useExpirationStatus(userId: string, dateRange?: { startDate: string; endDate: string }) {
  return useQuery<ExpirationStatusData, Error>({
    queryKey: ['expiration-status', userId, dateRange],
    queryFn: () => PerformanceMetricsService.calculateExpirationStatus(userId, dateRange),
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
  });
}

