import React, { useState, useMemo } from 'react';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Target,
  Shield,
  Filter,
  CheckCircle,
  X,
  Star,
} from 'lucide-react';
import type { AIInsight, InsightType, InsightPriority } from '@/domain/types';
import { formatDate as formatDateUtil } from '@/shared/utils/dateUtils';

const AIInsights: React.FC = () => {
  const [filterPriority, setFilterPriority] = useState<InsightPriority | 'all'>('all');
  const [filterType, setFilterType] = useState<InsightType | 'all'>('all');
  const [showDismissed, setShowDismissed] = useState(false);
  const [insights, setInsights] = useState<AIInsight[]>([]);

  // Filter insights
  const filteredInsights = useMemo(() => {
    let filtered = insights;

    if (!showDismissed) {
      filtered = filtered.filter((insight) => !insight.isDismissed);
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter((insight) => insight.priority === filterPriority);
    }

    if (filterType !== 'all') {
      filtered = filtered.filter((insight) => insight.type === filterType);
    }

    return filtered.sort((a, b) => {
      // Sort by priority first
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by date
      return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
    });
  }, [filterPriority, filterType, showDismissed, insights]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = insights.filter((i) => !i.isDismissed).length;
    const unread = insights.filter((i) => !i.isRead && !i.isDismissed).length;
    const actionable = insights.filter((i) => i.actionable && !i.isDismissed).length;
    const highPriority = insights.filter(
      (i) => (i.priority === 'high' || i.priority === 'critical') && !i.isDismissed
    ).length;

    return { total, unread, actionable, highPriority };
  }, [insights]);

  const getTypeIcon = (type: InsightType) => {
    const icons = {
      pattern_recognition: <BarChart3 size={20} />,
      risk_warning: <AlertTriangle size={20} />,
      opportunity: <Target size={20} />,
      performance_analysis: <TrendingUp size={20} />,
      strategy_suggestion: <Lightbulb size={20} />,
      market_condition: <Brain size={20} />,
      position_sizing: <Shield size={20} />,
      diversification: <Shield size={20} />,
      general: <Brain size={20} />,
    };
    return icons[type];
  };

  const getPriorityColor = (priority: InsightPriority) => {
    const colors = {
      critical: 'border-l-red-500',
      high: 'border-l-orange-500',
      medium: 'border-l-emerald-500',
      low: 'border-l-blue-500',
    };
    return colors[priority];
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    // Parse YYYY-MM-DD as local date, not UTC
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day); // month is 0-indexed
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
            <Brain size={32} className="text-emerald-400" />
            AI Insights
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Get intelligent analysis and recommendations for your trading
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Insights"
          value={stats.total.toString()}
          icon={Brain}
          positive
        />
        <StatCard
          title="Unread"
          value={stats.unread.toString()}
          icon={Star}
          positive={false}
        />
        <StatCard
          title="Actionable"
          value={stats.actionable.toString()}
          icon={Target}
          positive
        />
        <StatCard
          title="High Priority"
          value={stats.highPriority.toString()}
          icon={AlertTriangle}
          positive={false}
        />
      </div>

      {/* Filters */}
      <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-4 ">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
              Filter by:
            </span>
          </div>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as InsightPriority | 'all')}
            className="px-3 py-2 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 rounded-xl text-gray-700 dark:text-slate-300 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as InsightType | 'all')}
            className="px-3 py-2 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 rounded-xl text-gray-700 dark:text-slate-300 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
          >
            <option value="all">All Types</option>
            <option value="risk_warning">Risk Warnings</option>
            <option value="opportunity">Opportunities</option>
            <option value="pattern_recognition">Patterns</option>
            <option value="performance_analysis">Performance</option>
            <option value="strategy_suggestion">Strategies</option>
          </select>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showDismissed}
              onChange={(e) => setShowDismissed(e.target.checked)}
              className="rounded border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800/50"
            />
            <span className="text-sm text-gray-700 dark:text-slate-300">Show dismissed</span>
          </label>
        </div>
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        {filteredInsights.length === 0 ? (
          <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-12 text-center ">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center">
              <Brain className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-slate-400 text-sm">No insights available</p>
          </div>
        ) : (
          filteredInsights.map((insight) => (
            <div
              key={insight.id}
              className={`bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6 hover:border-emerald-500/30 transition-all  ${
                !insight.isRead ? 'ring-2 ring-emerald-500/30' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-gray-100 dark:bg-slate-800/50 rounded-xl">
                    {getTypeIcon(insight.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-slate-100">
                        {insight.title}
                      </h3>
                      {!insight.isRead && (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-medium rounded">
                          NEW
                        </span>
                      )}
                      {insight.actionable && (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-medium rounded">
                          ACTIONABLE
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mb-1">
                      {insight.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-500">
                      {formatDate(insight.generatedAt)} • Confidence: {insight.confidence}%
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                    <CheckCircle size={20} />
                  </button>
                  <button className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Analysis */}
              <div className="mb-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700/50">
                <p className="text-sm font-medium text-slate-100 mb-2">
                  Analysis:
                </p>
                <p className="text-sm text-gray-700 dark:text-slate-300">{insight.analysis}</p>
              </div>

              {/* Recommendations */}
              {insight.recommendations && insight.recommendations.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-slate-100 mb-2">
                    Recommendations:
                  </p>
                  <ul className="space-y-2">
                    {insight.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Lightbulb size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-slate-300">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Related Symbols */}
              {insight.relatedSymbols && insight.relatedSymbols.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">
                    Related symbols:
                  </span>
                  <div className="flex gap-2">
                    {insight.relatedSymbols.map((symbol) => (
                      <span
                        key={symbol}
                        className="px-2 py-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-medium rounded"
                      >
                        {symbol}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  positive: boolean;
}

const StatCard = ({ title, value, icon: Icon, positive }: StatCardProps) => (
  <div className="group relative bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6 hover:border-emerald-500/30 transition-all duration-300 overflow-hidden ">
    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-transparent transition-all duration-300" />
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-400">{title}</span>
        <div className={`p-2.5 rounded-xl ${positive ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
          <Icon className={`w-5 h-5 ${positive ? 'text-emerald-400' : 'text-red-500 dark:text-red-400'}`} />
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-100">{value}</p>
    </div>
  </div>
);

export default AIInsights;
