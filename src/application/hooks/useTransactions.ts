import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { TransactionRepository } from '@/infrastructure/repositories';
import { useToast } from '@/shared/hooks/useToast';
import { getUserFriendlyErrorMessage } from '@/shared/utils/errorHandler';
import { logger } from '@/shared/utils/logger';
import { queryKeys } from '@/infrastructure/api/queryKeys';
import type { TransactionFilters, Transaction, TransactionUpdate, TransactionStatistics } from '@/domain/types';

export function useTransactions(
  userId: string,
  filters?: TransactionFilters,
  options?: Omit<UseQueryOptions<Transaction[], Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = queryKeys.transactions.list(userId, filters);

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
  options?: Omit<UseQueryOptions<TransactionStatistics, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = queryKeys.transactions.statistics(userId, startDate, endDate);

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
      // Invalidate all transaction-related queries for this user
      const userId = data.user_id;
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            key[0] === 'transaction-statistics' &&
            key[1] === userId
          );
        }
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.positions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.cash.balance(userId) });
    },
  });
}

/**
 * Mutation hook for deleting a transaction
 */
export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation<void, Error, { id: string; userId: string }>({
    mutationFn: async ({ id }: { id: string; userId: string }) => {
      await TransactionRepository.delete(id);
    },
    onSuccess: (_, variables) => {
      const { userId } = variables;
      // Invalidate all transaction-related queries for this user
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            key[0] === 'transaction-statistics' &&
            key[1] === userId
          );
        }
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.positions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.cash.balance(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolio.value(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
      toast.success('Transaction deleted successfully');
    },
    onError: (error) => {
      logger.error('Failed to delete transaction', error);
      toast.error('Failed to delete transaction', {
        description: getUserFriendlyErrorMessage(error, 'deleting the transaction'),
      });
    },
  });
}
