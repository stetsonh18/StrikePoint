-- Journal Entries Table
-- Stores trading journal entries with comprehensive tracking fields

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_date ON journal_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_type ON journal_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tags ON journal_entries USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_journal_entries_emotions ON journal_entries USING GIN(emotions);
CREATE INDEX IF NOT EXISTS idx_journal_entries_linked_symbols ON journal_entries USING GIN(linked_symbols);
CREATE INDEX IF NOT EXISTS idx_journal_entries_is_favorite ON journal_entries(is_favorite) WHERE is_favorite = TRUE;

-- Update updated_at trigger
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

-- Enable Row Level Security
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own entries
CREATE POLICY "Users can view their own journal entries"
  ON journal_entries
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own entries
CREATE POLICY "Users can insert their own journal entries"
  ON journal_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own entries
CREATE POLICY "Users can update their own journal entries"
  ON journal_entries
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own entries
CREATE POLICY "Users can delete their own journal entries"
  ON journal_entries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE journal_entries IS 'Trading journal entries for tracking trades, lessons, and strategies';
COMMENT ON COLUMN journal_entries.entry_type IS 'Type of journal entry: pre_trade, post_trade, lesson_learned, strategy, general';
COMMENT ON COLUMN journal_entries.setup_quality IS 'Quality rating for trade setup (1-10)';
COMMENT ON COLUMN journal_entries.execution_quality IS 'Quality rating for trade execution (1-10)';
COMMENT ON COLUMN journal_entries.linked_position_ids IS 'Array of position IDs linked to this entry';
COMMENT ON COLUMN journal_entries.linked_transaction_ids IS 'Array of transaction IDs linked to this entry';
COMMENT ON COLUMN journal_entries.image_urls IS 'Array of image URLs uploaded to Supabase Storage';
COMMENT ON COLUMN journal_entries.chart_urls IS 'Array of chart URLs uploaded to Supabase Storage';

