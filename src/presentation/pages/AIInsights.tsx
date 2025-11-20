import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
  RefreshCw,
  Loader2,
} from 'lucide-react';
import type { InsightType, InsightPriority } from '@/domain/types';
import { useAuthStore } from '@/application/stores/auth.store';
import { useAIInsights, useMarkInsightAsRead, useDismissInsight } from '@/application/hooks/useAIInsights';
import { useStrategyPlans } from '@/application/hooks/useStrategyPlans';
import { AIInsightGenerationService } from '@/infrastructure/services/aiInsightGenerationService';

const AIInsights: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const { data: primaryStrategyData } = useStrategyPlans(user?.id, { is_primary: true });
  const primaryStrategy = primaryStrategyData?.[0];
  const [filterPriority, setFilterPriority] = useState<InsightPriority | 'all'>('all');
  const [filterType, setFilterType] = useState<InsightType | 'all'>('all');
  const [showDismissed, setShowDismissed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);

  // Fetch insights from database
  const { data: insights = [], isLoading, refetch } = useAIInsights(user?.id || '', {
    is_dismissed: showDismissed ? undefined : false,
    type: filterType !== 'all' ? (filterType === 'pattern_recognition' ? 'pattern' : filterType === 'performance_analysis' ? 'performance' : filterType === 'strategy_suggestion' ? 'strategy' : filterType) as any : undefined,
    priority: filterPriority !== 'all' ? filterPriority : undefined,
  });

  // Mutations
  const markAsRead = useMarkInsightAsRead();
  const dismiss = useDismissInsight();

  // Generate insights handler
  const handleGenerateInsights = async () => {
    setIsGenerating(true);
    setGenerationMessage('Analyzing your portfolio data...');

    try {
      const result = await AIInsightGenerationService.generateAllInsights();

      if (result.success) {
        setGenerationMessage(`Successfully generated ${result.totalCount} new insights!`);
        refetch();
      } else {
        const errors = result.results.filter(r => r.error).map(r => `${r.type}: ${r.error}`).join(', ');
        setGenerationMessage(`Generated ${result.totalCount} insights. Errors: ${errors}`);
      }
    } catch (error) {
      setGenerationMessage(`Error generating insights: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
      setTimeout(() => setGenerationMessage(null), 5000);
    }
  };

  // Handle marking as read
  const handleMarkAsRead = (id: string) => {
    markAsRead.mutate(id);
  };

  // Handle dismissing
  const handleDismiss = (id: string) => {
    dismiss.mutate(id);
  };

  // Sort insights by priority and date
  const sortedInsights = useMemo(() => {
    return [...insights].sort((a, b) => {
      // Sort by priority first
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by date
      return new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime();
    });
  }, [insights]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = insights.filter((i) => !i.is_dismissed).length;
    const unread = insights.filter((i) => !i.is_read && !i.is_dismissed).length;
    const actionable = insights.filter((i) => i.actionable && !i.is_dismissed).length;
    const highPriority = insights.filter(
      (i) => (i.priority === 'high' || i.priority === 'critical') && !i.is_dismissed
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 dark:from-slate-100 to-slate-600 dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
            <Brain size={32} className="text-emerald-400" />
            AI Insights
          </h1>
          <p className="text-slate-600 dark:text-slate-500 mt-2 text-lg">
            Get intelligent analysis and recommendations for your trading
          </p>
        </div>
        <button
          onClick={handleGenerateInsights}
          disabled={isGenerating}
          className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw size={20} />
              Generate Insights
            </>
          )}
        </button>
      </div>

      {/* Generation Message */}
      {generationMessage && (
        <div className="bg-gradient-to-br from-emerald-50 dark:from-emerald-900/50 to-emerald-100 dark:to-emerald-800/30 backdrop-blur-sm rounded-2xl border border-emerald-200 dark:border-emerald-800/50 p-4 shadow-sm dark:shadow-none">
          <p className="text-emerald-700 dark:text-emerald-400 text-sm font-medium">{generationMessage}</p>
        </div>
      )}

      {primaryStrategy && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 border border-slate-700 flex flex-wrap items-center gap-4">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Primary strategy</p>
            <h3 className="text-2xl font-semibold mt-1">{primaryStrategy.plan_name}</h3>
            <p className="text-sm text-slate-300 mt-1">
              AI Insights monitors these focus areas to keep you honest:
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {(primaryStrategy.alignment_focus ?? ['discipline']).map((focus) => (
                <span
                  key={focus}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 border border-white/20"
                >
                  {focus}
                </span>
              ))}
            </div>
          </div>
          <Link
            to="/strategy"
            className="px-4 py-2 rounded-2xl border border-white/30 text-sm font-semibold hover:bg-white/10 transition"
          >
            Open Strategy Hub
          </Link>
        </div>
      )}

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
      <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-4 shadow-sm dark:shadow-none">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-500 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Filter by:
            </span>
          </div>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as InsightPriority | 'all')}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-slate-300 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
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
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-slate-300 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
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
              className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Show dismissed</span>
          </label>
        </div>
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-12 text-center shadow-sm dark:shadow-none">
            <Loader2 className="w-8 h-8 mx-auto mb-3 text-emerald-400 animate-spin" />
            <p className="text-slate-600 dark:text-slate-400 text-sm">Loading insights...</p>
          </div>
        ) : sortedInsights.length === 0 ? (
          <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-12 text-center shadow-sm dark:shadow-none">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center">
              <Brain className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">No insights available</p>
            <button
              onClick={handleGenerateInsights}
              disabled={isGenerating}
              className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-medium rounded-lg transition-all duration-300 inline-flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Generate Your First Insights
            </button>
          </div>
        ) : (
          sortedInsights.map((insight) => {
            const shouldHighlightStrategy = primaryStrategy && insight.type === 'strategy';
            return (
            <div
              key={insight.id}
              className={`bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 hover:border-emerald-500/30 transition-all shadow-sm dark:shadow-none ${
                !insight.is_read ? 'ring-2 ring-emerald-500/30' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800/50 rounded-xl">
                    {getTypeIcon(insight.type === 'pattern' ? 'pattern_recognition' : insight.type === 'performance' ? 'performance_analysis' : insight.type === 'strategy' ? 'strategy_suggestion' : insight.type as any)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {insight.title}
                      </h3>
                      {!insight.is_read && (
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
                    {shouldHighlightStrategy && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(primaryStrategy.alignment_focus ?? []).map((focus) => (
                          <span
                            key={`${insight.id}-${focus}`}
                            className="px-2 py-0.5 text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-full"
                          >
                            Focus: {focus}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                      {insight.description}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      {formatDate(insight.generated_at)} • Confidence: {insight.confidence}%
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMarkAsRead(insight.id)}
                    className="p-2 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    <CheckCircle size={20} />
                  </button>
                  <button
                    onClick={() => handleDismiss(insight.id)}
                    className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Analysis */}
              {insight.analysis && (
                <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Analysis:
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{insight.analysis}</p>
                </div>
              )}

              {/* Recommendations */}
              {insight.recommendations && Array.isArray(insight.recommendations) && insight.recommendations.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Recommendations:
                  </p>
                  <ul className="space-y-2">
                    {insight.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <Lightbulb size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Related Symbols */}
              {insight.related_symbols && insight.related_symbols.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Related symbols:
                  </span>
                  <div className="flex gap-2">
                    {insight.related_symbols.map((symbol: string) => (
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
          );
        })
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
  <div className="group relative bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 hover:border-emerald-500/30 transition-all duration-300 overflow-hidden shadow-sm dark:shadow-none">
    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-transparent transition-all duration-300" />
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</span>
        <div className={`p-2.5 rounded-xl ${positive ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
          <Icon className={`w-5 h-5 ${positive ? 'text-emerald-400' : 'text-red-500 dark:text-red-400'}`} />
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  </div>
);

export default AIInsights;
