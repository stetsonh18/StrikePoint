import { useQuery } from '@tanstack/react-query';
import { PerformanceMetricsService } from '@/infrastructure/services/performanceMetricsService';

export interface StrategyPerformanceData {
  strategyType: string;
  pl: number;
  winRate: number;
  profitOnRisk: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

/**
 * Hook to fetch strategy performance data
 */
export function useStrategyPerformance(userId: string) {
  return useQuery<StrategyPerformanceData[], Error>({
    queryKey: ['strategy-performance', userId],
    queryFn: () => PerformanceMetricsService.calculateStrategyPerformance(userId),
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
  });
}

