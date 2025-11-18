import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Clock, ArrowRight, TrendingUp, FileText, Wallet, BookOpen, Command } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGlobalSearch, saveSearchHistory, type SearchResult } from '@/shared/hooks/useGlobalSearch';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RESULT_TYPE_ICONS = {
  symbol: TrendingUp,
  transaction: Wallet,
  journal: BookOpen,
  position: FileText,
};

const RESULT_TYPE_LABELS = {
  symbol: 'Symbol',
  transaction: 'Transaction',
  journal: 'Journal Entry',
  position: 'Position',
};

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { results, isLoading, searchHistory } = useGlobalSearch(query, isOpen);

  // Focus trap - we'll handle it manually since we need the ref
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleSelectResult(results[selectedIndex]);
        return;
      }
    },
    [results, selectedIndex, onClose]
  );

  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      saveSearchHistory(query);
      navigate(result.route);
      onClose();
      setQuery('');
    },
    [query, navigate, onClose]
  );

  const handleSelectHistory = useCallback(
    (historyQuery: string) => {
      setQuery(historyQuery);
      inputRef.current?.focus();
    },
    []
  );

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current && selectedIndex >= 0) {
      const selectedElement = resultsRef.current.querySelector(
        `[data-result-index="${selectedIndex}"]`
      ) as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const displayResults = query.trim().length >= 2 ? results : [];
  const showHistory = query.trim().length === 0 && searchHistory.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search symbols, transactions, journal entries, positions..."
            className="flex-1 bg-transparent text-slate-900 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none text-base"
            autoComplete="off"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg text-xs text-slate-600 dark:text-slate-400">
            <Command className="w-3 h-3" />
            <span>K</span>
          </div>
        </div>

        {/* Results */}
        <div
          ref={resultsRef}
          className="max-h-[60vh] overflow-y-auto"
          onKeyDown={handleKeyDown}
        >
          {isLoading && query.trim().length >= 2 && (
            <div className="p-8 text-center text-slate-600 dark:text-slate-400">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent mb-2" />
              <p className="text-sm">Searching...</p>
            </div>
          )}

          {!isLoading && displayResults.length === 0 && query.trim().length >= 2 && (
            <div className="p-8 text-center text-slate-600 dark:text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No results found</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Try a different search term</p>
            </div>
          )}

          {showHistory && (
            <div className="p-2">
              <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                <Clock className="w-3 h-3" />
                Recent Searches
              </div>
              {searchHistory.map((historyQuery, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectHistory(historyQuery)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 text-left text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                >
                  <Clock className="w-4 h-4 text-slate-500 dark:text-slate-500 flex-shrink-0" />
                  <span className="flex-1 truncate">{historyQuery}</span>
                </button>
              ))}
            </div>
          )}

          {displayResults.length > 0 && (
            <div className="p-2">
              <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                <Search className="w-3 h-3" />
                Results ({displayResults.length})
              </div>
              {displayResults.map((result, index) => {
                const Icon = RESULT_TYPE_ICONS[result.type];
                const label = RESULT_TYPE_LABELS[result.type];
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={result.id}
                    data-result-index={index}
                    onClick={() => handleSelectResult(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-emerald-500/10 border border-emerald-500/30'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      isSelected ? 'bg-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800/50'
                    }`}>
                      <Icon className={`w-4 h-4 ${
                        isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-medium ${
                          isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-200'
                        }`}>
                          {highlightMatch(result.title, query)}
                        </span>
                        <span className="text-xs text-slate-600 dark:text-slate-500 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800/50 rounded">
                          {label}
                        </span>
                      </div>
                      {result.subtitle && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                          {highlightMatch(result.subtitle, query)}
                        </p>
                      )}
                    </div>
                    <ArrowRight className={`w-4 h-4 flex-shrink-0 ${
                      isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-500'
                    }`} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 dark:text-slate-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs">↑↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs">↵</kbd>
              <span>Select</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs">Esc</kbd>
              <span>Close</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Highlight search matches in text
 */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || query.trim().length === 0) return text;

  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={index} className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

