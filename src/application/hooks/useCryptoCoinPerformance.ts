import { useQuery } from '@tanstack/react-query';
import { PerformanceMetricsService } from '@/infrastructure/services/performanceMetricsService';

export interface CryptoCoinPerformanceData {
  coin: string;
  pl: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

/**
 * Hook to fetch crypto coin performance data
 */
export function useCryptoCoinPerformance(userId: string, dateRange?: { startDate: string; endDate: string }) {
  return useQuery<CryptoCoinPerformanceData[], Error>({
    queryKey: ['crypto-coin-performance', userId, dateRange],
    queryFn: () => PerformanceMetricsService.calculateCryptoCoinPerformance(userId, dateRange),
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
  });
}

