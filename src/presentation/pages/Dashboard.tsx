import { TrendingUp, TrendingDown, DollarSign, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const Dashboard = () => {
  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Overview of your trading performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl text-slate-300 text-sm font-medium transition-all">
            Last 30 Days
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total P&L"
          value="$12,450.00"
          icon={DollarSign}
          trend="+15.3%"
          positive
        />
        <StatCard
          title="Win Rate"
          value="68.5%"
          icon={TrendingUp}
          trend="+2.4%"
          positive
        />
        <StatCard
          title="Total Trades"
          value="142"
          icon={Activity}
          trend="+8"
          positive
        />
        <StatCard
          title="Avg Win/Loss"
          value="1.85"
          icon={TrendingDown}
          trend="-0.12"
          positive={false}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-slate-100">
                Performance Chart
              </h3>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-medium border border-emerald-500/20">
                  Daily
                </button>
                <button className="px-3 py-1.5 text-slate-400 hover:text-slate-300 rounded-lg text-xs font-medium">
                  Weekly
                </button>
                <button className="px-3 py-1.5 text-slate-400 hover:text-slate-300 rounded-lg text-xs font-medium">
                  Monthly
                </button>
              </div>
            </div>
            <div className="h-64 flex items-center justify-center border border-slate-800/50 rounded-xl bg-slate-950/30">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-slate-400 text-sm">Chart visualization coming soon</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6">
          <h3 className="text-xl font-semibold text-slate-100 mb-4">
            Recent Trades
          </h3>
          <div className="space-y-3">
            <TradeItem symbol="AAPL" profit={125.50} type="win" date="2 hours ago" />
            <TradeItem symbol="TSLA" profit={-45.20} type="loss" date="5 hours ago" />
            <TradeItem symbol="MSFT" profit={89.75} type="win" date="1 day ago" />
            <TradeItem symbol="NVDA" profit={234.80} type="win" date="1 day ago" />
            <TradeItem symbol="GOOGL" profit={-67.30} type="loss" date="2 days ago" />
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  trend: string;
  positive: boolean;
}

const StatCard = ({ title, value, icon: Icon, trend, positive }: StatCardProps) => (
  <div className="group relative bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6 hover:border-emerald-500/30 transition-all duration-300 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-transparent transition-all duration-300" />
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-400">{title}</span>
        <div className={`p-2.5 rounded-xl ${positive ? 'bg-emerald-500/10' : 'bg-accent-500/10'}`}>
          <Icon className={`w-5 h-5 ${positive ? 'text-emerald-400' : 'text-accent-400'}`} />
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-3xl font-bold text-slate-100">{value}</p>
        <div className="flex items-center gap-1.5">
          {positive ? (
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-accent-400" />
          )}
          <p className={`text-sm font-medium ${positive ? 'text-emerald-400' : 'text-accent-400'}`}>
            {trend}
          </p>
          <span className="text-xs text-slate-500 ml-1">vs last period</span>
        </div>
      </div>
    </div>
  </div>
);

interface TradeItemProps {
  symbol: string;
  profit: number;
  type: 'win' | 'loss';
  date: string;
}

const TradeItem = ({ symbol, profit, type, date }: TradeItemProps) => (
  <div className="group flex items-center justify-between p-3.5 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 border border-slate-800/50 hover:border-slate-700/50 transition-all cursor-pointer">
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${type === 'win' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-accent-500/10 text-accent-400'}`}>
        {type === 'win' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
      </div>
      <div>
        <span className="font-semibold text-slate-200 block">{symbol}</span>
        <span className="text-xs text-slate-500">{date}</span>
      </div>
    </div>
    <span className={`font-bold text-sm ${type === 'win' ? 'text-emerald-400' : 'text-accent-400'}`}>
      {profit > 0 ? '+' : ''}${profit.toFixed(2)}
    </span>
  </div>
);
