/**
 * Analytics Service
 * 
 * Provides functions for generating analytics data for the StrikePoint application.
 * Includes functions for calculating performance metrics, account history, and other analytics.
 */

import { getTransactions, getTransactionStats } from './cashService';
import { getStockPositions } from './stockService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get account balance history
 * 
 * @param {string} timeframe - Timeframe for history (1M, 3M, 6M, 1Y, ALL)
 * @returns {Promise<Object>} Account balance history data
 */
export const getAccountBalanceHistory = async (timeframe = '6M') => {
  // Get all transactions
  const transactions = await getTransactions();
  
  // Sort transactions by date
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );
  
  // Filter transactions based on timeframe
  const filteredTransactions = filterByTimeframe(sortedTransactions, timeframe);
  
  if (filteredTransactions.length === 0) {
    return {
      labels: [],
      accountBalance: [],
      cashBalance: [],
      tradingPnL: []
    };
  }
  
  // Generate daily data points
  const startDate = new Date(filteredTransactions[0].date);
  const endDate = new Date();
  const datePoints = generateDatePoints(startDate, endDate);
  
  // Calculate running balances
  let runningCashBalance = 0;
  let runningTradingPnL = 0;
  
  const balanceData = datePoints.map(date => {
    // Get transactions up to this date
    const transactionsToDate = filteredTransactions.filter(t => 
      new Date(t.date) <= date
    );
    
    // Calculate cash balance
    const deposits = transactionsToDate
      .filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const withdrawals = transactionsToDate
      .filter(t => t.type === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0);
    
    runningCashBalance = deposits - withdrawals;
    
    // Calculate trading P&L (simplified for demo)
    // In a real app, this would be calculated from actual position data
    const tradingTransactions = transactionsToDate.filter(t => 
      t.positionId !== null
    );
    
    runningTradingPnL = tradingTransactions.reduce((sum, t) => {
      if (t.type === 'deposit') {
        return sum + t.amount;
      } else {
        return sum - t.amount;
      }
    }, 0);
    
    // Format date for display
    const formattedDate = date.toISOString().split('T')[0];
    
    return {
      date: formattedDate,
      cashBalance: runningCashBalance,
      tradingPnL: runningTradingPnL,
      accountBalance: runningCashBalance + runningTradingPnL
    };
  });
  
  // Extract data series for chart
  return {
    labels: balanceData.map(d => d.date),
    accountBalance: balanceData.map(d => d.accountBalance),
    cashBalance: balanceData.map(d => d.cashBalance),
    tradingPnL: balanceData.map(d => d.tradingPnL)
  };
};

/**
 * Get performance metrics
 * 
 * @param {string} timeframe - Timeframe for metrics (1M, 3M, 6M, 1Y, ALL)
 * @returns {Promise<Object>} Performance metrics
 */
export const getPerformanceMetrics = async (timeframe = '6M') => {
  // Get stock positions
  const positions = await getStockPositions();
  
  // Filter positions based on timeframe
  const filteredPositions = filterPositionsByTimeframe(positions, timeframe);
  
  // Calculate metrics
  const totalTrades = filteredPositions.length;
  
  if (totalTrades === 0) {
    return {
      totalPnL: 0,
      winRate: 0,
      totalTrades: 0,
      profitFactor: 0,
      averageWin: 0,
      averageLoss: 0,
      largestWin: 0,
      largestLoss: 0
    };
  }
  
  // Calculate P&L
  const totalPnL = filteredPositions.reduce((sum, p) => sum + p.profitLoss, 0);
  
  // Calculate win rate
  const winningTrades = filteredPositions.filter(p => p.profitLoss > 0);
  const winRate = (winningTrades.length / totalTrades) * 100;
  
  // Calculate profit factor
  const grossProfit = winningTrades.reduce((sum, p) => sum + p.profitLoss, 0);
  const losingTrades = filteredPositions.filter(p => p.profitLoss < 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, p) => sum + p.profitLoss, 0));
  const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;
  
  // Calculate average win/loss
  const averageWin = winningTrades.length > 0 
    ? grossProfit / winningTrades.length 
    : 0;
    
  const averageLoss = losingTrades.length > 0 
    ? grossLoss / losingTrades.length 
    : 0;
  
  // Calculate largest win/loss
  const largestWin = winningTrades.length > 0 
    ? Math.max(...winningTrades.map(p => p.profitLoss)) 
    : 0;
    
  const largestLoss = losingTrades.length > 0 
    ? Math.abs(Math.min(...losingTrades.map(p => p.profitLoss))) 
    : 0;
  
  return {
    totalPnL,
    winRate,
    totalTrades,
    profitFactor,
    averageWin,
    averageLoss,
    largestWin,
    largestLoss
  };
};

/**
 * Get cash flow data
 * 
 * @param {string} timeframe - Timeframe for cash flow (1M, 3M, 6M, 1Y, ALL)
 * @returns {Promise<Object>} Cash flow data
 */
export const getCashFlowData = async (timeframe = '6M') => {
  // Get all transactions
  const transactions = await getTransactions();
  
  // Filter transactions based on timeframe
  const filteredTransactions = filterByTimeframe(transactions, timeframe);
  
  // Group transactions by month
  const months = groupTransactionsByMonth(filteredTransactions);
  
  // Calculate deposits and withdrawals by month
  const depositsByMonth = [];
  const withdrawalsByMonth = [];
  const monthLabels = [];
  
  Object.keys(months).sort().forEach(month => {
    const monthTransactions = months[month];
    
    const deposits = monthTransactions
      .filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const withdrawals = monthTransactions
      .filter(t => t.type === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0);
    
    depositsByMonth.push(deposits);
    withdrawalsByMonth.push(withdrawals);
    monthLabels.push(month);
  });
  
  // Calculate totals
  const totalDeposits = depositsByMonth.reduce((sum, amount) => sum + amount, 0);
  const totalWithdrawals = withdrawalsByMonth.reduce((sum, amount) => sum + amount, 0);
  const netCashFlow = totalDeposits - totalWithdrawals;
  
  return {
    series: [
      {
        name: 'Deposits',
        data: depositsByMonth
      },
      {
        name: 'Withdrawals',
        data: withdrawalsByMonth
      }
    ],
    labels: monthLabels,
    totals: {
      deposits: totalDeposits,
      withdrawals: totalWithdrawals,
      netCashFlow
    }
  };
};

/**
 * Get account composition data
 * 
 * @returns {Promise<Object>} Account composition data
 */
export const getAccountComposition = async () => {
  // Get transaction stats for cash balance
  const stats = await getTransactionStats();
  
  // Get stock positions for stock value
  const stockPositions = await getStockPositions();
  
  // Calculate stock value
  const stockValue = stockPositions
    .filter(p => p.status === 'open' && p.direction === 'long')
    .reduce((sum, p) => sum + (p.currentPrice * p.quantity), 0);
  
  // Calculate option value (mock data for demo)
  const optionValue = stockPositions
    .filter(p => p.status === 'open' && p.symbol.includes('OPTION'))
    .reduce((sum, p) => sum + (p.currentPrice * p.quantity), 0);
  
  // Calculate total account value
  const totalValue = stats.currentBalance + stockValue + optionValue;
  
  // Calculate percentages
  const cashPercentage = totalValue > 0 ? (stats.currentBalance / totalValue) * 100 : 0;
  const stockPercentage = totalValue > 0 ? (stockValue / totalValue) * 100 : 0;
  const optionPercentage = totalValue > 0 ? (optionValue / totalValue) * 100 : 0;
  
  return {
    series: [cashPercentage, stockPercentage, optionPercentage],
    labels: ['Cash', 'Stock Positions', 'Option Positions'],
    values: {
      cash: stats.currentBalance,
      stock: stockValue,
      option: optionValue,
      total: totalValue
    }
  };
};

/**
 * Get performance by symbol data
 * 
 * @param {string} timeframe - Timeframe for performance (1M, 3M, 6M, 1Y, ALL)
 * @param {string} sortBy - Sort field (pnl, trades, winRate)
 * @returns {Promise<Array>} Performance by symbol data
 */
export const getPerformanceBySymbol = async (timeframe = '6M', sortBy = 'pnl') => {
  // Get stock positions
  const positions = await getStockPositions();
  
  // Filter positions based on timeframe
  const filteredPositions = filterPositionsByTimeframe(positions, timeframe);
  
  // Group positions by symbol
  const symbolMap = {};
  
  filteredPositions.forEach(position => {
    const { symbol, profitLoss } = position;
    
    if (!symbolMap[symbol]) {
      symbolMap[symbol] = {
        symbol,
        pnl: 0,
        trades: 0,
        wins: 0,
        losses: 0,
        winRate: 0
      };
    }
    
    symbolMap[symbol].pnl += profitLoss;
    symbolMap[symbol].trades += 1;
    
    if (profitLoss > 0) {
      symbolMap[symbol].wins += 1;
    } else if (profitLoss < 0) {
      symbolMap[symbol].losses += 1;
    }
  });
  
  // Calculate win rates
  Object.values(symbolMap).forEach(data => {
    data.winRate = data.trades > 0 ? (data.wins / data.trades) * 100 : 0;
  });
  
  // Convert to array and sort
  const symbolData = Object.values(symbolMap);
  
  switch (sortBy) {
    case 'pnl':
      return symbolData.sort((a, b) => b.pnl - a.pnl);
    case 'trades':
      return symbolData.sort((a, b) => b.trades - a.trades);
    case 'winRate':
      return symbolData.sort((a, b) => b.winRate - a.winRate);
    default:
      return symbolData;
  }
};

/**
 * Get performance by date data
 * 
 * @param {string} timeframe - Timeframe for performance (1M, 3M, 6M, 1Y, ALL)
 * @param {string} sortBy - Sort field (date, pnl, trades)
 * @returns {Promise<Array>} Performance by date data
 */
export const getPerformanceByDate = async (timeframe = '1M', sortBy = 'date') => {
  // Get stock positions
  const positions = await getStockPositions();
  
  // Filter positions based on timeframe
  const filteredPositions = filterPositionsByTimeframe(positions, timeframe);
  
  // Group positions by date
  const dateMap = {};
  
  filteredPositions.forEach(position => {
    const date = position.entryDate.split('T')[0];
    
    if (!dateMap[date]) {
      dateMap[date] = {
        date,
        pnl: 0,
        trades: 0
      };
    }
    
    dateMap[date].pnl += position.profitLoss;
    dateMap[date].trades += 1;
  });
  
  // Convert to array and sort
  const dateData = Object.values(dateMap);
  
  switch (sortBy) {
    case 'date':
      return dateData.sort((a, b) => new Date(b.date) - new Date(a.date));
    case 'pnl':
      return dateData.sort((a, b) => b.pnl - a.pnl);
    case 'trades':
      return dateData.sort((a, b) => b.trades - a.trades);
    default:
      return dateData;
  }
};

/**
 * Get performance over time data
 * 
 * @param {string} timeframe - Timeframe for performance (1M, 3M, 6M, 1Y, ALL)
 * @returns {Promise<Array>} Performance over time data
 */
export const getPerformanceOverTime = async (timeframe = '6M') => {
  // Get stock positions
  const positions = await getStockPositions();
  
  // Filter and sort positions by entry date
  const filteredPositions = filterPositionsByTimeframe(positions, timeframe)
    .sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
  
  if (filteredPositions.length === 0) {
    return [];
  }
  
  // Generate cumulative P&L data
  let cumulativePnL = 0;
  const performanceData = [];
  
  filteredPositions.forEach(position => {
    cumulativePnL += position.profitLoss;
    
    performanceData.push({
      x: position.entryDate.split('T')[0],
      y: cumulativePnL
    });
  });
  
  return performanceData;
};

// Helper functions

/**
 * Filter transactions by timeframe
 * 
 * @param {Array} transactions - Array of transactions
 * @param {string} timeframe - Timeframe (1M, 3M, 6M, 1Y, ALL)
 * @returns {Array} Filtered transactions
 */
const filterByTimeframe = (transactions, timeframe) => {
  if (timeframe === 'ALL') {
    return transactions;
  }
  
  const now = new Date();
  let startDate;
  
  switch (timeframe) {
    case '1M':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    case '3M':
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      break;
    case '6M':
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      break;
    case '1Y':
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
  }
  
  return transactions.filter(t => new Date(t.date) >= startDate);
};

/**
 * Filter positions by timeframe
 * 
 * @param {Array} positions - Array of positions
 * @param {string} timeframe - Timeframe (1M, 3M, 6M, 1Y, ALL)
 * @returns {Array} Filtered positions
 */
const filterPositionsByTimeframe = (positions, timeframe) => {
  if (timeframe === 'ALL') {
    return positions;
  }
  
  const now = new Date();
  let startDate;
  
  switch (timeframe) {
    case '1M':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    case '3M':
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      break;
    case '6M':
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      break;
    case '1Y':
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
  }
  
  return positions.filter(p => new Date(p.entryDate) >= startDate);
};

/**
 * Generate date points between start and end dates
 * 
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array<Date>} Array of date points
 */
const generateDatePoints = (startDate, endDate) => {
  const dates = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
};

/**
 * Group transactions by month
 * 
 * @param {Array} transactions - Array of transactions
 * @returns {Object} Transactions grouped by month
 */
const groupTransactionsByMonth = (transactions) => {
  const months = {};
  
  transactions.forEach(transaction => {
    const date = new Date(transaction.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!months[monthKey]) {
      months[monthKey] = [];
    }
    
    months[monthKey].push(transaction);
  });
  
  return months;
};
