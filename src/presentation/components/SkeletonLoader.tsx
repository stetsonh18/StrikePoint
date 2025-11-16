interface SkeletonLoaderProps {
  className?: string;
  lines?: number;
  variant?: 'text' | 'card' | 'circle' | 'stat-card' | 'table-row' | 'position-card';
}

export const SkeletonLoader = ({ className = '', lines = 1, variant = 'text' }: SkeletonLoaderProps) => {
  if (variant === 'circle') {
    return (
      <div className={`animate-pulse rounded-full bg-slate-800/50 ${className}`} aria-hidden="true" />
    );
  }

  if (variant === 'card') {
    return (
      <div className={`animate-pulse bg-gradient-to-br from-slate-900/50 to-slate-800/30 rounded-2xl border border-slate-800/50 p-6 ${className}`} aria-hidden="true">
        <div className="h-4 bg-slate-800/50 rounded w-3/4 mb-4" />
        <div className="h-8 bg-slate-800/50 rounded w-1/2 mb-2" />
        <div className="h-4 bg-slate-800/50 rounded w-full" />
      </div>
    );
  }

  if (variant === 'stat-card') {
    return (
      <div className={`animate-pulse bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6 ${className}`} aria-hidden="true">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 bg-slate-800/50 rounded w-24" />
          <div className="h-10 w-10 bg-slate-800/50 rounded-lg" />
        </div>
        <div className="h-8 bg-slate-800/50 rounded w-32 mb-2" />
        <div className="h-3 bg-slate-800/50 rounded w-20" />
      </div>
    );
  }

  if (variant === 'table-row') {
    return (
      <tr className="animate-pulse" aria-hidden="true">
        <td className="px-6 py-4">
          <div className="h-4 bg-slate-800/50 rounded w-16" />
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-slate-800/50 rounded w-12 ml-auto" />
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-slate-800/50 rounded w-20 ml-auto" />
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-slate-800/50 rounded w-20 ml-auto" />
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-slate-800/50 rounded w-24 ml-auto" />
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-slate-800/50 rounded w-20 ml-auto" />
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-slate-800/50 rounded w-16 ml-auto" />
        </td>
        <td className="px-6 py-4">
          <div className="h-8 bg-slate-800/50 rounded w-16 mx-auto" />
        </td>
      </tr>
    );
  }

  if (variant === 'position-card') {
    return (
      <div className={`animate-pulse p-4 bg-slate-800/30 rounded-lg border border-slate-700/30 ${className}`} aria-hidden="true">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-slate-800/50 rounded-lg" />
            <div>
              <div className="h-4 bg-slate-800/50 rounded w-16 mb-1" />
              <div className="h-3 bg-slate-800/50 rounded w-12" />
            </div>
          </div>
          <div className="h-4 bg-slate-800/50 rounded w-20" />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div className="h-3 bg-slate-800/50 rounded w-full" />
          <div className="h-3 bg-slate-800/50 rounded w-full" />
          <div className="h-3 bg-slate-800/50 rounded w-full" />
        </div>
        <div className="h-3 bg-slate-800/50 rounded w-32 mt-2" />
      </div>
    );
  }

  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-slate-800/50 rounded ${
            i === lines - 1 ? 'w-3/4' : 'w-full'
          } ${i > 0 ? 'mt-2' : ''}`}
          style={{ height: '1rem' }}
        />
      ))}
    </div>
  );
};

interface ArticleSkeletonProps {
  count?: number;
}

export const ArticleSkeleton = ({ count = 3 }: ArticleSkeletonProps) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse bg-gradient-to-br from-slate-900/50 to-slate-800/30 rounded-2xl border border-slate-800/50 p-6"
          aria-hidden="true"
        >
          <div className="h-5 bg-slate-800/50 rounded w-3/4 mb-3" />
          <div className="h-4 bg-slate-800/50 rounded w-full mb-2" />
          <div className="h-4 bg-slate-800/50 rounded w-5/6 mb-4" />
          <div className="flex items-center gap-2">
            <div className="h-3 bg-slate-800/50 rounded w-20" />
            <div className="h-3 bg-slate-800/50 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  );
};

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton = ({ rows = 5, columns = 8 }: TableSkeletonProps) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLoader key={i} variant="table-row" />
      ))}
    </>
  );
};

interface StatCardSkeletonProps {
  count?: number;
}

export const StatCardSkeleton = ({ count = 5 }: StatCardSkeletonProps) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonLoader key={i} variant="stat-card" />
      ))}
    </>
  );
};

interface PositionCardSkeletonProps {
  count?: number;
}

export const PositionCardSkeleton = ({ count = 5 }: PositionCardSkeletonProps) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonLoader key={i} variant="position-card" />
      ))}
    </div>
  );
};

