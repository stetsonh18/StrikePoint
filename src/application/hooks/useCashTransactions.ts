import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { CashTransactionRepository } from '@/infrastructure/repositories/cashTransaction.repository';
import type { CashTransaction, CashTransactionUpdate } from '@/domain/types';

interface CashTransactionFilters {
  startDate?: string;
  endDate?: string;
  transactionCode?: string;
}

/**
 * Hook to fetch cash transactions for a user
 */
export function useCashTransactions(
  userId: string,
  filters?: CashTransactionFilters,
  options?: Omit<UseQueryOptions<CashTransaction[], Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = ['cash_transactions', userId, filters] as const;

  return useQuery<CashTransaction[], Error>({
    queryKey,
    queryFn: () => CashTransactionRepository.getByUserId(userId, filters),
    enabled: !!userId,
    ...options,
  });
}

/**
 * Mutation hook for updating a cash transaction
 */
export function useUpdateCashTransaction() {
  const queryClient = useQueryClient();

  return useMutation<CashTransaction, Error, { id: string; updates: CashTransactionUpdate }>({
    mutationFn: ({ id, updates }: { id: string; updates: CashTransactionUpdate }) =>
      CashTransactionRepository.update(id, updates),
    onSuccess: () => {
      // Invalidate all cash transaction-related queries
      queryClient.invalidateQueries({ queryKey: ['cash_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
    },
  });
}

/**
 * Mutation hook for deleting a cash transaction
 */
export function useDeleteCashTransaction() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id: string) => CashTransactionRepository.delete(id),
    onSuccess: () => {
      // Invalidate all cash transaction-related queries
      queryClient.invalidateQueries({ queryKey: ['cash_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
    },
  });
}

