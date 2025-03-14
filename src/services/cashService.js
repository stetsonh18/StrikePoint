/**
 * Cash Service
 * 
 * Provides functions for managing cash transactions in StrikePoint.
 * In a production environment, these would connect to a backend API.
 */
import { v4 as uuidv4 } from 'uuid';

// In-memory storage for development
let mockTransactionsStorage = [];

/**
 * Get all transactions
 * 
 * @returns {Promise<Array>} Array of transaction objects
 */
export const getTransactions = async () => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // In production, this would be a call to Supabase
  // return await supabase.from('transactions').select('*');
  
  return [...mockTransactionsStorage];
};

/**
 * Add a new transaction
 * 
 * @param {Object} transaction - Transaction object to add
 * @returns {Promise<Object>} Added transaction
 */
export const addTransaction = async (transaction) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Ensure transaction has an ID
  if (!transaction.id) {
    transaction.id = uuidv4();
  }
  
  // In production, this would be a call to Supabase
  // return await supabase.from('transactions').insert(transaction).select().single();
  
  mockTransactionsStorage.push(transaction);
  return transaction;
};

/**
 * Update an existing transaction
 * 
 * @param {Object} transaction - Transaction object with updated values
 * @returns {Promise<Object>} Updated transaction
 */
export const updateTransaction = async (transaction) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // In production, this would be a call to Supabase
  // return await supabase.from('transactions').update(transaction).eq('id', transaction.id).select().single();
  
  const index = mockTransactionsStorage.findIndex(t => t.id === transaction.id);
  if (index !== -1) {
    mockTransactionsStorage[index] = transaction;
    return transaction;
  }
  throw new Error('Transaction not found');
};

/**
 * Delete a transaction by ID
 * 
 * @param {string} id - ID of the transaction to delete
 * @returns {Promise<void>}
 */
export const deleteTransaction = async (id) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // In production, this would be a call to Supabase
  // return await supabase.from('transactions').delete().eq('id', id);
  
  mockTransactionsStorage = mockTransactionsStorage.filter(t => t.id !== id);
};

/**
 * Delete multiple transactions by ID
 * 
 * @param {Array<string>} ids - Array of transaction IDs to delete
 * @returns {Promise<void>}
 */
export const deleteTransactions = async (ids) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // In production, this would be a call to Supabase
  // return await supabase.from('transactions').delete().in('id', ids);
  
  mockTransactionsStorage = mockTransactionsStorage.filter(t => !ids.includes(t.id));
};

/**
 * Get transaction statistics
 * 
 * @returns {Promise<Object>} Transaction statistics
 */
export const getTransactionStats = async () => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Calculate statistics from transactions
  const transactions = await getTransactions();
  
  const deposits = transactions.filter(t => t.type === 'deposit');
  const withdrawals = transactions.filter(t => t.type === 'withdrawal');
  
  const totalDeposits = deposits.reduce((sum, t) => sum + t.amount, 0);
  const totalWithdrawals = withdrawals.reduce((sum, t) => sum + t.amount, 0);
  
  return {
    totalTransactions: transactions.length,
    totalDeposits,
    totalWithdrawals,
    balance: totalDeposits - totalWithdrawals
  };
};
