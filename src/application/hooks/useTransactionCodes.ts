import { useQuery } from '@tanstack/react-query';
import { TransactionCodeRepository } from '@/infrastructure/repositories/transactionCode.repository';
import type { TransactionCode } from '@/domain/types';

/**
 * Hook to fetch all transaction codes
 */
export function useTransactionCodes() {
  return useQuery<TransactionCode[]>({
    queryKey: ['transaction_codes'],
    queryFn: () => TransactionCodeRepository.getAll(),
    staleTime: 1000 * 60 * 60, // 1 hour - transaction codes don't change often
  });
}

/**
 * Hook to fetch transaction codes by category
 */
export function useTransactionCodesByCategory(category: string) {
  return useQuery<TransactionCode[]>({
    queryKey: ['transaction_codes', category],
    queryFn: () => TransactionCodeRepository.getByCategory(category),
    enabled: !!category,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook to fetch all unique categories
 */
export function useTransactionCodeCategories() {
  return useQuery<string[]>({
    queryKey: ['transaction_code_categories'],
    queryFn: async () => {
      const codes = await TransactionCodeRepository.getAll();
      const categories = Array.from(new Set(codes.map(c => c.category)));
      return categories.sort();
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook to fetch cash movement transaction codes
 */
export function useCashMovementCodes() {
  return useTransactionCodesByCategory('Cash Movement');
}

