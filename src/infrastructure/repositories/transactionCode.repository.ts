import { supabase } from '../api/supabase';
import type { TransactionCode } from '@/domain/types';

/**
 * Transaction Code Repository
 * Handles all database operations for transaction_codes table
 */
export class TransactionCodeRepository {
  /**
   * Get all transaction codes
   */
  static async getAll(): Promise<TransactionCode[]> {
    const { data, error } = await supabase
      .from('transaction_codes')
      .select('*')
      .order('category', { ascending: true })
      .order('trans_code', { ascending: true });

    if (error) {
      console.error('Error fetching transaction codes:', error);
      throw new Error(`Failed to fetch transaction codes: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get transaction codes by category
   */
  static async getByCategory(category: string): Promise<TransactionCode[]> {
    const { data, error } = await supabase
      .from('transaction_codes')
      .select('*')
      .eq('category', category)
      .order('trans_code', { ascending: true });

    if (error) {
      console.error('Error fetching transaction codes by category:', error);
      throw new Error(`Failed to fetch transaction codes: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get transaction code by code
   */
  static async getByCode(transCode: string): Promise<TransactionCode | null> {
    const { data, error } = await supabase
      .from('transaction_codes')
      .select('*')
      .eq('trans_code', transCode)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching transaction code:', error);
      throw new Error(`Failed to fetch transaction code: ${error.message}`);
    }

    return data;
  }

  /**
   * Get cash movement transaction codes
   */
  static async getCashMovementCodes(): Promise<TransactionCode[]> {
    return this.getByCategory('Cash Movement');
  }
}

