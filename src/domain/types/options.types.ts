/**
 * Options-specific types and interfaces
 */

import type { OptionType } from './asset.types';

/**
 * Option chain entry from MarketData.app API
 */
export interface OptionChainEntry {
  symbol: string; // Option symbol (e.g., AAPL271217C00300000)
  underlying: string; // Underlying symbol (e.g., AAPL)
  expiration: string; // Expiration date (YYYY-MM-DD)
  strike: number;
  option_type: OptionType; // 'call' or 'put'
  bid?: number;
  ask?: number;
  last?: number;
  volume?: number;
  open_interest?: number;
  implied_volatility?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  rho?: number;
}

/**
 * Options chain data grouped by expiration
 */
export interface OptionsChain {
  underlying: string;
  underlying_price?: number;
  expirations: string[]; // Array of expiration dates
  chain: Record<string, OptionChainEntry[]>; // Keyed by expiration date
  last_updated?: string;
}

/**
 * Option quote with Greeks from MarketData.app API
 */
export interface OptionQuote {
  symbol: string;
  underlying: string;
  expiration: string;
  strike: number;
  option_type: OptionType;
  bid?: number;
  ask?: number;
  last?: number;
  volume?: number;
  open_interest?: number;
  implied_volatility?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  rho?: number;
  intrinsic_value?: number;
  extrinsic_value?: number;
  time_value?: number;
  in_the_money?: boolean;
}

/**
 * Multi-leg strategy form data
 */
export interface MultiLegStrategyFormData {
  underlyingSymbol: string;
  legs: OptionLegFormData[];
  transactionDate: string;
  description?: string;
  notes?: string;
  tags?: string[];
}

/**
 * Individual leg data for multi-leg form
 */
export interface OptionLegFormData {
  expiration: string;
  strike: number;
  optionType: OptionType;
  side: 'long' | 'short';
  quantity: number;
  price: number;
}

/**
 * Strategy type suggestion based on legs
 */
export type SuggestedStrategyType =
  | 'single_option'
  | 'covered_call'
  | 'cash_secured_put'
  | 'vertical_spread'
  | 'horizontal_spread'
  | 'diagonal_spread'
  | 'iron_condor'
  | 'iron_butterfly'
  | 'butterfly'
  | 'straddle'
  | 'strangle'
  | 'ratio_spread'
  | 'custom';

/**
 * Strategy detection result
 */
export interface StrategyDetectionResult {
  suggestedType: SuggestedStrategyType;
  confidence: number; // 0-1
  netDebit: number; // Negative for debit, positive for credit
  maxRisk?: number;
  maxProfit?: number;
  breakevenPoints?: number[];
}

