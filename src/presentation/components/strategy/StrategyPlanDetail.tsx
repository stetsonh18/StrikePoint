import type { StrategyAlignmentSnapshot, TradingStrategyPlan } from '@/domain/types';
import { formatPercent } from '@/shared/utils/formatUtils';
import { cn } from '@/shared/utils/cn';
import { Activity, Shield, Sparkles, Target } from 'lucide-react';

interface StrategyPlanDetailProps {
  plan?: TradingStrategyPlan | null;
  isLoading?: boolean;
  onEvaluateAlignment?: () => void;
  evaluating?: boolean;
  onSetPrimary?: () => void;
  alignmentHistory?: StrategyAlignmentSnapshot[];
}

const toArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) =>
      typeof item === 'string' ? item : JSON.stringify(item, null, 0).replace(/[{}"]/g, '')
    );
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).map(
      ([key, val]) => `${key}: ${typeof val === 'string' ? val : JSON.stringify(val)}`
    );
  }
  if (typeof value === 'string') return [value];
  return [];
};

const SectionCard = ({
  title,
  items,
  icon: Icon,
}: {
  title: string;
  items: string[];
  icon?: typeof Shield;
}) => {
  if (items.length === 0) return null;
  return (
    <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        {Icon ? <Icon className="w-4 h-4 text-emerald-500" /> : null}
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
      </div>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="text-sm text-slate-600 dark:text-slate-300 flex gap-2">
            <span className="text-emerald-500 font-semibold">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const StrategyPlanDetail = ({
  plan,
  isLoading,
  onEvaluateAlignment,
  evaluating,
  onSetPrimary,
  alignmentHistory,
}: StrategyPlanDetailProps) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 animate-pulse min-h-[520px]" />
    );
  }

  if (!plan) {
    return (
      <div className="bg-white dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center min-h-[520px]">
        <Target className="w-12 h-12 text-slate-400 mb-4" />
        <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">No strategy selected</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-md">
          Generate a strategy with the wizard or choose an existing plan from the list to see its guardrails and AI
          notes.
        </p>
      </div>
    );
  }

  const entryRules = toArray(plan.entry_rules);
  const exitRules = toArray(plan.exit_rules);
  const checklist = toArray(plan.checklist);
  const guardrails = toArray(plan.guardrails?.rules ?? plan.guardrails);
  const routines = toArray(plan.routines);
  const riskPercent = plan.risk_per_trade_percent ?? 0;

  return (
    <div className="bg-white dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">{plan.asset_type}</p>
          <h2 className="text-3xl font-semibold text-slate-900 dark:text-white">{plan.plan_name}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">{plan.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {plan.is_primary ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-400/30">
              Primary Plan
            </span>
          ) : (
            <button
              type="button"
              onClick={onSetPrimary}
              className="px-3 py-1 rounded-full text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-400"
            >
              Set as Primary
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Risk Per Trade</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {riskPercent ? formatPercent(riskPercent) : '—'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Target allocation cap per idea</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Cash Buffer</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {plan.cash_buffer_percent ? formatPercent(plan.cash_buffer_percent) : '20%'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Minimum cash reserve</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Max Positions</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {plan.max_concurrent_positions ?? 'n/a'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Open positions simultaneously</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Alignment</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {plan.alignment_score ? `${plan.alignment_score.toFixed(0)}%` : 'Not checked'}
          </p>
          <div className="flex justify-between items-center mt-1 text-xs text-slate-500 dark:text-slate-400">
            <span>Last check</span>
            <span>
              {plan.last_alignment_check
                ? new Date(plan.last_alignment_check).toLocaleDateString()
                : '—'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <button
          type="button"
          onClick={onEvaluateAlignment}
          disabled={evaluating}
          className={cn(
            'px-4 py-2 rounded-2xl text-sm font-semibold flex items-center gap-2 border',
            evaluating
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              : 'bg-emerald-500/10 border-emerald-400/40 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/20'
          )}
        >
          <Activity className="w-4 h-4" />
          {evaluating ? 'Checking alignment...' : 'Re-check alignment'}
        </button>
        <div className="px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-300">
          {plan.time_horizon || 'No time horizon set'}
        </div>
        <div className="px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-300">
          {plan.trade_frequency || 'Trade cadence unknown'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Entry Playbook" items={entryRules} icon={Sparkles} />
        <SectionCard title="Exit Playbook" items={exitRules} icon={Target} />
        <SectionCard title="Risk Guardrails" items={guardrails} icon={Shield} />
        <SectionCard title="Execution Checklist" items={checklist} icon={Activity} />
        <SectionCard title="Routines" items={routines} icon={Sparkles} />
      </div>

      {alignmentHistory && alignmentHistory.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Alignment timeline</h4>
          <div className="space-y-3">
            {alignmentHistory.slice(0, 6).map((snapshot) => (
              <div
                key={snapshot.id}
                className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">
                    {snapshot.alignment_score ? `${snapshot.alignment_score.toFixed(0)}%` : '—'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(snapshot.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {(snapshot.focus_areas ?? []).slice(0, 2).join(', ') || 'General review'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

