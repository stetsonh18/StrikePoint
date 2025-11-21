import { useState } from 'react';
import type { StrategyAlignmentSnapshot, TradingStrategyPlan } from '@/domain/types';
import { formatPercent } from '@/shared/utils/formatUtils';
import { cn } from '@/shared/utils/cn';
import { Activity, Shield, Sparkles, Target, ChevronDown, AlertTriangle, TrendingUp } from 'lucide-react';
import { Modal } from '@/presentation/components/Modal';

interface StrategyPlanDetailProps {
  plan?: TradingStrategyPlan | null;
  isLoading?: boolean;
  onEvaluateAlignment?: () => void;
  evaluating?: boolean;
  onSetPrimary?: () => void;
  onUpdateStatus?: (status: 'active' | 'draft' | 'archived') => void;
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

const normalizePriority = (value: unknown, fallback: 'high' | 'medium' | 'low' = 'medium'): 'high' | 'medium' | 'low' => {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized === 'high' || normalized === 'medium' || normalized === 'low') {
      return normalized as 'high' | 'medium' | 'low';
    }
  }
  return fallback;
};

const normalizeSeverity = (value: unknown): 'info' | 'warning' | 'critical' => {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized === 'critical' || normalized === 'warning' || normalized === 'info') {
      return normalized as 'info' | 'warning' | 'critical';
    }
  }
  return 'info';
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

// Types for recommendations


interface UnifiedRecommendation {
  type: 'action_item' | 'breach';
  priority: 'high' | 'medium' | 'low';
  description: string;
  timeframe?: string;
  severity?: 'info' | 'warning' | 'critical';
  rule?: string;
  evidence?: string;
  recommendation?: string;
}

// Helper to parse recommendations from snapshot
const parseRecommendations = (snapshot: StrategyAlignmentSnapshot | null): UnifiedRecommendation[] => {
  const recommendations: UnifiedRecommendation[] = [];

  if (!snapshot) return recommendations;

  // Parse breaches
  if (snapshot.breaches && Array.isArray(snapshot.breaches)) {
    snapshot.breaches.forEach((breach) => {
      const severity = normalizeSeverity(breach.severity);
      const priorityMap: Record<'critical' | 'warning' | 'info', 'high' | 'medium' | 'low'> = {
        critical: 'high',
        warning: 'medium',
        info: 'low',
      };

      recommendations.push({
        type: 'breach',
        priority: priorityMap[severity],
        description: breach.recommendation as string || breach.rule as string || 'Address this breach',
        severity,
        rule: breach.rule as string,
        evidence: breach.evidence as string,
        recommendation: breach.recommendation as string,
      });
    });
  }

  // Parse action items
  if (snapshot.action_items && Array.isArray(snapshot.action_items)) {
    snapshot.action_items.forEach((item) => {
      recommendations.push({
        type: 'action_item',
        priority: normalizePriority(item.priority, 'medium'),
        description: item.description as string || 'Action item',
        timeframe: item.timeframe as string,
      });
    });
  }

  return recommendations;
};

// Sort recommendations by priority
const sortRecommendations = (recommendations: UnifiedRecommendation[]): UnifiedRecommendation[] => {
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const severityOrder = { critical: 0, warning: 1, info: 2 };

  return [...recommendations].sort((a, b) => {
    // First sort by priority
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // If priorities are equal and both are breaches, sort by severity
    if (a.type === 'breach' && b.type === 'breach' && a.severity && b.severity) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }

    // Breaches come before action items at same priority
    if (a.type !== b.type) {
      return a.type === 'breach' ? -1 : 1;
    }

    return 0;
  });
};

// Get score impact estimate
const getScoreImpact = (priority: 'high' | 'medium' | 'low'): string => {
  const impacts = {
    high: '+10-15%',
    medium: '+5-10%',
    low: '+1-5%',
  };
  return impacts[priority];
};

// Priority badge component
const PriorityBadge = ({ priority }: { priority: 'high' | 'medium' | 'low' }) => {
  const styles = {
    high: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
    medium: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
    low: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
  };
  const displayPriority = normalizePriority(priority, 'low');

  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold border', styles[displayPriority])}>
      {displayPriority.toUpperCase()}
    </span>
  );
};

// Alignment timeline component
const AlignmentTimeline = ({
  history,
  onSelectSnapshot,
}: {
  history?: StrategyAlignmentSnapshot[] | null;
  onSelectSnapshot: (snapshot: StrategyAlignmentSnapshot) => void;
}) => {
  if (!history || history.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 mb-4">
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Alignment timeline</h4>
      <div className="space-y-3">
        {history.slice(0, 6).map((snapshot) => {
          const snapshotRecommendations = parseRecommendations(snapshot);
          return (
            <button
              key={snapshot.id}
              type="button"
              onClick={() => onSelectSnapshot(snapshot)}
              className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors text-left"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">
                  {snapshot.alignment_score ? `${snapshot.alignment_score.toFixed(0)}%` : '-'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(snapshot.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-slate-500 dark:text-slate-400 text-right">
                  <div>{(snapshot.focus_areas ?? []).slice(0, 2).join(', ') || 'General review'}</div>
                  {snapshotRecommendations.length > 0 && (
                    <div className="text-emerald-500 dark:text-emerald-400 mt-1">
                      {snapshotRecommendations.length} recommendation{snapshotRecommendations.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const StrategyPlanDetail = ({
  plan,
  isLoading,
  onEvaluateAlignment,
  evaluating,
  onSetPrimary,
  onUpdateStatus,
  alignmentHistory,
}: StrategyPlanDetailProps) => {
  const [selectedSnapshot, setSelectedSnapshot] = useState<StrategyAlignmentSnapshot | null>(null);

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
          {onUpdateStatus && (
            <button
              type="button"
              onClick={() => onUpdateStatus(plan.status === 'active' ? 'draft' : 'active')}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-semibold border transition-colors',
                plan.status === 'active'
                  ? 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-700'
              )}
            >
              {plan.status === 'active' ? 'Active' : 'Activate'}
            </button>
          )}
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

      <AlignmentTimeline
        history={alignmentHistory}
        onSelectSnapshot={(snapshot) => setSelectedSnapshot(snapshot)}
      />

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


      {/* Historical Snapshot Modal */}
      <Modal
        isOpen={selectedSnapshot !== null}
        onClose={() => setSelectedSnapshot(null)}
        title={`Alignment Check - ${selectedSnapshot ? new Date(selectedSnapshot.created_at).toLocaleDateString() : ''}`}
        description={selectedSnapshot ? `Score: ${selectedSnapshot.alignment_score?.toFixed(0) ?? 'N/A'}%` : ''}
        size="lg"
      >
        {selectedSnapshot && (
          <div className="space-y-6">
            {/* Summary */}
            {selectedSnapshot.ai_response && typeof selectedSnapshot.ai_response === 'object' && 'summary' in selectedSnapshot.ai_response && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                <h5 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Summary</h5>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {String(selectedSnapshot.ai_response.summary || 'No summary available')}
                </p>
              </div>
            )}

            {/* Focus Areas */}
            {selectedSnapshot.focus_areas && selectedSnapshot.focus_areas.length > 0 && (
              <div>
                <h5 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Focus Areas</h5>
                <div className="flex flex-wrap gap-2">
                  {selectedSnapshot.focus_areas.map((area, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-medium"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div>
              <h5 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Recommendations</h5>
              {(() => {
                const recommendations = sortRecommendations(parseRecommendations(selectedSnapshot));
                if (recommendations.length === 0) {
                  return (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">No recommendations for this check.</p>
                  );
                }
                return (
                  <div className="space-y-3">
                    {recommendations.map((rec, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {rec.type === 'breach' ? (
                              <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                            ) : (
                              <TrendingUp className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            )}
                            <PriorityBadge priority={rec.priority} />
                            {rec.severity && rec.type === 'breach' && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                                {rec.severity.toUpperCase()}
                              </span>
                            )}
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              Potential: {getScoreImpact(rec.priority)}
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-slate-900 dark:text-slate-100 mb-2">{rec.description}</p>

                        {rec.type === 'breach' && rec.rule && (
                          <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Rule:</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">{rec.rule}</p>
                            {rec.evidence && (
                              <>
                                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-2 mb-1">Evidence:</p>
                                <p className="text-xs text-slate-600 dark:text-slate-400">{rec.evidence}</p>
                              </>
                            )}
                          </div>
                        )}

                        {rec.timeframe && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            <span className="font-medium">Timeframe:</span> {rec.timeframe}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
