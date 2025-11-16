import React, { useState, useRef, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useDebouncedSymbolSearch } from '@/application/hooks/useStockSymbolSearch';
import { useOptionsSymbolSearch } from '@/application/hooks/useOptionsSymbolSearch';
import type { SymbolSearchResult } from '@/infrastructure/services/marketDataService';
import type { OptionsSymbolSearchResult } from '@/application/hooks/useOptionsSymbolSearch';

interface SymbolAutocompleteProps {
  value: string;
  onChange: (symbol: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  mode?: 'stock' | 'option'; // 'stock' uses Finnhub, 'option' uses MarketData validation
}

export const SymbolAutocomplete: React.FC<SymbolAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'AAPL',
  required = false,
  className = '',
  disabled = false,
  mode = 'stock',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use appropriate search based on mode
  const isOptionsMode = mode === 'option';
  
  // Stock search (Finnhub)
  const {
    debouncedQuery: stockDebouncedQuery,
    data: stockSearchResults = [],
    isLoading: isStockSearching,
    error: stockError,
  } = useDebouncedSymbolSearch(
    inputValue,
    300,
    !isOptionsMode && hasUserInteracted && inputValue.length >= 1
  );

  // Options search (MarketData validation)
  const {
    data: optionsSearchResults = [],
    isLoading: isOptionsSearching,
    error: optionsError,
  } = useOptionsSymbolSearch(
    inputValue,
    isOptionsMode && hasUserInteracted && inputValue.length >= 1
  );

  // Use appropriate results based on mode
  // Convert options results to match SymbolSearchResult format for display
  const optionsResultsAsSymbolResults: SymbolSearchResult[] = optionsSearchResults.map(result => ({
    symbol: result.symbol,
    name: result.name || 'Options Available',
    type: 'Option',
    region: 'US',
  }));

  const searchResults = isOptionsMode ? optionsResultsAsSymbolResults : stockSearchResults;
  const isSearching = isOptionsMode ? isOptionsSearching : isStockSearching;
  const error = isOptionsMode ? optionsError : stockError;
  const debouncedQuery = isOptionsMode ? inputValue : stockDebouncedQuery;

  // Track if we've hit rate limit (no results after search completes)
  const [rateLimitReached, setRateLimitReached] = useState(false);

  useEffect(() => {
    if (error) {
      console.error('[SymbolAutocomplete] Search error:', error);
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
    onChange(newValue);
    setHasUserInteracted(true);
    setIsOpen(true);
  };

  const handleSelectSymbol = (symbol: string) => {
    setInputValue(symbol);
    onChange(symbol);
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
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
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
          className={`w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 ${className}`}
          autoComplete="off"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 animate-spin" size={18} />
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-h-60 overflow-auto">
          {isSearching ? (
            <div className="px-4 py-3 text-sm text-slate-400 text-center">
              Searching...
            </div>
          ) : rateLimitReached ? (
            <div className="px-4 py-3 text-sm text-amber-400 text-center">
              <div className="font-medium mb-1">No results found</div>
              <div className="text-xs text-amber-500">
                Try a different search term or check your spelling
              </div>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400 text-center">
              No symbols found
            </div>
          ) : (
            <ul className="py-1">
              {searchResults.map((result: SymbolSearchResult) => (
                <li
                  key={result.symbol}
                  onClick={() => handleSelectSymbol(result.symbol)}
                  className="px-4 py-2 hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-100">{result.symbol}</div>
                      <div className="text-xs text-slate-400">{result.name}</div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {result.type} • {result.region}
                    </div>
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

