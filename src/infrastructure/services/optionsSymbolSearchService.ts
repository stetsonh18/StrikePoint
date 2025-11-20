/**
 * Options Symbol Search Service
 * Validates symbols for options trading by attempting to fetch options chain
 * Since MarketData.app may not have direct symbol search, we validate by checking if options chain exists
 */

import { getOptionsChain } from './optionsMarketDataService';

/**
 * Validate if a symbol has options available by attempting to fetch its chain
 * @param symbol - The symbol to validate
 * @returns True if symbol has options, false otherwise
 */
export async function validateOptionsSymbol(symbol: string): Promise<boolean> {
  if (!symbol || symbol.length < 1) {
    return false;
  }

  try {
    // Attempt to fetch options chain - if it succeeds, symbol is valid
    const chain = await getOptionsChain(symbol);
    return chain !== null && chain.expirations.length > 0;
  } catch (error) {
    console.error(`[validateOptionsSymbol] Error validating ${symbol}:`, error);
    return false;
  }
}

/**
 * Search for options symbols by validating multiple candidates
 * This is a simple approach - in production, you might want to maintain a list of known optionable symbols
 * @param query - Search query
 * @returns Array of validated symbols that have options
 */
export async function searchOptionsSymbols(query: string): Promise<string[]> {
  if (!query || query.length < 1) {
    return [];
  }

  // Common index options that users might search for
  const commonIndexOptions = ['SPX', 'SPXW', 'XSP', 'NDX', 'RUT', 'DJX', 'OEX'];
  
  // Filter common symbols that match query
  const matchingCommon = commonIndexOptions.filter(symbol => 
    symbol.toUpperCase().includes(query.toUpperCase())
  );

  // Validate each matching symbol
  const validatedSymbols: string[] = [];
  
  for (const symbol of matchingCommon) {
    try {
      const isValid = await validateOptionsSymbol(symbol);
      if (isValid) {
        validatedSymbols.push(symbol);
      }
    } catch {
      // Skip on error
      continue;
    }
  }

  // Also validate the query itself if it looks like a symbol
  if (query.length >= 1 && query.length <= 5 && /^[A-Z]+$/.test(query.toUpperCase())) {
    try {
      const isValid = await validateOptionsSymbol(query.toUpperCase());
      if (isValid && !validatedSymbols.includes(query.toUpperCase())) {
        validatedSymbols.push(query.toUpperCase());
      }
    } catch {
      // Skip on error
    }
  }

  return validatedSymbols;
}

/**
 * Interface for symbol search result
 */
export interface OptionsSymbolSearchResult {
  symbol: string;
  name: string; // Will be same as symbol for now, could be enhanced with a mapping
  hasOptions: boolean;
}

/**
 * Search for options symbols with result details
 */
export async function searchOptionsSymbolsWithDetails(query: string): Promise<OptionsSymbolSearchResult[]> {
  const symbols = await searchOptionsSymbols(query);
  
  return symbols.map(symbol => ({
    symbol,
    name: symbol, // Could be enhanced with a symbol-to-name mapping
    hasOptions: true,
  }));
}

