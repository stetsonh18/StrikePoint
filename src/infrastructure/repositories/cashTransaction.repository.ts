import { supabase } from '../api/supabase';
import { logger } from '@/shared/utils/logger';
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
      logger.error('Error creating cash transaction', error);
      
      // Check if the error is about a missing column (schema not up to date)
      if (error.message?.includes('transaction_id') || error.message?.includes('column') || error.code === '42703') {
        throw new Error(
          `Database schema update required: The 'transaction_id' column does not exist in the cash_transactions table. ` +
          `Please ensure your database schema is up to date. Check database/schema/consolidated_schema.sql`
        );
      }
      
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
      logger.error('Error fetching cash transaction', error);
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
      logger.error('Error fetching cash transactions', error);
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
      logger.error('Error updating cash transaction', error);
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
      logger.error('Error deleting cash transaction', error);
      throw new Error(`Failed to delete cash transaction: ${error.message}`);
    }
  }
}

