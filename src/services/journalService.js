/**
 * Journal Service
 * Handles all journal entry data operations including fetching, adding, updating, and deleting entries
 * Currently uses mock data, but designed to be easily integrated with Supabase in the future
 */

import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

// Mock data for journal entries
const mockJournalEntries = [
  {
    id: '1',
    date: '2025-03-01T08:30:00.000Z',
    symbol: 'AAPL',
    tradeType: 'long',
    strategy: 'Breakout',
    quantity: 100,
    entryPrice: 175.25,
    exitPrice: 182.50,
    pnl: 725,
    pnlPercent: 4.14,
    status: 'closed',
    setupNotes: 'Apple broke out of a 3-month consolidation pattern with increased volume. The stock had been building a base around the $170 level and finally broke through resistance at $175.',
    executionNotes: 'Entered the position when price confirmed the breakout with a strong green candle. Set a stop loss at $168 below the recent support level. Took profits when the stock reached the first price target at $182.50.',
    lessonsLearned: 'Patience paid off waiting for confirmation of the breakout rather than anticipating it. Could have held longer as the stock continued to rise after exit.',
    tags: ['breakout', 'technical', 'momentum']
  },
  {
    id: '2',
    date: '2025-03-05T10:15:00.000Z',
    symbol: 'MSFT',
    tradeType: 'call',
    strategy: 'Earnings Play',
    quantity: 5,
    entryPrice: 8.50,
    exitPrice: 12.75,
    pnl: 2125,
    pnlPercent: 50,
    status: 'closed',
    setupNotes: 'Microsoft had consistently beaten earnings estimates for the last 4 quarters. Bought calls 2 weeks before earnings announcement as IV was still relatively low.',
    executionNotes: 'Purchased 5 contracts of MSFT 400 calls expiring 1 month after earnings. Sold the day after earnings when the stock gapped up on positive results.',
    lessonsLearned: 'Options pricing worked in my favor as IV expansion and directional move both contributed to profits. In the future, consider selling half the position before earnings to reduce risk.',
    tags: ['options', 'earnings', 'swing']
  },
  {
    id: '3',
    date: '2025-03-10T14:45:00.000Z',
    symbol: 'TSLA',
    tradeType: 'short',
    strategy: 'Technical Reversal',
    quantity: 50,
    entryPrice: 245.75,
    exitPrice: 228.30,
    pnl: 872.5,
    pnlPercent: 7.1,
    status: 'closed',
    setupNotes: 'Tesla formed a double top pattern at resistance level around $245-250. RSI showed bearish divergence with price making higher highs while RSI made lower highs.',
    executionNotes: 'Entered short position after the second top formed and price started to decline. Set stop loss above recent high at $252. Covered the position when price reached the previous support level around $228.',
    lessonsLearned: 'The bearish divergence was a strong signal, but I should have sized the position more conservatively given Tesla\'s volatility and tendency for short squeezes.',
    tags: ['reversal', 'technical', 'short']
  },
  {
    id: '4',
    date: '2025-03-15T09:20:00.000Z',
    symbol: 'AMD',
    tradeType: 'long',
    strategy: 'Trend Following',
    quantity: 200,
    entryPrice: 110.25,
    exitPrice: null,
    pnl: 0,
    pnlPercent: 0,
    status: 'open',
    setupNotes: 'AMD has been in a strong uptrend following positive news about AI chip development. The stock pulled back to the 20-day moving average, creating a potential entry point.',
    executionNotes: 'Entered the position on the pullback to the 20-day MA with above-average volume indicating support at this level. Set a trailing stop at 7% below entry.',
    lessonsLearned: '',
    tags: ['trend', 'semiconductor', 'AI']
  },
  {
    id: '5',
    date: '2025-03-18T11:30:00.000Z',
    symbol: 'SPY',
    tradeType: 'put',
    strategy: 'Hedging',
    quantity: 10,
    entryPrice: 5.25,
    exitPrice: null,
    pnl: 0,
    pnlPercent: 0,
    status: 'open',
    setupNotes: 'Market has been making new highs for several weeks with decreasing volume and increasing volatility. Purchased puts as a hedge against my predominantly long portfolio.',
    executionNotes: 'Bought 10 contracts of SPY puts with strike price 5% below current market level and 45 days to expiration. Plan to hold as insurance against a market correction.',
    lessonsLearned: '',
    tags: ['hedge', 'options', 'risk-management']
  },
  {
    id: '6',
    date: '2025-03-20T13:15:00.000Z',
    symbol: 'NVDA',
    tradeType: 'long',
    strategy: 'Momentum',
    quantity: 75,
    entryPrice: 420.50,
    exitPrice: null,
    pnl: 0,
    pnlPercent: 0,
    status: 'open',
    setupNotes: 'NVIDIA continues to lead the AI chip market with strong revenue growth. The stock broke out to new all-time highs on heavy volume following industry conference announcements.',
    executionNotes: 'Entered position after the breakout was confirmed with two consecutive strong up days. Set initial stop at $395 below the breakout level.',
    lessonsLearned: '',
    tags: ['momentum', 'AI', 'breakout']
  }
];

/**
 * Get all journal entries
 * @returns {Promise<Array>} Array of journal entries
 */
export const getJournalEntries = async () => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return [...mockJournalEntries];
};

/**
 * Get journal entry by ID
 * @param {string} id Journal entry ID
 * @returns {Promise<Object|null>} Journal entry object or null if not found
 */
export const getJournalEntryById = async (id) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockJournalEntries.find(entry => entry.id === id) || null;
};

/**
 * Add a new journal entry
 * @param {Object} entry Journal entry object
 * @returns {Promise<Object>} Added journal entry with ID
 */
export const addJournalEntry = async (entry) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Ensure the entry has an ID
  const newEntry = {
    ...entry,
    id: entry.id || uuidv4()
  };
  
  // In a real app, this would add to the database
  mockJournalEntries.push(newEntry);
  
  return newEntry;
};

/**
 * Update an existing journal entry
 * @param {Object} entry Journal entry object with ID
 * @returns {Promise<Object>} Updated journal entry
 */
export const updateJournalEntry = async (entry) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Find the index of the entry to update
  const index = mockJournalEntries.findIndex(e => e.id === entry.id);
  
  if (index === -1) {
    throw new Error(`Journal entry with ID ${entry.id} not found`);
  }
  
  // Update the entry
  mockJournalEntries[index] = entry;
  
  return entry;
};

/**
 * Delete a journal entry
 * @param {string} id Journal entry ID
 * @returns {Promise<boolean>} True if successful
 */
export const deleteJournalEntry = async (id) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Find the index of the entry to delete
  const index = mockJournalEntries.findIndex(e => e.id === id);
  
  if (index === -1) {
    throw new Error(`Journal entry with ID ${id} not found`);
  }
  
  // Remove the entry
  mockJournalEntries.splice(index, 1);
  
  return true;
};

/**
 * Get journal statistics
 * @returns {Promise<Object>} Journal statistics
 */
export const getJournalStats = async () => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Calculate statistics
  const totalEntries = mockJournalEntries.length;
  const closedPositions = mockJournalEntries.filter(entry => entry.status === 'closed').length;
  const openPositions = mockJournalEntries.filter(entry => entry.status === 'open').length;
  
  // Get unique strategies
  const uniqueStrategies = new Set(mockJournalEntries.map(entry => entry.strategy));
  const strategiesUsed = uniqueStrategies.size;
  
  // Calculate profitable vs unprofitable trades
  const closedEntries = mockJournalEntries.filter(entry => entry.status === 'closed');
  const profitableTrades = closedEntries.filter(entry => parseFloat(entry.pnl) > 0).length;
  const unprofitableTrades = closedEntries.filter(entry => parseFloat(entry.pnl) <= 0).length;
  
  return {
    totalEntries,
    closedPositions,
    openPositions,
    strategiesUsed,
    profitableTrades,
    unprofitableTrades
  };
};

/**
 * Filter journal entries
 * @param {Array} entries Array of journal entries to filter
 * @param {Object} filters Filter criteria
 * @returns {Promise<Array>} Filtered journal entries
 */
export const filterJournalEntries = async (entries, filters) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 400));
  
  let filteredEntries = [...entries];
  
  // Apply filters
  if (filters.symbol) {
    filteredEntries = filteredEntries.filter(entry => 
      entry.symbol.toLowerCase().includes(filters.symbol.toLowerCase())
    );
  }
  
  if (filters.tradeType && filters.tradeType !== 'all') {
    filteredEntries = filteredEntries.filter(entry => 
      entry.tradeType === filters.tradeType
    );
  }
  
  if (filters.status && filters.status !== 'all') {
    filteredEntries = filteredEntries.filter(entry => 
      entry.status === filters.status
    );
  }
  
  if (filters.startDate) {
    const startDate = dayjs(filters.startDate);
    filteredEntries = filteredEntries.filter(entry => 
      dayjs(entry.date).isAfter(startDate) || dayjs(entry.date).isSame(startDate)
    );
  }
  
  if (filters.endDate) {
    const endDate = dayjs(filters.endDate);
    filteredEntries = filteredEntries.filter(entry => 
      dayjs(entry.date).isBefore(endDate) || dayjs(entry.date).isSame(endDate)
    );
  }
  
  if (filters.tags && filters.tags.length > 0) {
    filteredEntries = filteredEntries.filter(entry => 
      filters.tags.some(tag => entry.tags.includes(tag))
    );
  }
  
  return filteredEntries;
};

/**
 * Get all unique tags from journal entries
 * @returns {Promise<Array>} Array of unique tags
 */
export const getAllTags = async () => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Extract all tags and remove duplicates
  const allTags = mockJournalEntries.flatMap(entry => entry.tags);
  const uniqueTags = [...new Set(allTags)];
  
  return uniqueTags;
};
