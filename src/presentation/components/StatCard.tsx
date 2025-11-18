import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { ThemeMode } from '@/shared/theme/theme.config';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  positive: boolean;
  theme?: ThemeMode;
}

/**
 * StatCard component with accessibility improvements
 * - Always includes icons for profit/loss indicators
 * - High contrast colors
 * - Semantic HTML
 */
export const StatCard = React.memo<StatCardProps>(({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  positive,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';
  
  return (
    <div className={`group relative bg-gradient-to-br ${isDark ? 'from-slate-900/50 to-slate-800/30' : 'from-white to-slate-50'} backdrop-blur-sm rounded-2xl border ${isDark ? 'border-slate-800/50' : 'border-slate-200'} p-6 hover:border-emerald-500/30 transition-all duration-300 overflow-hidden`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${isDark ? 'from-emerald-500/0 to-emerald-500/0' : 'from-emerald-500/0 to-emerald-500/0'} group-hover:from-emerald-500/5 group-hover:to-transparent transition-all duration-300`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{title}</span>
          <div className={`p-2.5 rounded-xl ${positive ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
            <Icon className={`w-5 h-5 ${positive ? 'text-emerald-400' : 'text-red-400'}`} />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className={`text-3xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{value}</p>
            {/* Always show icon for profit/loss indicators to improve accessibility */}
            {subtitle && (
              <span className="sr-only" aria-label={positive ? 'Profit' : 'Loss'}>
                {positive ? 'Profit' : 'Loss'}
              </span>
            )}
          </div>
          {subtitle && (
            <div className="flex items-center gap-1.5">
              {positive ? (
                <TrendingUp size={14} className="text-emerald-400" aria-hidden="true" />
              ) : (
                <TrendingDown size={14} className="text-red-400" aria-hidden="true" />
              )}
              <p className={`text-sm font-medium ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                {subtitle}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';

