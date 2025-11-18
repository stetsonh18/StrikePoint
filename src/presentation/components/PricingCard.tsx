import { Link } from 'react-router-dom';
import { useEarlyAdopterStatus } from '@/application/hooks/useEarlyAdopterStatus';
import { LoadingSpinner } from './LoadingSpinner';

interface PricingCardProps {
  className?: string;
}

export function PricingCard({ className = '' }: PricingCardProps) {
  const { data: status, isLoading, error } = useEarlyAdopterStatus();

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (error || !status) {
    // Fallback to regular pricing if there's an error
    return (
      <div className={`${className}`}>
        <div className="relative bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/50 rounded-lg p-8 backdrop-blur-sm shadow-lg dark:shadow-none">
          <div className="text-center">
            <div className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">$19.99</div>
            <div className="text-slate-600 dark:text-slate-400 mb-6">per month</div>
            <Link
              to="/signup"
              className="inline-block w-full py-3 px-6 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 dark:from-emerald-400 dark:to-emerald-600 dark:hover:from-emerald-500 dark:hover:to-emerald-700 text-white dark:text-slate-950 font-semibold rounded-md transition-all shadow-glow-sm text-center"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isEarlyAdopterAvailable = status.isAvailable;
  const spotsRemaining = status.spotsRemaining;

  return (
    <div className={`${className}`}>
      <div className="relative bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/50 rounded-lg p-8 backdrop-blur-sm shadow-lg dark:shadow-none">
        {isEarlyAdopterAvailable && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-400 dark:to-emerald-600 text-white dark:text-slate-950 text-xs font-bold px-4 py-1 rounded-full shadow-lg">
              EARLY ADOPTER
            </span>
          </div>
        )}

        <div className="text-center">
          {isEarlyAdopterAvailable ? (
            <>
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="text-4xl font-bold text-slate-900 dark:text-slate-100">$9.99</div>
                <div className="text-xl text-slate-400 dark:text-slate-500 line-through">$19.99</div>
              </div>
              <div className="text-slate-600 dark:text-slate-400 mb-2">per month</div>
              {spotsRemaining > 0 && spotsRemaining <= 10 && (
                <div className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold mb-4">
                  Only {spotsRemaining} {spotsRemaining === 1 ? 'spot' : 'spots'} remaining!
                </div>
              )}
              {spotsRemaining > 10 && (
                <div className="text-slate-500 dark:text-slate-500 text-sm mb-4">
                  {spotsRemaining} early adopter {spotsRemaining === 1 ? 'spot' : 'spots'} available
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">$19.99</div>
              <div className="text-slate-600 dark:text-slate-400 mb-6">per month</div>
            </>
          )}

          <Link
            to="/signup"
            className="inline-block w-full py-3 px-6 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 dark:from-emerald-400 dark:to-emerald-600 dark:hover:from-emerald-500 dark:hover:to-emerald-700 text-white dark:text-slate-950 font-semibold rounded-md transition-all shadow-glow-sm text-center"
          >
            {isEarlyAdopterAvailable ? 'Get Early Adopter Pricing' : 'Get Started'}
          </Link>

          {isEarlyAdopterAvailable && (
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-4">
              Lock in this price forever. Cancel anytime.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

