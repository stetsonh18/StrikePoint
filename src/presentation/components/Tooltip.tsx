import { ReactNode, useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  showIcon?: boolean;
}

/**
 * Tooltip component for displaying helpful information
 */
export function Tooltip({ content, children, position = 'top', className, showIcon = false }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-800 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-800 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-800 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-800 border-t-transparent border-b-transparent border-l-transparent',
  };

  return (
    <div
      className={cn('relative inline-block', className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {showIcon ? (
        <Info className="w-4 h-4 text-slate-400 hover:text-slate-300 cursor-help" />
      ) : (
        children
      )}
      {isVisible && (
        <div
          className={cn(
            'absolute z-50 px-3 py-2 text-sm text-slate-200 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-w-xs',
            positionClasses[position]
          )}
          role="tooltip"
        >
          {content}
          <div
            className={cn('absolute w-0 h-0 border-4', arrowClasses[position])}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}

