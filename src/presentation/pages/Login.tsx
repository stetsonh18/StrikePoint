import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../application/stores/auth.store';
import { useToast } from '../../shared/hooks/useToast';
import { ThemeToggle } from '../components/ThemeToggle';
import { Home } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const signIn = useAuthStore((state) => state.signIn);
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signIn(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);

    try {
      await resetPassword(resetEmail);
      setResetSuccess(true);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      setResetError(err.message || 'Failed to send password reset email');
      toast.error('Failed to send password reset email');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-50/50 via-slate-50 to-slate-50 dark:from-emerald-900/20 dark:via-slate-950 dark:to-slate-950 pointer-events-none" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDIpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20 dark:opacity-40 pointer-events-none" />
      
      <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
        <Link
          to="/"
          className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
        >
          <Home className="w-5 h-5" />
          <span className="hidden sm:inline">Home</span>
        </Link>
        <ThemeToggle />
      </div>
      
      <div className="relative max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-accent-500/10 border border-accent-500/20 p-4">
              <p className="text-sm text-accent-400">{error}</p>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-200 dark:border-slate-800/50 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-900/50 rounded-t-md focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:z-10 sm:text-sm transition-all"
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
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-200 dark:border-slate-800/50 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-900/50 rounded-b-md focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:z-10 sm:text-sm transition-all"
                placeholder="Password"
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => {
                setShowResetPassword(true);
                setResetEmail(email);
                setResetSuccess(false);
                setResetError('');
              }}
              className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
            >
              Forgot password?
            </button>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white dark:text-slate-950 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 dark:from-emerald-400 dark:to-emerald-600 dark:hover:from-emerald-500 dark:hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-glow-sm"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/signup"
              className="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
            >
              Don't have an account? Sign up
            </Link>
          </div>
        </form>

        {showResetPassword && (
          <div className="mt-6 p-6 rounded-lg bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/50 backdrop-blur-sm shadow-lg dark:shadow-none">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Reset Password</h3>
              <button
                type="button"
                onClick={() => {
                  setShowResetPassword(false);
                  setResetEmail('');
                  setResetError('');
                  setResetSuccess(false);
                }}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {resetSuccess ? (
              <div className="space-y-4">
                <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-4">
                  <p className="text-sm text-emerald-400">
                    Password reset email sent! Please check your inbox and follow the instructions to reset your password.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPassword(false);
                    setResetEmail('');
                    setResetSuccess(false);
                  }}
                  className="w-full py-2 px-4 border border-slate-300 dark:border-slate-700 text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500/50 transition-all"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {resetError && (
                  <div className="rounded-md bg-accent-500/10 border border-accent-500/20 p-4">
                    <p className="text-sm text-accent-400">{resetError}</p>
                  </div>
                )}
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Email address
                  </label>
                  <input
                    id="reset-email"
                    name="reset-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-2 border border-slate-200 dark:border-slate-800/50 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-900/50 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 sm:text-sm transition-all"
                    placeholder="Enter your email address"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetPassword(false);
                      setResetEmail('');
                      setResetError('');
                    }}
                    className="flex-1 py-2 px-4 border border-slate-300 dark:border-slate-700 text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500/50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white dark:text-slate-950 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 dark:from-emerald-400 dark:to-emerald-600 dark:hover:from-emerald-500 dark:hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {resetLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
