import { supabase } from '../api/supabase';
import type {
  FuturesContractSpec,
  FuturesContractSpecInsert,
  FuturesContractSpecUpdate,
} from '@/domain/types';

/**
 * Futures Contract Specification Repository
 * Handles CRUD operations for futures contract specifications
 */
export class FuturesContractSpecRepository {
  private static tableName = 'futures_contract_specs';

  /**
   * Get all futures contract specifications
   */
  static async getAll(): Promise<FuturesContractSpec[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .order('symbol', { ascending: true });

    if (error) {
      console.error('Error fetching futures contract specs:', error);
      throw new Error(`Failed to fetch futures contract specs: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get all active futures contract specifications
   */
  static async getActive(): Promise<FuturesContractSpec[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('is_active', true)
      .order('symbol', { ascending: true });

    if (error) {
      console.error('Error fetching active futures contract specs:', error);
      throw new Error(`Failed to fetch active futures contract specs: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a futures contract specification by symbol
   */
  static async getBySymbol(symbol: string): Promise<FuturesContractSpec | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('symbol', symbol)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error(`Error fetching futures contract spec for ${symbol}:`, error);
      throw new Error(`Failed to fetch futures contract spec: ${error.message}`);
    }

    return data;
  }

  /**
   * Get a futures contract specification by ID
   */
  static async getById(id: string): Promise<FuturesContractSpec | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error(`Error fetching futures contract spec for ID ${id}:`, error);
      throw new Error(`Failed to fetch futures contract spec: ${error.message}`);
    }

    return data;
  }

  /**
   * Search futures contract specifications by name or symbol
   */
  static async search(query: string): Promise<FuturesContractSpec[]> {
    const { data, error} = await supabase
      .from(this.tableName)
      .select('*')
      .or(`symbol.ilike.%${query}%,name.ilike.%${query}%`)
      .order('symbol', { ascending: true });

    if (error) {
      console.error('Error searching futures contract specs:', error);
      throw new Error(`Failed to search futures contract specs: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a new futures contract specification
   */
  static async create(spec: FuturesContractSpecInsert): Promise<FuturesContractSpec> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(spec)
      .select()
      .single();

    if (error) {
      console.error('Error creating futures contract spec:', error);
      throw new Error(`Failed to create futures contract spec: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a futures contract specification
   */
  static async update(
    id: string,
    updates: FuturesContractSpecUpdate
  ): Promise<FuturesContractSpec> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating futures contract spec ${id}:`, error);
      throw new Error(`Failed to update futures contract spec: ${error.message}`);
    }

    return data;
  }

  /**
   * Deactivate a futures contract specification (soft delete)
   */
  static async deactivate(id: string): Promise<FuturesContractSpec> {
    return this.update(id, { is_active: false });
  }

  /**
   * Activate a futures contract specification
   */
  static async activate(id: string): Promise<FuturesContractSpec> {
    return this.update(id, { is_active: true });
  }

  /**
   * Delete a futures contract specification (hard delete)
   * Use sparingly - prefer deactivate() for soft delete
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting futures contract spec ${id}:`, error);
      throw new Error(`Failed to delete futures contract spec: ${error.message}`);
    }
  }

  /**
   * Get contract specifications for specific symbols
   */
  static async getBySymbols(symbols: string[]): Promise<FuturesContractSpec[]> {
    if (symbols.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .in('symbol', symbols)
      .order('symbol', { ascending: true });

    if (error) {
      console.error('Error fetching futures contract specs by symbols:', error);
      throw new Error(`Failed to fetch futures contract specs: ${error.message}`);
    }

    return data || [];
  }
}
