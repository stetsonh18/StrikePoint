import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { CashTransactionRepository } from '@/infrastructure/repositories/cashTransaction.repository';
import { queryKeys } from '@/infrastructure/api/queryKeys';

/**
 * Hook to calculate net cash flow from all cash transactions
 * Net Cash Flow = Sum of all cash transaction amounts
 */
export function useNetCashFlow(
  userId: string,
  options?: Omit<UseQueryOptions<number, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = queryKeys.portfolio.netCashFlow(userId);

  return useQuery<number, Error>({
    queryKey,
    queryFn: async () => {
      // Get all cash transactions
      const transactions = await CashTransactionRepository.getByUserId(userId);

      // Sum all transaction amounts
      // We INCLUDE everything:
      // - STOCK_BUY/STOCK_SELL: Actual cash paid/received for stocks
      // - CRYPTO_BUY/CRYPTO_SELL: Actual cash paid/received for crypto
      // - OPTION_BUY/OPTION_SELL: Actual cash paid/received for options
      // - FEE: Trading fees
      // - DEPOSIT/WITHDRAWAL: Cash deposits and withdrawals
      // - FUTURES_PROFIT/FUTURES_LOSS: Realized P&L from futures
      // - FUTURES_MARGIN: Margin reserved (debit) - now included to deduct from cash
      // - FUTURES_MARGIN_RELEASE: Margin released (credit) - now included to add back to cash
      const netCashFlow = transactions
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);

      return netCashFlow;
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // Cache for 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
    ...options,
  });
}

