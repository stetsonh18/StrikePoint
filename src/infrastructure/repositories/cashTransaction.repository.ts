import { supabase } from '../api/supabase';
import type {
  CashTransaction,
  CashTransactionInsert,
  CashTransactionUpdate,
} from '@/domain/types';

/**
 * Cash Transaction Repository
 * Handles all database operations for cash_transactions table
 */
export class CashTransactionRepository {
  /**
   * Create a cash transaction
   */
  static async create(transaction: CashTransactionInsert): Promise<CashTransaction> {
    const { data, error } = await supabase
      .from('cash_transactions')
      .insert(transaction)
      .select()
      .single();

    if (error) {
      console.error('Error creating cash transaction:', error);
      throw new Error(`Failed to create cash transaction: ${error.message}`);
    }

    return data;
  }

  /**
   * Get a cash transaction by ID
   */
  static async getById(id: string): Promise<CashTransaction | null> {
    const { data, error } = await supabase
      .from('cash_transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching cash transaction:', error);
      throw new Error(`Failed to fetch cash transaction: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all cash transactions for a user
   */
  static async getByUserId(
    userId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      transactionCode?: string;
    }
  ): Promise<CashTransaction[]> {
    let query = supabase
      .from('cash_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('activity_date', { ascending: false });

    if (filters?.startDate) {
      query = query.gte('activity_date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('activity_date', filters.endDate);
    }

    if (filters?.transactionCode) {
      query = query.eq('transaction_code', filters.transactionCode);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching cash transactions:', error);
      throw new Error(`Failed to fetch cash transactions: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update a cash transaction
   */
  static async update(
    id: string,
    updates: CashTransactionUpdate
  ): Promise<CashTransaction> {
    const { data, error } = await supabase
      .from('cash_transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating cash transaction:', error);
      throw new Error(`Failed to update cash transaction: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a cash transaction
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('cash_transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting cash transaction:', error);
      throw new Error(`Failed to delete cash transaction: ${error.message}`);
    }
  }
}

