import { ReactNode } from 'react';
import { useAuthStore } from '../../application/stores/auth.store';
import { LoadingSpinner } from './LoadingSpinner';
import { Landing } from '../pages/Landing';

interface HomeRouteProps {
  children: ReactNode;
}

/**
 * HomeRoute component that shows Landing page for unauthenticated users
 * and the protected app content for authenticated users
 */
export function HomeRoute({ children }: HomeRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return <>{children}</>;
}

