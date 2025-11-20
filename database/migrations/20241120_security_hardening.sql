-- Migration: Platform security hardening
-- Date: 2024-11-20
-- Moves sensitive subscription logic to the database, tightens RLS, and
-- introduces infrastructure for managing discount codes securely.

SET search_path = public;

-- -----------------------------------------------------------------------------
-- Helper guards
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_safeguarded_search_path()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('search_path', 'public', false);
END;
$$;

-- -----------------------------------------------------------------------------
-- Discount codes infrastructure
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  grants_free_forever BOOLEAN NOT NULL DEFAULT false,
  percent_off NUMERIC(5, 2),
  amount_off NUMERIC(10, 2),
  max_redemptions INTEGER,
  per_user_limit INTEGER DEFAULT 1,
  redemptions_used INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.discount_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_code_id UUID NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (discount_code_id, user_id)
);

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_code_redemptions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.touch_discount_codes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS discount_codes_set_updated_at ON public.discount_codes;
CREATE TRIGGER discount_codes_set_updated_at
  BEFORE UPDATE ON public.discount_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_discount_codes();

-- -----------------------------------------------------------------------------
-- Subscription helpers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_active_subscription(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_free BOOLEAN;
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN TRUE;
  END IF;

  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT subscription_status, is_free_forever
    INTO v_status, v_free
    FROM public.user_preferences
   WHERE user_id = p_user_id;

  IF v_free THEN
    RETURN TRUE;
  END IF;

  IF v_status IN ('active', 'trialing') THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.has_active_subscription(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.prevent_unauthorized_subscription_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_role TEXT := current_setting('request.jwt.claim.role', true);
BEGIN
  IF v_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF (NEW.subscription_status IS DISTINCT FROM OLD.subscription_status)
     OR (NEW.is_free_forever IS DISTINCT FROM OLD.is_free_forever)
     OR (NEW.is_early_adopter IS DISTINCT FROM OLD.is_early_adopter)
     OR (NEW.subscription_price IS DISTINCT FROM OLD.subscription_price)
     OR (NEW.discount_code IS DISTINCT FROM OLD.discount_code)
     OR (NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id)
     OR (NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id) THEN
    RAISE EXCEPTION 'Updating billing fields requires elevated permissions.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_user_preferences_subscription_tampering ON public.user_preferences;
CREATE TRIGGER prevent_user_preferences_subscription_tampering
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_unauthorized_subscription_changes();

-- -----------------------------------------------------------------------------
-- Pricing preview + redemption
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_subscription_pricing(
  p_user_id UUID,
  p_discount_code TEXT DEFAULT NULL
)
RETURNS TABLE (
  pricing_tier TEXT,
  amount NUMERIC(10, 2),
  is_early_adopter BOOLEAN,
  is_free_forever BOOLEAN,
  discount_applied BOOLEAN,
  discount_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preferences public.user_preferences%ROWTYPE;
  v_adopter RECORD;
  v_discount public.discount_codes%ROWTYPE;
  v_amount NUMERIC(10, 2) := 19.99;
  v_is_free BOOLEAN := FALSE;
  v_is_early BOOLEAN := FALSE;
  v_discount_applied BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_preferences
    FROM public.user_preferences
   WHERE user_id = p_user_id;

  IF v_preferences IS NULL THEN
    SELECT * INTO v_preferences FROM public.get_or_create_user_preferences(p_user_id);
  END IF;

  v_is_free := COALESCE(v_preferences.is_free_forever, FALSE);

  SELECT * INTO v_adopter
    FROM public.check_and_set_early_adopter(p_user_id)
   LIMIT 1;

  IF v_adopter IS NOT NULL AND v_adopter.is_early_adopter THEN
    v_is_early := TRUE;
    v_amount := v_adopter.subscription_price;
  END IF;

  IF NOT v_is_early THEN
    v_amount := 19.99;
  END IF;

  IF p_discount_code IS NOT NULL THEN
    SELECT *
      INTO v_discount
      FROM public.discount_codes
     WHERE LOWER(code) = LOWER(p_discount_code)
       AND is_active = TRUE
       AND (starts_at IS NULL OR starts_at <= NOW())
       AND (expires_at IS NULL OR expires_at >= NOW());

    IF FOUND THEN
      v_discount_applied := TRUE;
      IF COALESCE(v_discount.grants_free_forever, FALSE) THEN
        v_is_free := TRUE;
        v_amount := 0;
      ELSIF v_discount.amount_off IS NOT NULL THEN
        v_amount := GREATEST(0, v_amount - v_discount.amount_off);
      ELSIF v_discount.percent_off IS NOT NULL THEN
        v_amount := GREATEST(0, v_amount * (1 - (v_discount.percent_off / 100)));
      END IF;
    END IF;
  END IF;

  IF v_is_free THEN
    v_amount := 0;
  END IF;

  RETURN QUERY
  SELECT
    CASE
      WHEN v_is_free THEN 'free_forever'
      WHEN v_is_early THEN 'early_adopter'
      ELSE 'regular'
    END AS pricing_tier,
    v_amount,
    v_is_early,
    v_is_free,
    v_discount_applied,
    CASE WHEN v_discount_applied THEN LOWER(p_discount_code) ELSE NULL END;
END;
$$;

REVOKE ALL ON FUNCTION public.get_subscription_pricing(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_subscription_pricing(UUID, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.redeem_discount_code(
  p_user_id UUID,
  p_discount_code TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  grants_free_forever BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_discount public.discount_codes%ROWTYPE;
  v_usage_count INTEGER;
  v_per_user_count INTEGER;
BEGIN
  IF p_discount_code IS NULL OR p_discount_code = '' THEN
    RETURN QUERY SELECT FALSE, 'Discount code is required.', FALSE;
    RETURN;
  END IF;

  SELECT *
    INTO v_discount
    FROM public.discount_codes
   WHERE LOWER(code) = LOWER(p_discount_code)
     AND is_active = TRUE
     AND (starts_at IS NULL OR starts_at <= NOW())
     AND (expires_at IS NULL OR expires_at >= NOW())
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invalid or expired discount code.', FALSE;
    RETURN;
  END IF;

  IF v_discount.max_redemptions IS NOT NULL
     AND v_discount.redemptions_used >= v_discount.max_redemptions THEN
    RETURN QUERY SELECT FALSE, 'This code is no longer available.', FALSE;
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_per_user_count
    FROM public.discount_code_redemptions
   WHERE discount_code_id = v_discount.id
     AND user_id = p_user_id;

  IF v_discount.per_user_limit IS NOT NULL
     AND v_per_user_count >= v_discount.per_user_limit THEN
    RETURN QUERY SELECT FALSE, 'You have already redeemed this code.', FALSE;
    RETURN;
  END IF;

  IF COALESCE(v_discount.grants_free_forever, FALSE) IS FALSE THEN
    RETURN QUERY SELECT FALSE, 'This code cannot be redeemed at this time.', FALSE;
    RETURN;
  END IF;

  PERFORM public.get_or_create_user_preferences(p_user_id);

  UPDATE public.user_preferences
     SET is_free_forever = TRUE,
         discount_code = v_discount.code,
         subscription_price = 0,
         subscription_status = 'active',
         updated_at = NOW()
   WHERE user_id = p_user_id;

  INSERT INTO public.discount_code_redemptions (discount_code_id, user_id)
  VALUES (v_discount.id, p_user_id)
  ON CONFLICT (discount_code_id, user_id) DO NOTHING;

  UPDATE public.discount_codes
     SET redemptions_used = redemptions_used + 1,
         updated_at = NOW()
   WHERE id = v_discount.id;

  RETURN QUERY SELECT TRUE, 'Discount applied successfully.', v_discount.grants_free_forever;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_discount_code(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_discount_code(UUID, TEXT) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Portfolio snapshots table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  portfolio_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
  net_cash_flow NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_market_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_realized_pl NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_unrealized_pl NUMERIC(18, 2) NOT NULL DEFAULT 0,
  daily_pl_change NUMERIC(18, 2),
  daily_pl_percent NUMERIC(9, 4),
  open_positions_count INTEGER NOT NULL DEFAULT 0,
  total_positions_count INTEGER NOT NULL DEFAULT 0,
  positions_breakdown JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_date
  ON public.portfolio_snapshots (user_id, snapshot_date DESC);

CREATE OR REPLACE FUNCTION public.touch_portfolio_snapshots()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS portfolio_snapshots_set_updated_at ON public.portfolio_snapshots;
CREATE TRIGGER portfolio_snapshots_set_updated_at
  BEFORE UPDATE ON public.portfolio_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_portfolio_snapshots();

ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own snapshots" ON public.portfolio_snapshots;
CREATE POLICY "Users can view their own snapshots"
  ON public.portfolio_snapshots
  FOR SELECT
  USING (
    (
      auth.uid() = user_id
      AND public.has_active_subscription(user_id)
    ) OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "Users can manage their own snapshots" ON public.portfolio_snapshots;
CREATE POLICY "Users can manage their own snapshots"
  ON public.portfolio_snapshots
  FOR ALL
  USING (
    (
      auth.uid() = user_id
      AND public.has_active_subscription(user_id)
    ) OR current_setting('request.jwt.claim.role', true) = 'service_role'
  )
  WITH CHECK (
    (
      auth.uid() = user_id
      AND public.has_active_subscription(user_id)
    ) OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

-- -----------------------------------------------------------------------------
-- AI insights table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('risk_warning', 'opportunity', 'pattern', 'performance', 'strategy')),
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  analysis TEXT,
  recommendations TEXT[],
  related_symbols TEXT[],
  related_positions TEXT[],
  related_transactions TEXT[],
  confidence NUMERIC(5, 2),
  actionable BOOLEAN DEFAULT FALSE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  user_rating NUMERIC(3, 2),
  user_feedback TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_user ON public.ai_insights(user_id, generated_at DESC);

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their insights" ON public.ai_insights;
CREATE POLICY "Users can view their insights"
  ON public.ai_insights
  FOR SELECT
  USING (
    (
      auth.uid() = user_id
      AND public.has_active_subscription(user_id)
    ) OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "Users can manage their insights" ON public.ai_insights;
CREATE POLICY "Users can manage their insights"
  ON public.ai_insights
  FOR ALL
  USING (
    (
      auth.uid() = user_id
      AND public.has_active_subscription(user_id)
    ) OR current_setting('request.jwt.claim.role', true) = 'service_role'
  )
  WITH CHECK (
    (
      auth.uid() = user_id
      AND public.has_active_subscription(user_id)
    ) OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

-- -----------------------------------------------------------------------------
-- Tighten existing table policies
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_subscription_policy(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    (
      (auth.uid() = p_user_id AND public.has_active_subscription(p_user_id))
      OR current_setting('request.jwt.claim.role', true) = 'service_role'
    )
$$;

-- Helper macro-like DO block to replace policies for a table
DO $$
DECLARE
  policy RECORD;
BEGIN
  FOR policy IN
    SELECT table_name, policy_name, policy_for
      FROM pg_policies
     WHERE schemaname = 'public'
       AND policy_name LIKE 'Users can%their own%'
       AND table_name IN (
         'transactions',
         'positions',
         'strategies',
         'cash_transactions',
         'cash_balances',
         'journal_entries'
       )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', policy.policy_name, policy.table_name);
  END LOOP;

  -- Positions
  EXECUTE $pol$
    CREATE POLICY "Users can view their own positions"
      ON public.positions
      FOR SELECT
      USING (public.enforce_subscription_policy(user_id));
  $pol$;
  EXECUTE $pol$
    CREATE POLICY "Users can insert their own positions"
      ON public.positions
      FOR INSERT
      WITH CHECK (public.enforce_subscription_policy(user_id));
  $pol$;
  EXECUTE $pol$
    CREATE POLICY "Users can update their own positions"
      ON public.positions
      FOR UPDATE
      USING (public.enforce_subscription_policy(user_id));
  $pol$;
  EXECUTE $pol$
    CREATE POLICY "Users can delete their own positions"
      ON public.positions
      FOR DELETE
      USING (public.enforce_subscription_policy(user_id));
  $pol$;

  -- Transactions
  EXECUTE $pol$
    CREATE POLICY "Users can view their own transactions"
      ON public.transactions
      FOR SELECT
      USING (public.enforce_subscription_policy(user_id));
  $pol$;
  EXECUTE $pol$
    CREATE POLICY "Users can insert their own transactions"
      ON public.transactions
      FOR INSERT
      WITH CHECK (public.enforce_subscription_policy(user_id));
  $pol$;
  EXECUTE $pol$
    CREATE POLICY "Users can update their own transactions"
      ON public.transactions
      FOR UPDATE
      USING (public.enforce_subscription_policy(user_id));
  $pol$;
  EXECUTE $pol$
    CREATE POLICY "Users can delete their own transactions"
      ON public.transactions
      FOR DELETE
      USING (public.enforce_subscription_policy(user_id));
  $pol$;

  -- Strategies
  EXECUTE $pol$
    CREATE POLICY "Users can view their own strategies"
      ON public.strategies
      FOR SELECT
      USING (public.enforce_subscription_policy(user_id));
  $pol$;
  EXECUTE $pol$
    CREATE POLICY "Users can insert their own strategies"
      ON public.strategies
      FOR INSERT
      WITH CHECK (public.enforce_subscription_policy(user_id));
  $pol$;
  EXECUTE $pol$
    CREATE POLICY "Users can update their own strategies"
      ON public.strategies
      FOR UPDATE
      USING (public.enforce_subscription_policy(user_id));
  $pol$;
  EXECUTE $pol$
    CREATE POLICY "Users can delete their own strategies"
      ON public.strategies
      FOR DELETE
      USING (public.enforce_subscription_policy(user_id));
  $pol$;

  -- Cash transactions
  EXECUTE $pol$
    CREATE POLICY "Users can view their own cash transactions"
      ON public.cash_transactions
      FOR SELECT
      USING (public.enforce_subscription_policy(user_id));
  $pol$;
  EXECUTE $pol$
    CREATE POLICY "Users can insert their own cash transactions"
      ON public.cash_transactions
      FOR INSERT
      WITH CHECK (public.enforce_subscription_policy(user_id));
  $pol$;
  EXECUTE $pol$
    CREATE POLICY "Users can update their own cash transactions"
      ON public.cash_transactions
      FOR UPDATE
      USING (public.enforce_subscription_policy(user_id));
  $pol$;
  EXECUTE $pol$
    CREATE POLICY "Users can delete their own cash transactions"
      ON public.cash_transactions
      FOR DELETE
      USING (public.enforce_subscription_policy(user_id));
  $pol$;

  -- Cash balances
  EXECUTE $pol$
    CREATE POLICY "Users can view their own cash balances"
      ON public.cash_balances
      FOR SELECT
      USING (public.enforce_subscription_policy(user_id));
  $pol$;
  EXECUTE $pol$
    CREATE POLICY "Users can insert their own cash balances"
      ON public.cash_balances
      FOR INSERT
      WITH CHECK (public.enforce_subscription_policy(user_id));
  $pol$;
  EXECUTE $pol$
    CREATE POLICY "Users can update their own cash balances"
      ON public.cash_balances
      FOR UPDATE
      USING (public.enforce_subscription_policy(user_id));
  $pol$;
  EXECUTE $pol$
    CREATE POLICY "Users can delete their own cash balances"
      ON public.cash_balances
      FOR DELETE
      USING (public.enforce_subscription_policy(user_id));
  $pol$;

  -- Journal entries
  EXECUTE $pol$
    CREATE POLICY "Users can view their own journal entries"
      ON public.journal_entries
      FOR SELECT
      USING (public.enforce_subscription_policy(user_id));
  $pol$;
  EXECUTE $pol$
    CREATE POLICY "Users can insert their own journal entries"
      ON public.journal_entries
      FOR INSERT
      WITH CHECK (public.enforce_subscription_policy(user_id));
  $pol$;
  EXECUTE $pol$
    CREATE POLICY "Users can update their own journal entries"
      ON public.journal_entries
      FOR UPDATE
      USING (public.enforce_subscription_policy(user_id));
  $pol$;
  EXECUTE $pol$
    CREATE POLICY "Users can delete their own journal entries"
      ON public.journal_entries
      FOR DELETE
      USING (public.enforce_subscription_policy(user_id));
  $pol$;
END;
$$;

-- -----------------------------------------------------------------------------
-- End of migration
-- -----------------------------------------------------------------------------

