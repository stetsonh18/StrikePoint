import { useState, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type PaginationState,
  type RowSelectionState,
  type VisibilityState,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown, Eye, EyeOff, CheckSquare, Square } from 'lucide-react';

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  enableRowSelection?: boolean;
  enableColumnVisibility?: boolean;
  enableSorting?: boolean;
  enablePagination?: boolean;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  onRowSelectionChange?: (selectedRows: TData[]) => void;
  className?: string;
  emptyMessage?: string;
  getRowId?: (row: TData) => string;
}

export function DataTable<TData>({
  data,
  columns,
  enableRowSelection = false,
  enableColumnVisibility = true,
  enableSorting = true,
  enablePagination = true,
  defaultPageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  onRowSelectionChange,
  className = '',
  emptyMessage = 'No data available',
  getRowId,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  // Add selection column if enabled
  const tableColumns = useMemo(() => {
    if (!enableRowSelection) return columns;

    const selectionColumn: ColumnDef<TData> = {
      id: 'select',
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              table.toggleAllRowsSelected();
            }}
            className="p-1 rounded hover:bg-slate-800/50 transition-colors"
            aria-label="Select all rows"
          >
            {table.getIsAllRowsSelected() ? (
              <CheckSquare className="w-4 h-4 text-emerald-400" />
            ) : table.getIsSomeRowsSelected() ? (
              <CheckSquare className="w-4 h-4 text-emerald-400/50" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              row.toggleSelected();
            }}
            className="p-1 rounded hover:bg-slate-800/50 transition-colors"
            aria-label={`Select row ${row.id}`}
          >
            {row.getIsSelected() ? (
              <CheckSquare className="w-4 h-4 text-emerald-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>
      ),
      enableSorting: false,
      size: 50,
    };

    return [selectionColumn, ...columns];
  }, [columns, enableRowSelection]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    enableRowSelection,
    enableSorting,
    state: {
      sorting,
      pagination,
      rowSelection,
      columnVisibility,
    },
    getRowId,
  });

  // Notify parent of selection changes
  useMemo(() => {
    if (onRowSelectionChange && enableRowSelection) {
      const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);
      onRowSelectionChange(selectedRows);
    }
  }, [rowSelection, onRowSelectionChange, enableRowSelection, table]);

  const selectedCount = table.getSelectedRowModel().rows.length;
  const totalRows = table.getFilteredRowModel().rows.length;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Toolbar */}
      {(enableRowSelection || enableColumnVisibility) && (
        <div className="flex items-center justify-between">
          {enableRowSelection && selectedCount > 0 && (
            <div className="text-sm text-slate-400">
              {selectedCount} of {totalRows} row{selectedCount !== 1 ? 's' : ''} selected
            </div>
          )}
          {enableColumnVisibility && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const allVisible = table.getIsAllColumnsVisible();
                  table.toggleAllColumnsVisible(!allVisible);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:text-slate-100 transition-colors"
              >
                {table.getIsAllColumnsVisible() ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Hide All
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Show All
                  </>
                )}
              </button>
              <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:text-slate-100 transition-colors">
                  <Eye className="w-4 h-4" />
                  Columns
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="p-2 max-h-64 overflow-y-auto">
                    {table.getAllColumns().map((column) => {
                      if (column.id === 'select' || !column.getCanHide()) return null;
                      return (
                        <label
                          key={column.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800/50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={column.getIsVisible()}
                            onChange={column.getToggleVisibilityHandler()}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500/50"
                          />
                          <span className="text-sm text-slate-300">
                            {typeof column.columnDef.header === 'string'
                              ? column.columnDef.header
                              : column.id}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/50 bg-slate-900/50">
        <table className="w-full">
          <thead className="bg-slate-800/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider"
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={`flex items-center gap-2 ${
                          header.column.getCanSort() ? 'cursor-pointer select-none hover:text-slate-300' : ''
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {enableSorting && header.column.getCanSort() && (
                          <span className="text-slate-500">
                            {{
                              asc: <ArrowUp className="w-3 h-3" />,
                              desc: <ArrowDown className="w-3 h-3" />,
                            }[header.column.getIsSorted() as string] ?? (
                              <ArrowUpDown className="w-3 h-3 opacity-50" />
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={table.getAllColumns().length}
                  className="px-6 py-12 text-center text-slate-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`hover:bg-slate-800/30 transition-colors ${
                    row.getIsSelected() ? 'bg-emerald-500/10' : ''
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-6 py-4 whitespace-nowrap text-sm text-slate-200"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {enablePagination && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span>
              Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                totalRows
              )}{' '}
              of {totalRows} entries
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-slate-300 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="First page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-slate-300 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-400 px-3">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-slate-300 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-slate-300 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Last page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="ml-2 px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  Show {size}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

