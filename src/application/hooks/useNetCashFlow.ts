import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { CashTransactionRepository } from '@/infrastructure/repositories/cashTransaction.repository';

/**
 * Hook to calculate net cash flow from all cash transactions
 * Net Cash Flow = Sum of all cash transaction amounts
 */
export function useNetCashFlow(
  userId: string,
  options?: Omit<UseQueryOptions<number, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = ['net-cash-flow', userId] as const;

  return useQuery<number, Error>({
    queryKey,
    queryFn: async () => {
      // Get all cash transactions
      const transactions = await CashTransactionRepository.getByUserId(userId);
      
      // Sum all transaction amounts
      const netCashFlow = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
      
      return netCashFlow;
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // Cache for 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
    ...options,
  });
}

