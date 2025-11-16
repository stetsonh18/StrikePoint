-- ============================================================================
-- User Preferences Table Setup
-- ============================================================================
-- This table stores user preferences for currency, timezone, and notifications
-- ============================================================================

-- Create user_preferences table
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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- Create updated_at trigger
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

-- Enable Row Level Security
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only view their own preferences
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert their own preferences"
  ON public.user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to get or create user preferences
CREATE OR REPLACE FUNCTION get_or_create_user_preferences(p_user_id UUID)
RETURNS public.user_preferences AS $$
DECLARE
  v_preferences public.user_preferences;
BEGIN
  -- Try to get existing preferences
  SELECT * INTO v_preferences
  FROM public.user_preferences
  WHERE user_id = p_user_id;
  
  -- If not found, create default preferences
  IF v_preferences IS NULL THEN
    INSERT INTO public.user_preferences (user_id, currency, timezone, email_notifications, desktop_notifications)
    VALUES (p_user_id, 'USD', 'America/New_York', true, false)
    RETURNING * INTO v_preferences;
  END IF;
  
  RETURN v_preferences;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

