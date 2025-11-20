import { Component, type ReactNode, type ErrorInfo } from 'react';
import { ErrorDisplay } from './ErrorDisplay';
import { logErrorWithContext } from '@/shared/utils/errorHandler';

interface RouteErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Route-level Error Boundary component
 * Catches errors in route components and displays user-friendly error messages
 */
export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  constructor(props: RouteErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error using error handler
    logErrorWithContext(error, {
      type: 'route-error-boundary',
      componentStack: errorInfo.componentStack,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-8">
          <ErrorDisplay
            title="Page Error"
            message="Something went wrong while loading this page."
            description="The error has been logged. You can try refreshing the page or navigating away and coming back."
            onRetry={this.handleRetry}
            retryLabel="Try Again"
            showRetry={true}
          />
          {import.meta.env.DEV && this.state.error && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-slate-400 mb-2 hover:text-slate-300 transition-colors">
                Error details (dev only)
              </summary>
              <pre className="text-xs bg-slate-900/50 border border-slate-800/50 text-slate-300 p-3 rounded-lg overflow-auto mt-2">
                {this.state.error.toString()}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

