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
export function useCryptoCoinPerformance(userId: string) {
  return useQuery<CryptoCoinPerformanceData[], Error>({
    queryKey: ['crypto-coin-performance', userId],
    queryFn: () => PerformanceMetricsService.calculateCryptoCoinPerformance(userId),
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
  });
}

