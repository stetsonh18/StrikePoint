// Example implementation showing how to use DataTable with StockPosition
// This demonstrates the pattern for converting existing tables to use DataTable

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { StockPosition } from '@/domain/types';
import { DataTable } from '@/presentation/components/DataTable';
import { TrendingUp, TrendingDown } from 'lucide-react';

// Example column definitions for StockPosition
export const createStockPositionColumns = (
  formatCurrency: (amount: number) => string,
  formatPercent: (percent: number) => string,
  onSellClick: (position: StockPosition) => void
): ColumnDef<StockPosition>[] => [
  {
    accessorKey: 'symbol',
    header: 'Symbol',
    cell: ({ getValue }) => (
      <span className="font-semibold text-slate-100">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: 'quantity',
    header: 'Quantity',
    cell: ({ getValue }) => (
      <div className="text-right text-slate-100">{getValue() as number}</div>
    ),
  },
  {
    accessorKey: 'averagePrice',
    header: 'Avg Price',
    cell: ({ getValue }) => (
      <div className="text-right text-slate-100">{formatCurrency(getValue() as number)}</div>
    ),
  },
  {
    accessorKey: 'currentPrice',
    header: 'Current Price',
    cell: ({ getValue }) => (
      <div className="text-right text-slate-100">{formatCurrency((getValue() as number) || 0)}</div>
    ),
  },
  {
    accessorKey: 'marketValue',
    header: 'Market Value',
    cell: ({ getValue }) => (
      <div className="text-right font-medium text-slate-100">
        {formatCurrency((getValue() as number) || 0)}
      </div>
    ),
  },
  {
    accessorKey: 'unrealizedPL',
    header: 'Unrealized P&L',
    cell: ({ getValue }) => {
      const pl = (getValue() as number) || 0;
      return (
        <div className={`text-right font-semibold ${pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {formatCurrency(pl)}
        </div>
      );
    },
  },
  {
    accessorKey: 'unrealizedPLPercent',
    header: 'P&L %',
    cell: ({ getValue }) => {
      const percent = (getValue() as number) || 0;
      return (
        <div className="flex items-center justify-end gap-1">
          {percent >= 0 ? (
            <TrendingUp size={16} className="text-emerald-400" />
          ) : (
            <TrendingDown size={16} className="text-red-400" />
          )}
          <span className={`font-semibold ${percent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatPercent(percent)}
          </span>
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <div className="text-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSellClick(row.original);
          }}
          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-all"
        >
          Sell
        </button>
      </div>
    ),
    enableSorting: false,
  },
];

// Usage example:
// const columns = useMemo(
//   () => createStockPositionColumns(formatCurrency, formatPercent, handleSellClick),
//   [formatCurrency, formatPercent, handleSellClick]
// );
//
// <DataTable
//   data={filteredPositions}
//   columns={columns}
//   enableRowSelection={true}
//   enableColumnVisibility={true}
//   enableSorting={true}
//   enablePagination={true}
//   defaultPageSize={10}
//   getRowId={(row) => row.id}
//   emptyMessage="No positions found"
// />

