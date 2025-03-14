import { finnhubClient } from './api';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration - use Vite's environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-supabase-url.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Fetch all stock positions from Supabase
 * @returns {Promise<Array>} Array of stock positions
 */
export const getStockPositions = async () => {
  try {
    // In a real implementation, this would fetch from Supabase
    // const { data, error } = await supabase
    //   .from('stock_positions')
    //   .select('*')
    //   .order('entryDate', { ascending: false });
    
    // if (error) throw error;
    
    // For demo purposes, return mock data
    const mockPositions = getMockStockPositions();
    
    // Update current prices for open positions
    return await updateStockPrices(mockPositions);
  } catch (error) {
    console.error('Error fetching stock positions:', error);
    throw error;
  }
};

/**
 * Add a new stock position to Supabase
 * @param {Object} position Stock position data
 * @returns {Promise<Object>} Added stock position
 */
export const addStockPosition = async (position) => {
  try {
    // In a real implementation, this would insert into Supabase
    // const { data, error } = await supabase
    //   .from('stock_positions')
    //   .insert(position)
    //   .select()
    //   .single();
    
    // if (error) throw error;
    // return data;
    
    // For demo purposes, just return the position
    return position;
  } catch (error) {
    console.error('Error adding stock position:', error);
    throw error;
  }
};

/**
 * Update an existing stock position in Supabase
 * @param {Object} position Stock position data
 * @returns {Promise<Object>} Updated stock position
 */
export const updateStockPosition = async (position) => {
  try {
    // In a real implementation, this would update in Supabase
    // const { data, error } = await supabase
    //   .from('stock_positions')
    //   .update(position)
    //   .eq('id', position.id)
    //   .select()
    //   .single();
    
    // if (error) throw error;
    // return data;
    
    // For demo purposes, just return the position
    return position;
  } catch (error) {
    console.error('Error updating stock position:', error);
    throw error;
  }
};

/**
 * Delete a stock position from Supabase
 * @param {string} id Stock position ID
 * @returns {Promise<void>}
 */
export const deleteStockPosition = async (id) => {
  try {
    // In a real implementation, this would delete from Supabase
    // const { error } = await supabase
    //   .from('stock_positions')
    //   .delete()
    //   .eq('id', id);
    
    // if (error) throw error;
    
    // For demo purposes, simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Update the mock data
    mockStockPositions = mockStockPositions.filter(position => position.id !== id);
    
    return;
  } catch (error) {
    console.error('Error deleting stock position:', error);
    throw error;
  }
};

/**
 * Delete multiple stock positions
 * @param {Array<string>} ids Array of stock position IDs to delete
 * @returns {Promise<void>}
 */
export const deleteStockPositions = async (ids) => {
  try {
    // In a real implementation, this would delete from Supabase
    // const { error } = await supabase
    //   .from('stock_positions')
    //   .delete()
    //   .in('id', ids);
    
    // if (error) throw error;
    
    // For demo purposes, simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Update the mock data
    mockStockPositions = mockStockPositions.filter(position => !ids.includes(position.id));
    
    return;
  } catch (error) {
    console.error('Error deleting stock positions:', error);
    throw error;
  }
};

/**
 * Update stock prices for all open positions
 * @param {Array} positions Array of stock positions
 * @returns {Promise<Array>} Updated array of stock positions
 */
export const updateStockPrices = async (positions) => {
  try {
    const openPositions = positions.filter(p => p.status === 'open');
    
    // If no open positions, return original array
    if (openPositions.length === 0) return positions;
    
    // Get unique symbols
    const symbols = [...new Set(openPositions.map(p => p.symbol))];
    
    // Fetch current prices for all symbols
    const priceUpdates = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          // Use the Finnhub API to get real-time stock prices
          const response = await finnhubClient.get('/quote', {
            params: { symbol }
          });
          return { symbol, price: response.data.c };
        } catch (error) {
          console.error(`Error fetching price for ${symbol}:`, error);
          // Fallback to mock price if API call fails
          const mockPrice = getMockPrice(symbol);
          return { symbol, price: mockPrice };
        }
      })
    );
    
    // Create a map of symbol to price
    const priceMap = priceUpdates.reduce((map, update) => {
      map[update.symbol] = update.price;
      return map;
    }, {});
    
    // Update positions with current prices and calculate P&L
    return positions.map(position => {
      if (position.status === 'closed') return position;
      
      const currentPrice = priceMap[position.symbol] || position.currentPrice;
      
      // Calculate P&L
      const entryValue = position.entryPrice * position.quantity;
      const currentValue = currentPrice * position.quantity;
      
      let profitLoss = 0;
      if (position.direction === 'long') {
        profitLoss = currentValue - entryValue;
      } else {
        profitLoss = entryValue - currentValue;
      }
      
      // Calculate P&L percentage
      const profitLossPercentage = (profitLoss / entryValue) * 100;
      
      return {
        ...position,
        currentPrice,
        profitLoss,
        profitLossPercentage
      };
    });
  } catch (error) {
    console.error('Error updating stock prices:', error);
    return positions; // Return original positions on error
  }
};

/**
 * Get mock stock positions for demo purposes
 * @returns {Array} Array of mock stock positions
 */
let mockStockPositions = [
  {
    id: '1',
    symbol: 'AAPL',
    direction: 'long',
    quantity: 100,
    entryPrice: 175.50,
    currentPrice: 0, // Will be updated
    entryDate: '2025-02-15T00:00:00.000Z',
    exitDate: null,
    stopLoss: 165.00,
    takeProfit: 195.00,
    status: 'open',
    notes: 'Strong support at $170, expecting earnings beat'
  },
  {
    id: '2',
    symbol: 'MSFT',
    direction: 'long',
    quantity: 50,
    entryPrice: 380.25,
    currentPrice: 0, // Will be updated
    entryDate: '2025-02-20T00:00:00.000Z',
    exitDate: null,
    stopLoss: 360.00,
    takeProfit: 420.00,
    status: 'open',
    notes: 'Cloud segment growth looks promising'
  },
  {
    id: '3',
    symbol: 'TSLA',
    direction: 'short',
    quantity: 25,
    entryPrice: 190.75,
    currentPrice: 0, // Will be updated
    entryDate: '2025-03-01T00:00:00.000Z',
    exitDate: null,
    stopLoss: 210.00,
    takeProfit: 160.00,
    status: 'open',
    notes: 'Concerns about production targets'
  },
  {
    id: '4',
    symbol: 'AMZN',
    direction: 'long',
    quantity: 30,
    entryPrice: 165.30,
    currentPrice: 0, // Will be updated
    entryDate: '2025-03-05T00:00:00.000Z',
    exitDate: null,
    stopLoss: 155.00,
    takeProfit: 185.00,
    status: 'open',
    notes: 'AWS growth and retail margins improving'
  },
  {
    id: '5',
    symbol: 'NVDA',
    direction: 'long',
    quantity: 20,
    entryPrice: 850.25,
    currentPrice: 0, // Will be updated
    entryDate: '2025-03-10T00:00:00.000Z',
    exitDate: null,
    stopLoss: 800.00,
    takeProfit: 950.00,
    status: 'open',
    notes: 'AI demand continues to drive growth'
  },
  {
    id: '6',
    symbol: 'META',
    direction: 'long',
    quantity: 40,
    entryPrice: 470.50,
    currentPrice: 480.25,
    entryDate: '2025-01-15T00:00:00.000Z',
    exitDate: '2025-02-10T00:00:00.000Z',
    stopLoss: 450.00,
    takeProfit: 500.00,
    status: 'closed',
    notes: 'Took profit after earnings beat'
  },
  {
    id: '7',
    symbol: 'NFLX',
    direction: 'short',
    quantity: 15,
    entryPrice: 610.75,
    currentPrice: 590.25,
    entryDate: '2025-01-20T00:00:00.000Z',
    exitDate: '2025-02-05T00:00:00.000Z',
    stopLoss: 630.00,
    takeProfit: 580.00,
    status: 'closed',
    notes: 'Subscriber growth missed expectations'
  }
];

/**
 * Get mock stock positions for demo purposes
 * @returns {Array} Array of mock stock positions
 */
const getMockStockPositions = () => {
  return [...mockStockPositions];
};

/**
 * Get a mock price for a symbol
 * @param {string} symbol Stock symbol
 * @returns {number} Mock current price
 */
const getMockPrice = (symbol) => {
  // Base prices for common stocks
  const basePrices = {
    'AAPL': 190.50,
    'MSFT': 425.75,
    'TSLA': 175.25,
    'AMZN': 180.30,
    'NVDA': 625.80,
    'GOOGL': 175.40,
    'META': 485.60,
    'AMD': 165.25
  };
  
  // Use base price or generate a random one
  const basePrice = basePrices[symbol] || 100.00;
  
  // Add some randomness (±3%)
  const randomFactor = 0.97 + Math.random() * 0.06;
  return parseFloat((basePrice * randomFactor).toFixed(2));
};

export { getMockStockPositions };
