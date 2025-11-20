import { useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from './infrastructure/api/queryClient';
import { RootLayout } from './presentation/layouts/RootLayout';
import { Login } from './presentation/pages/Login';
import { Signup } from './presentation/pages/Signup';
import { ResetPassword } from './presentation/pages/ResetPassword';
import { Landing } from './presentation/pages/Landing';
import { ProtectedRoute } from './presentation/components/ProtectedRoute';
import { HomeRoute } from './presentation/components/HomeRoute';
import { ErrorBoundary } from './presentation/components/ErrorBoundary';
import { LoadingSpinner } from './presentation/components/LoadingSpinner';
import { useTheme } from './shared/theme/useTheme';
import { useAuthStore } from './application/stores/auth.store';
import { createRouteWithErrorBoundary } from './presentation/components/RouteWithErrorBoundary';
import { RoutePrefetcher } from './presentation/components/RoutePrefetcher';
import { AnalyticsTracker } from './presentation/components/AnalyticsTracker';

// Lazy load routes with error boundaries
const Dashboard = createRouteWithErrorBoundary(() => import('./presentation/pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Analytics = createRouteWithErrorBoundary(() => import('./presentation/pages/Analytics').then(module => ({ default: module.Analytics })));
const Settings = createRouteWithErrorBoundary(() => import('./presentation/pages/Settings').then(module => ({ default: module.Settings })));
const CashTransactions = createRouteWithErrorBoundary(() => import('./presentation/pages/CashTransactions'));
const Stocks = createRouteWithErrorBoundary(() => import('./presentation/pages/Stocks'));
const Options = createRouteWithErrorBoundary(() => import('./presentation/pages/Options'));
const Crypto = createRouteWithErrorBoundary(() => import('./presentation/pages/Crypto'));
const Futures = createRouteWithErrorBoundary(() => import('./presentation/pages/Futures'));
const Journal = createRouteWithErrorBoundary(() => import('./presentation/pages/Journal'));
const AIInsights = createRouteWithErrorBoundary(() => import('./presentation/pages/AIInsights'));
const News = createRouteWithErrorBoundary(() => import('./presentation/pages/News'));
const Checkout = createRouteWithErrorBoundary(() => import('./presentation/pages/Checkout').then(module => ({ default: module.Checkout })));
const Strategy = createRouteWithErrorBoundary(() => import('./presentation/pages/Strategy').then(module => ({ default: module.Strategy })));

function App() {
  useTheme();
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AnalyticsTracker />
          <RoutePrefetcher />
          <Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <LoadingSpinner size="lg" text="Loading..." />
              </div>
            }
          >
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/landing" element={<Landing />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/checkout/success" element={<Checkout />} />
              <Route
                path="/"
                element={
                  <HomeRoute>
                    <ProtectedRoute>
                      <RootLayout />
                    </ProtectedRoute>
                  </HomeRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="cash" element={<CashTransactions />} />
                <Route path="stocks" element={<Stocks />} />
                <Route path="options" element={<Options />} />
                <Route path="crypto" element={<Crypto />} />
                <Route path="futures" element={<Futures />} />
                <Route path="journal" element={<Journal />} />
                <Route path="insights" element={<AIInsights />} />
                <Route path="strategy" element={<Strategy />} />
                <Route path="news" element={<News />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster
          position="top-right"
          expand={true}
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: 'bg-slate-900/95 backdrop-blur-sm border border-slate-800/50 text-slate-100',
              title: 'text-slate-100 font-semibold',
              description: 'text-slate-400 text-sm',
              success: 'border-emerald-500/50',
              error: 'border-red-500/50',
              info: 'border-blue-500/50',
              warning: 'border-yellow-500/50',
              closeButton: 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-slate-200',
            },
          }}
        />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
