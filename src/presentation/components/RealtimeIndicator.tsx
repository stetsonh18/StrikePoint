import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface RealtimeIndicatorProps {
  queryKey: string | string[];
  lastUpdated?: Date;
  onRefresh?: () => void;
  showRefreshButton?: boolean;
  className?: string;
}

export function RealtimeIndicator({
  queryKey,
  lastUpdated,
  onRefresh,
  showRefreshButton = true,
  className = '',
}: RealtimeIndicatorProps) {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'updating' | 'success' | 'error'>('idle');

  // Check query status
  useEffect(() => {
    const queryState = queryClient.getQueryState(queryKey);
    if (queryState) {
      if (queryState.isFetching) {
        setStatus('updating');
      } else if (queryState.isError) {
        setStatus('error');
      } else if (queryState.dataUpdatedAt > 0) {
        setStatus('success');
        // Reset to idle after 2 seconds
        const timer = setTimeout(() => setStatus('idle'), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [queryClient, queryKey]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey });
      if (onRefresh) {
        onRefresh();
      }
      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        setIsRefreshing(false);
      }, 1000);
    } catch (error) {
      setStatus('error');
      setIsRefreshing(false);
    }
  };

  const formatLastUpdated = (date?: Date) => {
    if (!date) return null;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleTimeString();
  };

  return (
    <div className={`flex items-center gap-2 text-xs text-slate-400 ${className}`}>
      {/* Status Indicator */}
      {status === 'updating' && (
        <div className="flex items-center gap-1.5">
          <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
          <span className="text-blue-400">Updating...</span>
        </div>
      )}
      {status === 'success' && (
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span className="text-emerald-400">Updated</span>
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3 text-red-400" />
          <span className="text-red-400">Error</span>
        </div>
      )}
      {status === 'idle' && lastUpdated && (
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          <span>Last updated: {formatLastUpdated(lastUpdated)}</span>
        </div>
      )}

      {/* Refresh Button */}
      {showRefreshButton && (
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || status === 'updating'}
          className="p-1.5 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Refresh data"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing || status === 'updating' ? 'animate-spin' : ''}`}
          />
        </button>
      )}
    </div>
  );
}

