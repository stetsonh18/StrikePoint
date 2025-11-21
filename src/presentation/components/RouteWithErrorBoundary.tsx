import { Suspense, lazy, ComponentType, ReactElement } from 'react';
import { RouteErrorBoundary } from './RouteErrorBoundary';
import { LoadingSpinner } from './LoadingSpinner';

/**
 * Wrapper component that combines lazy loading, Suspense, and error boundary
 * This ensures proper error handling for lazy-loaded route components
 */
type LoadableComponent = ComponentType<Record<string, unknown>>;

function hasDefaultExport(
  module: { default?: LoadableComponent } | LoadableComponent
): module is { default: LoadableComponent } {
  return typeof module === 'object' && module !== null && 'default' in module && !!module.default;
}

export function createRouteWithErrorBoundary(
  importFn: () => Promise<{ default: LoadableComponent } | LoadableComponent>
) {
  const LazyComponent = lazy(async () => {
    const module = await importFn();
    // Handle both { default: Component } and direct Component exports
    if (hasDefaultExport(module)) {
      return { default: module.default };
    }
    return { default: module as LoadableComponent };
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

