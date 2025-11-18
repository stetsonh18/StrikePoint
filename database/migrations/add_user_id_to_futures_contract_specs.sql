-- Migration: Add user_id to futures_contract_specs
-- This migration makes futures contract specs user-specific so each user can have their own margin requirements based on their broker

-- Add user_id column (nullable initially to handle existing data)
ALTER TABLE public.futures_contract_specs
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_futures_contract_specs_user_id ON public.futures_contract_specs(user_id) WHERE user_id IS NOT NULL;

-- Update the unique constraint to include user_id
-- First, drop the existing unique constraint on symbol if it exists
ALTER TABLE public.futures_contract_specs
  DROP CONSTRAINT IF EXISTS futures_contract_specs_symbol_key;

-- Add a unique constraint on (user_id, symbol) to allow same symbol for different users
-- But allow NULL user_id for backward compatibility (though we'll migrate existing data)
CREATE UNIQUE INDEX IF NOT EXISTS idx_futures_contract_specs_user_symbol 
  ON public.futures_contract_specs(user_id, symbol) 
  WHERE user_id IS NOT NULL;

-- For NULL user_id (legacy data), keep symbol unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_futures_contract_specs_symbol_null_user 
  ON public.futures_contract_specs(symbol) 
  WHERE user_id IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.futures_contract_specs.user_id IS 'User ID for user-specific contract specifications. NULL indicates system-wide default specs.';

