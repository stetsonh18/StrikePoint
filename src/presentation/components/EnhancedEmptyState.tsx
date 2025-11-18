import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { TrendingUp, BookOpen, Wallet, Activity, FileText, BarChart3 } from 'lucide-react';

interface EnhancedEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  tips?: string[];
  illustration?: ReactNode;
  className?: string;
}

const DEFAULT_ICONS: Record<string, LucideIcon> = {
  positions: TrendingUp,
  transactions: Wallet,
  journal: BookOpen,
  analytics: BarChart3,
  default: FileText,
};

export const EnhancedEmptyState = ({
  icon,
  title,
  description,
  action,
  tips,
  illustration,
  className = '',
}: EnhancedEmptyStateProps) => {
  const Icon = icon || DEFAULT_ICONS.default;

  return (
    <div className={`bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-12 text-center shadow-sm dark:shadow-none ${className}`}>
      {/* Illustration or Icon */}
      {illustration ? (
        <div className="mb-6">{illustration}</div>
      ) : (
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center">
          <Icon className="w-8 h-8 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        </div>
      )}

      {/* Title */}
      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-200 mb-2">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 max-w-md mx-auto">{description}</p>
      )}

      {/* Action Button */}
      {action && (
        <button
          onClick={action.onClick}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            action.variant === 'secondary'
              ? 'bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
              : 'bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300'
          }`}
        >
          {action.label}
        </button>
      )}

      {/* Tips */}
      {tips && tips.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800/50">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-3">
            Quick Tips
          </p>
          <ul className="space-y-2 text-left max-w-md mx-auto">
            {tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Pre-configured empty states for common scenarios
export const EmptyPositions = ({
  onAddTrade,
  assetType = 'stocks',
}: {
  onAddTrade: () => void;
  assetType?: string;
}) => (
  <EnhancedEmptyState
    icon={TrendingUp}
    title={`No ${assetType} positions yet`}
    description="Start tracking your trades by adding your first transaction. Monitor your positions, track performance, and analyze your trading strategy."
    action={{
      label: 'Add Your First Trade',
      onClick: onAddTrade,
    }}
    tips={[
      'Track your entry and exit prices for accurate P&L calculations',
      'Monitor unrealized gains and losses in real-time',
      'Review your position history to identify patterns',
    ]}
  />
);

export const EmptyTransactions = ({
  onAddTransaction,
  assetType = 'stocks',
}: {
  onAddTransaction: () => void;
  assetType?: string;
}) => (
  <EnhancedEmptyState
    icon={Wallet}
    title={`No ${assetType} transactions yet`}
    description="Record your buy and sell transactions to build a complete trading history. Every trade helps you understand your trading patterns better."
    action={{
      label: 'Add Transaction',
      onClick: onAddTransaction,
    }}
    tips={[
      'Record all transactions to maintain accurate position tracking',
      'Include fees and commissions for precise calculations',
      'Link transactions to positions for automatic updates',
    ]}
  />
);

export const EmptyJournal = ({ onNewEntry }: { onNewEntry: () => void }) => (
  <EnhancedEmptyState
    icon={BookOpen}
    title="No journal entries found"
    description="Start documenting your trading journey by creating your first entry. Track your thoughts, strategies, and lessons learned."
    action={{
      label: 'Create Your First Entry',
      onClick: onNewEntry,
    }}
    tips={[
      'Document your pre-trade analysis and setup quality',
      'Record emotions and market conditions for pattern recognition',
      'Review past entries to learn from your trading history',
    ]}
  />
);

export const EmptyAnalytics = () => (
  <EnhancedEmptyState
    icon={BarChart3}
    title="No analytics data available"
    description="Analytics will appear once you have completed trades and closed positions. Track your performance metrics and identify areas for improvement."
    tips={[
      'Close positions to generate performance metrics',
      'Review win rate and profit factor regularly',
      'Compare performance across different asset types',
    ]}
  />
);

