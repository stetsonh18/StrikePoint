/**
 * Options Market Data Service
 * Handles fetching options chain data and option quotes from MarketData.app API
 * All API calls go through the Express backend to:
 * 1. Keep API keys secure (server-side only)
 * 2. Provide a stable IP address for API providers that require IP whitelisting (MarketData.app)
 */

import type { OptionChainEntry, OptionsChain, OptionQuote } from '@/domain/types';

// Backend API URL - uses Vite proxy in development (/api), direct URL in production
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Get options chain for an underlying symbol
 * @param underlyingSymbol - The underlying stock symbol (e.g., 'AAPL')
 * @param expiration - Optional expiration date filter (YYYY-MM-DD)
 * @param strike - Optional strike price filter
 * @param side - Optional filter by 'call' or 'put'
 * @returns Options chain data grouped by expiration
 */
export async function getOptionsChain(
  underlyingSymbol: string,
  expiration?: string,
  strike?: number,
  side?: 'call' | 'put'
): Promise<OptionsChain | null> {
  if (!underlyingSymbol) {
    return null;
  }

  try {
    // Build query parameters
    const params = new URLSearchParams();
    params.append('underlyingSymbol', underlyingSymbol);
    if (expiration) params.append('expiration', expiration);
    if (strike) params.append('strike', strike.toString());
    if (side) params.append('side', side);

    const chainUrl = `${API_BASE_URL}/marketdata/options/chain?${params.toString()}`;

    const response = await fetch(chainUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[getOptionsChain] API error for ${underlyingSymbol}: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Check for error in response
    if (data.error) {
      console.error(`[getOptionsChain] Error in response for ${underlyingSymbol}:`, data.error);
      throw new Error(data.error);
    }

    // Transform MarketData.app response to OptionsChain format
    // MarketData.app may return: { chain: {...}, expirations: [...], underlying_price: ... } or array of entries
    if (data.chain || data.expirations) {
      // Response is already in chain format
      return transformChainResponse(data, underlyingSymbol, expiration, strike, side);
    } else {
      // Response is array of entries or has entries array
      return transformEntriesToChain(underlyingSymbol, data, expiration, strike, side);
    }
  } catch (error) {
    console.error(`[getOptionsChain] Error fetching options chain for ${underlyingSymbol}:`, error);
    return null;
  }
}

/**
 * Transform chain response to OptionsChain format (MarketData.app format)
 */
function transformChainResponse(
  data: any, 
  underlying: string,
  expirationFilter?: string,
  strikeFilter?: number,
  sideFilter?: 'call' | 'put'
): OptionsChain {
  const chain: Record<string, OptionChainEntry[]> = {};
  const expirations: string[] = [];

  if (data.chain) {
    // Group entries by expiration
    Object.keys(data.chain).forEach((expiration) => {
      // Apply expiration filter
      if (expirationFilter && expiration !== expirationFilter) return;
      
      expirations.push(expiration);
      
      // Transform and filter entries
      const entries = data.chain[expiration]
        .map((entry: any) => transformEntry(entry))
        .filter((entry: OptionChainEntry) => {
          // Apply strike filter
          if (strikeFilter && entry.strike !== strikeFilter) return false;
          // Apply side filter
          if (sideFilter && entry.option_type !== sideFilter) return false;
          return true;
        });
      
      chain[expiration] = entries;
    });
  }

  return {
    underlying,
    underlying_price: data.underlying_price,
    expirations: expirations.sort(),
    chain,
    last_updated: data.last_updated || new Date().toISOString(),
  };
}

/**
 * Transform entries to chain format (MarketData.app array format)
 */
function transformEntriesToChain(
  underlying: string, 
  data: any,
  expirationFilter?: string,
  strikeFilter?: number,
  sideFilter?: 'call' | 'put'
): OptionsChain {
  const chain: Record<string, OptionChainEntry[]> = {};
  const expirationsSet = new Set<string>();

  // If data is an object with entries, or if it's an array
  const entries = Array.isArray(data) ? data : (data.entries || []);
  
  entries.forEach((entry: any) => {
    const expiration = entry.expiration || entry.exp || entry.exp_date || entry.expiration_date;
    if (!expiration) return;

    // Apply expiration filter
    if (expirationFilter && expiration !== expirationFilter) return;

    expirationsSet.add(expiration);
    
    if (!chain[expiration]) {
      chain[expiration] = [];
    }

    const transformedEntry = transformEntry(entry);
    
    // Apply strike and side filters
    if (strikeFilter && transformedEntry.strike !== strikeFilter) return;
    if (sideFilter && transformedEntry.option_type !== sideFilter) return;

    chain[expiration].push(transformedEntry);
  });

  // Sort entries by strike within each expiration
  Object.keys(chain).forEach((exp) => {
    chain[exp].sort((a, b) => a.strike - b.strike);
  });

  return {
    underlying,
    underlying_price: data.underlying_price,
    expirations: Array.from(expirationsSet).sort(),
    chain,
    last_updated: new Date().toISOString(),
  };
}

/**
 * Transform API entry to OptionChainEntry
 */
function transformEntry(entry: any): OptionChainEntry {
  return {
    symbol: entry.symbol || entry.option_symbol || '',
    underlying: entry.underlying || entry.underlying_symbol || '',
    expiration: entry.expiration || entry.exp || entry.exp_date || '',
    strike: entry.strike || entry.strike_price || 0,
    option_type: (entry.option_type || entry.type || entry.side || 'call').toLowerCase() as 'call' | 'put',
    bid: entry.bid,
    ask: entry.ask,
    last: entry.last || entry.price,
    volume: entry.volume,
    open_interest: entry.open_interest || entry.oi,
    implied_volatility: entry.implied_volatility || entry.iv,
    delta: entry.delta,
    gamma: entry.gamma,
    theta: entry.theta,
    vega: entry.vega,
    rho: entry.rho,
  };
}

/**
 * Get detailed quote for a specific option symbol
 * @param optionSymbol - The option symbol (e.g., 'AAPL271217C00300000')
 * @returns Detailed option quote with Greeks
 */
export async function getOptionQuote(optionSymbol: string): Promise<OptionQuote | null> {
  if (!optionSymbol) {
    return null;
  }

  try {
    const quoteUrl = `${API_BASE_URL}/marketdata/options/quote/${encodeURIComponent(optionSymbol)}`;

    const response = await fetch(quoteUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[getOptionQuote] API error for ${optionSymbol}: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Check for error in response
    if (data.error) {
      console.error(`[getOptionQuote] Error in response for ${optionSymbol}:`, data.error);
      throw new Error(data.error);
    }

    // Transform response to OptionQuote format
    return {
      symbol: data.symbol || optionSymbol,
      underlying: data.underlying || data.underlying_symbol || '',
      expiration: data.expiration || data.exp || data.exp_date || '',
      strike: data.strike || data.strike_price || 0,
      option_type: (data.option_type || data.type || 'call').toLowerCase() as 'call' | 'put',
      bid: data.bid,
      ask: data.ask,
      last: data.last || data.price,
      volume: data.volume,
      open_interest: data.open_interest || data.oi,
      implied_volatility: data.implied_volatility || data.iv,
      delta: data.delta,
      gamma: data.gamma,
      theta: data.theta,
      vega: data.vega,
      rho: data.rho,
      intrinsic_value: data.intrinsic_value,
      extrinsic_value: data.extrinsic_value,
      time_value: data.time_value,
      in_the_money: data.in_the_money,
    };
  } catch (error) {
    console.error(`[getOptionQuote] Error fetching quote for ${optionSymbol}:`, error);
    return null;
  }
}

/**
 * Get quotes for multiple option symbols
 * @param optionSymbols - Array of option symbols
 * @returns Record of option symbols to quotes
 */
export async function getOptionQuotes(optionSymbols: string[]): Promise<Record<string, OptionQuote>> {
  if (optionSymbols.length === 0) {
    return {};
  }

  // Fetch quotes in parallel
  const quotePromises = optionSymbols.map(async (symbol) => {
    const quote = await getOptionQuote(symbol);
    return { symbol, quote };
  });

  const results = await Promise.all(quotePromises);
  
  const quotes: Record<string, OptionQuote> = {};
  results.forEach(({ symbol, quote }) => {
    if (quote) {
      quotes[symbol] = quote;
    }
  });

  return quotes;
}

