/**
 * Temporary utility page to fix strategies
 * Access at /fix-strategies
 */

import { useState } from 'react';
import { useAuthStore } from '@/application/stores/auth.store';
import { fixClosedStrategies } from '@/infrastructure/utils/fixClosedStrategies';
import { useNavigate } from 'react-router-dom';

export const FixStrategiesPage = () => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string[]>([]);

  const handleFix = async () => {
    if (!user?.id) {
      setOutput(['Error: Not logged in']);
      return;
    }

    setIsRunning(true);
    setOutput(['Starting fix...']);

    // Capture console.log output
    const originalLog = console.log;
    console.log = (...args) => {
      originalLog(...args);
      setOutput(prev => [...prev, args.join(' ')]);
    };

    try {
      await fixClosedStrategies(user.id);
      setOutput(prev => [...prev, '\n✅ Done! Redirecting to dashboard...']);
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      setOutput(prev => [...prev, `\n❌ Error: ${error}`]);
    } finally {
      console.log = originalLog;
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
          Fix Closed Strategies
        </h1>

        <div className="bg-white dark:bg-slate-900 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
          <p className="text-slate-700 dark:text-slate-300 mb-4">
            This utility will find all strategies where all positions are closed but the strategy
            itself is still marked as "open", and update them with the correct realized P&L and
            closed date.
          </p>

          <button
            onClick={handleFix}
            disabled={isRunning || !user}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
          >
            {isRunning ? 'Running...' : 'Fix Closed Strategies'}
          </button>
        </div>

        {output.length > 0 && (
          <div className="bg-slate-900 text-slate-100 rounded-lg p-6 font-mono text-sm overflow-auto max-h-96">
            {output.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
