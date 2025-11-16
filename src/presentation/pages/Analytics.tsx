import { Calendar, TrendingUp } from 'lucide-react';
import { EmptyAnalytics } from '@/presentation/components/EnhancedEmptyState';

export const Analytics = () => {
  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Analytics
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Detailed insights into your trading performance
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-slate-300 rounded-xl font-medium transition-all">
          <Calendar className="w-4 h-4" />
          Last 30 Days
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Average Win"
          value="—"
          description="Average profit per winning trade"
        />
        <MetricCard
          title="Average Loss"
          value="—"
          description="Average loss per losing trade"
        />
        <MetricCard
          title="Profit Factor"
          value="—"
          description="Ratio of gross profit to gross loss"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6">
          <h3 className="text-xl font-semibold text-slate-100 mb-6">
            Performance by Symbol
          </h3>
          <EmptyAnalytics />
        </div>

        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="relative">
            <h3 className="text-xl font-semibold text-slate-100 mb-6">
              Monthly Performance
            </h3>
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
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  description: string;
}

const MetricCard = ({ title, value, description }: MetricCardProps) => (
  <div className="group bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6 hover:border-emerald-500/30 transition-all overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-transparent transition-all" />
    <div className="relative">
      <p className="text-sm font-semibold text-slate-400 mb-3">{title}</p>
      <p className="text-3xl font-bold text-slate-100 mb-2">{value}</p>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
  </div>
);

