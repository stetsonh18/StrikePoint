import { useQuery } from '@tanstack/react-query';
import { SubscriptionService, type SubscriptionInfo } from '@/infrastructure/services/subscription.service';
import { useAuthStore } from '../stores/auth.store';

/**
 * Hook to get subscription status for the current user
 */
export function useSubscriptionStatus() {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;

  return useQuery<SubscriptionInfo, Error>({
    queryKey: ['subscription-status', userId],
    queryFn: () => {
      if (!userId) {
        throw new Error('User not authenticated');
      }
      return SubscriptionService.getSubscriptionInfo(userId);
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 2,
  });
}

/**
 * Hook to check if user needs to subscribe
 */
export function useNeedsSubscription() {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;

  return useQuery<boolean, Error>({
    queryKey: ['needs-subscription', userId],
    queryFn: () => {
      if (!userId) {
        return false; // Not authenticated, will be handled by ProtectedRoute
      }
      return SubscriptionService.needsSubscription(userId);
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 2,
  });
}

