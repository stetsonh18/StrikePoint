import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { CashTransactionRepository } from '@/infrastructure/repositories/cashTransaction.repository';
import { queryKeys } from '@/infrastructure/api/queryKeys';

/**
 * Hook to calculate initial investment from deposit transactions
 * Initial Investment = Sum of all deposit transactions (DEPOSIT, ACH, DCF, RTP)
 */
export function useInitialInvestment(
  userId: string,
  options?: Omit<UseQueryOptions<number, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = queryKeys.portfolio.initialInvestment(userId);

  return useQuery<number, Error>({
    queryKey,
    queryFn: async () => {
      // Get all cash transactions
      const transactions = await CashTransactionRepository.getByUserId(userId);

      // Deposit transaction codes
      const depositCodes = ['DEPOSIT', 'ACH', 'DCF', 'RTP', 'DEP'];

      // Sum only positive deposit amounts
      const initialInvestment = transactions
        .filter((tx) => depositCodes.includes(tx.transaction_code || ''))
        .filter((tx) => (tx.amount || 0) > 0) // Only positive amounts (deposits)
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);

      return initialInvestment;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    ...options,
  });
}

