import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/infrastructure/api/queryKeys';
import { StrategyPlanRepository } from '@/infrastructure/repositories';
import type {
  StrategyPlanFilters,
  StrategyPlanGenerationPayload,
  StrategyPlanUpdate,
  StrategyAlignmentResult,
  StrategyAlignmentSnapshot,
  StrategyAssetType,
} from '@/domain/types';

export function useStrategyPlans(userId?: string, filters?: StrategyPlanFilters) {
  return useQuery({
    queryKey: userId ? queryKeys.strategyPlans.list(userId, filters) : ['strategy-plans', 'anon'],
    queryFn: () => {
      if (!userId) return Promise.resolve({ data: [] });
      return StrategyPlanRepository.list(userId, filters);
    },
    enabled: Boolean(userId),
    select: (result) => result.data,
  });
}

export function useStrategyPlan(planId?: string) {
  return useQuery({
    queryKey: planId ? queryKeys.strategyPlans.detail(planId) : ['strategy-plan', 'anon'],
    queryFn: () => {
      if (!planId) return Promise.resolve(null);
      return StrategyPlanRepository.getById(planId);
    },
    enabled: Boolean(planId),
  });
}

export function useStrategyAlignmentHistory(planId?: string) {
  return useQuery({
    queryKey: planId ? queryKeys.strategyPlans.alignmentHistory(planId) : ['strategy-plan', 'alignment', 'anon'],
    queryFn: () => {
      if (!planId) return Promise.resolve<StrategyAlignmentSnapshot[]>([]);
      return StrategyPlanRepository.getAlignmentHistory(planId);
    },
    enabled: Boolean(planId),
  });
}

export function useGenerateStrategyPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StrategyPlanGenerationPayload) => StrategyPlanRepository.generateWithAI(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.strategyPlans.all, exact: false });
    },
  });
}

export function useUpdateStrategyPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: StrategyPlanUpdate }) =>
      StrategyPlanRepository.update(id, updates),
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.strategyPlans.list(plan.user_id, undefined), exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.strategyPlans.detail(plan.id) });
    },
  });
}

export function useDeleteStrategyPlan(userId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => StrategyPlanRepository.remove(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.strategyPlans.all, exact: false });
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.strategyPlans.list(userId, undefined), exact: false });
      }
    },
  });
}

export function useSetPrimaryStrategyPlan(userId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, assetType }: { planId: string; assetType: StrategyAssetType }) => {
      if (!userId) throw new Error('User ID is required to set primary strategy');
      return StrategyPlanRepository.setPrimary(planId, assetType, userId);
    },
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.strategyPlans.list(plan.user_id, undefined), exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.strategyPlans.detail(plan.id) });
    },
  });
}

export function useEvaluateStrategyAlignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string): Promise<StrategyAlignmentResult> => StrategyPlanRepository.evaluateAlignment(planId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.strategyPlans.detail(result.snapshot.plan_id) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.strategyPlans.alignmentHistory(result.snapshot.plan_id),
      });
    },
  });
}

