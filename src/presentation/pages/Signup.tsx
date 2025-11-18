import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../application/stores/auth.store';
import { EarlyAdopterService } from '../../infrastructure/services/earlyAdopterService';
import { useToast } from '../../shared/hooks/useToast';
import { logger } from '../../shared/utils/logger';
import { ThemeToggle } from '../components/ThemeToggle';

export function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const signUp = useAuthStore((state) => state.signUp);
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data } = await signUp(email, password, fullName);
      
      // Check early adopter status and show message
      if (data?.user) {
        try {
          const earlyAdopterResult = await EarlyAdopterService.checkAndSetEarlyAdopter(data.user.id);
          if (earlyAdopterResult.isEarlyAdopter) {
            toast.success(
              `🎉 Early Adopter! You've locked in $${earlyAdopterResult.subscriptionPrice}/month forever!`,
              { duration: 5000 }
            );
          }
        } catch (earlyAdopterError) {
          // Silently fail - early adopter check shouldn't block signup
          logger.error('Early adopter check failed', earlyAdopterError, { userId: data.user.id });
        }
      }
      
      // Redirect to checkout to start free trial
      toast.success('Account created! Starting your 14-day free trial...', {
        description: 'You\'ll be redirected to checkout.',
      });
      navigate('/checkout');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign up';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-50/50 via-slate-50 to-slate-50 dark:from-emerald-900/20 dark:via-slate-950 dark:to-slate-950 pointer-events-none" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDIpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20 dark:opacity-40 pointer-events-none" />
      
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      
      <div className="relative max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-accent-500/10 border border-accent-500/20 p-4">
              <p className="text-sm text-accent-400">{error}</p>
            </div>
          )}
          <div className="rounded-md shadow-sm space-y-3">
            <div>
              <label htmlFor="full-name" className="sr-only">
                Full Name
              </label>
              <input
                id="full-name"
                name="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-slate-200 dark:border-slate-800/50 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-900/50 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:z-10 sm:text-sm transition-all"
                placeholder="Full Name (optional)"
              />
            </div>
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-slate-200 dark:border-slate-800/50 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-900/50 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:z-10 sm:text-sm transition-all"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-slate-200 dark:border-slate-800/50 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-900/50 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:z-10 sm:text-sm transition-all"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white dark:text-slate-950 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 dark:from-emerald-400 dark:to-emerald-600 dark:hover:from-emerald-500 dark:hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-glow-sm"
            >
              {isLoading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/login"
              className="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
