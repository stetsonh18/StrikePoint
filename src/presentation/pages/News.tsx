import { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, Filter, ExternalLink, Newspaper, ChevronLeft, ChevronRight, X, RefreshCw } from 'lucide-react';
import type { NewsArticle, NewsCategory } from '@/domain/types';
import { useMarketNews } from '@/application/hooks/useMarketNews';
import { useQueryClient } from '@tanstack/react-query';
import { Select } from '@/presentation/components/Select';
import { ArticleSkeleton } from '@/presentation/components/SkeletonLoader';
import { EmptyState } from '@/presentation/components/EmptyState';
import { LoadingOverlay } from '@/presentation/components/LoadingSpinner';
import { ErrorDisplay } from '@/presentation/components/ErrorDisplay';
import { getUserFriendlyErrorMessage, isRetryableError } from '@/shared/utils/errorHandler';

type SortOrder = 'newest' | 'oldest';

const News: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<NewsCategory | 'all'>('all');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [minId, setMinId] = useState<number | undefined>(undefined);
  const [pageHistory, setPageHistory] = useState<number[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Map app category to Finnhub category
  const getFinnhubCategory = (category: NewsCategory | 'all'): string => {
    if (category === 'all') return 'general';
    const categoryMap: Record<string, string> = {
      'general': 'general',
      'market': 'forex',
      'crypto': 'crypto',
      'company': 'merger',
    };
    return categoryMap[category] || 'general';
  };

  // Fetch news with current category and pagination
  const finnhubCategory = getFinnhubCategory(filterCategory);
  const { articles, isLoading, error, hasMore, minId: lastMinId } = useMarketNews(
    finnhubCategory,
    minId,
    true
  );

  // Filter news by symbol if selected
  const filteredBySymbol = useMemo(() => {
    if (!selectedSymbol) return articles;
    return articles.filter((article) =>
      article.symbols?.some((symbol) => symbol.toUpperCase() === selectedSymbol.toUpperCase())
    );
  }, [articles, selectedSymbol]);

  // Filter news by search query
  const filteredBySearch = useMemo(() => {
    if (!searchQuery) return filteredBySymbol;
    return filteredBySymbol.filter(
      (article) =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.symbols?.some((symbol) =>
          symbol.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );
  }, [searchQuery, filteredBySymbol]);

  // Sort news
  const filteredNews = useMemo(() => {
    const sorted = [...filteredBySearch].sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime();
      const dateB = new Date(b.publishedAt).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    return sorted;
  }, [filteredBySearch, sortOrder]);

  // Article count
  const totalArticles = filteredNews.length;
  const currentPageStart = pageHistory.length * 20 + 1;
  const currentPageEnd = currentPageStart + filteredNews.length - 1;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const handleNextPage = useCallback(() => {
    if (lastMinId && hasMore) {
      setPageHistory((prev) => [...prev, minId || 0]);
      setMinId(lastMinId);
    }
  }, [lastMinId, hasMore, minId]);

  const handlePreviousPage = useCallback(() => {
    setPageHistory((prev) => {
      if (prev.length > 0) {
        const previousMinId = prev[prev.length - 1];
        setMinId(previousMinId === 0 ? undefined : previousMinId);
        return prev.slice(0, -1);
      } else {
        setMinId(undefined);
        return prev;
      }
    });
  }, []);

  const handleCategoryChange = (category: NewsCategory | 'all') => {
    setFilterCategory(category);
    setMinId(undefined);
    setPageHistory([]);
    setSelectedSymbol(null);
  };

  const handleSymbolClick = (symbol: string) => {
    setSelectedSymbol(symbol);
    setMinId(undefined);
    setPageHistory([]);
  };

  const handleClearSymbolFilter = () => {
    setSelectedSymbol(null);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['market-news'] });
    setMinId(undefined);
    setPageHistory([]);
  };

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['market-news'] });
  };

  const toggleArticleExpansion = (articleId: string) => {
    setExpandedArticles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(articleId)) {
        newSet.delete(articleId);
      } else {
        newSet.add(articleId);
      }
      return newSet;
    });
  };

  const canGoNext = hasMore && lastMinId !== undefined && !isLoading;
  const canGoPrevious = (pageHistory.length > 0 || minId !== undefined) && !isLoading;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowLeft' && canGoPrevious) {
        e.preventDefault();
        handlePreviousPage();
      } else if (e.key === 'ArrowRight' && canGoNext) {
        e.preventDefault();
        handleNextPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canGoNext, canGoPrevious, handleNextPage, handlePreviousPage]);

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Market News
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Stay updated with the latest market news and analysis
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-800/70 border border-slate-700/50 rounded-xl text-slate-300 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh news"
        >
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[300px]">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <Select
              value={filterCategory}
              onChange={(e) => handleCategoryChange(e.target.value as NewsCategory | 'all')}
              options={[
                { value: 'all', label: 'All Categories' },
                { value: 'general', label: 'General' },
                { value: 'market', label: 'Market' },
                { value: 'crypto', label: 'Crypto' },
                { value: 'company', label: 'Company' },
              ]}
              size="sm"
            />

            <Select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              options={[
                { value: 'newest', label: 'Newest First' },
                { value: 'oldest', label: 'Oldest First' },
              ]}
              size="sm"
              title="Sort order"
            />
          </div>

          {selectedSymbol && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
              <span className="text-sm text-emerald-400">Filtered by: {selectedSymbol}</span>
              <button
                onClick={handleClearSymbolFilter}
                className="text-emerald-400 hover:text-emerald-300 transition-colors"
                aria-label="Clear symbol filter"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Article count badge */}
          {error && (
          <div className="mb-6">
            <ErrorDisplay
              title="Failed to load news"
              message={getUserFriendlyErrorMessage(error)}
              description={isRetryableError(error) ? 'This might be a temporary issue. Please try again.' : undefined}
              onRetry={() => window.location.reload()}
              retryLabel="Reload Page"
              showRetry={isRetryableError(error)}
            />
          </div>
        )}
        {!isLoading && !error && filteredNews.length > 0 && (
            <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <span className="text-sm text-emerald-400 font-medium">
                {totalArticles} {totalArticles === 1 ? 'article' : 'articles'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6">
          <ErrorDisplay
            title="Failed to load news"
            message={getUserFriendlyErrorMessage(error)}
            description={isRetryableError(error) ? 'This might be a temporary issue. Please try again.' : undefined}
            onRetry={isRetryableError(error) ? handleRetry : undefined}
            retryLabel="Retry"
            showRetry={isRetryableError(error)}
          />
        </div>
      )}

      {/* News Feed */}
      <div className="space-y-4">
        {isLoading && filteredNews.length === 0 ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <ArticleSkeleton key={i} />
            ))}
          </div>
        ) : !error && filteredNews.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title={
              selectedSymbol 
                ? `No news articles found for ${selectedSymbol}`
                : searchQuery
                ? `No articles match "${searchQuery}"`
                : 'No news articles found'
            }
            description={
              selectedSymbol || searchQuery
                ? 'Try adjusting your filters to see more results'
                : 'Check back later for the latest market news'
            }
            action={
              (selectedSymbol || searchQuery) ? (
                <button
                  onClick={() => {
                    setSelectedSymbol(null);
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 bg-slate-800/50 hover:bg-slate-800/70 border border-slate-700/50 rounded-xl text-slate-300 text-sm font-medium transition-all"
                >
                  Clear Filters
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Loading overlay during pagination */}
            <LoadingOverlay isLoading={isLoading && filteredNews.length > 0} text="Loading more articles...">
              <div className="space-y-4">
                {filteredNews.map((article) => {
              const isExpanded = expandedArticles.has(article.id);
              const summaryLength = article.summary.length;
              const shouldTruncate = summaryLength > 200;

              return (
                <div
                  key={article.id}
                  className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6 hover:border-emerald-500/30 transition-all"
                >
                  <div className="flex gap-4">
                    {article.imageUrl && (
                      <img
                        src={article.imageUrl}
                        alt={article.title}
                        className="w-32 h-32 object-cover rounded-xl flex-shrink-0"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-slate-100 mb-2">
                            {article.title}
                          </h3>
                          <p className={`text-slate-300 mb-3 ${!isExpanded && shouldTruncate ? 'line-clamp-3' : ''}`}>
                            {article.summary}
                          </p>
                          {shouldTruncate && (
                            <button
                              onClick={() => toggleArticleExpansion(article.id)}
                              className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
                            >
                              {isExpanded ? 'Show less' : 'Read more'}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                        <span className="px-2 py-1 bg-slate-800/50 text-slate-300 border border-slate-700/50 text-xs rounded capitalize">
                          {article.category}
                        </span>

                        <span>{article.source}</span>
                        <span>{formatDate(article.publishedAt)}</span>

                        <a
                          href={article.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline ml-auto transition-colors"
                        >
                          Read more
                          <ExternalLink size={14} />
                        </a>
                      </div>

                      {/* Symbols */}
                      {article.symbols && article.symbols.length > 0 && (
                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-sm text-slate-400">Related:</span>
                          <div className="flex gap-2 flex-wrap">
                            {article.symbols.map((symbol) => (
                              <button
                                key={symbol}
                                onClick={() => handleSymbolClick(symbol)}
                                className={`px-2 py-1 text-xs font-medium rounded transition-all ${
                                  selectedSymbol?.toUpperCase() === symbol.toUpperCase()
                                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 hover:text-emerald-300'
                                }`}
                              >
                                {symbol}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
              </div>
            </LoadingOverlay>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={handlePreviousPage}
                disabled={!canGoPrevious}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                  canGoPrevious
                    ? 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800/70 hover:border-emerald-500/50'
                    : 'bg-slate-800/30 border-slate-700/30 text-slate-600 cursor-not-allowed'
                }`}
                title="Previous page (←)"
              >
                <ChevronLeft size={18} />
                Previous
              </button>

              <div className="flex items-center gap-4 text-sm text-slate-400">
                {totalArticles > 0 && (
                  <span>
                    {pageHistory.length > 0 
                      ? `Page ${pageHistory.length + 1}` 
                      : 'Page 1'}
                    {totalArticles > 0 && ` • ${totalArticles} ${totalArticles === 1 ? 'article' : 'articles'}`}
                  </span>
                )}
              </div>

              <button
                onClick={handleNextPage}
                disabled={!canGoNext}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                  canGoNext
                    ? 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800/70 hover:border-emerald-500/50'
                    : 'bg-slate-800/30 border-slate-700/30 text-slate-600 cursor-not-allowed'
                }`}
                title="Next page (→)"
              >
                Next
                <ChevronRight size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default News;
