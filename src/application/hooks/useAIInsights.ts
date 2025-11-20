import { useQuery, useMutation, useQueryClient, type UseQueryOptions, type QueryClient } from '@tanstack/react-query';
import { AIInsightRepository, type AIInsightInsert, type AIInsightUpdate } from '@/infrastructure/repositories/aiInsight.repository';
import { queryKeys } from '@/infrastructure/api/queryKeys';
import type { AIInsight, AIInsightFilters } from '@/domain/types';

const invalidateAIInsightQueries = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.aiInsights.all, exact: false });
};

/**
 * Hook to fetch AI insights with optional filtering
 */
export function useAIInsights(
  userId: string,
  filters?: AIInsightFilters,
  options?: Omit<UseQueryOptions<AIInsight[], Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = queryKeys.aiInsights.list(userId, filters);

  return useQuery<AIInsight[], Error>({
    queryKey,
    queryFn: () => AIInsightRepository.getAll(userId, filters),
    enabled: !!userId,
    staleTime: 30 * 1000, // Cache for 30 seconds
    ...options,
  });
}

/**
 * Hook to fetch a single AI insight by ID
 */
export function useAIInsight(
  id: string,
  options?: Omit<UseQueryOptions<AIInsight | null, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = queryKeys.aiInsights.detail(id);

  return useQuery<AIInsight | null, Error>({
    queryKey,
    queryFn: () => AIInsightRepository.getById(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Hook to fetch AI insight statistics
 */
export function useAIInsightStatistics(
  userId: string,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const queryKey = queryKeys.aiInsights.statistics(userId);

  return useQuery({
    queryKey,
    queryFn: () => AIInsightRepository.getStatistics(userId),
    enabled: !!userId,
    staleTime: 30 * 1000, // Cache for 30 seconds
    ...options,
  });
}

/**
 * Mutation hook for creating a single AI insight
 */
export function useCreateAIInsight() {
  const queryClient = useQueryClient();

  return useMutation<AIInsight, Error, AIInsightInsert>({
    mutationFn: (insight: AIInsightInsert) => AIInsightRepository.create(insight),
    onSuccess: () => {
      invalidateAIInsightQueries(queryClient);
    },
  });
}

/**
 * Mutation hook for creating multiple AI insights in batch
 */
export function useCreateManyAIInsights() {
  const queryClient = useQueryClient();

  return useMutation<AIInsight[], Error, AIInsightInsert[]>({
    mutationFn: (insights: AIInsightInsert[]) => AIInsightRepository.createMany(insights),
    onSuccess: () => {
      invalidateAIInsightQueries(queryClient);
    },
  });
}

/**
 * Mutation hook for updating an AI insight
 */
export function useUpdateAIInsight() {
  const queryClient = useQueryClient();

  return useMutation<AIInsight, Error, { id: string; updates: AIInsightUpdate }>({
    mutationFn: ({ id, updates }: { id: string; updates: AIInsightUpdate }) =>
      AIInsightRepository.update(id, updates),
    onSuccess: (data) => {
      invalidateAIInsightQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.aiInsights.detail(data.id) });
    },
  });
}

/**
 * Mutation hook for marking an insight as read
 */
export function useMarkInsightAsRead() {
  const queryClient = useQueryClient();

  return useMutation<AIInsight, Error, string>({
    mutationFn: (id: string) => AIInsightRepository.markAsRead(id),
    onSuccess: (data) => {
      invalidateAIInsightQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.aiInsights.detail(data.id) });
    },
  });
}

/**
 * Mutation hook for dismissing an insight
 */
export function useDismissInsight() {
  const queryClient = useQueryClient();

  return useMutation<AIInsight, Error, string>({
    mutationFn: (id: string) => AIInsightRepository.dismiss(id),
    onSuccess: (data) => {
      invalidateAIInsightQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.aiInsights.detail(data.id) });
    },
  });
}

/**
 * Mutation hook for adding feedback to an insight
 */
export function useAddInsightFeedback() {
  const queryClient = useQueryClient();

  return useMutation<AIInsight, Error, { id: string; rating: number; feedback?: string }>({
    mutationFn: ({ id, rating, feedback }: { id: string; rating: number; feedback?: string }) =>
      AIInsightRepository.addFeedback(id, rating, feedback),
    onSuccess: (data) => {
      invalidateAIInsightQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.aiInsights.detail(data.id) });
    },
  });
}

/**
 * Mutation hook for deleting an AI insight
 */
export function useDeleteAIInsight() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id: string) => AIInsightRepository.delete(id),
    onSuccess: () => {
      invalidateAIInsightQueries(queryClient);
    },
  });
}

/**
 * Mutation hook for cleaning up expired insights
 */
export function useCleanupExpiredInsights() {
  const queryClient = useQueryClient();

  return useMutation<number, Error, string>({
    mutationFn: (userId: string) => AIInsightRepository.cleanupExpired(userId),
    onSuccess: () => {
      invalidateAIInsightQueries(queryClient);
    },
  });
}
