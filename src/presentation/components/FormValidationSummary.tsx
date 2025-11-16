import { AlertCircle } from 'lucide-react';

interface FormValidationSummaryProps {
  errors: Record<string, string>;
  className?: string;
}

/**
 * Component to display a summary of all form validation errors
 * Useful for accessibility and providing a quick overview
 */
export const FormValidationSummary: React.FC<FormValidationSummaryProps> = ({
  errors,
  className = '',
}) => {
  const errorCount = Object.keys(errors).length;

  if (errorCount === 0) {
    return null;
  }

  return (
    <div
      className={`bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-2 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="w-5 h-5 text-red-400" />
        <h3 className="text-sm font-semibold text-red-400">
          Please fix the following {errorCount === 1 ? 'error' : 'errors'}:
        </h3>
      </div>
      <ul className="list-disc list-inside space-y-1">
        {Object.entries(errors).map(([field, message]) => (
          <li key={field} className="text-sm text-red-300">
            <span className="font-medium capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}:</span>{' '}
            {message}
          </li>
        ))}
      </ul>
    </div>
  );
};

