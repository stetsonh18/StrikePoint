import React, { memo } from 'react';
import { LineChart, Zap, Bitcoin, Activity } from 'lucide-react';

interface PositionCardProps {
  id: string;
  symbol: string;
  assetType: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPL: number;
  totalPL: number;
  plPercent: number;
  formatCurrency: (amount: number) => string;
  getAssetIcon: (assetType: string) => React.ComponentType<{ className?: string }>;
}

export const PositionCard = memo<PositionCardProps>(({
  id,
  symbol,
  assetType,
  quantity,
  avgPrice,
  currentPrice,
  marketValue,
  unrealizedPL,
  totalPL,
  plPercent,
  formatCurrency,
  getAssetIcon,
}) => {
  const AssetIcon = getAssetIcon(assetType);
  const isPositive = totalPL >= 0;

  return (
    <div className="p-4 bg-slate-100 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700/30 hover:border-slate-300 dark:hover:border-slate-600/50 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isPositive ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
            <AssetIcon className={`w-4 h-4 ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{symbol}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 uppercase">{assetType}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-sm font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {isPositive ? '+' : ''}{formatCurrency(totalPL)}
          </p>
          <p className={`text-xs ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {plPercent >= 0 ? '+' : ''}{plPercent.toFixed(2)}%
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-400 mt-2">
        <div>
          <span className="text-slate-500 dark:text-slate-500">Qty:</span> {quantity}
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-500">Avg:</span> {formatCurrency(avgPrice)}
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-500">Current:</span> {formatCurrency(currentPrice)}
        </div>
      </div>
      <div className="mt-2 text-xs text-slate-500 dark:text-slate-500">
        <span className="text-slate-600 dark:text-slate-400">Market Value:</span> {formatCurrency(marketValue)}
      </div>
    </div>
  );
});

PositionCard.displayName = 'PositionCard';

