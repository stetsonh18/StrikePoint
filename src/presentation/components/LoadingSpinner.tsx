import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export const LoadingSpinner = ({ size = 'md', className = '', text }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} text-emerald-400 animate-spin`} aria-hidden="true" />
      {text && <span className="text-slate-400 text-sm">{text}</span>}
    </div>
  );
};

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  text?: string;
}

export const LoadingOverlay = ({ isLoading, children, text = 'Loading...' }: LoadingOverlayProps) => {
  if (!isLoading) return <>{children}</>;

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm rounded-2xl z-10 flex items-center justify-center">
        <LoadingSpinner text={text} />
      </div>
      {children}
    </div>
  );
};

