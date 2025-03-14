/**
 * Option Service
 * 
 * Provides functions for managing option positions, including:
 * - Fetching option positions from the database
 * - Updating option prices with real-time data
 * - Calculating profit/loss values
 */

// Mock data for development - would be replaced with actual API calls in production
const MOCK_OPTION_POSITIONS = [
  {
    id: '1',
    symbol: 'AAPL',
    optionType: 'call',
    direction: 'long',
    quantity: 2,
    entryPrice: 5.75,
    currentPrice: 7.25,
    strikePrice: 180.00,
    entryDate: '2023-10-15T00:00:00.000Z',
    expirationDate: '2023-12-15T00:00:00.000Z',
    entryFees: 1.50,
    status: 'open',
    strategy: 'Earnings Play',
    setupNotes: 'Expecting positive earnings surprise',
    executionNotes: 'Filled at market open',
    lessonsLearned: '',
    tags: ['Earnings', 'Momentum'],
    additionalNotes: '',
    profitLoss: 300.00,
    profitLossPercentage: 26.09
  },
  {
    id: '2',
    symbol: 'TSLA',
    optionType: 'put',
    direction: 'long',
    quantity: 1,
    entryPrice: 12.50,
    currentPrice: 9.75,
    strikePrice: 250.00,
    entryDate: '2023-10-20T00:00:00.000Z',
    expirationDate: '2023-11-17T00:00:00.000Z',
    entryFees: 0.75,
    status: 'open',
    strategy: 'Technical Breakdown',
    setupNotes: 'Bearish divergence on daily chart',
    executionNotes: '',
    lessonsLearned: '',
    tags: ['Technical', 'Bearish'],
    additionalNotes: '',
    profitLoss: -275.00,
    profitLossPercentage: -22.00
  },
  {
    id: '3',
    symbol: 'SPY',
    optionType: 'multi-leg',
    strategyType: 'iron-condor',
    direction: 'short',
    quantityMultiplier: 1,
    entryDate: '2023-10-05T00:00:00.000Z',
    expirationDate: '2023-11-30T00:00:00.000Z',
    entryFees: 2.00,
    status: 'open',
    strategy: 'Volatility Play',
    setupNotes: 'Expecting market to trade sideways',
    executionNotes: 'Filled in parts over 2 days',
    lessonsLearned: '',
    tags: ['Neutral', 'Volatility', 'Theta'],
    additionalNotes: '',
    currentPrice: 2.25,
    profitLoss: 75.00,
    profitLossPercentage: 37.50,
    legs: [
      {
        id: '3-1',
        optionType: 'put',
        direction: 'short',
        quantity: 1,
        strikePrice: 430.00,
        expirationDate: '2023-11-30T00:00:00.000Z',
        entryPrice: 1.25
      },
      {
        id: '3-2',
        optionType: 'put',
        direction: 'long',
        quantity: 1,
        strikePrice: 420.00,
        expirationDate: '2023-11-30T00:00:00.000Z',
        entryPrice: 0.75
      },
      {
        id: '3-3',
        optionType: 'call',
        direction: 'short',
        quantity: 1,
        strikePrice: 450.00,
        expirationDate: '2023-11-30T00:00:00.000Z',
        entryPrice: 1.50
      },
      {
        id: '3-4',
        optionType: 'call',
        direction: 'long',
        quantity: 1,
        strikePrice: 460.00,
        expirationDate: '2023-11-30T00:00:00.000Z',
        entryPrice: 0.75
      }
    ]
  },
  {
    id: '4',
    symbol: 'MSFT',
    optionType: 'call',
    direction: 'short',
    quantity: 1,
    entryPrice: 8.50,
    currentPrice: 6.25,
    strikePrice: 360.00,
    entryDate: '2023-09-25T00:00:00.000Z',
    expirationDate: '2023-11-25T00:00:00.000Z',
    entryFees: 0.50,
    status: 'open',
    strategy: 'Theta Decay',
    setupNotes: 'Selling premium after earnings',
    executionNotes: '',
    lessonsLearned: '',
    tags: ['Theta', 'Post-Earnings'],
    additionalNotes: '',
    profitLoss: 225.00,
    profitLossPercentage: 26.47
  },
  {
    id: '5',
    symbol: 'AMZN',
    optionType: 'multi-leg',
    strategyType: 'vertical-spread',
    direction: 'long',
    quantityMultiplier: 2,
    entryDate: '2023-10-10T00:00:00.000Z',
    expirationDate: '2023-12-15T00:00:00.000Z',
    entryFees: 1.00,
    status: 'open',
    strategy: 'Bullish Earnings Play',
    setupNotes: 'Expecting strong holiday guidance',
    executionNotes: '',
    lessonsLearned: '',
    tags: ['Earnings', 'Debit Spread'],
    additionalNotes: '',
    currentPrice: 4.50,
    profitLoss: 200.00,
    profitLossPercentage: 33.33,
    legs: [
      {
        id: '5-1',
        optionType: 'call',
        direction: 'long',
        quantity: 2,
        strikePrice: 135.00,
        expirationDate: '2023-12-15T00:00:00.000Z',
        entryPrice: 5.00
      },
      {
        id: '5-2',
        optionType: 'call',
        direction: 'short',
        quantity: 2,
        strikePrice: 145.00,
        expirationDate: '2023-12-15T00:00:00.000Z',
        entryPrice: 2.00
      }
    ]
  },
  {
    id: '6',
    symbol: 'AMD',
    optionType: 'put',
    direction: 'short',
    quantity: 3,
    entryPrice: 3.25,
    currentPrice: 1.75,
    strikePrice: 110.00,
    entryDate: '2023-09-15T00:00:00.000Z',
    expirationDate: '2023-11-10T00:00:00.000Z',
    entryFees: 1.50,
    status: 'open',
    strategy: 'Theta Decay',
    setupNotes: 'Selling puts at support level',
    executionNotes: '',
    lessonsLearned: '',
    tags: ['Theta', 'Support'],
    additionalNotes: '',
    profitLoss: 450.00,
    profitLossPercentage: 46.15
  },
  {
    id: '7',
    symbol: 'QQQ',
    optionType: 'multi-leg',
    strategyType: 'butterfly',
    direction: 'long',
    quantityMultiplier: 1,
    entryDate: '2023-10-01T00:00:00.000Z',
    expirationDate: '2023-11-15T00:00:00.000Z',
    entryFees: 1.00,
    status: 'open',
    strategy: 'Low Risk Directional',
    setupNotes: 'Expecting QQQ to land near 375 by expiration',
    executionNotes: '',
    lessonsLearned: '',
    tags: ['Defined Risk', 'Directional'],
    additionalNotes: '',
    currentPrice: 1.50,
    profitLoss: 50.00,
    profitLossPercentage: 50.00,
    legs: [
      {
        id: '7-1',
        optionType: 'call',
        direction: 'long',
        quantity: 1,
        strikePrice: 365.00,
        expirationDate: '2023-11-15T00:00:00.000Z',
        entryPrice: 10.00
      },
      {
        id: '7-2',
        optionType: 'call',
        direction: 'short',
        quantity: 2,
        strikePrice: 375.00,
        expirationDate: '2023-11-15T00:00:00.000Z',
        entryPrice: 5.00
      },
      {
        id: '7-3',
        optionType: 'call',
        direction: 'long',
        quantity: 1,
        strikePrice: 385.00,
        expirationDate: '2023-11-15T00:00:00.000Z',
        entryPrice: 2.00
      }
    ]
  }
];

/**
 * Fetch option positions from the database
 * 
 * @returns {Promise<Array>} Array of option positions
 */
export const getOptionPositions = async () => {
  // In a real implementation, this would fetch data from an API
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_OPTION_POSITIONS);
    }, 500);
  });
};

/**
 * Update option prices with real-time data
 * 
 * @param {Array} positions - Array of option positions to update
 * @returns {Promise<Array>} Updated array of option positions
 */
export const updateOptionPrices = async (positions) => {
  // In a real implementation, this would fetch current prices from an API like Finnhub
  return new Promise((resolve) => {
    setTimeout(() => {
      const updatedPositions = positions.map(position => {
        // Simulate price changes
        const priceChange = (Math.random() * 0.2) - 0.1; // -10% to +10%
        let newPrice;
        
        if (position.optionType === 'multi-leg') {
          // For multi-leg, update the overall strategy price
          newPrice = Math.max(0.01, position.currentPrice * (1 + priceChange));
          
          // Calculate P&L based on strategy type and direction
          const costBasis = position.legs.reduce((total, leg) => {
            const legCost = leg.entryPrice * leg.quantity * (leg.direction === 'long' ? 1 : -1);
            return total + legCost;
          }, 0) * position.quantityMultiplier;
          
          const currentValue = newPrice * position.quantityMultiplier;
          const profitLoss = position.direction === 'long' 
            ? currentValue - costBasis
            : costBasis - currentValue;
          
          const profitLossPercentage = (profitLoss / Math.abs(costBasis)) * 100;
          
          return {
            ...position,
            currentPrice: newPrice,
            profitLoss,
            profitLossPercentage
          };
        } else {
          // For single-leg options
          newPrice = Math.max(0.01, position.currentPrice * (1 + priceChange));
          
          // Calculate P&L
          const costBasis = position.entryPrice * position.quantity;
          const currentValue = newPrice * position.quantity;
          
          let profitLoss;
          if (position.direction === 'long') {
            profitLoss = currentValue - costBasis;
          } else {
            profitLoss = costBasis - currentValue;
          }
          
          const profitLossPercentage = (profitLoss / costBasis) * 100;
          
          return {
            ...position,
            currentPrice: newPrice,
            profitLoss,
            profitLossPercentage
          };
        }
      });
      
      resolve(updatedPositions);
    }, 500);
  });
};

/**
 * Add a new option position
 * 
 * @param {Object} position - Option position to add
 * @returns {Promise<Object>} Added position with ID
 */
export const addOptionPosition = async (position) => {
  // In a real implementation, this would send data to an API
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ...position,
        id: Math.random().toString(36).substring(2, 9)
      });
    }, 500);
  });
};

/**
 * Update an existing option position
 * 
 * @param {Object} position - Option position to update
 * @returns {Promise<Object>} Updated position
 */
export const updateOptionPosition = async (position) => {
  // In a real implementation, this would send data to an API
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(position);
    }, 500);
  });
};

/**
 * Delete an option position
 * 
 * @param {string} positionId - ID of position to delete
 * @returns {Promise<boolean>} Success status
 */
export const deleteOptionPosition = async (positionId) => {
  // In a real implementation, this would send a delete request to an API
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 500);
  });
};
