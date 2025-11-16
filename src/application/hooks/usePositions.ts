import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { PositionRepository } from '@/infrastructure/repositories';
import type { PositionFilters, Position, PositionUpdate } from '@/domain/types';

export function usePositions(
  userId: string,
  filters?: PositionFilters,
  options?: Omit<UseQueryOptions<Position[], Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = ['positions', userId, filters] as const;

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
  const queryKey = ['positions', 'open', userId] as const;

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
  const queryKey = ['position-statistics', userId, startDate, endDate] as const;

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
  const queryKey = ['positions', 'expiring', userId, daysAhead] as const;

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
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['position-statistics'] });
    },
  });
}

/**
 * Mutation hook for deleting a position
 */
export function useDeletePosition() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id: string) => PositionRepository.delete(id),
    onSuccess: () => {
      // Invalidate all position-related queries
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['position-statistics'] });
    },
  });
}
