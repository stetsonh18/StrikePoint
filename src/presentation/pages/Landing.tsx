import { Link } from 'react-router-dom';
import { PricingCard } from '../components/PricingCard';
import { ThemeToggle } from '../components/ThemeToggle';
import { 
  BarChart3, 
  TrendingUp, 
  Brain, 
  DollarSign, 
  Newspaper, 
  Shield,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export function Landing() {
  const features = [
    {
      icon: BarChart3,
      title: 'Portfolio Tracking',
      description: 'Track stocks, options, crypto, and futures all in one place with real-time market data.',
    },
    {
      icon: TrendingUp,
      title: 'Advanced Analytics',
      description: 'Comprehensive performance metrics, win rates, profit factors, and detailed insights.',
    },
    {
      icon: Brain,
      title: 'AI-Powered Insights',
      description: 'Get personalized trading recommendations and risk warnings powered by Claude AI.',
    },
    {
      icon: DollarSign,
      title: 'Cash Management',
      description: 'Track cash balances, transactions, and portfolio performance over time.',
    },
    {
      icon: Newspaper,
      title: 'Market News',
      description: 'Stay updated with the latest market news and trends that matter to your portfolio.',
    },
    {
      icon: Shield,
      title: 'Risk Analysis',
      description: 'Identify concentration risks, expiring options, and portfolio vulnerabilities.',
    },
  ];

  const benefits = [
    'Multi-asset portfolio tracking',
    'Real-time market data integration',
    'AI-powered trading insights',
    'Advanced performance analytics',
    'Options chain analysis',
    'Comprehensive trading journal',
    'Risk management tools',
    'Market news aggregation',
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-50/50 via-slate-50 to-slate-50 dark:from-emerald-900/20 dark:via-slate-950 dark:to-slate-950 pointer-events-none" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDIpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20 dark:opacity-40 pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-950/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-400 dark:to-emerald-600 bg-clip-text text-transparent">
                StrikePoint
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Link
                to="/login"
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 dark:from-emerald-400 dark:to-emerald-600 dark:hover:from-emerald-500 dark:hover:to-emerald-700 text-white dark:text-slate-950 font-semibold rounded-md transition-all shadow-glow-sm"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
              Your Complete Trading Journal
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 mb-4 max-w-3xl mx-auto">
              Track, analyze, and optimize your trading performance with AI-powered insights
              across stocks, options, crypto, and futures.
            </p>
            <p className="text-lg text-emerald-600 dark:text-emerald-400 font-semibold mb-8">
              🎁 Start your 14-day free trial today - No credit card required!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link
                to="/signup"
                className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 dark:from-emerald-400 dark:to-emerald-600 dark:hover:from-emerald-500 dark:hover:to-emerald-700 text-white dark:text-slate-950 font-bold text-lg rounded-md transition-all shadow-glow-sm flex items-center gap-2"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/login"
                className="px-8 py-4 border border-slate-300 dark:border-slate-800/50 hover:border-slate-400 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-md transition-all"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 bg-slate-100/50 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-slate-100">
              Everything You Need to Succeed
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Powerful tools designed for serious traders
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/50 rounded-lg p-6 backdrop-blur-sm hover:border-emerald-500/50 transition-all shadow-sm dark:shadow-none"
                >
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 dark:from-emerald-400/20 dark:to-emerald-600/20 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-slate-100">{feature.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-slate-100">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-2">
              One price. All features. No hidden fees.
            </p>
            <p className="text-base text-emerald-600 dark:text-emerald-400 font-medium">
              ✨ 14-day free trial - Try all features risk-free
            </p>
          </div>

          <div className="flex justify-center">
            <PricingCard className="w-full max-w-md" />
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 bg-slate-100/50 dark:bg-slate-900/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-slate-100">
            Ready to Elevate Your Trading?
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
            Join traders who are already improving their performance with StrikePoint.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 dark:from-emerald-400 dark:to-emerald-600 dark:hover:from-emerald-500 dark:hover:to-emerald-700 text-white dark:text-slate-950 font-bold text-lg rounded-md transition-all shadow-glow-sm"
          >
            Get Started Now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 dark:border-slate-800/50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center text-slate-600 dark:text-slate-400 text-sm">
          <p>&copy; {new Date().getFullYear()} StrikePoint. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

