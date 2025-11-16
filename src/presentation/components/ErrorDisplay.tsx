import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { useToast } from '@/shared/hooks/useToast';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  description?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  retryLabel?: string;
  showRetry?: boolean;
  className?: string;
}

/**
 * Component for displaying user-friendly error messages with retry functionality
 */
export const ErrorDisplay = ({
  title = 'Something went wrong',
  message,
  description,
  onRetry,
  onDismiss,
  retryLabel = 'Try Again',
  showRetry = true,
  className = '',
}: ErrorDisplayProps) => {
  return (
    <div
      className={`bg-gradient-to-br from-red-900/20 to-red-800/10 border border-red-500/30 rounded-2xl p-6 ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-400" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-red-400 mb-1">{title}</h3>
          <p className="text-slate-200 mb-2">{message}</p>
          {description && (
            <p className="text-sm text-slate-400 mb-4">{description}</p>
          )}
          <div className="flex items-center gap-3">
            {showRetry && onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-red-400 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-red-500/50"
              >
                <RefreshCw className="w-4 h-4" />
                {retryLabel}
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-xl text-slate-300 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-slate-500/50"
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4" />
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Compact inline error display for smaller spaces
 */
export const InlineError = ({ message, onRetry, className = '' }: InlineErrorProps) => {
  return (
    <div
      className={`flex items-center justify-between gap-4 p-4 bg-red-900/20 border border-red-500/30 rounded-xl ${className}`}
      role="alert"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
        <p className="text-sm text-red-400 truncate">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex-shrink-0 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-xs font-medium transition-all"
        >
          Retry
        </button>
      )}
    </div>
  );
};

