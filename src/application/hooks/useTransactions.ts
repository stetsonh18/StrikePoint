import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { TransactionRepository } from '@/infrastructure/repositories';
import type { TransactionFilters, Transaction, TransactionUpdate } from '@/domain/types';

export function useTransactions(
  userId: string,
  filters?: TransactionFilters,
  options?: Omit<UseQueryOptions<Transaction[], Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = ['transactions', userId, filters] as const;

  return useQuery<Transaction[], Error>({
    queryKey,
    queryFn: () => TransactionRepository.getAll(userId, filters),
    enabled: !!userId,
    ...options,
  });
}

export function useTransactionStatistics(
  userId: string,
  startDate?: string,
  endDate?: string,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = ['transaction-statistics', userId, startDate, endDate] as const;

  return useQuery({
    queryKey,
    queryFn: () => TransactionRepository.getStatistics(userId, startDate, endDate),
    enabled: !!userId,
    ...options,
  });
}

/**
 * Mutation hook for updating a transaction
 */
export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation<Transaction, Error, { id: string; updates: TransactionUpdate }>({
    mutationFn: ({ id, updates }: { id: string; updates: TransactionUpdate }) =>
      TransactionRepository.update(id, updates),
    onSuccess: (data) => {
      // Invalidate all transaction-related queries
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
    },
  });
}

/**
 * Mutation hook for deleting a transaction
 */
export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id: string) => TransactionRepository.delete(id),
    onSuccess: () => {
      // Invalidate all transaction-related queries
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
    },
  });
}
