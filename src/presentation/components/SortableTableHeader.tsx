import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { toggleSort, type SortConfig } from '@/shared/utils/tableSorting';
import { cn } from '@/shared/utils/cn';

interface SortableTableHeaderProps<T> {
  label: string;
  sortKey: keyof T | string;
  currentSort: SortConfig<T> | null;
  onSortChange: (sort: SortConfig<T> | null) => void;
  className?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

/**
 * Sortable table header component
 */
export function SortableTableHeader<T>({
  label,
  sortKey,
  currentSort,
  onSortChange,
  className = '',
  align = 'left',
  sortable = true,
}: SortableTableHeaderProps<T>) {
  const isActive = currentSort?.key === sortKey;
  const direction = isActive ? currentSort.direction : null;

  const handleClick = () => {
    if (!sortable) return;
    const newSort = toggleSort(currentSort, sortKey);
    onSortChange(newSort);
  };

  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const getSortIcon = () => {
    if (!sortable) return null;
    if (direction === 'asc') return <ArrowUp className="w-3 h-3" />;
    if (direction === 'desc') return <ArrowDown className="w-3 h-3" />;
    return <ArrowUpDown className="w-3 h-3 opacity-30" />;
  };

  return (
    <th
      className={cn(
        'px-6 py-3 text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider',
        alignClasses[align],
        sortable && 'cursor-pointer select-none hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors',
        isActive && 'text-emerald-600 dark:text-emerald-400',
        className
      )}
      onClick={handleClick}
    >
      <div className={cn('flex items-center gap-2', alignClasses[align], align === 'right' && 'justify-end')}>
        <span>{label}</span>
        {getSortIcon()}
      </div>
    </th>
  );
}

