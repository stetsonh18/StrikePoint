import { Suspense, lazy, ComponentType, ReactElement } from 'react';
import { RouteErrorBoundary } from './RouteErrorBoundary';
import { LoadingSpinner } from './LoadingSpinner';

/**
 * Wrapper component that combines lazy loading, Suspense, and error boundary
 * This ensures proper error handling for lazy-loaded route components
 */
export function createRouteWithErrorBoundary(
  importFn: () => Promise<{ default: ComponentType<unknown> } | ComponentType<unknown>>
) {
  const LazyComponent = lazy(async () => {
    const module = await importFn();
    // Handle both { default: Component } and direct Component exports
    if ('default' in module && module.default) {
      return { default: module.default };
    }
    return { default: module as ComponentType<unknown> };
  });

  return function RouteWithErrorBoundary(): ReactElement {
    return (
      <RouteErrorBoundary>
        <Suspense
          fallback={
            <div className="p-8 flex items-center justify-center min-h-[400px]">
              <LoadingSpinner size="lg" text="Loading page..." />
            </div>
          }
        >
          <LazyComponent />
        </Suspense>
      </RouteErrorBoundary>
    );
  };
}

