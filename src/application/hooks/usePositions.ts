import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { PositionRepository } from '@/infrastructure/repositories';
import { useToast } from '@/shared/hooks/useToast';
import { getUserFriendlyErrorMessage } from '@/shared/utils/errorHandler';
import { logger } from '@/shared/utils/logger';
import { queryKeys } from '@/infrastructure/api/queryKeys';
import type { PositionFilters, Position, PositionUpdate } from '@/domain/types';

export function usePositions(
  userId: string,
  filters?: PositionFilters,
  options?: Omit<UseQueryOptions<Position[], Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = queryKeys.positions.list(userId, filters);

  return useQuery<Position[], Error>({
    queryKey,
    queryFn: () => PositionRepository.getAll(userId, filters),
    enabled: !!userId,
    ...options,
  });
}

export function useOpenPositions(
  userId: string,
  options?: Omit<UseQueryOptions<Position[], Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = queryKeys.positions.open(userId);

  return useQuery<Position[], Error>({
    queryKey,
    queryFn: () => PositionRepository.getOpenPositions(userId),
    enabled: !!userId,
    ...options,
  });
}

export function usePositionStatistics(
  userId: string,
  startDate?: string,
  endDate?: string,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = queryKeys.positions.statistics(userId, startDate, endDate);

  return useQuery({
    queryKey,
    queryFn: () => PositionRepository.getStatistics(userId, startDate, endDate),
    enabled: !!userId,
    ...options,
  });
}

export function useExpiringSoon(
  userId: string,
  daysAhead: number = 7,
  options?: Omit<UseQueryOptions<Position[], Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = queryKeys.positions.expiring(userId, daysAhead);

  return useQuery<Position[], Error>({
    queryKey,
    queryFn: () => PositionRepository.getExpiringSoon(userId, daysAhead),
    enabled: !!userId,
    ...options,
  });
}

/**
 * Mutation hook for updating a position
 */
export function useUpdatePosition() {
  const queryClient = useQueryClient();

  return useMutation<Position, Error, { id: string; updates: PositionUpdate }>({
    mutationFn: ({ id, updates }: { id: string; updates: PositionUpdate }) =>
      PositionRepository.update(id, updates),
    onSuccess: () => {
      // Invalidate all position-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.positions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.positions.statistics('', undefined, undefined) });
      // Invalidate win rate metrics when positions are updated
      queryClient.invalidateQueries({ queryKey: ['win-rate-metrics'] });
    },
  });
}

/**
 * Mutation hook for deleting a position
 */
export function useDeletePosition() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation<void, Error, string>({
    mutationFn: (id: string) => PositionRepository.delete(id),
    onSuccess: () => {
      // Invalidate all position-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.positions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.positions.statistics('', undefined, undefined) });
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolio.value('') });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
      // Invalidate win rate metrics when positions are deleted
      queryClient.invalidateQueries({ queryKey: ['win-rate-metrics'] });
      toast.success('Position deleted successfully');
    },
    onError: (error) => {
      logger.error('Failed to delete position', error);
      toast.error('Failed to delete position', {
        description: getUserFriendlyErrorMessage(error, 'deleting the position'),
      });
    },
  });
}
