-- ============================================================================
-- StrikePoint v4.5 - Consolidated Database Schema
-- ============================================================================
-- This file contains the complete database schema for reference and documentation.
-- All statements use IF NOT EXISTS, so this file is safe to run multiple times.
--
-- IMPORTANT: This is a REFERENCE file. If your database is already set up,
-- you don't need to run this. It's kept for:
--   - Documentation of the database structure
--   - Setting up new environments (dev, staging, etc.)
--   - Understanding table relationships and constraints
--   - Version control of schema changes
--
-- Execution Order: Tables are organized by dependency order. If running fresh,
-- execute sections in the order they appear.
-- ============================================================================

-- ============================================================================
-- SECTION 1: Foundation Tables (No dependencies on other custom tables)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Transaction Codes Table
-- Reference table for all transaction codes used in the system
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transaction_codes (
  trans_code VARCHAR(50) PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  in_your_file BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_codes_category ON transaction_codes(category);

-- ----------------------------------------------------------------------------
-- Imports Table
-- Stores CSV import batch tracking information
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Import metadata
  filename VARCHAR(255) NOT NULL,
  import_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Import stats
  total_rows INTEGER NOT NULL DEFAULT 0,
  successful_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,

  -- Error tracking
  errors JSONB,

  -- Import source/type
  source VARCHAR(50),
  import_type VARCHAR(50),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_imports_user_id ON imports(user_id);
CREATE INDEX IF NOT EXISTS idx_imports_import_date ON imports(import_date);
CREATE INDEX IF NOT EXISTS idx_imports_source ON imports(source);

ALTER TABLE imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own imports"
  ON imports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own imports"
  ON imports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own imports"
  ON imports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own imports"
  ON imports FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Futures Contract Specifications Table
-- Stores contract specifications for futures trading
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS futures_contract_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  exchange TEXT,
  multiplier NUMERIC NOT NULL,
  tick_size NUMERIC NOT NULL,
  tick_value NUMERIC NOT NULL,
  initial_margin NUMERIC,
  maintenance_margin NUMERIC,
  contract_months TEXT[],
  fees_per_contract NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_futures_contract_specs_symbol ON futures_contract_specs(symbol);
CREATE INDEX IF NOT EXISTS idx_futures_contract_specs_active ON futures_contract_specs(is_active);

CREATE OR REPLACE FUNCTION update_futures_contract_specs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER futures_contract_specs_updated_at
  BEFORE UPDATE ON futures_contract_specs
  FOR EACH ROW
  EXECUTE FUNCTION update_futures_contract_specs_updated_at();

-- Seed common futures contracts
INSERT INTO futures_contract_specs (symbol, name, exchange, multiplier, tick_size, tick_value, initial_margin, maintenance_margin, contract_months, fees_per_contract, description)
VALUES
  ('ES', 'E-mini S&P 500', 'CME', 50, 0.25, 12.50, 13200, 12000, ARRAY['H', 'M', 'U', 'Z'], 2.50, 'Most liquid equity index futures contract'),
  ('NQ', 'E-mini Nasdaq-100', 'CME', 20, 0.25, 5.00, 17600, 16000, ARRAY['H', 'M', 'U', 'Z'], 2.50, 'Tech-heavy index futures'),
  ('YM', 'E-mini Dow ($5)', 'CBOT', 5, 1.00, 5.00, 8800, 8000, ARRAY['H', 'M', 'U', 'Z'], 2.50, 'Dow Jones Industrial Average futures'),
  ('RTY', 'E-mini Russell 2000', 'CME', 50, 0.10, 5.00, 6600, 6000, ARRAY['H', 'M', 'U', 'Z'], 2.50, 'Small-cap index futures'),
  ('MES', 'Micro E-mini S&P 500', 'CME', 5, 0.25, 1.25, 1320, 1200, ARRAY['H', 'M', 'U', 'Z'], 0.50, '1/10th size of ES contract'),
  ('MNQ', 'Micro E-mini Nasdaq-100', 'CME', 2, 0.25, 0.50, 1760, 1600, ARRAY['H', 'M', 'U', 'Z'], 0.50, '1/10th size of NQ contract'),
  ('MYM', 'Micro E-mini Dow', 'CBOT', 0.5, 1.00, 0.50, 880, 800, ARRAY['H', 'M', 'U', 'Z'], 0.50, '1/10th size of YM contract'),
  ('M2K', 'Micro E-mini Russell 2000', 'CME', 5, 0.10, 0.50, 660, 600, ARRAY['H', 'M', 'U', 'Z'], 0.50, '1/10th size of RTY contract'),
  ('CL', 'Crude Oil', 'NYMEX', 1000, 0.01, 10.00, 6600, 6000, ARRAY['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z'], 3.00, '1,000 barrels of WTI crude oil'),
  ('NG', 'Natural Gas', 'NYMEX', 10000, 0.001, 10.00, 3300, 3000, ARRAY['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z'], 3.00, '10,000 MMBtu of natural gas'),
  ('RB', 'RBOB Gasoline', 'NYMEX', 42000, 0.0001, 4.20, 5280, 4800, ARRAY['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z'], 3.00, '42,000 gallons of gasoline'),
  ('HO', 'Heating Oil', 'NYMEX', 42000, 0.0001, 4.20, 4620, 4200, ARRAY['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z'], 3.00, '42,000 gallons of heating oil'),
  ('GC', 'Gold', 'COMEX', 100, 0.10, 10.00, 9900, 9000, ARRAY['G', 'J', 'M', 'Q', 'V', 'Z'], 3.00, '100 troy ounces of gold'),
  ('SI', 'Silver', 'COMEX', 5000, 0.005, 25.00, 14300, 13000, ARRAY['H', 'K', 'N', 'U', 'Z'], 3.00, '5,000 troy ounces of silver'),
  ('HG', 'Copper', 'COMEX', 25000, 0.0005, 12.50, 4400, 4000, ARRAY['H', 'K', 'N', 'U', 'Z'], 3.00, '25,000 pounds of copper'),
  ('MGC', 'Micro Gold', 'COMEX', 10, 0.10, 1.00, 990, 900, ARRAY['G', 'J', 'M', 'Q', 'V', 'Z'], 0.50, '10 troy ounces of gold'),
  ('SIL', 'Micro Silver', 'COMEX', 1000, 0.005, 5.00, 2860, 2600, ARRAY['H', 'K', 'N', 'U', 'Z'], 0.50, '1,000 troy ounces of silver'),
  ('ZB', '30-Year Treasury Bond', 'CBOT', 1000, 0.03125, 31.25, 4400, 4000, ARRAY['H', 'M', 'U', 'Z'], 2.00, '$100,000 face value 30-year T-bond'),
  ('ZN', '10-Year Treasury Note', 'CBOT', 1000, 0.015625, 15.625, 2200, 2000, ARRAY['H', 'M', 'U', 'Z'], 2.00, '$100,000 face value 10-year T-note'),
  ('ZF', '5-Year Treasury Note', 'CBOT', 1000, 0.0078125, 7.8125, 1540, 1400, ARRAY['H', 'M', 'U', 'Z'], 2.00, '$100,000 face value 5-year T-note'),
  ('ZT', '2-Year Treasury Note', 'CBOT', 2000, 0.00390625, 7.8125, 880, 800, ARRAY['H', 'M', 'U', 'Z'], 2.00, '$200,000 face value 2-year T-note'),
  ('ZC', 'Corn', 'CBOT', 50, 0.25, 12.50, 1980, 1800, ARRAY['H', 'K', 'N', 'U', 'Z'], 3.00, '5,000 bushels of corn'),
  ('ZS', 'Soybeans', 'CBOT', 50, 0.25, 12.50, 4400, 4000, ARRAY['F', 'H', 'K', 'N', 'Q', 'U', 'X'], 3.00, '5,000 bushels of soybeans'),
  ('ZW', 'Wheat', 'CBOT', 50, 0.25, 12.50, 3300, 3000, ARRAY['H', 'K', 'N', 'U', 'Z'], 3.00, '5,000 bushels of wheat'),
  ('6E', 'Euro FX', 'CME', 125000, 0.00005, 6.25, 2750, 2500, ARRAY['H', 'M', 'U', 'Z'], 2.00, '€125,000 EUR/USD'),
  ('6B', 'British Pound', 'CME', 62500, 0.0001, 6.25, 3300, 3000, ARRAY['H', 'M', 'U', 'Z'], 2.00, '£62,500 GBP/USD'),
  ('6J', 'Japanese Yen', 'CME', 12500000, 0.0000005, 6.25, 3850, 3500, ARRAY['H', 'M', 'U', 'Z'], 2.00, '¥12,500,000 JPY/USD'),
  ('6C', 'Canadian Dollar', 'CME', 100000, 0.00005, 5.00, 1650, 1500, ARRAY['H', 'M', 'U', 'Z'], 2.00, 'CAD$100,000 CAD/USD')
ON CONFLICT (symbol) DO NOTHING;

COMMENT ON TABLE futures_contract_specs IS 'Specifications for futures contracts including margin requirements, multipliers, and tick sizes';

-- ----------------------------------------------------------------------------
-- User Preferences Table
-- Stores user preferences for currency, timezone, and notifications
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Trading preferences
  currency TEXT NOT NULL DEFAULT 'USD',
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  
  -- Notification preferences
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  desktop_notifications BOOLEAN NOT NULL DEFAULT false,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT user_preferences_currency_check CHECK (currency IN ('USD', 'EUR', 'GBP')),
  CONSTRAINT user_preferences_timezone_check CHECK (
    timezone IN (
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Phoenix',
      'Europe/London',
      'Europe/Paris',
      'Asia/Tokyo',
      'Asia/Hong_Kong',
      'Australia/Sydney'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION prevent_unauthorized_subscription_changes()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_user_preferences_subscription_tampering ON public.user_preferences;
CREATE TRIGGER prevent_user_preferences_subscription_tampering
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION prevent_unauthorized_subscription_changes();

CREATE OR REPLACE FUNCTION get_or_create_user_preferences(p_user_id UUID)
RETURNS public.user_preferences AS $$
DECLARE
  v_preferences public.user_preferences;
BEGIN
  SELECT * INTO v_preferences
  FROM public.user_preferences
  WHERE user_id = p_user_id;
  
  IF v_preferences IS NULL THEN
    INSERT INTO public.user_preferences (user_id, currency, timezone, email_notifications, desktop_notifications)
    VALUES (p_user_id, 'USD', 'America/New_York', true, false)
    RETURNING * INTO v_preferences;
  END IF;
  
  RETURN v_preferences;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- Subscription Helpers & Discount Codes
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION has_active_subscription(p_user_id UUID)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

CREATE OR REPLACE FUNCTION touch_discount_codes()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS discount_codes_set_updated_at ON public.discount_codes;
CREATE TRIGGER discount_codes_set_updated_at
  BEFORE UPDATE ON public.discount_codes
  FOR EACH ROW
  EXECUTE FUNCTION touch_discount_codes();

CREATE OR REPLACE FUNCTION get_subscription_pricing(
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
) AS $$
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
  ELSE
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION redeem_discount_code(
  p_user_id UUID,
  p_discount_code TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  grants_free_forever BOOLEAN
) AS $$
DECLARE
  v_discount public.discount_codes%ROWTYPE;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECTION 2: Core Trading Tables (Depend on imports, transaction_codes)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Strategies Table
-- Groups positions into recognized option trading patterns
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Classification
  strategy_type TEXT NOT NULL CHECK (strategy_type IN (
    'single_option',
    'covered_call',
    'cash_secured_put',
    'vertical_spread',
    'iron_condor',
    'iron_butterfly',
    'butterfly',
    'straddle',
    'strangle',
    'calendar_spread',
    'diagonal_spread',
    'ratio_spread',
    'custom'
  )),
  
  -- Details
  underlying_symbol TEXT NOT NULL,
  direction TEXT CHECK (direction IS NULL OR direction IN ('bullish', 'bearish', 'neutral')),
  
  -- Legs (denormalized for display)
  leg_count INTEGER NOT NULL DEFAULT 1,
  legs JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Dates
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expiration_date DATE,
  closed_at TIMESTAMPTZ,
  
  -- P/L tracking
  total_opening_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_closing_proceeds NUMERIC(15, 2) NOT NULL DEFAULT 0,
  realized_pl NUMERIC(15, 2) NOT NULL DEFAULT 0,
  unrealized_pl NUMERIC(15, 2) NOT NULL DEFAULT 0,
  
  -- Risk calculations
  max_risk NUMERIC(15, 2),
  max_profit NUMERIC(15, 2),
  breakeven_points NUMERIC(15, 2)[] DEFAULT '{}',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'partially_closed', 'assigned', 'expired')),
  
  -- Metadata
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Adjustments
  is_adjustment BOOLEAN NOT NULL DEFAULT FALSE,
  original_strategy_id UUID REFERENCES strategies(id) ON DELETE SET NULL,
  adjusted_from_strategy_id UUID REFERENCES strategies(id) ON DELETE SET NULL,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_strategies_user_status ON strategies(user_id, status);
CREATE INDEX IF NOT EXISTS idx_strategies_strategy_type ON strategies(strategy_type);
CREATE INDEX IF NOT EXISTS idx_strategies_underlying_symbol ON strategies(underlying_symbol);
CREATE INDEX IF NOT EXISTS idx_strategies_opened_at ON strategies(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_strategies_expiration_date ON strategies(expiration_date) WHERE expiration_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_strategies_status ON strategies(status);
CREATE INDEX IF NOT EXISTS idx_strategies_original_strategy_id ON strategies(original_strategy_id) WHERE original_strategy_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_strategies_adjusted_from_strategy_id ON strategies(adjusted_from_strategy_id) WHERE adjusted_from_strategy_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_strategies_tags ON strategies USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_strategies_legs ON strategies USING GIN(legs);

CREATE OR REPLACE FUNCTION update_strategies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_strategies_updated_at
  BEFORE UPDATE ON strategies
  FOR EACH ROW
  EXECUTE FUNCTION update_strategies_updated_at();

ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own strategies"
  ON strategies FOR SELECT
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can insert their own strategies"
  ON strategies FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can update their own strategies"
  ON strategies FOR UPDATE
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  )
  WITH CHECK (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can delete their own strategies"
  ON strategies FOR DELETE
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

COMMENT ON TABLE strategies IS 'Groups positions into recognized option trading patterns';
COMMENT ON COLUMN strategies.strategy_type IS 'Type of strategy: single_option, covered_call, vertical_spread, etc.';
COMMENT ON COLUMN strategies.direction IS 'Market direction: bullish, bearish, or neutral';
COMMENT ON COLUMN strategies.legs IS 'JSONB array of strategy legs with strike, expiration, option_type, side, quantity, opening_price';
COMMENT ON COLUMN strategies.total_opening_cost IS 'Total cost to open strategy (negative = debit paid, positive = credit received)';
COMMENT ON COLUMN strategies.breakeven_points IS 'Array of breakeven price points for the strategy';
COMMENT ON COLUMN strategies.is_adjustment IS 'True if this strategy is an adjustment/roll of another strategy';

-- Strategy Summary View
CREATE OR REPLACE VIEW v_strategy_summary AS
SELECT 
  s.*,
  COALESCE(COUNT(p.id) FILTER (WHERE p.status = 'open'), 0)::INTEGER as position_count,
  COALESCE(SUM(p.realized_pl + p.unrealized_pl) FILTER (WHERE p.status = 'open'), 0)::NUMERIC(15, 2) as total_position_pl,
  (s.realized_pl + s.unrealized_pl)::NUMERIC(15, 2) as current_pl
FROM strategies s
LEFT JOIN positions p ON p.strategy_id = s.id
GROUP BY s.id;

GRANT SELECT ON v_strategy_summary TO authenticated;
COMMENT ON VIEW v_strategy_summary IS 'Summary view of strategies with aggregated position counts and P/L';

-- ----------------------------------------------------------------------------
-- Positions Table
-- Stores individual position records for each asset
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('stock', 'option', 'crypto', 'futures')),

  -- Options-specific fields
  expiration_date DATE,
  strike_price DECIMAL(10, 2),
  option_type VARCHAR(4) CHECK (option_type IN ('call', 'put', NULL)),

  -- Futures-specific fields
  contract_month VARCHAR(10),
  contract_year INTEGER,

  -- Position tracking
  quantity DECIMAL(18, 8) NOT NULL,
  average_price DECIMAL(18, 8) NOT NULL,
  realized_pnl DECIMAL(18, 2) DEFAULT 0,

  -- Strategy linkage
  strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,

  -- Status
  is_open BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol);
CREATE INDEX IF NOT EXISTS idx_positions_asset_type ON positions(asset_type);
CREATE INDEX IF NOT EXISTS idx_positions_strategy_id ON positions(strategy_id);
CREATE INDEX IF NOT EXISTS idx_positions_is_open ON positions(is_open);

ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own positions"
  ON positions FOR SELECT
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can insert their own positions"
  ON positions FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can update their own positions"
  ON positions FOR UPDATE
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can delete their own positions"
  ON positions FOR DELETE
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE OR REPLACE FUNCTION update_positions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER positions_updated_at_trigger
  BEFORE UPDATE ON positions
  FOR EACH ROW
  EXECUTE FUNCTION update_positions_updated_at();

-- ----------------------------------------------------------------------------
-- Transactions Table
-- Stores all trade transactions (buys, sells, adjustments, etc.)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('stock', 'option', 'crypto', 'futures')),

  -- Options-specific fields
  expiration_date DATE,
  strike_price DECIMAL(10, 2),
  option_type VARCHAR(4) CHECK (option_type IN ('call', 'put', NULL)),

  -- Futures-specific fields
  contract_month VARCHAR(10),
  contract_year INTEGER,

  -- Transaction details
  transaction_date DATE NOT NULL,
  transaction_code VARCHAR(20) NOT NULL,
  quantity DECIMAL(18, 8) NOT NULL,
  price DECIMAL(18, 8) NOT NULL,
  amount DECIMAL(18, 2) NOT NULL,
  fees DECIMAL(18, 2) DEFAULT 0,

  -- Foreign keys with appropriate cascades
  position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES strategies(id) ON DELETE SET NULL,
  import_id UUID REFERENCES imports(id) ON DELETE SET NULL,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_symbol ON transactions(symbol);
CREATE INDEX IF NOT EXISTS idx_transactions_asset_type ON transactions(asset_type);
CREATE INDEX IF NOT EXISTS idx_transactions_position_id ON transactions(position_id);
CREATE INDEX IF NOT EXISTS idx_transactions_strategy_id ON transactions(strategy_id);
CREATE INDEX IF NOT EXISTS idx_transactions_import_id ON transactions(import_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date ON transactions(transaction_date);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
  ON transactions FOR SELECT
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can insert their own transactions"
  ON transactions FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can update their own transactions"
  ON transactions FOR UPDATE
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can delete their own transactions"
  ON transactions FOR DELETE
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transactions_updated_at_trigger
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transactions_updated_at();

-- ----------------------------------------------------------------------------
-- Position Matches Table
-- Stores FIFO matching records between opening and closing transactions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS position_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Position reference
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,

  -- Transaction references (cascading deletes)
  opening_transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  closing_transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,

  -- Match details
  matched_quantity DECIMAL(18, 8) NOT NULL,
  realized_pnl DECIMAL(18, 2) NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_position_matches_user_id ON position_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_position_matches_position_id ON position_matches(position_id);
CREATE INDEX IF NOT EXISTS idx_position_matches_opening_transaction_id ON position_matches(opening_transaction_id);
CREATE INDEX IF NOT EXISTS idx_position_matches_closing_transaction_id ON position_matches(closing_transaction_id);

ALTER TABLE position_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own position matches"
  ON position_matches FOR SELECT
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can insert their own position matches"
  ON position_matches FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can update their own position matches"
  ON position_matches FOR UPDATE
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can delete their own position matches"
  ON position_matches FOR DELETE
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

-- ============================================================================
-- SECTION 3: Cash Management Tables
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Cash Transactions Table
-- Stores all cash movements (deposits, withdrawals, trade settlements, etc.)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Transaction details
  transaction_date DATE NOT NULL,
  transaction_code VARCHAR(50) NOT NULL,
  description TEXT,
  amount DECIMAL(18, 2) NOT NULL,

  -- Symbol context (if related to a specific asset)
  symbol VARCHAR(20),
  asset_type VARCHAR(20) CHECK (asset_type IN ('stock', 'option', 'crypto', 'futures', NULL)),

  -- Foreign key to transactions (nullable for multi-leg options)
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_transactions_user_id ON cash_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_transaction_date ON cash_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_transaction_code ON cash_transactions(transaction_code);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_symbol ON cash_transactions(symbol);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_transaction_id ON cash_transactions(transaction_id);

ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cash transactions"
  ON cash_transactions FOR SELECT
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can insert their own cash transactions"
  ON cash_transactions FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can update their own cash transactions"
  ON cash_transactions FOR UPDATE
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can delete their own cash transactions"
  ON cash_transactions FOR DELETE
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE OR REPLACE FUNCTION update_cash_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cash_transactions_updated_at_trigger
  BEFORE UPDATE ON cash_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_cash_transactions_updated_at();

-- ----------------------------------------------------------------------------
-- Cash Balances Table
-- Tracks cash balance snapshots over time
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cash_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Balance snapshot date
  balance_date DATE NOT NULL,
  
  -- Cash amounts
  available_cash NUMERIC(15, 2) NOT NULL DEFAULT 0,
  pending_deposits NUMERIC(15, 2) NOT NULL DEFAULT 0,
  pending_withdrawals NUMERIC(15, 2) NOT NULL DEFAULT 0,
  margin_used NUMERIC(15, 2) NOT NULL DEFAULT 0,
  buying_power NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_cash NUMERIC(15, 2) NOT NULL DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT cash_balances_user_date_unique UNIQUE (user_id, balance_date)
);

CREATE INDEX IF NOT EXISTS idx_cash_balances_user_id ON public.cash_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_balances_balance_date ON public.cash_balances(balance_date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_balances_user_date ON public.cash_balances(user_id, balance_date DESC);

ALTER TABLE public.cash_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cash balances"
  ON public.cash_balances FOR SELECT
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can insert their own cash balances"
  ON public.cash_balances FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can update their own cash balances"
  ON public.cash_balances FOR UPDATE
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  )
  WITH CHECK (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can delete their own cash balances"
  ON public.cash_balances FOR DELETE
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

COMMENT ON TABLE public.cash_balances IS 'Tracks cash balance snapshots over time for each user';
COMMENT ON COLUMN public.cash_balances.balance_date IS 'Date of the balance snapshot (YYYY-MM-DD)';
COMMENT ON COLUMN public.cash_balances.available_cash IS 'Cash available for trading';
COMMENT ON COLUMN public.cash_balances.pending_deposits IS 'Deposits not yet settled';
COMMENT ON COLUMN public.cash_balances.pending_withdrawals IS 'Withdrawals not yet settled';
COMMENT ON COLUMN public.cash_balances.margin_used IS 'Margin currently used';
COMMENT ON COLUMN public.cash_balances.buying_power IS 'Total buying power';
COMMENT ON COLUMN public.cash_balances.total_cash IS 'Total cash including pending transactions';

-- ============================================================================
-- SECTION 4: Journal and Analysis Tables
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Journal Entries Table
-- Stores trading journal entries with comprehensive tracking fields
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Core fields
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('pre_trade', 'post_trade', 'lesson_learned', 'strategy', 'general')),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Linked data
  linked_position_ids UUID[] DEFAULT '{}',
  linked_transaction_ids UUID[] DEFAULT '{}',
  linked_symbols TEXT[] DEFAULT '{}',
  
  -- Emotional tracking
  emotions TEXT[] DEFAULT '{}',
  market_condition TEXT,
  
  -- Strategy and setup
  strategy TEXT,
  setup_quality INTEGER CHECK (setup_quality IS NULL OR (setup_quality >= 1 AND setup_quality <= 10)),
  execution_quality INTEGER CHECK (execution_quality IS NULL OR (execution_quality >= 1 AND execution_quality <= 10)),
  
  -- Analysis
  what_went_well TEXT,
  what_went_wrong TEXT,
  lessons_learned TEXT,
  action_items TEXT[] DEFAULT '{}',
  
  -- Attachments
  image_urls TEXT[] DEFAULT '{}',
  chart_urls TEXT[] DEFAULT '{}',
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_date ON journal_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_type ON journal_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tags ON journal_entries USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_journal_entries_emotions ON journal_entries USING GIN(emotions);
CREATE INDEX IF NOT EXISTS idx_journal_entries_linked_symbols ON journal_entries USING GIN(linked_symbols);
CREATE INDEX IF NOT EXISTS idx_journal_entries_is_favorite ON journal_entries(is_favorite) WHERE is_favorite = TRUE;

CREATE OR REPLACE FUNCTION update_journal_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_journal_entries_updated_at();

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own journal entries"
  ON journal_entries FOR SELECT
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can insert their own journal entries"
  ON journal_entries FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can update their own journal entries"
  ON journal_entries FOR UPDATE
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  )
  WITH CHECK (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can delete their own journal entries"
  ON journal_entries FOR DELETE
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

COMMENT ON TABLE journal_entries IS 'Trading journal entries for tracking trades, lessons, and strategies';
COMMENT ON COLUMN journal_entries.entry_type IS 'Type of journal entry: pre_trade, post_trade, lesson_learned, strategy, general';
COMMENT ON COLUMN journal_entries.setup_quality IS 'Quality rating for trade setup (1-10)';
COMMENT ON COLUMN journal_entries.execution_quality IS 'Quality rating for trade execution (1-10)';
COMMENT ON COLUMN journal_entries.linked_position_ids IS 'Array of position IDs linked to this entry';
COMMENT ON COLUMN journal_entries.linked_transaction_ids IS 'Array of transaction IDs linked to this entry';
COMMENT ON COLUMN journal_entries.image_urls IS 'Array of image URLs uploaded to Supabase Storage';
COMMENT ON COLUMN journal_entries.chart_urls IS 'Array of chart URLs uploaded to Supabase Storage';

-- ----------------------------------------------------------------------------
-- Portfolio Snapshots Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
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
  CONSTRAINT portfolio_snapshots_user_date UNIQUE (user_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_date
  ON portfolio_snapshots(user_id, snapshot_date DESC);

CREATE OR REPLACE FUNCTION update_portfolio_snapshots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_portfolio_snapshots_updated_at
  BEFORE UPDATE ON portfolio_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_portfolio_snapshots_updated_at();

ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their snapshots"
  ON portfolio_snapshots FOR SELECT
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can manage their snapshots"
  ON portfolio_snapshots FOR ALL
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  )
  WITH CHECK (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

COMMENT ON TABLE portfolio_snapshots IS 'Historical portfolio time-series for analytics';
COMMENT ON COLUMN portfolio_snapshots.positions_breakdown IS 'JSON breakdown of holdings by asset type';

-- ----------------------------------------------------------------------------
-- AI Insights Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_insights (
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

CREATE INDEX IF NOT EXISTS idx_ai_insights_user ON ai_insights(user_id, generated_at DESC);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their insights"
  ON ai_insights FOR SELECT
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can insert their insights"
  ON ai_insights FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can update their insights"
  ON ai_insights FOR UPDATE
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  )
  WITH CHECK (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can delete their insights"
  ON ai_insights FOR DELETE
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

COMMENT ON TABLE ai_insights IS 'Holds AI-generated insights, warnings, and opportunities per user';
COMMENT ON COLUMN ai_insights.recommendations IS 'List of recommended actions for the user';

-- ----------------------------------------------------------------------------
-- Strategy Hub Tables
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_trading_strategy_plans()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS trading_strategy_plans (
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

CREATE INDEX IF NOT EXISTS idx_trading_strategy_plans_user ON trading_strategy_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_strategy_plans_asset ON trading_strategy_plans(asset_type);
CREATE INDEX IF NOT EXISTS idx_trading_strategy_plans_status ON trading_strategy_plans(status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_trading_strategy_plans_primary
  ON trading_strategy_plans(user_id, asset_type)
  WHERE is_primary = TRUE;

DROP TRIGGER IF EXISTS trg_touch_trading_strategy_plans ON trading_strategy_plans;
CREATE TRIGGER trg_touch_trading_strategy_plans
  BEFORE UPDATE ON trading_strategy_plans
  FOR EACH ROW
  EXECUTE FUNCTION touch_trading_strategy_plans();

ALTER TABLE trading_strategy_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their strategy plans"
  ON trading_strategy_plans FOR SELECT
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can insert their strategy plans"
  ON trading_strategy_plans FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can update their strategy plans"
  ON trading_strategy_plans FOR UPDATE
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  )
  WITH CHECK (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can delete their strategy plans"
  ON trading_strategy_plans FOR DELETE
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

COMMENT ON TABLE trading_strategy_plans IS 'AI-assisted trading strategies with per-asset guardrails and playbooks.';

CREATE TABLE IF NOT EXISTS strategy_alignment_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES trading_strategy_plans(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_strategy_alignment_snapshots_plan ON strategy_alignment_snapshots(plan_id);
CREATE INDEX IF NOT EXISTS idx_strategy_alignment_snapshots_user ON strategy_alignment_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_alignment_snapshots_asset ON strategy_alignment_snapshots(asset_type);

ALTER TABLE strategy_alignment_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their alignment snapshots"
  ON strategy_alignment_snapshots FOR SELECT
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can insert their alignment snapshots"
  ON strategy_alignment_snapshots FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can update their alignment snapshots"
  ON strategy_alignment_snapshots FOR UPDATE
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  )
  WITH CHECK (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "Users can delete their alignment snapshots"
  ON strategy_alignment_snapshots FOR DELETE
  USING (
    (auth.uid() = user_id AND has_active_subscription(user_id))
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

COMMENT ON TABLE strategy_alignment_snapshots IS 'History of AI alignment checks comparing account data to stored strategies.';

-- ============================================================================
-- SECTION 5: Data Seeding (Optional - for reference codes)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Stock Cash Transaction Codes
-- Adds stock-related cash transaction codes to the transaction_codes table
-- Note: These are also set up via npm run setup:stock-codes
-- ----------------------------------------------------------------------------
INSERT INTO transaction_codes (trans_code, category, description, in_your_file)
VALUES 
  ('STOCK_BUY', 'Stock Trade', 'Cash debit from stock purchase', true),
  ('STOCK_SELL', 'Stock Trade', 'Cash credit from stock sale', true)
ON CONFLICT (trans_code) DO UPDATE
SET
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  in_your_file = EXCLUDED.in_your_file;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
-- 
-- Summary of Tables Created:
--   1. transaction_codes - Reference table for transaction codes
--   2. imports - CSV import batch tracking
--   3. futures_contract_specs - Futures contract specifications
--   4. user_preferences - User preferences (currency, timezone, notifications)
--   5. strategies - Trading strategy groupings
--   6. positions - Individual position records
--   7. transactions - All trade transactions
--   8. position_matches - FIFO matching records
--   9. cash_transactions - Cash movement transactions
--  10. cash_balances - Cash balance snapshots
--  11. journal_entries - Trading journal entries
--
-- Views Created:
--   1. v_strategy_summary - Strategy summary with aggregated position data
--
-- All tables have:
--   - Row Level Security (RLS) enabled
--   - Appropriate RLS policies for user data isolation
--   - Indexes for performance
--   - Updated_at triggers where applicable
--   - Foreign key constraints with appropriate cascade behaviors
--
-- ============================================================================

