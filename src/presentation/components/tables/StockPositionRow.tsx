import React from 'react';
import { TrendingUp, TrendingDown, Edit, Trash2 } from 'lucide-react';
import type { StockPosition } from '@/domain/types';

interface StockPositionRowProps {
  position: StockPosition;
  formatCurrency: (amount: number) => string;
  formatPercent: (value: number) => string;
  onSellClick: (position: StockPosition) => void;
  onEditClick: (position: StockPosition) => void;
  onDeleteClick: (position: StockPosition) => void;
}

/**
 * Memoized stock position table row component
 * Prevents unnecessary re-renders when parent component updates
 */
export const StockPositionRow = React.memo<StockPositionRowProps>(({
  position,
  formatCurrency,
  formatPercent,
  onSellClick,
  onEditClick,
  onDeleteClick,
}) => {
  const handleSellClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSellClick(position);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditClick(position);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteClick(position);
  };

  return (
    <tr
      key={position.id}
      className="hover:bg-slate-800/30 transition-colors cursor-pointer"
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="font-semibold text-slate-100">
          {position.symbol}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-100">
        {position.quantity}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-100">
        {formatCurrency(position.averagePrice)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-100">
        {formatCurrency(position.currentPrice || 0)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-100">
        {formatCurrency(position.marketValue || 0)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
        <span
          className={`font-semibold ${
            (position.unrealizedPL || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {formatCurrency(position.unrealizedPL || 0)}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
        <div className="flex items-center justify-end gap-1">
          {(position.unrealizedPLPercent || 0) >= 0 ? (
            <TrendingUp size={16} className="text-emerald-400" />
          ) : (
            <TrendingDown size={16} className="text-red-400" />
          )}
          <span
            className={`font-semibold ${
              (position.unrealizedPLPercent || 0) >= 0
                ? 'text-emerald-400'
                : 'text-red-400'
            }`}
          >
            {formatPercent(position.unrealizedPLPercent || 0)}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={handleSellClick}
            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-all"
          >
            Sell
          </button>
          <button
            onClick={handleEditClick}
            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
            title="Edit position"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={handleDeleteClick}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
            title="Delete position"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better memoization
  return (
    prevProps.position.id === nextProps.position.id &&
    prevProps.position.quantity === nextProps.position.quantity &&
    prevProps.position.currentPrice === nextProps.position.currentPrice &&
    prevProps.position.unrealizedPL === nextProps.position.unrealizedPL &&
    prevProps.position.unrealizedPLPercent === nextProps.position.unrealizedPLPercent
  );
});

StockPositionRow.displayName = 'StockPositionRow';

