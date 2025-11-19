import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../application/stores/auth.store';
import { LoadingSpinner } from './LoadingSpinner';
import { useNeedsSubscription } from '../../application/hooks/useSubscriptionStatus';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();
  const { data: needsSubscription, isLoading: isLoadingSubscription, error: subscriptionError } = useNeedsSubscription();

  // Allow access to checkout page without subscription check to avoid redirect loops
  const isCheckoutPage = location.pathname === '/checkout' || location.pathname.startsWith('/checkout/');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check subscription status (skip for checkout page)
  if (!isCheckoutPage) {
    if (isLoadingSubscription) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <LoadingSpinner size="lg" text="Checking subscription..." />
        </div>
      );
    }

    // If there's an error checking subscription, be conservative and require checkout
    if (subscriptionError) {
      // Log error but still redirect to checkout for security
      console.error('Error checking subscription status:', subscriptionError);
      return <Navigate to="/checkout" replace />;
    }

    // Redirect to checkout if user needs subscription
    // needsSubscription should be a boolean after loading completes
    if (needsSubscription === true) {
      return <Navigate to="/checkout" replace />;
    }
    
    // If needsSubscription is undefined after loading, something went wrong
    // Be conservative and require checkout for security
    if (needsSubscription === undefined) {
      console.warn('Subscription status check returned undefined, requiring checkout');
      return <Navigate to="/checkout" replace />;
    }
  }

  return <>{children}</>;
}
