export type StrategyAssetType = 'stock' | 'option' | 'crypto' | 'futures';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type StrategyPlanStatus = 'draft' | 'active' | 'archived';

export interface StrategyPlanQuestion {
  question: string;
  answer: string;
  assetType?: StrategyAssetType;
}

export interface StrategyPlanRoutines {
  morning?: string[] | string;
  pre_market?: string[] | string;
  intraday?: string[] | string;
  evening?: string[] | string;
  weekend?: string[] | string;
}

export interface StrategyPlanGuardrails {
  rules?: Array<{ title: string; description?: string; maxDeviation?: string }>;
  breach_triggers?: Array<{ condition: string; action: string }>;
  focusAreas?: string[];
}

export interface StrategyPlanAISections {
  summary?: string;
  objectives?: string[];
  position_sizing?: Record<string, JsonValue>;
  entry_criteria?: string[];
  exit_criteria?: string[];
  risk_management?: Record<string, JsonValue>;
  playbook?: Record<string, JsonValue>;
  mindset?: Record<string, JsonValue>;
  checklist?: string[] | Record<string, JsonValue>;
  routines?: StrategyPlanRoutines | Record<string, JsonValue>;
  guardrails?: StrategyPlanGuardrails | Record<string, JsonValue>;
  focus_areas?: string[];
}

export interface TradingStrategyPlan {
  id: string;
  user_id: string;
  asset_type: StrategyAssetType;
  plan_name: string;
  description: string | null;
  strategy_style: string | null;
  time_horizon: string | null;
  trade_frequency: string | null;
  risk_per_trade_percent: number | null;
  max_capital_allocation_percent: number | null;
  cash_buffer_percent: number | null;
  max_concurrent_positions: number | null;
  status: StrategyPlanStatus;
  ai_prompt_context: Record<string, JsonValue> | null;
  ai_response: StrategyPlanAISections | Record<string, JsonValue> | null;
  entry_rules: string[] | Record<string, JsonValue> | null;
  exit_rules: string[] | Record<string, JsonValue> | null;
  risk_management_rules: Record<string, JsonValue> | null;
  playbook: Record<string, JsonValue> | null;
  mindset_notes: Record<string, JsonValue> | null;
  checklist: string[] | Record<string, JsonValue> | null;
  routines: StrategyPlanRoutines | Record<string, JsonValue> | null;
  guardrails: StrategyPlanGuardrails | Record<string, JsonValue> | null;
  portfolio_snapshot: Record<string, JsonValue> | null;
  cash_snapshot: Record<string, JsonValue> | null;
  alignment_focus: string[] | null;
  alignment_score: number | null;
  is_primary: boolean;
  generated_with_ai: boolean;
  last_alignment_check: string | null;
  created_at: string;
  updated_at: string;
}

export type StrategyPlanInsert = Omit<TradingStrategyPlan, 'id' | 'created_at' | 'updated_at'>;

export type StrategyPlanUpdate = Partial<
  Omit<TradingStrategyPlan, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'generated_with_ai'>
>;

export interface StrategyPlanFilters {
  asset_type?: StrategyAssetType | StrategyAssetType[];
  status?: StrategyPlanStatus | StrategyPlanStatus[];
  is_primary?: boolean;
}

export interface StrategyPlanGenerationPayload {
  assetType: StrategyAssetType;
  strategyStyle?: string;
  planName?: string;
  timeHorizon?: string;
  tradeFrequency?: string;
  riskTolerance?: string;
  makePrimary?: boolean;
  questions?: StrategyPlanQuestion[];
  portfolioContext?: {
    totalBalance: number;
    cashBalance: number;
    buyingPower: number;
    activePositionsCount: number;
    recentWinRate?: number;
  };
  [key: string]: unknown;
}

export interface StrategyAlignmentSnapshot {
  id: string;
  plan_id: string;
  user_id: string;
  asset_type: StrategyAssetType;
  alignment_score: number | null;
  focus_areas: string[] | null;
  breaches: Array<Record<string, JsonValue>> | null;
  portfolio_metrics: Record<string, JsonValue> | null;
  cash_metrics: Record<string, JsonValue> | null;
  action_items: Array<Record<string, JsonValue>> | null;
  ai_prompt: Record<string, JsonValue> | null;
  ai_response: Record<string, JsonValue> | null;
  created_at: string;
}

export interface StrategyAlignmentResult {
  snapshot: StrategyAlignmentSnapshot;
  aiResult: Record<string, JsonValue>;
}

