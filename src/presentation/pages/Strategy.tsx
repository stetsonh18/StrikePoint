import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Shield, NotepadText, Filter } from 'lucide-react';
import type { StrategyAssetType, TradingStrategyPlan, StrategyPlanGenerationPayload } from '@/domain/types';
import {
  useStrategyPlans,
  useGenerateStrategyPlan,
  useSetPrimaryStrategyPlan,
  useDeleteStrategyPlan,
  useEvaluateStrategyAlignment,
  useStrategyAlignmentHistory,
} from '@/application/hooks/useStrategyPlans';
import { useAuthStore } from '@/application/stores/auth.store';
import { useToast } from '@/shared/hooks/useToast';
import { StrategyWizard } from '@/presentation/components/strategy/StrategyWizard';
import { StrategyPlanDetail } from '@/presentation/components/strategy/StrategyPlanDetail';
import { StrategyPlanList } from '@/presentation/components/strategy/StrategyPlanList';
import { cn } from '@/shared/utils/cn';

type AssetFilter = 'all' | StrategyAssetType;

const assetFilterOptions: { label: string; value: AssetFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Stocks', value: 'stock' },
  { label: 'Options', value: 'option' },
  { label: 'Crypto', value: 'crypto' },
  { label: 'Futures', value: 'futures' },
];

export const Strategy = () => {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;
  const { success, error } = useToast();

  const [assetFilter, setAssetFilter] = useState<AssetFilter>('all');
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>();

  const planFilters = useMemo(() => {
    if (assetFilter === 'all') return undefined;
    return { asset_type: assetFilter };
  }, [assetFilter]);

  const { data: plans = [], isLoading: plansLoading } = useStrategyPlans(userId, planFilters);

  const generateMutation = useGenerateStrategyPlan();
  const setPrimaryMutation = useSetPrimaryStrategyPlan(userId);
  const deleteMutation = useDeleteStrategyPlan(userId);
  const evaluateMutation = useEvaluateStrategyAlignment();
  const alignmentHistoryQuery = useStrategyAlignmentHistory(selectedPlanId);

  useEffect(() => {
    if (!plans.length) {
      setSelectedPlanId(undefined);
      return;
    }
    if (!selectedPlanId || !plans.find((plan) => plan.id === selectedPlanId)) {
      const primaryPlan = plans.find((plan) => plan.is_primary);
      setSelectedPlanId(primaryPlan?.id ?? plans[0].id);
    }
  }, [plans, selectedPlanId]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? null,
    [plans, selectedPlanId]
  );

  const filteredPlans = useMemo(() => {
    if (assetFilter === 'all') return plans;
    return plans.filter((plan) => plan.asset_type === assetFilter);
  }, [plans, assetFilter]);

  const handleGenerate = (payload: StrategyPlanGenerationPayload) => {
    generateMutation.mutate(payload, {
      onSuccess: (data) => {
        success('Strategy created', { description: 'AI assembled a fresh playbook.' });
        setSelectedPlanId(data.plan.id);
      },
      onError: (err: Error) => {
        error('Unable to generate strategy', { description: err.message });
      },
    });
  };

  const handleSetPrimary = (plan: TradingStrategyPlan) => {
    setPrimaryMutation.mutate(
      { planId: plan.id, assetType: plan.asset_type },
      {
        onSuccess: () => success('Primary strategy updated'),
        onError: (err: Error) => error('Unable to set primary plan', { description: err.message }),
      }
    );
  };

  const handleDelete = (plan: TradingStrategyPlan) => {
    const confirmDelete = window.confirm(`Delete plan "${plan.plan_name}"? This action cannot be undone.`);
    if (!confirmDelete) return;
    deleteMutation.mutate(plan.id, {
      onSuccess: () => {
        success('Strategy deleted');
        if (selectedPlanId === plan.id) {
          setSelectedPlanId(undefined);
        }
      },
      onError: (err: Error) => error('Unable to delete strategy', { description: err.message }),
    });
  };

  const handleEvaluateAlignment = () => {
    if (!selectedPlanId) return;
    evaluateMutation.mutate(selectedPlanId, {
      onSuccess: () => success('Alignment check complete', { description: 'AI evaluated your recent activity.' }),
      onError: (err: Error) => error('Alignment check failed', { description: err.message }),
    });
  };

  const stats = useMemo(() => {
    const total = plans.length;
    const active = plans.filter((plan) => plan.status === 'active').length;
    const lastAlignment = plans
      .map((plan) => plan.last_alignment_check)
      .filter(Boolean)
      .sort((a, b) => (b! > a! ? 1 : -1))[0];
    const primary = plans.find((plan) => plan.is_primary);
    return { total, active, lastAlignment, primary };
  }, [plans]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">PLAYBOOK</p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Strategy Hub</h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl">
            Build AI-assisted plans of attack, store them by asset, and routinely check whether your execution aligns
            with your guardrails.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400" />
          {assetFilterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setAssetFilter(option.value)}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-full border',
                assetFilter === option.value
                  ? 'bg-emerald-500/10 border-emerald-400 text-emerald-600 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400/40'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-emerald-500" />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Total strategies</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-sky-500" />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Active guardrails</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <NotepadText className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Last alignment check</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {stats.lastAlignment ? new Date(stats.lastAlignment).toLocaleDateString() : 'Never'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-4">
          <StrategyWizard isGenerating={generateMutation.isPending} onGenerate={handleGenerate} />
        </div>
        <div className="xl:col-span-5">
          <StrategyPlanDetail
            plan={selectedPlan}
            isLoading={plansLoading}
            onEvaluateAlignment={handleEvaluateAlignment}
            evaluating={evaluateMutation.isPending}
            onSetPrimary={selectedPlan ? () => handleSetPrimary(selectedPlan) : undefined}
            alignmentHistory={alignmentHistoryQuery.data}
          />
        </div>
        <div className="xl:col-span-3">
          <StrategyPlanList
            plans={filteredPlans}
            selectedPlanId={selectedPlanId}
            onSelect={setSelectedPlanId}
            onSetPrimary={handleSetPrimary}
            onDelete={handleDelete}
            isLoading={plansLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default Strategy;

