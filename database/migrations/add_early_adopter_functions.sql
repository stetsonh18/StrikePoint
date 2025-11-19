-- Migration: Add early adopter database functions
-- This migration creates the functions needed to check and set early adopter status

-- Function to get the current count of early adopters
CREATE OR REPLACE FUNCTION public.get_early_adopter_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.user_preferences up
  WHERE up.is_early_adopter = true;
  
  RETURN COALESCE(v_count, 0);
END;
$$;

COMMENT ON FUNCTION public.get_early_adopter_count() IS 'Returns the current count of users with early adopter status';

-- Function to check and set early adopter status for a user
-- This function atomically checks if spots are available and sets the user's status
CREATE OR REPLACE FUNCTION public.check_and_set_early_adopter(p_user_id UUID)
RETURNS TABLE (
  is_early_adopter BOOLEAN,
  subscription_price NUMERIC(10, 2),
  spots_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_count INTEGER;
  v_limit INTEGER := 100;
  v_early_adopter_price NUMERIC(10, 2) := 9.99;
  v_regular_price NUMERIC(10, 2) := 19.99;
  v_user_is_early_adopter BOOLEAN;
  v_user_subscription_price NUMERIC(10, 2);
  v_spots_remaining INTEGER;
BEGIN
  -- First, check if user is already an early adopter
  SELECT 
    up.is_early_adopter,
    up.subscription_price
  INTO 
    v_user_is_early_adopter,
    v_user_subscription_price
  FROM public.user_preferences up
  WHERE up.user_id = p_user_id;
  
  -- If user is already an early adopter, return their existing status
  IF v_user_is_early_adopter IS TRUE THEN
    SELECT COUNT(*) INTO v_current_count
    FROM public.user_preferences up
    WHERE up.is_early_adopter = true;
    
    v_spots_remaining := GREATEST(0, v_limit - v_current_count);
    
    RETURN QUERY SELECT
      true as is_early_adopter,
      COALESCE(v_user_subscription_price, v_early_adopter_price) as subscription_price,
      v_spots_remaining as spots_remaining;
    RETURN;
  END IF;
  
  -- If user is not an early adopter, check if spots are available
  SELECT COUNT(*) INTO v_current_count
  FROM public.user_preferences up
  WHERE up.is_early_adopter = true;
  
  v_spots_remaining := GREATEST(0, v_limit - v_current_count);
  
  -- If spots are available, set the user as an early adopter
  IF v_spots_remaining > 0 THEN
    -- Ensure user_preferences row exists (create if it doesn't)
    -- Use INSERT ... ON CONFLICT to atomically set early adopter status
    -- Include default values for required fields to ensure INSERT succeeds
    INSERT INTO public.user_preferences (
      user_id, 
      is_early_adopter, 
      subscription_price,
      currency,
      timezone,
      email_notifications,
      desktop_notifications
    )
    VALUES (
      p_user_id, 
      true, 
      v_early_adopter_price,
      'USD',
      'America/New_York',
      true,
      false
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
      is_early_adopter = EXCLUDED.is_early_adopter,
      subscription_price = EXCLUDED.subscription_price;
    
    -- Recalculate spots remaining after update
    SELECT COUNT(*) INTO v_current_count
    FROM public.user_preferences up
    WHERE up.is_early_adopter = true;
    
    v_spots_remaining := GREATEST(0, v_limit - v_current_count);
    
    RETURN QUERY SELECT
      true as is_early_adopter,
      v_early_adopter_price as subscription_price,
      v_spots_remaining as spots_remaining;
  ELSE
    -- No spots available, return regular pricing
    RETURN QUERY SELECT
      false as is_early_adopter,
      v_regular_price as subscription_price,
      0 as spots_remaining;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.check_and_set_early_adopter(UUID) IS 'Atomically checks if early adopter spots are available and sets the user as an early adopter if spots remain. Returns the user''s early adopter status, subscription price, and remaining spots.';

