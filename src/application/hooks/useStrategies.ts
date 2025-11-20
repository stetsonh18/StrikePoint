import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { StrategyRepository } from '@/infrastructure/repositories';
import { queryKeys } from '@/infrastructure/api/queryKeys';
import type { StrategyFilters, Strategy } from '@/domain/types';

type StrategySummaryResult = Awaited<ReturnType<typeof StrategyRepository.getSummaries>>;
type StrategyStatisticsResult = Awaited<ReturnType<typeof StrategyRepository.getStatistics>>;

export function useStrategies(
  userId: string,
  filters?: StrategyFilters,
  options?: Omit<UseQueryOptions<Strategy[], Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = queryKeys.strategies.list(userId, filters);

  return useQuery<Strategy[], Error>({
    queryKey,
    queryFn: () => StrategyRepository.getAll(userId, filters),
    enabled: !!userId,
    ...options,
  });
}

export function useOpenStrategies(
  userId: string,
  options?: Omit<UseQueryOptions<Strategy[], Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = queryKeys.strategies.open(userId);

  return useQuery<Strategy[], Error>({
    queryKey,
    queryFn: () => StrategyRepository.getOpen(userId),
    enabled: !!userId,
    ...options,
  });
}

export function useStrategySummaries(
  userId: string,
  filters?: StrategyFilters,
  options?: Omit<UseQueryOptions<StrategySummaryResult, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = ['strategy-summaries', userId, filters] as const;

  return useQuery<StrategySummaryResult, Error>({
    queryKey,
    queryFn: () => StrategyRepository.getSummaries(userId, filters),
    enabled: !!userId,
    ...options,
  });
}

export function useStrategyStatistics(
  userId: string,
  startDate?: string,
  endDate?: string,
  options?: Omit<UseQueryOptions<StrategyStatisticsResult, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = ['strategy-statistics', userId, startDate, endDate] as const;

  return useQuery<StrategyStatisticsResult, Error>({
    queryKey,
    queryFn: () => StrategyRepository.getStatistics(userId, startDate, endDate),
    enabled: !!userId,
    ...options,
  });
}
