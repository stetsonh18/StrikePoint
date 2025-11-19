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
import { parseContractSymbol, calculateExpirationDate, FUTURES_MONTH_CODES } from '@/domain/types/futures.types';

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
 * Build Tradier option symbol from position data
 * Format: {underlying}{YYMMDD}{C|P}{strike_padded_to_8_digits}
 * Example: AAPL250321C00155000 (AAPL, 2025-03-21, CALL, 155)
 */
export function buildTradierOptionSymbol(
  underlying: string,
  expirationDate: string,
  optionType: 'call' | 'put',
  strikePrice: number
): string {
  // Parse expiration date (YYYY-MM-DD) to YYMMDD
  // Use string parsing to avoid timezone issues
  const dateParts = expirationDate.split('-');
  if (dateParts.length !== 3) {
    throw new Error(`Invalid expiration date format: ${expirationDate}. Expected YYYY-MM-DD`);
  }

  const year = dateParts[0].slice(-2); // Last 2 digits of year
  const month = dateParts[1].padStart(2, '0');
  const day = dateParts[2].padStart(2, '0');
  const expStr = `${year}${month}${day}`;

  // Convert option type to C or P
  const typeChar = optionType.toUpperCase() === 'CALL' ? 'C' : 'P';

  // Convert strike to cents and pad to 8 digits
  const strikeInCents = Math.round(strikePrice * 100);
  const strikeStr = strikeInCents.toString().padStart(8, '0');

  return `${underlying}${expStr}${typeChar}${strikeStr}`;
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

  // Default multipliers by contract symbol
  const defaultMultipliers: Record<string, number> = {
    ES: 50,  // E-mini S&P 500
    NQ: 20,  // E-mini Nasdaq-100
    YM: 5,   // E-mini Dow
    RTY: 50, // E-mini Russell 2000
    CL: 1000, // Crude Oil
    GC: 100, // Gold
    SI: 5000, // Silver
    ZB: 1000, // 30-Year Treasury Bond
    ZN: 1000, // 10-Year Treasury Note
  };
  const multiplier = position.multiplier || defaultMultipliers[position.symbol] || 50;
  const costBasis = Math.abs(position.total_cost_basis);
  const marketValue = position.current_quantity * multiplier * (position.average_opening_price || 0);
  const unrealizedPL = position.unrealized_pl || 0;
  const unrealizedPLPercent = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;

  // Format contract month display
  // If contract_month is already in format like "MAR25", use it as-is
  // If it's in format like "H25", convert to "MAR25"
  // If contract_month is missing, try to parse from symbol field (e.g., "MESH25" -> "MAR25")
  let formattedContractMonth = position.contract_month || '';
  
  // If contract_month is missing, try to parse from symbol field as fallback
  if (!formattedContractMonth && position.symbol) {
    const parsed = parseContractSymbol(position.symbol);
    if (parsed) {
      // Format contract month as "MAR25" (month name + year)
      const monthCodeMap: Record<string, string> = {
        F: 'JAN', G: 'FEB', H: 'MAR', J: 'APR', K: 'MAY', M: 'JUN',
        N: 'JUL', Q: 'AUG', U: 'SEP', V: 'OCT', X: 'NOV', Z: 'DEC'
      };
      const monthName = monthCodeMap[parsed.monthCode];
      const year = parsed.year.length === 2 ? parsed.year : parsed.year.slice(-2);
      if (monthName) {
        formattedContractMonth = `${monthName}${year}`;
      } else {
        formattedContractMonth = `${parsed.monthCode}${year}`;
      }
    }
  }
  
  if (formattedContractMonth) {
    // Check if it's already formatted (e.g., "MAR25", "DEC24")
    const isFormatted = /^[A-Z]{3}\d{2}$/.test(formattedContractMonth);
    if (!isFormatted) {
      // Try to parse and format (e.g., "H25" -> "MAR25")
      // Month codes: F=Jan, G=Feb, H=Mar, J=Apr, K=May, M=Jun, N=Jul, Q=Aug, U=Sep, V=Oct, X=Nov, Z=Dec
      const monthCodeMap: Record<string, string> = {
        F: 'JAN', G: 'FEB', H: 'MAR', J: 'APR', K: 'MAY', M: 'JUN',
        N: 'JUL', Q: 'AUG', U: 'SEP', V: 'OCT', X: 'NOV', Z: 'DEC'
      };
      const match = formattedContractMonth.match(/^([FGHJKMNQUVXZ])(\d{2,4})$/);
      if (match) {
        const monthCode = match[1];
        const year = match[2];
        const monthName = monthCodeMap[monthCode];
        if (monthName) {
          formattedContractMonth = `${monthName}${year.length === 2 ? year : year.slice(-2)}`;
        }
      }
    }
  }

  // Calculate expiration date from contract month if missing
  let expirationDate = position.expiration_date;
  if (!expirationDate && formattedContractMonth) {
    // Try to calculate expiration date from contract month
    expirationDate = calculateExpirationDate(formattedContractMonth, position.symbol);
  }

  return {
    id: position.id,
    userId: position.user_id,
    symbol: position.symbol,
    contractName: contractNames[position.symbol] || position.symbol,
    contractMonth: formattedContractMonth,
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
    expirationDate: expirationDate || '', // Allow empty string if no expiration date
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

  // Format expiration date to be more readable (Nov 21, 2025)
  const formatExpirationDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00'); // Add time to avoid timezone issues
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Create a descriptive label if description is generic or missing
  const description = transaction.description === 'Manual entry' || !transaction.description
    ? `${transaction.underlying_symbol} $${transaction.strike_price} ${transaction.option_type === 'call' ? 'Call' : 'Put'} ${formatExpirationDate(transaction.expiration_date)}`
    : transaction.description;

  return {
    id: transaction.id,
    userId: transaction.user_id,
    underlyingSymbol: transaction.underlying_symbol || '',
    optionSymbol,
    description,
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
  // Parse contract month from instrument field (e.g., "ESH25" -> "MAR25")
  let contractMonth = '';
  if (transaction.instrument) {
    const parsed = parseContractSymbol(transaction.instrument);
    if (parsed) {
      const monthName = FUTURES_MONTH_CODES[parsed.monthCode];
      const year = parsed.year.length === 2 ? `20${parsed.year}` : parsed.year;
      contractMonth = monthName 
        ? `${monthName.toUpperCase().slice(0, 3)}${year.slice(-2)}` 
        : `${parsed.monthCode}${parsed.year}`;
    }
  }

  // Convert transaction code to lowercase for type compatibility
  const transactionCode = transaction.transaction_code?.toLowerCase() || 'buy';
  const transactionType = (transactionCode === 'sell' ? 'sell' : 'buy') as 'buy' | 'sell';

  return {
    id: transaction.id,
    userId: transaction.user_id,
    symbol: transaction.underlying_symbol || transaction.instrument || '',
    contractMonth,
    transactionType,
    quantity: Math.abs(transaction.quantity || 0),
    price: transaction.price || 0,
    amount: transaction.amount || 0,
    fees: transaction.fees || 0,
    activityDate: transaction.activity_date,
    processDate: transaction.process_date,
    settleDate: transaction.settle_date,
    createdAt: transaction.created_at,
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

