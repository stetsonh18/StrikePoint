import { useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  className?: string;
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  className = '',
}: ModalProps) => {
  const containerRef = useFocusTrap(isOpen);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby={description ? 'modal-description' : undefined}
    >
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className={`bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full ${sizeClasses[size]} max-h-[95vh] md:max-h-[90vh] overflow-y-auto ${className}`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 p-3 md:p-6 flex items-center justify-between z-10">
          <div className="flex-1 min-w-0 pr-2">
            <h2 id="modal-title" className="text-lg md:text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {title}
            </h2>
            {description && (
              <p id="modal-description" className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1">
                {description}
              </p>
            )}
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0 touch-target"
              aria-label="Close modal"
            >
              <X className="text-slate-600 dark:text-slate-400" size={20} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-3 md:p-6">{children}</div>
      </div>
    </div>
  );
};

