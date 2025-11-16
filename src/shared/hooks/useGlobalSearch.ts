import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/application/stores/auth.store';
import { useTransactions } from '@/application/hooks/useTransactions';
import { useJournalEntries } from '@/application/hooks/useJournal';
import { usePositions } from '@/application/hooks/usePositions';
import { useDebouncedSymbolSearch } from '@/application/hooks/useStockSymbolSearch';
import { useDebouncedCryptoSymbolSearch } from '@/application/hooks/useCryptoSymbolSearch';
import type { Transaction } from '@/domain/types';
import type { JournalEntry } from '@/domain/types';
import type { Position } from '@/domain/types';

export interface SearchResult {
  type: 'symbol' | 'transaction' | 'journal' | 'position';
  id: string;
  title: string;
  subtitle?: string;
  symbol?: string;
  route: string;
  metadata?: Record<string, any>;
}

const SEARCH_HISTORY_KEY = 'strikepoint_search_history';
const MAX_HISTORY_ITEMS = 10;

/**
 * Get search history from localStorage
 */
export function getSearchHistory(): string[] {
  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
}

/**
 * Save search query to history
 */
export function saveSearchHistory(query: string): void {
  try {
    const history = getSearchHistory();
    // Remove if already exists
    const filtered = history.filter((q) => q.toLowerCase() !== query.toLowerCase());
    // Add to beginning
    const updated = [query, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Clear search history
 */
export function clearSearchHistory(): void {
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Global search hook that searches across all data types
 */
export function useGlobalSearch(query: string, enabled: boolean = true) {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || '';
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const hasQuery = debouncedQuery.trim().length >= 2;
  const searchLower = debouncedQuery.toLowerCase();

  // Search symbols (stocks)
  const stockSymbolSearch = useDebouncedSymbolSearch(debouncedQuery, 300, enabled && hasQuery);
  
  // Search crypto symbols
  const cryptoSymbolSearch = useDebouncedCryptoSymbolSearch(debouncedQuery, 300, enabled && hasQuery);

  // Fetch transactions
  const { data: transactions = [] } = useTransactions(userId, undefined, {
    enabled: enabled && hasQuery,
  });

  // Fetch journal entries
  const { data: journalEntries = [] } = useJournalEntries(userId, undefined, {
    enabled: enabled && hasQuery,
  });

  // Fetch positions
  const { data: positions = [] } = usePositions(userId, {
    enabled: enabled && hasQuery,
  });

  // Combine and filter results
  const results = useMemo<SearchResult[]>(() => {
    if (!hasQuery) return [];

    const allResults: SearchResult[] = [];

    // Add stock symbol results
    if (stockSymbolSearch.data) {
      stockSymbolSearch.data.forEach((symbol) => {
        allResults.push({
          type: 'symbol',
          id: `symbol-${symbol.symbol}`,
          title: symbol.symbol,
          subtitle: symbol.description || symbol.name,
          symbol: symbol.symbol,
          route: `/stocks`,
          metadata: { assetType: 'stock', ...symbol },
        });
      });
    }

    // Add crypto symbol results
    if (cryptoSymbolSearch.data) {
      cryptoSymbolSearch.data.forEach((crypto) => {
        allResults.push({
          type: 'symbol',
          id: `crypto-${crypto.symbol}`,
          title: crypto.symbol,
          subtitle: crypto.name,
          symbol: crypto.symbol,
          route: `/crypto`,
          metadata: { assetType: 'crypto', ...crypto },
        });
      });
    }

    // Filter and add transactions
    transactions
      .filter((tx: Transaction) => {
        const matchesSymbol = tx.instrument?.toLowerCase().includes(searchLower) ||
          tx.underlying_symbol?.toLowerCase().includes(searchLower) ||
          tx.description?.toLowerCase().includes(searchLower);
        return matchesSymbol;
      })
      .forEach((tx: Transaction) => {
        const assetType = tx.asset_type.toLowerCase();
        allResults.push({
          type: 'transaction',
          id: `transaction-${tx.id}`,
          title: `${tx.transaction_code} ${tx.instrument || tx.underlying_symbol || 'Unknown'}`,
          subtitle: `${tx.quantity || 0} @ $${tx.price?.toFixed(2) || '0.00'} on ${tx.activity_date}`,
          symbol: tx.instrument || tx.underlying_symbol || undefined,
          route: `/${assetType === 'stock' ? 'stocks' : assetType === 'option' ? 'options' : assetType === 'crypto' ? 'crypto' : assetType === 'future' ? 'futures' : 'cash'}`,
          metadata: { transaction: tx },
        });
      });

    // Filter and add journal entries
    journalEntries
      .filter((entry: JournalEntry) => {
        return (
          entry.title.toLowerCase().includes(searchLower) ||
          entry.content.toLowerCase().includes(searchLower) ||
          entry.linkedSymbols?.some((s) => s.toLowerCase().includes(searchLower)) ||
          entry.tags?.some((t) => t.toLowerCase().includes(searchLower))
        );
      })
      .forEach((entry: JournalEntry) => {
        allResults.push({
          type: 'journal',
          id: `journal-${entry.id}`,
          title: entry.title,
          subtitle: entry.entryType.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          symbol: entry.linkedSymbols?.[0],
          route: '/journal',
          metadata: { entry },
        });
      });

    // Filter and add positions
    positions
      .filter((pos: Position) => {
        return (
          pos.symbol?.toLowerCase().includes(searchLower) ||
          pos.underlyingSymbol?.toLowerCase().includes(searchLower)
        );
      })
      .forEach((pos: Position) => {
        const assetType = pos.assetType.toLowerCase();
        allResults.push({
          type: 'position',
          id: `position-${pos.id}`,
          title: `${pos.symbol || pos.underlyingSymbol || 'Unknown'}`,
          subtitle: `${pos.quantity || 0} @ $${pos.averagePrice?.toFixed(2) || '0.00'} (${assetType})`,
          symbol: pos.symbol || pos.underlyingSymbol || undefined,
          route: `/${assetType === 'stock' ? 'stocks' : assetType === 'option' ? 'options' : assetType === 'crypto' ? 'crypto' : assetType === 'future' ? 'futures' : 'cash'}`,
          metadata: { position: pos },
        });
      });

    // Sort by relevance (exact matches first, then partial matches)
    return allResults.sort((a, b) => {
      const aExact = a.title.toLowerCase() === searchLower || a.symbol?.toLowerCase() === searchLower;
      const bExact = b.title.toLowerCase() === searchLower || b.symbol?.toLowerCase() === searchLower;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return a.title.localeCompare(b.title);
    });
  }, [
    hasQuery,
    searchLower,
    stockSymbolSearch.data,
    cryptoSymbolSearch.data,
    transactions,
    journalEntries,
    positions,
  ]);

  const isLoading =
    stockSymbolSearch.isLoading ||
    cryptoSymbolSearch.isLoading ||
    (hasQuery && (transactions === undefined || journalEntries === undefined || positions === undefined));

  return {
    results,
    isLoading,
    query: debouncedQuery,
    searchHistory: getSearchHistory(),
  };
}

