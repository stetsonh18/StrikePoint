import type { Position, Transaction, CashTransaction } from '@/domain/types';
import type {
  StockPosition,
  OptionContract,
  CryptoPosition,
  FuturesContract,
  StockTransaction,
  OptionTransaction,
  CryptoTransaction,
  FuturesTransaction,
} from '@/domain/types';

/**
 * Transform database Position to StockPosition
 */
export function toStockPosition(position: Position): StockPosition {
  const costBasis = Math.abs(position.total_cost_basis);
  const marketValue = position.current_quantity * (position.average_opening_price || 0); // Would need current price from market data
  const unrealizedPL = position.unrealized_pl || 0;
  const unrealizedPLPercent = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;

  return {
    id: position.id,
    userId: position.user_id,
    symbol: position.symbol,
    quantity: position.current_quantity,
    averagePrice: position.average_opening_price,
    currentPrice: position.average_opening_price, // TODO: Fetch from market data
    marketValue,
    unrealizedPL,
    unrealizedPLPercent,
    costBasis,
    side: position.side,
    createdAt: position.created_at,
    updatedAt: position.updated_at,
  };
}

/**
 * Transform database Position to OptionContract
 */
export function toOptionContract(position: Position): OptionContract {
  if (!position.option_type || !position.strike_price || !position.expiration_date) {
    throw new Error('Invalid option position: missing required fields');
  }

  const multiplier = position.multiplier || 100; // Default to 100 for standard options
  const costBasis = Math.abs(position.total_cost_basis);
  const marketValue = position.current_quantity * multiplier * (position.average_opening_price || 0); // Would need current price
  const unrealizedPL = position.unrealized_pl || 0;
  const unrealizedPLPercent = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;

  return {
    id: position.id,
    userId: position.user_id,
    underlyingSymbol: position.symbol,
    optionSymbol: `${position.symbol}_${position.expiration_date}_${position.option_type.toUpperCase()}_${position.strike_price}`,
    optionType: position.option_type,
    strikePrice: position.strike_price,
    expirationDate: position.expiration_date,
    quantity: position.current_quantity,
    multiplier,
    averagePrice: position.average_opening_price,
    currentPrice: position.average_opening_price, // TODO: Fetch from market data
    marketValue,
    unrealizedPL,
    unrealizedPLPercent,
    costBasis,
    side: position.side,
    delta: undefined, // TODO: Calculate from market data
    gamma: undefined,
    theta: undefined,
    vega: undefined,
    impliedVolatility: undefined,
    createdAt: position.created_at,
    updatedAt: position.updated_at,
  };
}

/**
 * Transform database Position to CryptoPosition
 */
export function toCryptoPosition(position: Position): CryptoPosition {
  // Get crypto name from symbol (could be enhanced with a mapping)
  const cryptoNames: Record<string, string> = {
    BTC: 'Bitcoin',
    ETH: 'Ethereum',
    SOL: 'Solana',
    ADA: 'Cardano',
    DOT: 'Polkadot',
    MATIC: 'Polygon',
    AVAX: 'Avalanche',
    LINK: 'Chainlink',
    UNI: 'Uniswap',
    AAVE: 'Aave',
  };

  const costBasis = Math.abs(position.total_cost_basis);
  const marketValue = position.current_quantity * (position.average_opening_price || 0); // Would need current price
  const unrealizedPL = position.unrealized_pl || 0;
  const unrealizedPLPercent = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;

  return {
    id: position.id,
    userId: position.user_id,
    symbol: position.symbol,
    name: cryptoNames[position.symbol] || position.symbol,
    quantity: position.current_quantity,
    averagePrice: position.average_opening_price,
    currentPrice: position.average_opening_price, // TODO: Fetch from market data
    marketValue,
    unrealizedPL,
    unrealizedPLPercent,
    costBasis,
    createdAt: position.created_at,
    updatedAt: position.updated_at,
  };
}

/**
 * Transform database Position to FuturesContract
 */
export function toFuturesContract(position: Position): FuturesContract {
  if (!position.expiration_date) {
    throw new Error('Invalid futures position: missing expiration_date');
  }

  // Get contract name from symbol (could be enhanced with a mapping)
  const contractNames: Record<string, string> = {
    ES: 'E-mini S&P 500',
    NQ: 'E-mini Nasdaq-100',
    YM: 'E-mini Dow',
    RTY: 'E-mini Russell 2000',
    CL: 'Crude Oil',
    GC: 'Gold',
    SI: 'Silver',
    ZB: '30-Year Treasury Bond',
    ZN: '10-Year Treasury Note',
  };

  const multiplier = position.multiplier || 50; // Default varies by contract
  const costBasis = Math.abs(position.total_cost_basis);
  const marketValue = position.current_quantity * multiplier * (position.average_opening_price || 0);
  const unrealizedPL = position.unrealized_pl || 0;
  const unrealizedPLPercent = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;

  return {
    id: position.id,
    userId: position.user_id,
    symbol: position.symbol,
    contractName: contractNames[position.symbol] || position.symbol,
    contractMonth: position.contract_month || '',
    quantity: position.current_quantity,
    side: position.side,
    averagePrice: position.average_opening_price,
    currentPrice: position.average_opening_price, // TODO: Fetch from market data
    marketValue,
    unrealizedPL,
    unrealizedPLPercent,
    multiplier,
    tickSize: position.tick_size || 0.25,
    tickValue: position.tick_value || 12.50,
    expirationDate: position.expiration_date,
    marginRequirement: position.margin_requirement || 0,
    createdAt: position.created_at,
    updatedAt: position.updated_at,
  };
}

/**
 * Transform database Transaction to StockTransaction
 */
export function toStockTransaction(transaction: Transaction): StockTransaction {
  return {
    id: transaction.id,
    userId: transaction.user_id,
    symbol: transaction.underlying_symbol || transaction.instrument || '',
    transactionType: transaction.transaction_code === 'Buy' ? 'buy' : 'sell',
    quantity: transaction.quantity || 0,
    price: transaction.price || 0,
    amount: Math.abs(transaction.amount),
    fees: transaction.fees,
    activityDate: transaction.activity_date,
    processDate: transaction.process_date,
    settleDate: transaction.settle_date,
    createdAt: transaction.created_at,
  };
}

/**
 * Transform database Transaction to OptionTransaction
 */
export function toOptionTransaction(transaction: Transaction): OptionTransaction {
  if (!transaction.option_type || !transaction.strike_price || !transaction.expiration_date) {
    throw new Error('Invalid option transaction: missing required fields');
  }

  const optionSymbol = `${transaction.underlying_symbol}_${transaction.expiration_date}_${transaction.option_type.toUpperCase()}_${transaction.strike_price}`;

  return {
    id: transaction.id,
    userId: transaction.user_id,
    underlyingSymbol: transaction.underlying_symbol || '',
    optionSymbol,
    description: transaction.description,
    transactionType: transaction.transaction_code as any,
    optionType: transaction.option_type,
    strikePrice: transaction.strike_price,
    expirationDate: transaction.expiration_date,
    quantity: transaction.quantity || 0,
    price: transaction.price || undefined,
    amount: transaction.amount || undefined,
    fees: transaction.fees || undefined,
    activityDate: transaction.activity_date,
    processDate: transaction.process_date,
    settleDate: transaction.settle_date,
    createdAt: transaction.created_at,
  };
}

/**
 * Transform database Transaction to CryptoTransaction
 */
export function toCryptoTransaction(transaction: Transaction): CryptoTransaction {
  let transactionType: 'buy' | 'sell' | 'transfer_in' | 'transfer_out' = 'buy';
  if (transaction.transaction_code === 'Sell') {
    transactionType = 'sell';
  } else if (transaction.transaction_code.includes('transfer')) {
    transactionType = transaction.amount >= 0 ? 'transfer_in' : 'transfer_out';
  }

  return {
    id: transaction.id,
    userId: transaction.user_id,
    symbol: transaction.underlying_symbol || transaction.instrument || '',
    transactionType,
    quantity: transaction.quantity || 0,
    price: transaction.price || undefined,
    amount: Math.abs(transaction.amount),
    fees: transaction.fees || undefined,
    activityDate: transaction.activity_date,
    processDate: transaction.process_date,
    settleDate: transaction.settle_date,
    notes: transaction.notes || undefined,
    createdAt: transaction.created_at,
  };
}

/**
 * Transform database Transaction to FuturesTransaction
 */
export function toFuturesTransaction(transaction: Transaction): FuturesTransaction {
  return {
    id: transaction.id,
    date: transaction.activity_date,
    symbol: transaction.underlying_symbol || transaction.instrument || '',
    contractName: transaction.instrument || '',
    transactionType: transaction.transaction_code as 'Buy' | 'Sell',
    quantity: Math.abs(transaction.quantity || 0),
    price: transaction.price || 0,
    fees: transaction.fees || 0,
    amount: transaction.amount || 0,
    description: transaction.description || '',
  };
}

/**
 * Transform database Transaction to CashTransaction
 */
export function toCashTransaction(transaction: Transaction): CashTransaction {
  // Map transaction codes to cash transaction types
  const codeToType: Record<string, CashTransaction['transactionType']> = {
    INT: 'interest',
    DIV: 'dividend',
    CDIV: 'dividend',
    SLIP: 'interest',
    ACH: 'deposit', // Will be determined by amount sign
    RTP: 'deposit',
    DCF: 'deposit',
    DEP: 'deposit',
    WD: 'withdrawal',
    WIRE: 'deposit', // Will be determined by amount sign
    GOLD: 'fee',
    FEE: 'fee',
    GMPC: 'other',
    OCC: 'other',
  };

  let transactionType: CashTransaction['transactionType'] = codeToType[transaction.transaction_code] || 'other';

  // Handle ACH/WIRE based on amount sign
  if (transaction.transaction_code === 'ACH' || transaction.transaction_code === 'WIRE') {
    transactionType = transaction.amount >= 0 ? 'deposit' : 'withdrawal';
  }

  return {
    id: transaction.id,
    userId: transaction.user_id,
    transactionType,
    amount: Math.abs(transaction.amount),
    description: transaction.description,
    symbol: transaction.underlying_symbol || transaction.instrument || undefined,
    activityDate: transaction.activity_date,
    processDate: transaction.process_date,
    settleDate: transaction.settle_date || undefined,
    notes: transaction.notes || undefined,
    createdAt: transaction.created_at,
    updatedAt: transaction.updated_at,
  };
}

