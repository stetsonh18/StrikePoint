import { cn } from '@/shared/utils/cn';

interface SkeletonLoaderProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'chart';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

/**
 * Skeleton loader component for loading states
 */
export function SkeletonLoader({
  className,
  variant = 'rectangular',
  width,
  height,
  lines = 1,
}: SkeletonLoaderProps) {
  const baseClasses = 'animate-pulse bg-slate-800/50 rounded';

  if (variant === 'text') {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(baseClasses, className)}
            style={{
              width: width || '100%',
              height: height || '1rem',
              marginBottom: i < lines - 1 ? '0.5rem' : 0,
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'circular') {
    return (
      <div
        className={cn(baseClasses, 'rounded-full', className)}
        style={{
          width: width || '2rem',
          height: height || width || '2rem',
        }}
      />
    );
  }

  if (variant === 'chart') {
    return (
      <div className={cn('space-y-4', className)}>
        {/* Chart header */}
        <div className={cn(baseClasses, 'h-6 w-48')} />
        {/* Chart area */}
        <div className={cn(baseClasses, 'h-64 w-full')} />
      </div>
    );
  }

  return (
    <div
      className={cn(baseClasses, className)}
      style={{
        width: width || '100%',
        height: height || '1rem',
      }}
    />
  );
}

/**
 * Skeleton for metric cards
 */
export function MetricCardSkeleton() {
  return (
    <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <SkeletonLoader variant="text" width="40%" height="0.875rem" />
        <SkeletonLoader variant="circular" width="1.5rem" height="1.5rem" />
      </div>
      <SkeletonLoader variant="text" width="60%" height="2rem" className="mb-2" />
      <SkeletonLoader variant="text" width="80%" height="0.75rem" />
    </div>
  );
}

/**
 * Skeleton for table rows
 */
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-slate-800/50">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <SkeletonLoader variant="text" width="80%" height="1rem" />
        </td>
      ))}
    </tr>
  );
}

/**
 * Skeleton for chart containers
 */
export function ChartSkeleton({ title }: { title?: string }) {
  return (
    <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6 min-h-[350px]">
      {title && (
        <div className="mb-6">
          <SkeletonLoader variant="text" width="40%" height="1.5rem" />
        </div>
      )}
      <div className="w-full" style={{ minHeight: '300px' }}>
        <SkeletonLoader variant="chart" />
      </div>
    </div>
  );
}

/**
 * Skeleton for news articles
 */
export function ArticleSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/30"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-2">
              <SkeletonLoader variant="text" width="80%" height="1rem" />
              <SkeletonLoader variant="text" width="100%" height="0.875rem" />
              <SkeletonLoader variant="text" width="60%" height="0.75rem" />
            </div>
            <SkeletonLoader variant="circular" width="1rem" height="1rem" />
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * Skeleton for stat cards
 */
export function StatCardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <SkeletonLoader variant="text" width="40%" height="0.875rem" />
            <SkeletonLoader variant="circular" width="2.5rem" height="2.5rem" />
          </div>
          <SkeletonLoader variant="text" width="60%" height="2rem" className="mb-2" />
          <SkeletonLoader variant="text" width="50%" height="0.75rem" />
        </div>
      ))}
    </>
  );
}

/**
 * Skeleton for position cards
 */
export function PositionCardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <SkeletonLoader variant="circular" width="2.5rem" height="2.5rem" />
              <div className="space-y-1">
                <SkeletonLoader variant="text" width="4rem" height="1rem" />
                <SkeletonLoader variant="text" width="3rem" height="0.75rem" />
              </div>
            </div>
            <div className="text-right space-y-1">
              <SkeletonLoader variant="text" width="5rem" height="1.25rem" />
              <SkeletonLoader variant="text" width="4rem" height="0.875rem" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <SkeletonLoader variant="text" width="100%" height="0.75rem" />
            <SkeletonLoader variant="text" width="100%" height="0.75rem" />
            <SkeletonLoader variant="text" width="100%" height="0.75rem" />
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * Skeleton for tables
 */
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-slate-800/50">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="px-6 py-3">
              <SkeletonLoader variant="text" width="80%" height="1rem" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
