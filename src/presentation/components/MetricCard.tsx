import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { ThemeMode } from '@/shared/theme/theme.config';
import { Tooltip } from './Tooltip';

interface MetricCardProps {
  title: string;
  value: string;
  description?: string;
  positive?: boolean;
  theme?: ThemeMode;
  tooltip?: string;
}

/**
 * MetricCard component with accessibility improvements
 * - Shows icons for positive/negative values
 * - High contrast colors
 * - Semantic HTML with proper ARIA labels
 */
export const MetricCard = React.memo<MetricCardProps>(({ 
  title, 
  value, 
  description,
  positive,
  theme = 'dark',
  tooltip
}) => {
  const isDark = theme === 'dark';
  const showIcon = positive !== undefined;
  const isPositive = positive === true;
  
  const cardContent = (
    <div className={`group bg-gradient-to-br ${isDark ? 'from-slate-900/50 to-slate-800/30' : 'from-white to-slate-50'} backdrop-blur-sm rounded-2xl border ${isDark ? 'border-slate-800/50' : 'border-slate-200'} p-6 hover:border-emerald-500/30 transition-all overflow-hidden`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${isDark ? 'from-emerald-500/0 to-emerald-500/0' : 'from-emerald-500/0 to-emerald-500/0'} group-hover:from-emerald-500/5 group-hover:to-transparent transition-all`} />
      <div className="relative space-y-2">
        <div className="flex items-center justify-between">
          <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{title}</h3>
          {tooltip && (
            <Tooltip content={tooltip} position="top" showIcon />
          )}
        </div>
        <div className="flex items-center gap-2">
          {showIcon && (
            <>
              {isPositive ? (
                <TrendingUp 
                  size={20} 
                  className="text-emerald-600 dark:text-emerald-400" 
                  aria-label="Positive value"
                  aria-hidden="false"
                />
              ) : (
                <TrendingDown 
                  size={20} 
                  className="text-red-600 dark:text-red-400" 
                  aria-label="Negative value"
                  aria-hidden="false"
                />
              )}
            </>
          )}
          <p className={`text-3xl font-bold ${showIcon ? (isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400') : (isDark ? 'text-slate-100' : 'text-slate-900')}`}>
            {value}
          </p>
        </div>
        {description && (
          <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{description}</p>
        )}
      </div>
    </div>
  );

  return tooltip ? (
    <Tooltip content={tooltip} position="top">
      {cardContent}
    </Tooltip>
  ) : (
    cardContent
  );
});

MetricCard.displayName = 'MetricCard';

