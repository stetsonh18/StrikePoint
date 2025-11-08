import { Plus, Search, Filter, ArrowUpRight, ArrowDownRight, MoreVertical } from 'lucide-react';

export const Trades = () => {
  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Trades
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Manage and track all your trades
          </p>
        </div>
        <button className="group flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-105">
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          New Trade
        </button>
      </div>

      <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 overflow-hidden">
        <div className="p-6 border-b border-slate-800/50">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by symbol, date, or notes..."
                className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-800/50 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
            </div>
            <button className="flex items-center gap-2 px-5 py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600/50 text-slate-300 rounded-xl font-medium transition-all">
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800/50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Direction
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Entry Price
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Exit Price
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  P&L
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              <TradeRow
                symbol="AAPL"
                direction="Long"
                entry="$175.50"
                exit="$178.75"
                pnl={325.0}
                status="closed"
              />
              <TradeRow
                symbol="TSLA"
                direction="Short"
                entry="$245.80"
                exit="—"
                pnl={null}
                status="open"
              />
              <TradeRow
                symbol="MSFT"
                direction="Long"
                entry="$380.20"
                exit="$385.60"
                pnl={540.0}
                status="closed"
              />
              <TradeRow
                symbol="NVDA"
                direction="Long"
                entry="$485.30"
                exit="$478.90"
                pnl={-640.0}
                status="closed"
              />
              <TradeRow
                symbol="GOOGL"
                direction="Short"
                entry="$142.50"
                exit="—"
                pnl={null}
                status="open"
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface TradeRowProps {
  symbol: string;
  direction: string;
  entry: string;
  exit: string;
  pnl: number | null;
  status: 'open' | 'closed';
}

const TradeRow = ({ symbol, direction, entry, exit, pnl, status }: TradeRowProps) => (
  <tr className="group hover:bg-slate-800/30 transition-colors">
    <td className="px-6 py-4 whitespace-nowrap">
      <span className="text-sm font-bold text-slate-100">{symbol}</span>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="flex items-center gap-2">
        {direction === 'Long' ? (
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-lg bg-accent-500/10 flex items-center justify-center">
            <ArrowDownRight className="w-3.5 h-3.5 text-accent-400" />
          </div>
        )}
        <span className="text-sm text-slate-300">{direction}</span>
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
      {entry}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
      {exit}
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      {pnl !== null ? (
        <span className={`text-sm font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-accent-400'}`}>
          {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
        </span>
      ) : (
        <span className="text-sm text-slate-500">—</span>
      )}
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      {status === 'open' ? (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          Open
        </span>
      ) : (
        <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-700/30 text-slate-400 border border-slate-700/30">
          Closed
        </span>
      )}
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <button className="p-2 rounded-lg hover:bg-slate-700/30 text-slate-400 hover:text-slate-300 transition-all opacity-0 group-hover:opacity-100">
        <MoreVertical className="w-4 h-4" />
      </button>
    </td>
  </tr>
);
