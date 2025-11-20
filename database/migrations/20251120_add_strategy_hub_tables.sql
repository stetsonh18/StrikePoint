-- Migration: Strategy Hub tables for AI-driven trading plans
-- Adds trading_strategy_plans and strategy_alignment_snapshots with RLS policies

-- ============================================================================
-- Helper functions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.touch_trading_strategy_plans()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- trading_strategy_plans table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trading_strategy_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('stock', 'option', 'crypto', 'futures')),
  plan_name TEXT NOT NULL,
  description TEXT,
  strategy_style TEXT CHECK (strategy_style IN ('scalp', 'day', 'swing', 'position', 'income', 'long_term')),
  time_horizon TEXT,
  trade_frequency TEXT,
  risk_per_trade_percent NUMERIC(6, 3),
  max_capital_allocation_percent NUMERIC(6, 3),
  cash_buffer_percent NUMERIC(6, 3),
  max_concurrent_positions INTEGER,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  ai_prompt_context JSONB,
  ai_response JSONB,
  entry_rules JSONB,
  exit_rules JSONB,
  risk_management_rules JSONB,
  playbook JSONB,
  mindset_notes JSONB,
  checklist JSONB,
  routines JSONB,
  guardrails JSONB,
  portfolio_snapshot JSONB,
  cash_snapshot JSONB,
  alignment_focus JSONB,
  alignment_score NUMERIC(5, 2),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  generated_with_ai BOOLEAN NOT NULL DEFAULT false,
  last_alignment_check TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trading_strategy_plans_user ON public.trading_strategy_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_strategy_plans_asset_type ON public.trading_strategy_plans(asset_type);
CREATE INDEX IF NOT EXISTS idx_trading_strategy_plans_status ON public.trading_strategy_plans(status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_trading_strategy_plans_primary
  ON public.trading_strategy_plans(user_id, asset_type)
  WHERE is_primary = true;

DROP TRIGGER IF EXISTS trg_touch_trading_strategy_plans ON public.trading_strategy_plans;
CREATE TRIGGER trg_touch_trading_strategy_plans
  BEFORE UPDATE ON public.trading_strategy_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_trading_strategy_plans();

COMMENT ON TABLE public.trading_strategy_plans IS 'AI-assisted trading strategies with per-asset guardrails and playbooks.';

-- ============================================================================
-- strategy_alignment_snapshots table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.strategy_alignment_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.trading_strategy_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('stock', 'option', 'crypto', 'futures')),
  alignment_score NUMERIC(5, 2),
  focus_areas TEXT[],
  breaches JSONB,
  portfolio_metrics JSONB,
  cash_metrics JSONB,
  action_items JSONB,
  ai_prompt JSONB,
  ai_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strategy_alignment_snapshots_plan ON public.strategy_alignment_snapshots(plan_id);
CREATE INDEX IF NOT EXISTS idx_strategy_alignment_snapshots_user ON public.strategy_alignment_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_alignment_snapshots_asset ON public.strategy_alignment_snapshots(asset_type);

COMMENT ON TABLE public.strategy_alignment_snapshots IS 'History of AI alignment checks comparing account data to stored strategies.';

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE public.trading_strategy_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_alignment_snapshots ENABLE ROW LEVEL SECURITY;

-- Trading Strategy Plans policies
DROP POLICY IF EXISTS "Users can view their strategy plans" ON public.trading_strategy_plans;
CREATE POLICY "Users can view their strategy plans"
  ON public.trading_strategy_plans FOR SELECT
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "Users can insert their strategy plans" ON public.trading_strategy_plans;
CREATE POLICY "Users can insert their strategy plans"
  ON public.trading_strategy_plans FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "Users can update their strategy plans" ON public.trading_strategy_plans;
CREATE POLICY "Users can update their strategy plans"
  ON public.trading_strategy_plans FOR UPDATE
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  )
  WITH CHECK (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "Users can delete their strategy plans" ON public.trading_strategy_plans;
CREATE POLICY "Users can delete their strategy plans"
  ON public.trading_strategy_plans FOR DELETE
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

-- Strategy Alignment Snapshots policies
DROP POLICY IF EXISTS "Users can view their alignment snapshots" ON public.strategy_alignment_snapshots;
CREATE POLICY "Users can view their alignment snapshots"
  ON public.strategy_alignment_snapshots FOR SELECT
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "Users can insert their alignment snapshots" ON public.strategy_alignment_snapshots;
CREATE POLICY "Users can insert their alignment snapshots"
  ON public.strategy_alignment_snapshots FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "Users can update their alignment snapshots" ON public.strategy_alignment_snapshots;
CREATE POLICY "Users can update their alignment snapshots"
  ON public.strategy_alignment_snapshots FOR UPDATE
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  )
  WITH CHECK (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "Users can delete their alignment snapshots" ON public.strategy_alignment_snapshots;
CREATE POLICY "Users can delete their alignment snapshots"
  ON public.strategy_alignment_snapshots FOR DELETE
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

