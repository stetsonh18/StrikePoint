// Asset Types
export type AssetType = 'stock' | 'option' | 'crypto' | 'futures' | 'cash';
export type OptionType = 'call' | 'put';
export type PositionSide = 'long' | 'short';

// Stock Position
export interface StockPosition {
  id: string;
  userId: string;
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice?: number;
  marketValue?: number;
  unrealizedPL?: number;
  unrealizedPLPercent?: number;
  costBasis: number;
  side: PositionSide;
  createdAt: string;
  updatedAt: string;
}

// Stock Transaction
export interface StockTransaction {
  id: string;
  userId: string;
  symbol: string;
  transactionType: 'buy' | 'sell';
  quantity: number;
  price: number;
  amount: number;
  fees?: number;
  activityDate: string;
  processDate: string;
  settleDate: string;
  createdAt: string;
}

// Option Contract
export interface OptionContract {
  id: string;
  userId: string;
  underlyingSymbol: string;
  optionSymbol: string;
  optionType: OptionType;
  strikePrice: number;
  expirationDate: string;
  quantity: number; // Number of contracts
  multiplier: number; // Usually 100 for standard options, 10 for mini options
  side: PositionSide;
  averagePrice: number; // Price per contract
  currentPrice?: number;
  marketValue?: number;
  unrealizedPL?: number;
  unrealizedPLPercent?: number;
  costBasis: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  impliedVolatility?: number;
  createdAt: string;
  updatedAt: string;
}

// Option Transaction
export type OptionTransactionType =
  | 'BTO' // Buy to Open
  | 'STO' // Sell to Open
  | 'BTC' // Buy to Close
  | 'STC' // Sell to Close
  | 'OEXP' // Option Expiration
  | 'OASGN' // Option Assignment
  | 'OEXCS' // Option Exercise
  | 'OCC'; // Option Cash Component

export interface OptionTransaction {
  id: string;
  userId: string;
  underlyingSymbol: string;
  optionSymbol: string;
  description: string;
  transactionType: OptionTransactionType;
  optionType: OptionType;
  strikePrice: number;
  expirationDate: string;
  quantity: number;
  price?: number;
  amount?: number;
  fees?: number;
  activityDate: string;
  processDate: string;
  settleDate: string;
  createdAt: string;
}

// Crypto Position
export interface CryptoPosition {
  id: string;
  userId: string;
  symbol: string; // BTC, ETH, etc.
  name: string; // Bitcoin, Ethereum, etc.
  quantity: number;
  averagePrice: number;
  currentPrice?: number;
  marketValue?: number;
  unrealizedPL?: number;
  unrealizedPLPercent?: number;
  costBasis: number;
  createdAt: string;
  updatedAt: string;
}

// Crypto Transaction
export interface CryptoTransaction {
  id: string;
  userId: string;
  symbol: string;
  transactionType: 'buy' | 'sell' | 'transfer_in' | 'transfer_out';
  quantity: number;
  price?: number;
  amount: number;
  fees?: number;
  activityDate: string;
  processDate: string;
  settleDate: string;
  notes?: string;
  createdAt: string;
}

// Futures Contract
export interface FuturesContract {
  id: string;
  userId: string;
  symbol: string; // e.g., ES, NQ, CL
  contractName: string; // e.g., E-mini S&P 500
  contractMonth: string; // e.g., DEC24, MAR25
  quantity: number;
  side: PositionSide;
  averagePrice: number;
  currentPrice?: number;
  marketValue?: number;
  unrealizedPL?: number;
  unrealizedPLPercent?: number;
  multiplier: number; // Contract multiplier
  tickSize: number;
  tickValue: number;
  expirationDate: string;
  marginRequirement?: number;
  createdAt: string;
  updatedAt: string;
}

// Futures Transaction
export interface FuturesTransaction {
  id: string;
  userId: string;
  symbol: string;
  contractMonth: string;
  transactionType: 'buy' | 'sell';
  quantity: number;
  price: number;
  amount: number;
  fees?: number;
  activityDate: string;
  processDate: string;
  settleDate: string;
  createdAt: string;
}

// Re-export options types
export type {
  OptionChainEntry,
  OptionsChain,
  OptionQuote,
  MultiLegStrategyFormData,
  OptionLegFormData,
  SuggestedStrategyType,
  StrategyDetectionResult,
} from './options.types';