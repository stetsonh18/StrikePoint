/**
 * Futures Contract Specification Types
 * Defines the structure for futures contract specifications stored in the database
 */

export interface FuturesContractSpec {
  id: string;
  symbol: string;                  // ES, NQ, CL, GC, etc.
  name: string;                     // E-mini S&P 500, E-mini Nasdaq-100, etc.
  exchange: string | null;          // CME, CBOT, NYMEX, COMEX
  multiplier: number;               // Contract size multiplier
  tick_size: number;                // Minimum price movement
  tick_value: number;               // Dollar value per tick
  initial_margin: number | null;    // Initial margin requirement in USD
  maintenance_margin: number | null; // Maintenance margin requirement in USD
  contract_months: string[];        // Valid contract months ['H', 'M', 'U', 'Z']
  fees_per_contract: number;        // Typical fees per contract
  is_active: boolean;               // Whether contract is currently tradeable
  description: string | null;       // Additional notes
  created_at: string;
  updated_at: string;
}

export interface FuturesContractSpecInsert {
  symbol: string;
  name: string;
  exchange?: string | null;
  multiplier: number;
  tick_size: number;
  tick_value: number;
  initial_margin?: number | null;
  maintenance_margin?: number | null;
  contract_months: string[];
  fees_per_contract?: number;
  is_active?: boolean;
  description?: string | null;
}

export interface FuturesContractSpecUpdate {
  symbol?: string;
  name?: string;
  exchange?: string | null;
  multiplier?: number;
  tick_size?: number;
  tick_value?: number;
  initial_margin?: number | null;
  maintenance_margin?: number | null;
  contract_months?: string[];
  fees_per_contract?: number;
  is_active?: boolean;
  description?: string | null;
}

/**
 * Contract month letter codes mapping
 * CME standard month codes
 */
export const FUTURES_MONTH_CODES: Record<string, string> = {
  F: 'January',
  G: 'February',
  H: 'March',
  J: 'April',
  K: 'May',
  M: 'June',
  N: 'July',
  Q: 'August',
  U: 'September',
  V: 'October',
  X: 'November',
  Z: 'December',
};

/**
 * Quarterly contract months (most liquid)
 */
export const QUARTERLY_MONTHS = ['H', 'M', 'U', 'Z']; // Mar, Jun, Sep, Dec

/**
 * All contract months
 */
export const ALL_MONTHS = ['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z'];

/**
 * Helper function to format contract month code to display name
 * @param code - Month code (e.g., 'H', 'Z')
 * @returns Full month name (e.g., 'March', 'December')
 */
export function getMonthName(code: string): string {
  return FUTURES_MONTH_CODES[code] || code;
}

/**
 * Helper function to generate contract symbol with month and year
 * @param symbol - Base symbol (e.g., 'ES')
 * @param monthCode - Month code (e.g., 'H')
 * @param year - Year (e.g., '25' or '2025')
 * @returns Full contract symbol (e.g., 'ESH25')
 */
export function formatContractSymbol(symbol: string, monthCode: string, year: string): string {
  // Handle both 2-digit and 4-digit years
  const yearSuffix = year.length === 4 ? year.slice(-2) : year;
  return `${symbol}${monthCode}${yearSuffix}`;
}

/**
 * Helper function to parse contract symbol
 * @param contractSymbol - Full contract symbol (e.g., 'ESH25')
 * @returns Object with symbol, month code, and year
 */
export function parseContractSymbol(contractSymbol: string): {
  symbol: string;
  monthCode: string;
  year: string;
} | null {
  // Match pattern: 1-4 letters + 1 letter month code + 2-4 digit year
  const match = contractSymbol.match(/^([A-Z]{1,4})([FGHJKMNQUVXZ])(\d{2,4})$/);

  if (!match) {
    return null;
  }

  return {
    symbol: match[1],
    monthCode: match[2],
    year: match[3],
  };
}

/**
 * Calculate position value for futures contract
 * @param price - Current price
 * @param quantity - Number of contracts
 * @param multiplier - Contract multiplier
 * @returns Notional value of position
 */
export function calculateFuturesValue(price: number, quantity: number, multiplier: number): number {
  return price * quantity * multiplier;
}

/**
 * Calculate margin requirement for futures position
 * @param quantity - Number of contracts
 * @param marginPerContract - Margin required per contract
 * @returns Total margin required
 */
export function calculateMarginRequirement(quantity: number, marginPerContract: number): number {
  return Math.abs(quantity) * marginPerContract;
}

/**
 * Calculate tick profit/loss
 * @param entryPrice - Entry price
 * @param exitPrice - Exit price
 * @param quantity - Number of contracts
 * @param tickSize - Minimum price movement
 * @param tickValue - Dollar value per tick
 * @returns Profit/loss in dollars
 */
export function calculateTickPL(
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  tickSize: number,
  tickValue: number
): number {
  const priceDifference = exitPrice - entryPrice;
  const ticks = priceDifference / tickSize;
  return ticks * tickValue * quantity;
}
