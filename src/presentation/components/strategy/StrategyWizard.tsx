import { useMemo, useState } from 'react';
import type { StrategyAssetType, StrategyPlanGenerationPayload } from '@/domain/types';
import { cn } from '@/shared/utils/cn';

const assetOptions: { label: string; value: StrategyAssetType }[] = [
  { label: 'Stocks', value: 'stock' },
  { label: 'Options', value: 'option' },
  { label: 'Crypto', value: 'crypto' },
  { label: 'Futures', value: 'futures' },
];

const styleOptions = ['scalp', 'day', 'swing', 'position', 'income', 'long_term'];

const questionBank: Record<
  StrategyAssetType,
  Array<{ id: string; label: string; placeholder: string; assetType?: StrategyAssetType }>
> = {
  stock: [
    { id: 'objective', label: 'What is your primary objective for trading stocks?', placeholder: 'e.g., funded retirement, income stream, extra growth' },
    { id: 'setup', label: 'Describe the setups you have the highest conviction in.', placeholder: 'Breakout from consolidation, gap-and-go, pullback to EMA, etc.' },
    { id: 'risk', label: 'When do you usually reduce size or step aside?', placeholder: 'After 3 red trades, when VIX > 25, etc.' },
  ],
  option: [
    { id: 'optionStyle', label: 'Which option strategies do you deploy most?', placeholder: 'Debit spreads, cash-secured puts, covered calls, etc.', assetType: 'option' },
    { id: 'greeks', label: 'Any Greek or volatility guardrails you want to enforce?', placeholder: 'Delta ranges, max theta decay tolerated, skew preferences' },
    { id: 'expiration', label: 'Preferred expiration structure?', placeholder: '0DTE, weekly, monthly, LEAPS, etc.' },
  ],
  crypto: [
    { id: 'session', label: 'When are you most active in crypto markets?', placeholder: 'London open, NY session overlap, Asian session' },
    { id: 'leverage', label: 'How do you approach leverage and funding rates?', placeholder: 'Max 2x leverage, avoid negative funding when long, etc.' },
    { id: 'onchain', label: 'Any on-chain metrics or catalysts you monitor?', placeholder: 'Stablecoin flows, halving cycles, network activity' },
  ],
  futures: [
    { id: 'contract', label: 'Which contracts or products do you focus on?', placeholder: 'ES, NQ, CL, ZB, calendar spreads, etc.' },
    { id: 'sessionDiscipline', label: 'How do you handle overnight risk or globex moves?', placeholder: 'Flat overnight, hedge with options, partial reductions, etc.' },
    { id: 'riskStops', label: 'Describe your hard stops for futures (daily loss/margin).', placeholder: 'Max 8 handles ES per trade, -$1,000 daily stop, etc.' },
  ],
};

const fallbackQuestions: Array<{ id: string; label: string; placeholder: string; assetType?: StrategyAssetType }> = [
  { id: 'mindset', label: 'If you stray from plan, what usually breaks first?', placeholder: 'Sizing discipline, chasing, revenge trades, etc.' },
  { id: 'focus', label: 'What do you want AI insights to monitor closely?', placeholder: 'Overtrading mornings, ignoring stop discipline, etc.' },
];

interface StrategyWizardProps {
  isGenerating?: boolean;
  onGenerate: (payload: StrategyPlanGenerationPayload) => void;
}

export const StrategyWizard = ({ isGenerating, onGenerate }: StrategyWizardProps) => {
  const [assetType, setAssetType] = useState<StrategyAssetType>('stock');
  const [strategyStyle, setStrategyStyle] = useState('swing');
  const [planName, setPlanName] = useState('');
  const [timeHorizon, setTimeHorizon] = useState('2-5 days');
  const [tradeFrequency, setTradeFrequency] = useState('3-5 trades/week');
  const [riskTolerance, setRiskTolerance] = useState('moderate');
  const [makePrimary, setMakePrimary] = useState(true);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [focusAreas, setFocusAreas] = useState<string[]>(['discipline', 'consistency']);
  const [focusInput, setFocusInput] = useState('');

  const questions = useMemo(() => [...questionBank[assetType], ...fallbackQuestions], [assetType]);

  const handleGenerate = () => {
    const payload: StrategyPlanGenerationPayload = {
      assetType,
      strategyStyle,
      planName: planName || undefined,
      timeHorizon,
      tradeFrequency,
      riskTolerance,
      makePrimary,
      questions: questions.map((question) => ({
        question: question.label,
        answer: responses[question.id]?.trim() || 'Not specified',
        assetType: question.assetType ?? assetType,
      })),
    };

    if (focusAreas.length > 0) {
      payload.questions?.push({
        question: 'Focus areas that AI Insights should monitor',
        answer: focusAreas.join(', '),
        assetType,
      });
    }

    onGenerate(payload);
  };

  const addFocusArea = () => {
    if (!focusInput.trim()) return;
    setFocusAreas((prev) => Array.from(new Set([...prev, focusInput.trim()])));
    setFocusInput('');
  };

  const removeFocusArea = (value: string) => {
    setFocusAreas((prev) => prev.filter((item) => item !== value));
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 rounded-3xl p-6 border border-slate-800 shadow-lg shadow-slate-900/40">
      <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Strategy Lab</p>
            <h2 className="text-3xl font-semibold text-white mt-2">Design your plan of attack</h2>
            <p className="text-slate-400 mt-1">Answer a few adaptive prompts and let AI assemble a guardrailed strategy for this asset.</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            AI Powered
          </span>
        </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Asset focus</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {assetOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAssetType(option.value)}
                  className={cn(
                    'px-3 py-2 rounded-xl border text-sm font-medium transition-all',
                    assetType === option.value
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-glow-sm'
                      : 'border-slate-700 text-slate-300 hover:border-slate-500'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Strategy style</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {styleOptions.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setStrategyStyle(style)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition',
                    strategyStyle === style
                      ? 'bg-white/10 border-white/40 text-white'
                      : 'border-slate-700 text-slate-300 hover:border-slate-500'
                  )}
                >
                  {style.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Plan nickname</label>
            <input
              type="text"
              className="mt-2 w-full rounded-2xl bg-slate-900/60 border border-slate-700 text-white px-3 py-2 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40"
              placeholder="e.g., Theta Guardian"
              value={planName}
              onChange={(event) => setPlanName(event.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Time horizon</label>
            <input
              type="text"
              className="mt-2 w-full rounded-2xl bg-slate-900/60 border border-slate-700 text-white px-3 py-2 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40"
              value={timeHorizon}
              onChange={(event) => setTimeHorizon(event.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Trade frequency</label>
            <input
              type="text"
              className="mt-2 w-full rounded-2xl bg-slate-900/60 border border-slate-700 text-white px-3 py-2 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40"
              value={tradeFrequency}
              onChange={(event) => setTradeFrequency(event.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Risk tolerance</label>
            <select
              className="mt-2 w-full rounded-2xl bg-slate-900/60 border border-slate-700 text-white px-3 py-2 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40"
              value={riskTolerance}
              onChange={(event) => setRiskTolerance(event.target.value)}
            >
              <option value="conservative">Conservative</option>
              <option value="moderate">Moderate</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Questionnaire</label>
          <div className="space-y-3 mt-3">
            {questions.map((question) => (
              <div key={question.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-3">
                <p className="text-sm font-medium text-white">{question.label}</p>
                <textarea
                  className="mt-2 w-full rounded-xl bg-transparent border border-slate-700 text-sm text-slate-200 px-3 py-2 min-h-[70px] focus:border-emerald-400 focus:ring-0"
                  placeholder={question.placeholder}
                  value={responses[question.id] ?? ''}
                  onChange={(event) =>
                    setResponses((prev) => ({
                      ...prev,
                      [question.id]: event.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Focus areas for AI Insights
          </label>
          <div className="flex flex-wrap gap-2 mt-2">
            {focusAreas.map((focus) => (
              <span
                key={focus}
                className="flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-emerald-500/15 text-emerald-100 border border-emerald-400/40"
              >
                {focus}
                <button
                  type="button"
                  className="text-emerald-200 hover:text-white"
                  onClick={() => removeFocusArea(focus)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              className="flex-1 rounded-2xl bg-slate-900/60 border border-slate-700 text-white px-3 py-2 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40"
              placeholder="Add a new focus area"
              value={focusInput}
              onChange={(event) => setFocusInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addFocusArea();
                }
              }}
            />
            <button
              type="button"
              onClick={addFocusArea}
              className="px-3 py-2 text-sm font-semibold rounded-2xl border border-slate-600 text-slate-200 hover:border-emerald-400 hover:text-white transition"
            >
              Add
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={makePrimary}
            onChange={(event) => setMakePrimary(event.target.checked)}
            className="rounded bg-slate-900 border-slate-700 text-emerald-400 focus:ring-emerald-500"
          />
          Set this plan as my primary guardrail for {assetType}
        </label>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full mt-4 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:from-emerald-400 hover:to-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Generating strategy...' : 'Generate AI Strategy'}
        </button>
      </div>
    </div>
  );
};

