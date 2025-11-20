import type { TradingStrategyPlan } from '@/domain/types';
import { cn } from '@/shared/utils/cn';
import { formatPercent } from '@/shared/utils/formatUtils';
import { Trash2 } from 'lucide-react';

interface StrategyPlanListProps {
  plans: TradingStrategyPlan[];
  selectedPlanId?: string;
  onSelect: (planId: string) => void;
  onSetPrimary: (plan: TradingStrategyPlan) => void;
  onDelete: (plan: TradingStrategyPlan) => void;
  isLoading?: boolean;
}

export const StrategyPlanList = ({
  plans,
  selectedPlanId,
  onSelect,
  onSetPrimary,
  onDelete,
  isLoading,
}: StrategyPlanListProps) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900/60 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 min-h-[500px] animate-pulse" />
    );
  }

  if (!plans.length) {
    return (
      <div className="bg-white dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 text-center text-slate-500 dark:text-slate-400 min-h-[500px] flex flex-col items-center justify-center">
        <p>No saved strategies yet.</p>
        <p className="text-sm mt-2">Generate your first plan to see it listed here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900/60 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 space-y-3 max-h-[600px] overflow-auto">
      {plans.map((plan) => {
        const isSelected = selectedPlanId === plan.id;
        return (
          <button
            key={plan.id}
            type="button"
            onClick={() => onSelect(plan.id)}
            className={cn(
              'w-full text-left rounded-2xl border px-4 py-3 transition flex flex-col gap-2',
              isSelected
                ? 'bg-emerald-50/80 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/40 shadow-glow-sm'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300/70'
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{plan.plan_name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                  {plan.asset_type} • {plan.strategy_style ?? 'custom'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-xs font-semibold px-2 py-0.5 rounded-full border',
                    plan.status === 'active'
                      ? 'bg-emerald-500/10 border-emerald-400 text-emerald-600 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  )}
                >
                  {plan.status}
                </span>
                {plan.is_primary && (
                  <span className="text-[10px] uppercase tracking-wide font-semibold text-emerald-500">
                    Primary
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                Alignment:{' '}
                {plan.alignment_score ? (
                  <span className="text-slate-900 dark:text-slate-100 font-medium">
                    {plan.alignment_score.toFixed(0)}%
                  </span>
                ) : (
                  'no check yet'
                )}
              </span>
              <span>
                Risk:
                <span className="ml-1 text-slate-900 dark:text-slate-100 font-medium">
                  {plan.risk_per_trade_percent ? formatPercent(plan.risk_per_trade_percent) : 'n/a'}
                </span>
              </span>
            </div>

            <div className="flex items-center justify-between text-xs mt-1">
              <div className="flex items-center gap-2">
                {!plan.is_primary && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSetPrimary(plan);
                    }}
                    className="text-emerald-500 hover:text-emerald-400 font-semibold"
                  >
                    Make primary
                  </button>
                )}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(plan);
                  }}
                  className="text-slate-400 hover:text-red-500"
                  title="Delete plan"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-slate-400">
                Updated {new Date(plan.updated_at).toLocaleDateString()}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

