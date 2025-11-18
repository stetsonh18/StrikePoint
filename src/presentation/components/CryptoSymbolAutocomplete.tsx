import React, { useState, useRef, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useDebouncedCryptoSymbolSearch } from '@/application/hooks/useCryptoSymbolSearch';
import type { CryptoSearchResult } from '@/infrastructure/services/cryptoMarketDataService';
import { logger } from '@/shared/utils/logger';

interface CryptoSymbolAutocompleteProps {
  value: string;
  onChange: (symbol: string, coinId: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

export const CryptoSymbolAutocomplete: React.FC<CryptoSymbolAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'BTC, ETH, SOL...',
  required = false,
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use debounced search hook which returns both debouncedQuery and search results
  // Enable search when user has typed at least 1 character
  const {
    debouncedQuery,
    data: searchResults = [],
    isLoading: isSearching,
    error,
  } = useDebouncedCryptoSymbolSearch(inputValue, 300, hasUserInteracted && inputValue.length >= 1);

  // Track if we've hit rate limit (no results after search completes)
  const [rateLimitReached, setRateLimitReached] = useState(false);

  useEffect(() => {
    if (error) {
      logger.error('[CryptoSymbolAutocomplete] Search error', error);
    }
  }, [error]);

  useEffect(() => {
    // Check if we got no results after a completed search
    if (!isSearching && debouncedQuery && debouncedQuery.length >= 1 && searchResults.length === 0 && !error) {
      setRateLimitReached(true);
    } else if (searchResults.length > 0) {
      setRateLimitReached(false);
    }
  }, [searchResults, isSearching, debouncedQuery, error]);

  // Update input value when prop changes (e.g., pre-filled from sell button)
  useEffect(() => {
    setInputValue(value);
    // Don't mark as user interaction when value comes from props
    if (value && !hasUserInteracted) {
      setIsOpen(false);
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setInputValue(newValue);
    setHasUserInteracted(true);
    setIsOpen(true);
  };

  const handleSelectCrypto = (symbol: string, coinId: string) => {
    setInputValue(symbol);
    onChange(symbol, coinId);
    setIsOpen(false);
    setHasUserInteracted(false); // Reset after selection
    inputRef.current?.blur();
  };

  const handleFocus = () => {
    // Open dropdown when focused if we have input or user is typing
    if (inputValue.length >= 1) {
      setIsOpen(true);
      setHasUserInteracted(true);
    } else {
      setIsOpen(true);
    }
  };

  // Show dropdown when:
  // 1. Dropdown is open AND
  // 2. We have input (length >= 1) AND
  // 3. Either searching, have results, or have an error/rate limit message
  const showDropdown = isOpen && inputValue.length >= 1 && (isSearching || searchResults.length > 0 || rateLimitReached || error);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400"
          size={18}
        />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 ${className}`}
          autoComplete="off"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400 animate-spin" size={18} />
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-auto">
          {isSearching ? (
            <div className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 text-center">
              Searching...
            </div>
          ) : rateLimitReached ? (
            <div className="px-4 py-3 text-sm text-amber-600 dark:text-amber-400 text-center">
              <div className="font-medium mb-1">No results found</div>
              <div className="text-xs text-amber-600 dark:text-amber-500">
                Try a different search term or check your spelling
              </div>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 text-center">
              No cryptocurrencies found
            </div>
          ) : (
            <ul className="py-1">
              {searchResults.map((result: CryptoSearchResult) => (
                <li
                  key={result.id}
                  onClick={() => handleSelectCrypto(result.symbol, result.id)}
                  className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {result.thumb && (
                        <img src={result.thumb} alt={result.symbol} className="w-6 h-6 rounded-full" loading="lazy" />
                      )}
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{result.symbol}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">{result.name}</div>
                      </div>
                    </div>
                    {result.market_cap_rank && (
                      <div className="text-xs text-slate-500 dark:text-slate-500">
                        #{result.market_cap_rank}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
