import { supabase } from '../api/supabase';
import { parseError, logError } from '@/shared/utils/errorHandler';
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
   * Get all futures contract specifications for a user
   * @param userId - User ID to filter by. If not provided, returns all specs (for backward compatibility)
   */
  static async getAll(userId?: string): Promise<FuturesContractSpec[]> {
    let query = supabase
      .from(this.tableName)
      .select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.order('symbol', { ascending: true });

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'FuturesContractSpecRepository.getAll', userId });
      throw new Error(`Failed to fetch futures contract specs: ${parsed.message}`, { cause: error });
    }

    return data || [];
  }

  /**
   * Get all active futures contract specifications for a user
   * @param userId - User ID to filter by. If not provided, returns all active specs (for backward compatibility)
   */
  static async getActive(userId?: string): Promise<FuturesContractSpec[]> {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('is_active', true);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.order('symbol', { ascending: true });

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'FuturesContractSpecRepository.getActive', userId });
      throw new Error(`Failed to fetch active futures contract specs: ${parsed.message}`, { cause: error });
    }

    return data || [];
  }

  /**
   * Get a futures contract specification by symbol
   * @param symbol - Contract symbol (e.g., 'ES', 'NQ')
   * @param userId - User ID to filter by. If not provided, returns first match (for backward compatibility)
   */
  static async getBySymbol(symbol: string, userId?: string): Promise<FuturesContractSpec | null> {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('symbol', symbol);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      const parsed = parseError(error);
      logError(error, { context: 'FuturesContractSpecRepository.getBySymbol', symbol, userId });
      throw new Error(`Failed to fetch futures contract spec: ${parsed.message}`, { cause: error });
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
      const parsed = parseError(error);
      logError(error, { context: 'FuturesContractSpecRepository.getById', id });
      throw new Error(`Failed to fetch futures contract spec: ${parsed.message}`, { cause: error });
    }

    return data;
  }

  /**
   * Search futures contract specifications by name or symbol
   * @param query - Search query string
   * @param userId - User ID to filter by. If not provided, searches all specs (for backward compatibility)
   */
  static async search(query: string, userId?: string): Promise<FuturesContractSpec[]> {
    let dbQuery = supabase
      .from(this.tableName)
      .select('*')
      .or(`symbol.ilike.%${query}%,name.ilike.%${query}%`);

    if (userId) {
      dbQuery = dbQuery.eq('user_id', userId);
    }

    const { data, error} = await dbQuery.order('symbol', { ascending: true });

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'FuturesContractSpecRepository.search', query, userId });
      throw new Error(`Failed to search futures contract specs: ${parsed.message}`, { cause: error });
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
      const parsed = parseError(error);
      logError(error, { context: 'FuturesContractSpecRepository.create', spec });
      throw new Error(`Failed to create futures contract spec: ${parsed.message}`, { cause: error });
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
      const parsed = parseError(error);
      logError(error, { context: 'FuturesContractSpecRepository.update', id, updates });
      throw new Error(`Failed to update futures contract spec: ${parsed.message}`, { cause: error });
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
      const parsed = parseError(error);
      logError(error, { context: 'FuturesContractSpecRepository.delete', id });
      throw new Error(`Failed to delete futures contract spec: ${parsed.message}`, { cause: error });
    }
  }

  /**
   * Get contract specifications for specific symbols
   * @param symbols - Array of contract symbols
   * @param userId - User ID to filter by. If not provided, returns all matching specs (for backward compatibility)
   */
  static async getBySymbols(symbols: string[], userId?: string): Promise<FuturesContractSpec[]> {
    if (symbols.length === 0) {
      return [];
    }

    let query = supabase
      .from(this.tableName)
      .select('*')
      .in('symbol', symbols);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.order('symbol', { ascending: true });

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'FuturesContractSpecRepository.getBySymbols', symbols, userId });
      throw new Error(`Failed to fetch futures contract specs: ${parsed.message}`, { cause: error });
    }

    return data || [];
  }

  /**
   * Delete all futures contract specifications for a user
   * @param userId - User ID to delete specs for
   */
  static async deleteAllForUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('user_id', userId);

    if (error) {
      const parsed = parseError(error);
      logError(error, { context: 'FuturesContractSpecRepository.deleteAllForUser', userId });
      throw new Error(`Failed to delete user futures contract specs: ${parsed.message}`, { cause: error });
    }
  }
}
