-- Migration: Fix positions.status constraint to match TypeScript types
-- The database constraint only allows 'open' and 'closed', but TypeScript types
-- include 'assigned', 'exercised', and 'expired' as well.

-- Drop the existing constraint
ALTER TABLE positions
  DROP CONSTRAINT IF EXISTS positions_status_check;

-- Add the updated constraint with all valid status values
ALTER TABLE positions
  ADD CONSTRAINT positions_status_check 
  CHECK (status IN ('open', 'closed', 'assigned', 'exercised', 'expired'));

-- Add comment for documentation
COMMENT ON COLUMN positions.status IS 'Position status: open, closed, assigned, exercised, or expired';

