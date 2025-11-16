/**
 * Database Types matching Supabase schema
 * These types represent the actual database tables and their relationships
 */

// ============================================================================
// ENUMS AND COMMON TYPES
// ============================================================================

export type AssetType = 'stock' | 'option' | 'crypto' | 'futures' | 'cash';
export type OptionType = 'call' | 'put';
export type TransactionSide = 'long' | 'short';
export type PositionStatus = 'open' | 'closed' | 'assigned' | 'exercised' | 'expired';
export type StrategyStatus = 'open' | 'closed' | 'partially_closed' | 'assigned' | 'expired';
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type StrategyType =
  | 'single_option'
  | 'covered_call'
  | 'cash_secured_put'
  | 'vertical_spread'
  | 'iron_condor'
  | 'iron_butterfly'
  | 'butterfly'
  | 'straddle'
  | 'strangle'
  | 'calendar_spread'
  | 'diagonal_spread'
  | 'ratio_spread'
  | 'custom';

export type StrategyDirection = 'bullish' | 'bearish' | 'neutral';

// ============================================================================
// TABLE TYPES
// ============================================================================

/**
 * Import table - Tracks CSV import batches
 */
export interface Import {
  id: string;
  user_id: string;
  broker: string;
  file_name: string;
  file_size: number | null;
  status: ImportStatus;
  total_rows: number | null;
  transactions_imported: number;
  duplicates_skipped: number;
  errors: any[];  // JSONB array of error messages
  warnings: any[]; // JSONB array of warnings
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

/**
 * Transaction table - Immutable ledger of all trades
 */
export interface Transaction {
  // Identity
  id: string;
  user_id: string;
  import_id: string | null;

  // Dates
  activity_date: string; // Date (YYYY-MM-DD)
  process_date: string; // Date (YYYY-MM-DD)
  settle_date: string; // Date (YYYY-MM-DD)

  // Instrument
  instrument: string | null; // Broker's symbol notation
  description: string;
  transaction_code: string; // BTO, STO, BTC, STC, Buy, Sell, etc.

  // Classification
  asset_type: AssetType;

  // Option-specific (null for non-options)
  option_type: OptionType | null;
  strike_price: number | null;
  expiration_date: string | null; // Date (YYYY-MM-DD)
  underlying_symbol: string | null;

  // Quantities and pricing
  quantity: number | null;
  price: number | null;
  amount: number; // Total amount (positive = credit, negative = debit)
  fees: number;

  // Transaction classification
  is_opening: boolean | null; // True for BTO/STO, false for BTC/STC
  is_long: boolean | null; // True for BTO/BTC, false for STO/STC

  // Matching (populated by strategy detection)
  position_id: string | null;
  strategy_id: string | null;

  // Metadata
  notes: string | null;
  tags: string[];

  // Audit
  created_at: string; // Timestamptz
  updated_at: string; // Timestamptz
}

/**
 * Strategy table - Groups positions into recognized patterns
 */
export interface Strategy {
  // Identity
  id: string;
  user_id: string;

  // Classification
  strategy_type: StrategyType;

  // Details
  underlying_symbol: string;
  direction: StrategyDirection | null;

  // Legs (denormalized for display)
  leg_count: number;
  legs: StrategyLeg[];

  // Dates
  opened_at: string; // Timestamptz
  expiration_date: string | null; // Date (YYYY-MM-DD)

  // P/L tracking
  total_opening_cost: number; // Negative = debit, positive = credit
  total_closing_proceeds: number;
  realized_pl: number;
  unrealized_pl: number;

  // Risk calculations
  max_risk: number | null;
  max_profit: number | null;
  breakeven_points: number[];

  // Status
  status: StrategyStatus;

  // Metadata
  notes: string | null;
  tags: string[];

  // Adjustments
  is_adjustment: boolean;
  original_strategy_id: string | null;
  adjusted_from_strategy_id: string | null;

  // Audit
  created_at: string; // Timestamptz
  updated_at: string; // Timestamptz
  closed_at: string | null; // Timestamptz
}

/**
 * Strategy leg structure (stored in JSONB)
 */
export interface StrategyLeg {
  strike: number;
  expiration: string; // Date (YYYY-MM-DD)
  option_type: OptionType;
  side: TransactionSide;
  quantity: number;
  opening_price: number;
  position_id?: string; // Link to position table
}

/**
 * Position table - Individual legs (single option contracts or stock holdings)
 */
export interface Position {
  // Identity
  id: string;
  user_id: string;
  strategy_id: string | null;

  // Position identity
  symbol: string; // Underlying symbol
  asset_type: AssetType;

  // Option-specific (null for stocks)
  option_type: OptionType | null;
  strike_price: number | null;
  expiration_date: string | null; // Date (YYYY-MM-DD)

  // Crypto/Futures-specific fields (null for stocks/options)
  contract_month: string | null; // For futures contracts (e.g., "DEC24", "MAR25")
  multiplier: number | null; // Contract multiplier (default 100 for options, varies for futures)
  tick_size: number | null; // Minimum price movement
  tick_value: number | null; // Dollar value per tick
  margin_requirement: number | null; // Margin required for futures

  // Position details
  side: TransactionSide;

  // Quantities
  opening_quantity: number;
  current_quantity: number; // Decreases with partial closes

  // Pricing and P/L
  average_opening_price: number;
  total_cost_basis: number; // Negative for short positions receiving credit
  total_closing_amount: number;
  realized_pl: number;
  unrealized_pl: number;

  // Status
  status: PositionStatus;

  // FIFO tracking
  opening_transaction_ids: string[]; // Array of transaction IDs
  closing_transaction_ids: string[]; // Array of transaction IDs

  // Dates
  opened_at: string; // Timestamptz
  closed_at: string | null; // Timestamptz

  // Metadata
  notes: string | null;
  tags: string[];

  // Audit
  created_at: string; // Timestamptz
  updated_at: string; // Timestamptz
}

/**
 * Cash Balance table - Tracks cash balance snapshots over time
 */
export interface CashBalance {
  id: string;
  user_id: string;

  // Balance snapshot date
  balance_date: string; // Date (YYYY-MM-DD)

  // Cash amounts
  available_cash: number; // Cash available for trading
  pending_deposits: number; // Deposits not yet settled
  pending_withdrawals: number; // Withdrawals not yet settled
  margin_used: number; // Margin currently used
  buying_power: number; // Total buying power
  total_cash: number; // Total cash including pending

  // Audit
  created_at: string; // Timestamptz
}

/**
 * Position Match table - FIFO matching records
 */
export interface PositionMatch {
  id: string;
  position_id: string;

  // Transaction references
  opening_transaction_id: string;
  closing_transaction_id: string;

  // Match details
  matched_quantity: number;

  // Pricing
  opening_price: number;
  closing_price: number;

  // P/L
  realized_pl: number;

  // Audit
  matched_at: string; // Timestamptz
}

/**
 * Transaction Codes table - Reference table for transaction codes
 */
export interface TransactionCode {
  trans_code: string; // Primary key
  category: string; // e.g., "Options - Open/Close", "Cash Movement", "Income"
  description: string; // Full description of the transaction code
  in_your_file: boolean; // Whether this code appears in the user's file
  created_at: string; // Timestamptz
}

/**
 * Cash Transactions table - Dedicated table for cash transactions
 */
export interface CashTransaction {
  id: string;
  user_id: string;
  
  // Transaction details
  transaction_code: string; // References transaction_codes(trans_code)
  amount: number;
  description: string | null;
  notes: string | null;
  
  // Dates
  activity_date: string; // Date (YYYY-MM-DD)
  process_date: string; // Date (YYYY-MM-DD)
  settle_date: string; // Date (YYYY-MM-DD)
  
  // Optional symbol for dividends/interest from specific securities
  symbol: string | null;
  
  // Metadata
  tags: string[];
  
  // Audit
  created_at: string; // Timestamptz
  updated_at: string; // Timestamptz
}

// ============================================================================
// INSERT TYPES (for creating new records)
// ============================================================================

export type ImportInsert = Omit<Import, 'id' | 'created_at'>;

export type TransactionInsert = Omit<Transaction, 'id' | 'created_at' | 'updated_at'>;

export type StrategyInsert = Omit<Strategy, 'id' | 'created_at' | 'updated_at' | 'closed_at'>;

export type PositionInsert = Omit<Position, 'id' | 'created_at' | 'updated_at' | 'closed_at'>;

export type PositionMatchInsert = Omit<PositionMatch, 'id' | 'matched_at'>;

export type CashBalanceInsert = Omit<CashBalance, 'id' | 'created_at'>;

export type TransactionCodeInsert = Omit<TransactionCode, 'created_at'>;

export type CashTransactionInsert = Omit<CashTransaction, 'id' | 'created_at' | 'updated_at'>;

// ============================================================================
// UPDATE TYPES (partial updates)
// ============================================================================

export type TransactionUpdate = Partial<Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type StrategyUpdate = Partial<Omit<Strategy, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type PositionUpdate = Partial<Omit<Position, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type CashBalanceUpdate = Partial<Omit<CashBalance, 'id' | 'user_id' | 'created_at'>>;

export type CashTransactionUpdate = Partial<Omit<CashTransaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

// ============================================================================
// VIEW TYPES
// ============================================================================

/**
 * v_open_positions view
 */
export interface OpenPositionView extends Position {
  strategy_type: StrategyType | null;
  strategy_direction: StrategyDirection | null;
  strategy_max_risk: number | null;
  strategy_max_profit: number | null;
  transaction_count: number;
  total_transacted: number;
}

/**
 * v_strategy_summary view
 */
export interface StrategySummaryView extends Strategy {
  position_count: number;
  total_position_pl: number | null;
  current_pl: number;
}

// ============================================================================
// QUERY FILTER TYPES
// ============================================================================

export interface TransactionFilters {
  user_id?: string;
  asset_type?: AssetType;
  underlying_symbol?: string;
  transaction_code?: string;
  start_date?: string;
  end_date?: string;
  import_id?: string;
}

export interface PositionFilters {
  user_id?: string;
  status?: PositionStatus;
  asset_type?: AssetType;
  symbol?: string;
  strategy_id?: string;
  expiration_date?: string;
}

export interface StrategyFilters {
  user_id?: string;
  status?: StrategyStatus;
  strategy_type?: StrategyType;
  underlying_symbol?: string;
  direction?: StrategyDirection;
}

// ============================================================================
// HELPER TYPES FOR STRATEGY DETECTION
// ============================================================================

/**
 * Grouped transactions for pattern detection
 */
export interface TransactionGroup {
  date: string;
  underlying_symbol: string;
  transactions: Transaction[];
}

/**
 * Detected strategy pattern
 */
export interface DetectedStrategyPattern {
  strategy_type: StrategyType;
  underlying_symbol: string;
  direction: StrategyDirection | null;
  legs: StrategyLeg[];
  transactions: Transaction[];
  opened_at: string;
  expiration_date: string | null;
  total_opening_cost: number;
  max_risk: number | null;
  max_profit: number | null;
  breakeven_points: number[];
  confidence: number; // 0-1 score for pattern match confidence
}

/**
 * Vertical spread detection result
 */
export interface VerticalSpreadPattern {
  long_leg: Transaction;
  short_leg: Transaction;
  strike_width: number;
  net_credit: number;
  spread_type: 'bull_put' | 'bear_call' | 'bull_call' | 'bear_put';
}

/**
 * Iron condor detection result
 */
export interface IronCondorPattern {
  put_spread: {
    short_put: Transaction;
    long_put: Transaction;
  };
  call_spread: {
    short_call: Transaction;
    long_call: Transaction;
  };
  net_credit: number;
  max_risk: number;
}

// ============================================================================
// CALCULATION RESULT TYPES
// ============================================================================

/**
 * P/L calculation result
 */
export interface PLCalculation {
  realized_pl: number;
  unrealized_pl: number;
  total_pl: number;
  return_on_risk: number | null;
  win_rate: number | null;
}

/**
 * Position summary statistics
 */
export interface PositionStatistics {
  total_positions: number;
  open_positions: number;
  closed_positions: number;
  total_realized_pl: number;
  total_unrealized_pl: number;
  avg_win: number;
  avg_loss: number;
  win_rate: number;
  largest_win: number;
  largest_loss: number;
}
