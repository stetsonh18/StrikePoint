import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/infrastructure/api/queryKeys';
import { JournalRepository } from '@/infrastructure/repositories';
import type {
  JournalEntry,
  JournalEntryFilters,
  JournalEntryInsert,
  JournalEntryUpdate,
  JournalStats,
} from '@/domain/types';

export function useJournalEntries(
  userId: string,
  filters?: JournalEntryFilters,
  options?: Omit<UseQueryOptions<JournalEntry[], Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = queryKeys.journal.list(userId, filters);

  return useQuery<JournalEntry[], Error>({
    queryKey,
    queryFn: () => JournalRepository.getAll(userId, filters),
    enabled: !!userId,
    ...options,
  });
}

/**
 * Fetch a single journal entry by ID
 */
export function useJournalEntry(
  id: string,
  options?: Omit<UseQueryOptions<JournalEntry | null, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = queryKeys.journal.detail(id);

  return useQuery<JournalEntry | null, Error>({
    queryKey,
    queryFn: () => JournalRepository.getById(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Mutation hook for creating a journal entry
 */
export function useCreateJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation<JournalEntry, Error, JournalEntryInsert>({
    mutationFn: (entry: JournalEntryInsert) => JournalRepository.create(entry),
    onSuccess: (data) => {
      // Invalidate all journal list queries for the user (with any filters)
      queryClient.invalidateQueries({
        queryKey: queryKeys.journal.lists(),
        exact: false
      });
      // Invalidate stats queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.journal.stats(data.userId),
        exact: false
      });
    },
  });
}

/**
 * Mutation hook for updating a journal entry
 */
export function useUpdateJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation<JournalEntry, Error, { id: string; updates: JournalEntryUpdate }>({
    mutationFn: ({ id, updates }: { id: string; updates: JournalEntryUpdate }) =>
      JournalRepository.update(id, updates),
    onSuccess: (data) => {
      // Invalidate all journal list queries for the user (with any filters)
      queryClient.invalidateQueries({
        queryKey: queryKeys.journal.lists(),
        exact: false
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.journal.detail(data.id) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.journal.stats(data.userId),
        exact: false
      });
    },
  });
}

/**
 * Mutation hook for deleting a journal entry
 */
export function useDeleteJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => JournalRepository.delete(id),
    onSuccess: (_, deletedId) => {
      // Invalidate all journal-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.journal.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.journal.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.journal.stats('') });
    },
  });
}

/**
 * Fetch journal statistics for a user
 */
export function useJournalStats(
  userId: string,
  startDate?: string,
  endDate?: string,
  options?: Omit<UseQueryOptions<JournalStats, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = queryKeys.journal.stats(userId, startDate, endDate);

  return useQuery<JournalStats, Error>({
    queryKey,
    queryFn: () => JournalRepository.getStats(userId, startDate, endDate),
    enabled: !!userId,
    ...options,
  });
}

