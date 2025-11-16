import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPreferencesRepository } from '@/infrastructure/repositories/userPreferences.repository';
import type { UserPreferences } from '@/domain/types/user.types';

/**
 * Hook to get user preferences
 */
export function useUserPreferences(userId: string) {
  return useQuery<UserPreferences>({
    queryKey: ['user-preferences', userId],
    queryFn: () => UserPreferencesRepository.getUserPreferences(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to update user preferences
 */
export function useUpdateUserPreferences(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: Partial<UserPreferences>) =>
      UserPreferencesRepository.updateUserPreferences(userId, preferences),
    onSuccess: () => {
      // Invalidate and refetch preferences
      queryClient.invalidateQueries({ queryKey: ['user-preferences', userId] });
    },
  });
}

