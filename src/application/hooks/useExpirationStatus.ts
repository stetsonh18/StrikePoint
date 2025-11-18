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
export function useExpirationStatus(userId: string) {
  return useQuery<ExpirationStatusData, Error>({
    queryKey: ['expiration-status', userId],
    queryFn: () => PerformanceMetricsService.calculateExpirationStatus(userId),
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
  });
}

