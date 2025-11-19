import { useQuery } from '@tanstack/react-query';
import { EarlyAdopterService, type EarlyAdopterStatus } from '@/infrastructure/services/earlyAdopterService';

/**
 * Hook to get current early adopter status and pricing
 * Updates every 5 minutes
 */
export function useEarlyAdopterStatus() {
  return useQuery<EarlyAdopterStatus, Error>({
    queryKey: ['early-adopter-status'],
    queryFn: () => EarlyAdopterService.getEarlyAdopterStatus(),
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 2,
  });
}

