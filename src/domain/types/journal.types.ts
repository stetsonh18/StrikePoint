// Trading Journal Types
export type JournalEntryType = 'pre_trade' | 'post_trade' | 'lesson_learned' | 'strategy' | 'general';
export type EmotionType = 'confident' | 'anxious' | 'excited' | 'fearful' | 'neutral' | 'frustrated' | 'greedy' | 'disciplined';

export interface JournalEntryFilters {
  startDate?: string;
  endDate?: string;
  entryType?: JournalEntryType | 'all';
  emotions?: EmotionType[];
  tags?: string[];
  linkedSymbols?: string[];
  isFavorite?: boolean;
}

// Database insert/update types (matching database schema)
export interface JournalEntryInsert {
  user_id: string;
  title: string;
  content: string;
  entry_type: JournalEntryType;
  entry_date: string;
  linked_position_ids?: string[];
  linked_transaction_ids?: string[];
  linked_symbols?: string[];
  emotions?: EmotionType[];
  market_condition?: string;
  strategy?: string;
  setup_quality?: number;
  execution_quality?: number;
  what_went_well?: string;
  what_went_wrong?: string;
  lessons_learned?: string;
  action_items?: string[];
  image_urls?: string[];
  chart_urls?: string[];
  tags?: string[];
  is_favorite?: boolean;
}

export interface JournalEntryUpdate {
  title?: string;
  content?: string;
  entry_type?: JournalEntryType;
  entry_date?: string;
  linked_position_ids?: string[];
  linked_transaction_ids?: string[];
  linked_symbols?: string[];
  emotions?: EmotionType[];
  market_condition?: string;
  strategy?: string;
  setup_quality?: number;
  execution_quality?: number;
  what_went_well?: string;
  what_went_wrong?: string;
  lessons_learned?: string;
  action_items?: string[];
  image_urls?: string[];
  chart_urls?: string[];
  tags?: string[];
  is_favorite?: boolean;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  entryType: JournalEntryType;
  entryDate: string;

  // Optional linked trades
  linkedTradeIds?: string[];
  linkedSymbols?: string[];

  // Emotional and psychological tracking
  emotions?: EmotionType[];
  marketCondition?: string;

  // Strategy and setup
  strategy?: string;
  setupQuality?: number; // 1-10 rating
  executionQuality?: number; // 1-10 rating

  // Analysis
  whatWentWell?: string;
  whatWentWrong?: string;
  lessonsLearned?: string;
  actionItems?: string[];

  // Attachments
  imageUrls?: string[];
  chartUrls?: string[];

  // Tags for organization
  tags?: string[];

  // Flag for important entries
  isFavorite?: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface JournalStats {
  totalEntries: number;
  entriesThisMonth: number;
  entriesThisWeek: number;
  mostCommonEmotion?: EmotionType;
  averageSetupQuality?: number;
  averageExecutionQuality?: number;
  totalLinkedTrades: number;
}

// For displaying journal entries with linked trade info
export interface JournalEntryWithTrades extends JournalEntry {
  linkedTrades?: {
    id: string;
    symbol: string;
    profitLoss?: number;
    outcome?: string;
  }[];
}
