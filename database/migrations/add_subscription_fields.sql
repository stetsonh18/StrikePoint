-- Migration: Add subscription and Stripe fields to user_preferences
-- This migration adds fields for Stripe integration, early adopter tracking, and discount codes

-- Add subscription and Stripe-related columns
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS is_early_adopter BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS discount_code TEXT,
  ADD COLUMN IF NOT EXISTS is_free_forever BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid', 'paused')) DEFAULT NULL;

-- Create index for Stripe customer lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_stripe_customer_id ON public.user_preferences(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_preferences_stripe_subscription_id ON public.user_preferences(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_preferences_discount_code ON public.user_preferences(discount_code) WHERE discount_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_preferences_is_early_adopter ON public.user_preferences(is_early_adopter) WHERE is_early_adopter = true;

-- Add comment for documentation
COMMENT ON COLUMN public.user_preferences.is_early_adopter IS 'Whether the user is an early adopter (first 100 users) with locked-in pricing';
COMMENT ON COLUMN public.user_preferences.subscription_price IS 'Monthly subscription price in USD (locked in for early adopters)';
COMMENT ON COLUMN public.user_preferences.stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN public.user_preferences.stripe_subscription_id IS 'Stripe subscription ID for active subscriptions';
COMMENT ON COLUMN public.user_preferences.discount_code IS 'Discount code applied (e.g., "free4ever")';
COMMENT ON COLUMN public.user_preferences.is_free_forever IS 'Whether the user has a lifetime free subscription via discount code';
COMMENT ON COLUMN public.user_preferences.subscription_status IS 'Current subscription status from Stripe';

