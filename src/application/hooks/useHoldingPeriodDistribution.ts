import { useQuery } from '@tanstack/react-query';
import { PerformanceMetricsService } from '@/infrastructure/services/performanceMetricsService';

export interface HoldingPeriodDistributionData {
  period: string;
  pl: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

/**
 * Hook to fetch holding period distribution data
 */
export function useHoldingPeriodDistribution(userId: string, assetType: 'stock' | 'crypto') {
  return useQuery<HoldingPeriodDistributionData[], Error>({
    queryKey: ['holding-period-distribution', userId, assetType],
    queryFn: () => PerformanceMetricsService.calculateHoldingPeriodDistribution(userId, assetType),
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
  });
}

