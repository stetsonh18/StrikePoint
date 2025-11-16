import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { StrategyRepository } from '@/infrastructure/repositories';
import type { StrategyFilters, Strategy } from '@/domain/types';

export function useStrategies(
  userId: string,
  filters?: StrategyFilters,
  options?: Omit<UseQueryOptions<Strategy[], Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = ['strategies', userId, filters] as const;

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
  const queryKey = ['strategies', 'open', userId] as const;

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
  options?: Omit<UseQueryOptions<any[], Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = ['strategy-summaries', userId, filters] as const;

  return useQuery({
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
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = ['strategy-statistics', userId, startDate, endDate] as const;

  return useQuery({
    queryKey,
    queryFn: () => StrategyRepository.getStatistics(userId, startDate, endDate),
    enabled: !!userId,
    ...options,
  });
}
