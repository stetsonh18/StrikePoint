/**
 * Zod Validation Schemas
 * 
 * Provides runtime validation for all data types using Zod.
 * These schemas ensure data integrity before database operations.
 */

import { z } from 'zod';
import { ValidationError } from './errorHandler';

// ============================================================================
// COMMON VALIDATION HELPERS
// ============================================================================

/**
 * Date string validation (YYYY-MM-DD format)
 */
const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: 'Date must be in YYYY-MM-DD format',
});

/**
 * UUID validation
 */
const uuidSchema = z.string().uuid({
  message: 'Must be a valid UUID',
});

/**
 * Asset type enum
 */
const assetTypeSchema = z.enum(['stock', 'option', 'crypto', 'futures', 'cash']);

/**
 * Option type enum
 */
const optionTypeSchema = z.enum(['call', 'put']);

// ============================================================================
// TRANSACTION SCHEMAS
// ============================================================================

/**
 * Transaction Insert Schema
 * Validates data before creating a new transaction
 */
export const TransactionInsertSchema = z.object({
  user_id: uuidSchema,
  import_id: uuidSchema.nullable().optional(),
  
  // Dates
  activity_date: dateStringSchema,
  process_date: dateStringSchema,
  settle_date: dateStringSchema,
  
  // Instrument
  instrument: z.string().nullable().optional(),
  description: z.string().min(1, 'Description is required'),
  transaction_code: z.string().min(1, 'Transaction code is required'),
  
  // Classification
  asset_type: assetTypeSchema,
  
  // Option-specific (null for non-options)
  option_type: optionTypeSchema.nullable().optional(),
  strike_price: z.number().positive().nullable().optional(),
  expiration_date: dateStringSchema.nullable().optional(),
  underlying_symbol: z.string().nullable().optional(),
  
  // Quantities and pricing
  quantity: z.number().nullable().optional(),
  price: z.number().nullable().optional(),
  amount: z.number(),
  fees: z.number().default(0),
  
  // Transaction classification
  is_opening: z.boolean().nullable().optional(),
  is_long: z.boolean().nullable().optional(),
  
  // Matching (populated by strategy detection)
  position_id: uuidSchema.nullable().optional(),
  strategy_id: uuidSchema.nullable().optional(),
  
  // Metadata
  notes: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
}).refine(
  (data) => {
    // If asset_type is 'option', option-specific fields should be provided
    if (data.asset_type === 'option') {
      return data.option_type !== null && 
             data.strike_price !== null && 
             data.expiration_date !== null &&
             data.underlying_symbol !== null;
    }
    return true;
  },
  {
    message: 'Option transactions must include option_type, strike_price, expiration_date, and underlying_symbol',
    path: ['asset_type'],
  }
).refine(
  (data) => {
    // If asset_type is not 'option', option-specific fields should be null
    // Exception: futures can have expiration_date
    if (data.asset_type !== 'option') {
      const optionTypeValid = data.option_type === null;
      const strikePriceValid = data.strike_price === null;
      // expiration_date can be set for futures, but option_type and strike_price cannot
      const expirationDateValid = data.asset_type === 'futures' 
        ? true // Futures can have expiration_date
        : data.expiration_date === null; // Other non-options cannot
      return optionTypeValid && strikePriceValid && expirationDateValid;
    }
    return true;
  },
  {
    message: 'Non-option transactions should not include option-specific fields (option_type, strike_price). Futures can have expiration_date.',
    path: ['asset_type'],
  }
);

/**
 * Transaction Update Schema
 * Validates partial updates to transactions
 */
export const TransactionUpdateSchema = z.object({
  import_id: uuidSchema.nullable().optional(),
  
  // Dates
  activity_date: dateStringSchema.optional(),
  process_date: dateStringSchema.optional(),
  settle_date: dateStringSchema.optional(),
  
  // Instrument
  instrument: z.string().nullable().optional(),
  description: z.string().min(1).optional(),
  transaction_code: z.string().min(1).optional(),
  
  // Classification
  asset_type: assetTypeSchema.optional(),
  
  // Option-specific
  option_type: optionTypeSchema.nullable().optional(),
  strike_price: z.number().positive().nullable().optional(),
  expiration_date: dateStringSchema.nullable().optional(),
  underlying_symbol: z.string().nullable().optional(),
  
  // Quantities and pricing
  quantity: z.number().nullable().optional(),
  price: z.number().nullable().optional(),
  amount: z.number().optional(),
  fees: z.number().optional(),
  
  // Transaction classification
  is_opening: z.boolean().nullable().optional(),
  is_long: z.boolean().nullable().optional(),
  
  // Matching
  position_id: uuidSchema.nullable().optional(),
  strategy_id: uuidSchema.nullable().optional(),
  
  // Metadata
  notes: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
}).partial();

// ============================================================================
// POSITION SCHEMAS
// ============================================================================

const positionStatusSchema = z.enum(['open', 'closed', 'assigned', 'exercised', 'expired']);

export const PositionInsertSchema = z.object({
  user_id: uuidSchema,
  symbol: z.string().min(1, 'Symbol is required').max(20),
  asset_type: assetTypeSchema,
  
  // Option-specific fields
  expiration_date: dateStringSchema.nullable().optional(),
  strike_price: z.number().positive().nullable().optional(),
  option_type: optionTypeSchema.nullable().optional(),
  
  // Futures-specific fields
  contract_month: z.string().max(10).nullable().optional(),
  contract_year: z.number().int().min(2000).max(2100).nullable().optional(),
  
  // Position tracking
  quantity: z.number().positive('Quantity must be positive'),
  average_price: z.number().positive('Average price must be positive'),
  realized_pnl: z.number().default(0),
  
  // Strategy linkage
  strategy_id: uuidSchema.nullable().optional(),
  
  // Status
  is_open: z.boolean().default(true),
}).refine(
  (data) => {
    if (data.asset_type === 'option') {
      return data.option_type !== null && 
             data.strike_price !== null && 
             data.expiration_date !== null;
    }
    return true;
  },
  {
    message: 'Option positions must include option_type, strike_price, and expiration_date',
    path: ['asset_type'],
  }
);

export const PositionUpdateSchema = z.object({
  symbol: z.string().min(1).max(20).optional(),
  asset_type: assetTypeSchema.optional(),
  expiration_date: dateStringSchema.nullable().optional(),
  strike_price: z.number().positive().nullable().optional(),
  option_type: optionTypeSchema.nullable().optional(),
  contract_month: z.string().max(10).nullable().optional(),
  contract_year: z.number().int().min(2000).max(2100).nullable().optional(),
  quantity: z.number().positive().optional(),
  average_price: z.number().positive().optional(),
  realized_pnl: z.number().optional(),
  strategy_id: uuidSchema.nullable().optional(),
  is_open: z.boolean().optional(),
  status: positionStatusSchema.optional(),
}).partial();

// ============================================================================
// STRATEGY SCHEMAS
// ============================================================================

const strategyTypeSchema = z.enum([
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
  'custom',
]);

const strategyStatusSchema = z.enum(['open', 'closed', 'partially_closed', 'assigned', 'expired']);
const strategyDirectionSchema = z.enum(['bullish', 'bearish', 'neutral']).nullable();

const strategyLegSchema = z.object({
  position_id: uuidSchema,
  quantity: z.number(),
  option_type: optionTypeSchema.nullable(),
  strike_price: z.number().nullable(),
  expiration_date: dateStringSchema.nullable(),
});

export const StrategyInsertSchema = z.object({
  user_id: uuidSchema,
  strategy_type: strategyTypeSchema,
  underlying_symbol: z.string().min(1, 'Underlying symbol is required'),
  direction: strategyDirectionSchema,
  leg_count: z.number().int().min(1).default(1),
  legs: z.array(strategyLegSchema).default([]),
  opened_at: z.string().datetime().optional(),
  expiration_date: dateStringSchema.nullable().optional(),
  total_opening_cost: z.number().default(0),
  total_closing_proceeds: z.number().default(0),
  realized_pl: z.number().default(0),
  unrealized_pl: z.number().default(0),
  max_risk: z.number().nullable().optional(),
  max_profit: z.number().nullable().optional(),
  breakeven_points: z.array(z.number()).default([]),
  status: strategyStatusSchema.default('open'),
  notes: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  is_adjustment: z.boolean().default(false),
  original_strategy_id: uuidSchema.nullable().optional(),
  adjusted_from_strategy_id: uuidSchema.nullable().optional(),
});

export const StrategyUpdateSchema = z.object({
  strategy_type: strategyTypeSchema.optional(),
  underlying_symbol: z.string().min(1).optional(),
  direction: strategyDirectionSchema.optional(),
  leg_count: z.number().int().min(1).optional(),
  legs: z.array(strategyLegSchema).optional(),
  expiration_date: dateStringSchema.nullable().optional(),
  total_opening_cost: z.number().optional(),
  total_closing_proceeds: z.number().optional(),
  realized_pl: z.number().optional(),
  unrealized_pl: z.number().optional(),
  max_risk: z.number().nullable().optional(),
  max_profit: z.number().nullable().optional(),
  breakeven_points: z.array(z.number()).optional(),
  status: strategyStatusSchema.optional(),
  notes: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  is_adjustment: z.boolean().optional(),
  original_strategy_id: uuidSchema.nullable().optional(),
  adjusted_from_strategy_id: uuidSchema.nullable().optional(),
  closed_at: z.string().datetime().nullable().optional(),
}).partial();

// ============================================================================
// CASH BALANCE SCHEMAS
// ============================================================================

export const CashBalanceInsertSchema = z.object({
  user_id: uuidSchema,
  balance_date: dateStringSchema,
  available_cash: z.number(),
  pending_deposits: z.number().min(0).default(0),
  pending_withdrawals: z.number().min(0).default(0),
  margin_used: z.number().min(0).default(0),
  buying_power: z.number(),
  total_cash: z.number(),
});

export const CashBalanceUpdateSchema = z.object({
  balance_date: dateStringSchema.optional(),
  available_cash: z.number().optional(),
  pending_deposits: z.number().min(0).optional(),
  pending_withdrawals: z.number().min(0).optional(),
  margin_used: z.number().min(0).optional(),
  buying_power: z.number().optional(),
  total_cash: z.number().optional(),
}).partial();

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate data against a Zod schema
 * Throws ValidationError if validation fails
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('; ');
      
      throw new ValidationError(
        context 
          ? `Validation failed in ${context}: ${errorMessage}`
          : `Validation failed: ${errorMessage}`,
        error.issues[0]?.path[0] as string | undefined
      );
    }
    throw error;
  }
}

/**
 * Safe validation - returns result instead of throwing
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error };
}

// ============================================================================
// TYPE INFERENCE
// ============================================================================

export type TransactionInsertInput = z.infer<typeof TransactionInsertSchema>;
export type TransactionUpdateInput = z.infer<typeof TransactionUpdateSchema>;
export type PositionInsertInput = z.infer<typeof PositionInsertSchema>;
export type PositionUpdateInput = z.infer<typeof PositionUpdateSchema>;
export type StrategyInsertInput = z.infer<typeof StrategyInsertSchema>;
export type StrategyUpdateInput = z.infer<typeof StrategyUpdateSchema>;
export type CashBalanceInsertInput = z.infer<typeof CashBalanceInsertSchema>;
export type CashBalanceUpdateInput = z.infer<typeof CashBalanceUpdateSchema>;

