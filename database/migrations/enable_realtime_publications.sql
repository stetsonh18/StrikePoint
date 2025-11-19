-- Migration: Enable Realtime Publications for All Tables
-- This ensures that Supabase Realtime is enabled for all tables that need realtime updates
-- 
-- IMPORTANT: In Supabase, realtime is typically enabled by default for tables with RLS.
-- However, you can verify/enable it via:
-- 1. Supabase Dashboard: Database > Replication > Enable for each table
-- 2. Or run this SQL to add tables to the realtime publication
--
-- Note: This migration uses DO blocks to safely add tables to the publication
-- without errors if they're already added

DO $$
BEGIN
  -- Enable realtime for transactions table
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Table transactions already in realtime publication';
  END;

  -- Enable realtime for positions table
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE positions;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Table positions already in realtime publication';
  END;

  -- Enable realtime for cash_transactions table
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE cash_transactions;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Table cash_transactions already in realtime publication';
  END;

  -- Enable realtime for cash_balances table
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE cash_balances;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Table cash_balances already in realtime publication';
  END;

  -- Enable realtime for strategies table
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE strategies;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Table strategies already in realtime publication';
  END;

  -- Enable realtime for journal_entries table
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE journal_entries;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Table journal_entries already in realtime publication';
  END;

  -- Enable realtime for ai_insights table
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE ai_insights;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Table ai_insights already in realtime publication';
  END;

  -- Enable realtime for user_preferences table
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_preferences;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Table user_preferences already in realtime publication';
  END;
END $$;

-- Verify realtime is enabled (optional check)
-- You can run this query to see which tables are in the realtime publication:
-- SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

