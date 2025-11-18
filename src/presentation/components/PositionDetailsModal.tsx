import React, { useEffect, useRef, useMemo } from 'react';
import { X, Info, RefreshCw } from 'lucide-react';
import type { OptionContract, Position, Strategy } from '@/domain/types';
import { formatCurrency, formatDate, formatPercent } from '@/shared/utils/formatUtils';
import { useOptionQuotes } from '@/application/hooks/useOptionQuotes';
import { buildTradierOptionSymbol } from '@/shared/utils/positionTransformers';
import { logger } from '@/shared/utils/logger';

interface PositionDetailsModalProps {
  position: OptionContract | null;
  strategyGroup?: OptionContract[];
  strategy?: Strategy | null;
  allPositions?: Position[];
  onClose: () => void;
}

export const PositionDetailsModal: React.FC<PositionDetailsModalProps> = ({
  position,
  strategyGroup,
  strategy,
  allPositions,
  onClose,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!position && !strategyGroup) return null;

  const isMultiLeg = strategyGroup && strategyGroup.length > 1;
  const positionsToShow = strategyGroup || (position ? [position] : []);

  // Build Tradier option symbols for all positions in the modal
  const optionSymbols = useMemo(() => {
    const symbols: string[] = [];
    positionsToShow.forEach((pos) => {
      try {
        const tradierSymbol = buildTradierOptionSymbol(
          pos.underlyingSymbol,
          pos.expirationDate,
          pos.optionType,
          pos.strikePrice
        );
        symbols.push(tradierSymbol);
        logger.debug('[PositionDetailsModal] Built Tradier symbol', { tradierSymbol, position: pos });
      } catch (e) {
        logger.error('Error building Tradier symbol for modal', e, { position: pos });
      }
    });
    logger.debug('[PositionDetailsModal] Option symbols to fetch', { symbols });
    return symbols;
  }, [positionsToShow]);

  // Fetch real-time quotes for all positions in the modal
  const { data: optionQuotes = {}, isLoading: quotesLoading, isError: quotesError, error: quotesErrorObj, refetch: refetchQuotes } = useOptionQuotes(
    optionSymbols,
    optionSymbols.length > 0,
    {
      refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time updates
    }
  );

  // Debug logging
  useEffect(() => {
    if (optionSymbols.length > 0) {
      logger.debug('[PositionDetailsModal] Fetching quotes', { 
        symbols: optionSymbols, 
        loading: quotesLoading, 
        error: quotesError,
        errorObj: quotesErrorObj,
        quotes: optionQuotes 
      });
    }
  }, [optionSymbols, quotesLoading, quotesError, quotesErrorObj, optionQuotes]);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {isMultiLeg ? 'Strategy Details' : 'Position Details'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {position?.underlyingSymbol || strategyGroup?.[0]?.underlyingSymbol}
              {strategy && ` • ${strategy.strategy_type.replace('_', ' ').toUpperCase()}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="text-slate-600 dark:text-slate-400" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Strategy Summary (for multi-leg) */}
          {isMultiLeg && strategy && (
            <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">Strategy Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Net Credit/Debit</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(strategy.total_opening_cost)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Status</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 capitalize">{strategy.status}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Opened</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {formatDate(new Date(strategy.opened_at).toISOString())}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Expiration</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {strategy.expiration_date ? formatDate(strategy.expiration_date) : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Leg Details */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {isMultiLeg ? 'Leg Details' : 'Position Details'}
              </h3>
              <div className="flex items-center gap-3">
                {isMultiLeg && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/50">
                    <Info size={14} />
                    <span>Individual leg P&L shows what you'd get if you closed just that leg</span>
                  </div>
                )}
                <button
                  onClick={() => refetchQuotes()}
                  disabled={quotesLoading}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded-lg border border-slate-300 dark:border-slate-700/50 transition-colors disabled:opacity-50"
                  title="Refresh quotes"
                >
                  <RefreshCw size={14} className={quotesLoading ? 'animate-spin' : ''} />
                  <span>Refresh Quotes</span>
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {positionsToShow.map((pos, idx) => {
                const originalPosition = allPositions?.find(p => p.id === pos.id);
                const actualCostBasis = originalPosition?.total_cost_basis || 0;
                const isLong = pos.side === 'long';
                const multiplier = pos.multiplier || 100;
                
                // Get real-time quote for this position
                let tradierSymbol: string | null = null;
                try {
                  tradierSymbol = buildTradierOptionSymbol(
                    pos.underlyingSymbol,
                    pos.expirationDate,
                    pos.optionType,
                    pos.strikePrice
                  );
                } catch (e) {
                  logger.error('Error building Tradier symbol', e);
                }
                
                const quote = tradierSymbol ? optionQuotes[tradierSymbol] : null;
                
                // Debug logging for quote lookup
                if (tradierSymbol) {
                  logger.debug('[PositionDetailsModal] Quote lookup', { 
                    symbol: tradierSymbol, 
                    availableKeys: Object.keys(optionQuotes),
                    quote 
                  });
                }
                
                // Use real-time quote if available, otherwise fall back to position data
                const currentPrice = quote 
                  ? (quote.last || (quote.bid && quote.ask ? (quote.bid + quote.ask) / 2 : pos.currentPrice || pos.averagePrice))
                  : (pos.currentPrice || pos.averagePrice);
                
                const marketValue = pos.quantity * multiplier * currentPrice;
                const posPL = isLong
                  ? marketValue - Math.abs(actualCostBasis)
                  : Math.abs(actualCostBasis) - marketValue;
                const costBasisAbs = Math.abs(actualCostBasis);
                const posPLPercent = costBasisAbs > 0 ? (posPL / costBasisAbs) * 100 : 0;
                
                // Use quote Greeks if available, otherwise fall back to position data
                const delta = quote?.delta ?? pos.delta;
                const gamma = quote?.gamma ?? pos.gamma;
                const theta = quote?.theta ?? pos.theta;
                const vega = quote?.vega ?? pos.vega;
                const impliedVolatility = quote?.implied_volatility ?? pos.impliedVolatility;

                return (
                  <div
                    key={pos.id || idx}
                    className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                            isLong
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {isLong ? 'LONG' : 'SHORT'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {pos.optionType.toUpperCase()} ${pos.strikePrice}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {pos.underlyingSymbol} • {formatDate(pos.expirationDate)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-semibold ${
                            posPL >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {formatCurrency(posPL)}
                        </p>
                        <p
                          className={`text-xs ${
                            posPLPercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {formatPercent(posPLPercent)}
                        </p>
                      </div>
                    </div>

                    {/* Real-time Quote Section */}
                    {quotesLoading && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Loading real-time quote...</p>
                      </div>
                    )}
                    {quotesError && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-red-600 dark:text-red-400 mb-2">Error loading quote: {quotesErrorObj?.message || 'Unknown error'}</p>
                      </div>
                    )}
                    {!quotesLoading && !quotesError && !quote && tradierSymbol && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                          <p className="text-xs text-amber-400 mb-1 font-medium">Quote Not Available</p>
                          <p className="text-xs text-slate-400 mb-2">
                            Real-time quote data is not available for <code className="text-amber-300">{tradierSymbol}</code>. This may be because:
                          </p>
                          <ul className="text-xs text-slate-500 list-disc list-inside space-y-1 mb-2">
                            <li>The option contract may not exist in Tradier's system</li>
                            <li>The option may be expired or too far in the future</li>
                            <li>The market may be closed</li>
                            <li>Tradier may not have data for this specific contract</li>
                            {tradierSymbol.startsWith('SPX') && !tradierSymbol.startsWith('SPXW') && (
                              <li className="text-amber-300">SPX options may need SPXW (weekly) format - try using SPXW as the underlying symbol</li>
                            )}
                          </ul>
                          <p className="text-xs text-slate-500 italic">
                            Note: According to Tradier API docs, option symbols use OCC format: {'{underlying}{YYMMDD}{C|P}{strike_in_cents}'}
                          </p>
                        </div>
                      </div>
                    )}
                    {quote && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 font-medium">Real-time Quote (Tradier)</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg p-3">
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">Bid</p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {quote.bid ? formatCurrency(quote.bid) : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">Ask</p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {quote.ask ? formatCurrency(quote.ask) : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">Last</p>
                            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                              {quote.last ? formatCurrency(quote.last) : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">Mid</p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {quote.bid && quote.ask ? formatCurrency((quote.bid + quote.ask) / 2) : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">Volume</p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {quote.volume?.toLocaleString() || '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">Open Interest</p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {quote.open_interest?.toLocaleString() || '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">IV</p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {impliedVolatility ? `${(impliedVolatility * 100).toFixed(2)}%` : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">In The Money</p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {quote.in_the_money !== undefined ? (quote.in_the_money ? 'Yes' : 'No') : '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Contracts</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{pos.quantity}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Entry Price</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(pos.averagePrice)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Current Price</p>
                        <p className={`text-sm font-semibold ${quote ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                          {formatCurrency(currentPrice)}
                          {quote && <span className="ml-1 text-xs text-slate-500 dark:text-slate-500">(live)</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Market Value</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(marketValue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Cost Basis</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(costBasisAbs)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Delta</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {delta !== undefined ? delta.toFixed(2) : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Gamma</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {gamma !== undefined ? gamma.toFixed(4) : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Theta</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {theta !== undefined ? theta.toFixed(2) : '-'}
                        </p>
                      </div>
                      {vega !== undefined && (
                        <div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Vega</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {vega.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total P&L for multi-leg */}
          {isMultiLeg && strategyGroup && (
            <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Total Strategy P&L</h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/50 mb-3">
                <Info size={14} />
                <span>
                  This is your actual P&L if you close the entire spread. It accounts for the net credit/debit you received when opening the strategy.
                </span>
              </div>
              <div className="flex items-center justify-end">
                <div className="text-right">
                  {(() => {
                    let totalPL = 0;
                    let totalCostBasis = 0;
                    
                    strategyGroup.forEach((pos) => {
                      const origPos = allPositions?.find(p => p.id === pos.id);
                      const actualCostBasis = origPos?.total_cost_basis || 0;
                      const isLong = pos.side === 'long';
                      const marketValue = pos.marketValue || 0;
                      const posPL = isLong
                        ? marketValue - Math.abs(actualCostBasis)
                        : Math.abs(actualCostBasis) - marketValue;
                      totalPL += posPL;
                      totalCostBasis += Math.abs(actualCostBasis);
                    });

                    // Use strategy's total_opening_cost if available
                    let finalPL = totalPL;
                    let finalPLPercent = 0;
                    
                    if (strategy && strategy.total_opening_cost !== undefined) {
                      let longLegsValue = 0;
                      let shortLegsValue = 0;
                      
                      strategyGroup.forEach((pos) => {
                        const marketValue = pos.marketValue || 0;
                        if (pos.side === 'long') {
                          longLegsValue += marketValue;
                        } else {
                          shortLegsValue += marketValue;
                        }
                      });
                      
                      const currentSpreadValue = longLegsValue - shortLegsValue;
                      const netCreditDebit = strategy.total_opening_cost;
                      finalPL = currentSpreadValue - netCreditDebit;
                      
                      // For spreads, calculate percentage based on net credit/debit
                      const netCreditDebitAbs = Math.abs(netCreditDebit);
                      finalPLPercent = netCreditDebitAbs > 0 ? (finalPL / netCreditDebitAbs) * 100 : 0;
                    } else {
                      // Fallback to total cost basis if no strategy data
                      finalPLPercent = totalCostBasis > 0 ? (finalPL / totalCostBasis) * 100 : 0;
                    }

                    return (
                      <div>
                        <p
                          className={`text-xl font-bold ${
                            finalPL >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {formatCurrency(finalPL)}
                        </p>
                        <p
                          className={`text-sm ${
                            finalPLPercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {formatPercent(finalPLPercent)}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

