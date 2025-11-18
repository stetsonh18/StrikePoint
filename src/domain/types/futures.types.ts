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

/**
 * Calculate the third Friday of a given month and year
 * @param year - Full year (e.g., 2025)
 * @param month - Month index (0-11, where 0 = January)
 * @returns Date object for the third Friday
 */
export function getThirdFriday(year: number, month: number): Date {
  // Start with the first day of the month
  const firstDay = new Date(year, month, 1);
  const dayOfWeek = firstDay.getDay(); // 0 = Sunday, 5 = Friday
  
  // Calculate days until first Friday
  // Friday is day 5, so if today is:
  // Sunday (0): need 5 days
  // Monday (1): need 4 days
  // Tuesday (2): need 3 days
  // Wednesday (3): need 2 days
  // Thursday (4): need 1 day
  // Friday (5): need 0 days (it's already Friday)
  // Saturday (6): need 6 days
  const daysUntilFirstFriday = (5 - dayOfWeek + 7) % 7;
  
  // First Friday is on day (1 + daysUntilFirstFriday)
  // Third Friday is 14 days after first Friday
  const thirdFridayDay = 1 + daysUntilFirstFriday + 14;
  
  return new Date(year, month, thirdFridayDay);
}

/**
 * Calculate expiration date from contract month
 * For equity index futures (ES, NQ, YM, RTY): Third Friday of contract month
 * For other futures: Last day of contract month (fallback)
 * @param contractMonth - Contract month in format "MAR25", "DEC24", etc. or month code + year "H25"
 * @param symbol - Contract symbol (e.g., "ES", "NQ", "CL")
 * @returns Expiration date as YYYY-MM-DD string, or null if unable to calculate
 */
export function calculateExpirationDate(contractMonth: string, symbol?: string): string | null {
  if (!contractMonth) return null;

  // Parse contract month to get month and year
  let monthCode: string | null = null;
  let yearStr: string | null = null;

  // Try to parse formats like "MAR25", "DEC24"
  const formattedMatch = contractMonth.match(/^([A-Z]{3})(\d{2})$/);
  if (formattedMatch) {
    const monthName = formattedMatch[1];
    yearStr = formattedMatch[2];
    // Convert month name to month code
    const monthNameToCode: Record<string, string> = {
      JAN: 'F', FEB: 'G', MAR: 'H', APR: 'J', MAY: 'K', JUN: 'M',
      JUL: 'N', AUG: 'Q', SEP: 'U', OCT: 'V', NOV: 'X', DEC: 'Z'
    };
    monthCode = monthNameToCode[monthName] || null;
  } else {
    // Try to parse formats like "H25", "Z24"
    const codeMatch = contractMonth.match(/^([FGHJKMNQUVXZ])(\d{2,4})$/);
    if (codeMatch) {
      monthCode = codeMatch[1];
      yearStr = codeMatch[2];
    }
  }

  if (!monthCode || !yearStr) return null;

  // Convert month code to month index (0-11)
  const monthCodeToIndex: Record<string, number> = {
    F: 0,  // January
    G: 1,  // February
    H: 2,  // March
    J: 3,  // April
    K: 4,  // May
    M: 5,  // June
    N: 6,  // July
    Q: 7,  // August
    U: 8,  // September
    V: 9,  // October
    X: 10, // November
    Z: 11  // December
  };

  const monthIndex = monthCodeToIndex[monthCode];
  if (monthIndex === undefined) return null;

  // Convert year string to full year
  const year = yearStr.length === 2 ? 2000 + parseInt(yearStr, 10) : parseInt(yearStr, 10);

  // Equity index futures expire on third Friday of contract month
  const equityIndexFutures = ['ES', 'NQ', 'YM', 'RTY', 'MES', 'MNQ', 'MYM', 'M2K'];
  const isEquityIndex = symbol && equityIndexFutures.includes(symbol.toUpperCase());

  let expirationDate: Date;
  if (isEquityIndex) {
    // Third Friday of the contract month
    expirationDate = getThirdFriday(year, monthIndex);
  } else {
    // For other futures, use last day of the month as fallback
    // Last day is the day before the first day of next month
    expirationDate = new Date(year, monthIndex + 1, 0);
  }

  // Format as YYYY-MM-DD
  const yearStrFull = expirationDate.getFullYear();
  const monthStr = String(expirationDate.getMonth() + 1).padStart(2, '0');
  const dayStr = String(expirationDate.getDate()).padStart(2, '0');
  return `${yearStrFull}-${monthStr}-${dayStr}`;
}