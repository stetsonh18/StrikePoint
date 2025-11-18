import { useQuery } from '@tanstack/react-query';
import { EarlyAdopterService, type EarlyAdopterStatus } from '@/infrastructure/services/earlyAdopterService';

/**
 * Hook to get current early adopter status and pricing
 * Updates every 30 seconds to show real-time availability
 */
export function useEarlyAdopterStatus() {
  return useQuery<EarlyAdopterStatus, Error>({
    queryKey: ['early-adopter-status'],
    queryFn: () => EarlyAdopterService.getEarlyAdopterStatus(),
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    retry: 2,
  });
}

