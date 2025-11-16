import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({ icon: Icon, title, description, action, className = '' }: EmptyStateProps) => {
  return (
    <div className={`bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-12 text-center ${className}`}>
      <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center">
        <Icon className="w-6 h-6 text-emerald-400" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-slate-200 mb-2">{title}</h3>
      {description && <p className="text-slate-400 text-sm mb-4">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};

