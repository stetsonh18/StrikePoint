import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MobileTableCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

/**
 * Mobile-friendly card wrapper for table rows
 * Shows as a card on mobile, hidden on desktop (where table is shown)
 */
export const MobileTableCard: React.FC<MobileTableCardProps> = ({
  children,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        md:hidden
        bg-white dark:bg-slate-900/50
        border border-slate-200 dark:border-slate-800/50
        rounded-xl p-4 mb-3
        shadow-sm hover:shadow-md
        transition-all
        ${onClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

interface MobileTableCardRowProps {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
  positive?: boolean;
  negative?: boolean;
  className?: string;
}

/**
 * Row within a mobile table card
 */
export const MobileTableCardRow: React.FC<MobileTableCardRowProps> = ({
  label,
  value,
  highlight = false,
  positive = false,
  negative = false,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between py-2 ${className}`}>
      <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
      <div className="flex items-center gap-1.5">
        {positive && <TrendingUp className="w-4 h-4 text-emerald-400" />}
        {negative && <TrendingDown className="w-4 h-4 text-red-400" />}
        <span
          className={`
            text-sm font-medium
            ${highlight ? 'text-base font-semibold' : ''}
            ${positive ? 'text-emerald-400' : ''}
            ${negative ? 'text-red-400' : ''}
            ${!positive && !negative ? 'text-slate-900 dark:text-slate-100' : ''}
          `}
        >
          {value}
        </span>
      </div>
    </div>
  );
};

interface MobileTableCardHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

/**
 * Header section of a mobile table card
 */
export const MobileTableCardHeader: React.FC<MobileTableCardHeaderProps> = ({
  title,
  subtitle,
  badge,
  actions,
}) => {
  return (
    <div className="flex items-start justify-between mb-3 pb-3 border-b border-slate-200 dark:border-slate-800/50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
            {title}
          </h3>
          {badge}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex-shrink-0 ml-2">{actions}</div>}
    </div>
  );
};

