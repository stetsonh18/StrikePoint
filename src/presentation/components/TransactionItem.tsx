import { memo } from 'react';
import { formatDate } from '@/shared/utils/dateUtils';

interface TransactionItemProps {
  id: string;
  underlying_symbol?: string;
  instrument: string;
  transaction_code: string;
  amount: number;
  activity_date: string;
  formatCurrency: (amount: number) => string;
}

export const TransactionItem = memo<TransactionItemProps>(({
  id,
  underlying_symbol,
  instrument,
  transaction_code,
  amount,
  activity_date,
  formatCurrency,
}) => {
  return (
    <div className="p-3 bg-slate-100 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700/30">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{underlying_symbol || instrument}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">{transaction_code}</p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-bold ${amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(Math.abs(amount))}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500">{formatDate(activity_date)}</p>
        </div>
      </div>
    </div>
  );
});

TransactionItem.displayName = 'TransactionItem';

