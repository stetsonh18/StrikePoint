import { supabase } from '../api/supabase';
import { parseError, logErrorWithContext } from '@/shared/utils/errorHandler';
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
   * Returns both system defaults (user_id IS NULL) and user-specific contracts (user_id = userId)
   * Prioritizes user-specific contracts over system defaults when duplicates exist
   * @param userId - User ID to filter by. If not provided, returns all specs (for backward compatibility)
   */
  static async getAll(userId?: string): Promise<FuturesContractSpec[]> {
    let query = supabase
      .from(this.tableName)
      .select('*');

    if (userId) {
      // Return both system defaults (user_id IS NULL) and user-specific contracts
      query = query.or(`user_id.is.null,user_id.eq.${userId}`);
    }

    const { data, error } = await query.order('symbol', { ascending: true });

    if (error) {
      const parsed = parseError(error);
      logErrorWithContext(error, { context: 'FuturesContractSpecRepository.getAll', userId });
      throw new Error(`Failed to fetch futures contract specs: ${parsed.message}`, { cause: error });
    }

    if (!data || !userId) {
      return data || [];
    }

    // Deduplicate: prioritize user-specific contracts over system defaults
    const contractMap = new Map<string, FuturesContractSpec>();
    for (const spec of data) {
      const existing = contractMap.get(spec.symbol);
      if (!existing || (spec.user_id && !existing.user_id)) {
        // Use this spec if no existing one, or if this is user-specific and existing is system default
        contractMap.set(spec.symbol, spec);
      }
    }

    return Array.from(contractMap.values()).sort((a, b) => a.symbol.localeCompare(b.symbol));
  }

  /**
   * Get all active futures contract specifications for a user
   * Returns both system defaults (user_id IS NULL) and user-specific contracts (user_id = userId)
   * Prioritizes user-specific contracts over system defaults when duplicates exist
   * @param userId - User ID to filter by. If not provided, returns all active specs (for backward compatibility)
   */
  static async getActive(userId?: string): Promise<FuturesContractSpec[]> {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('is_active', true);

    if (userId) {
      // Return both system defaults (user_id IS NULL) and user-specific contracts
      query = query.or(`user_id.is.null,user_id.eq.${userId}`);
    }

    const { data, error } = await query.order('symbol', { ascending: true });

    if (error) {
      const parsed = parseError(error);
      logErrorWithContext(error, { context: 'FuturesContractSpecRepository.getActive', userId });
      throw new Error(`Failed to fetch active futures contract specs: ${parsed.message}`, { cause: error });
    }

    if (!data || !userId) {
      return data || [];
    }

    // Deduplicate: prioritize user-specific contracts over system defaults
    const contractMap = new Map<string, FuturesContractSpec>();
    for (const spec of data) {
      const existing = contractMap.get(spec.symbol);
      if (!existing || (spec.user_id && !existing.user_id)) {
        // Use this spec if no existing one, or if this is user-specific and existing is system default
        contractMap.set(spec.symbol, spec);
      }
    }

    return Array.from(contractMap.values()).sort((a, b) => a.symbol.localeCompare(b.symbol));
  }

  /**
   * Get a futures contract specification by symbol
   * Prioritizes user-specific contract over system default
   * @param symbol - Contract symbol (e.g., 'ES', 'NQ')
   * @param userId - User ID to filter by. If not provided, returns first match (for backward compatibility)
   */
  static async getBySymbol(symbol: string, userId?: string): Promise<FuturesContractSpec | null> {
    if (userId) {
      // First try to get user-specific contract
      const { data: userSpec, error: userError } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('symbol', symbol)
        .eq('user_id', userId)
        .maybeSingle();

      if (userError && userError.code !== 'PGRST116') {
        const parsed = parseError(userError);
        logErrorWithContext(userError, { context: 'FuturesContractSpecRepository.getBySymbol', symbol, userId });
        throw new Error(`Failed to fetch futures contract spec: ${parsed.message}`, { cause: userError });
      }

      if (userSpec) {
        return userSpec;
      }

      // Fall back to system default
      const { data: defaultSpec, error: defaultError } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('symbol', symbol)
        .is('user_id', null)
        .maybeSingle();

      if (defaultError && defaultError.code !== 'PGRST116') {
        const parsed = parseError(defaultError);
        logErrorWithContext(defaultError, { context: 'FuturesContractSpecRepository.getBySymbol', symbol, userId });
        throw new Error(`Failed to fetch futures contract spec: ${parsed.message}`, { cause: defaultError });
      }

      return defaultSpec;
    }

    // No userId provided - return first match (backward compatibility)
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('symbol', symbol)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      const parsed = parseError(error);
      logErrorWithContext(error, { context: 'FuturesContractSpecRepository.getBySymbol', symbol });
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
      logErrorWithContext(error, { context: 'FuturesContractSpecRepository.getById', id });
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

    const { data, error } = await dbQuery.order('symbol', { ascending: true });

    if (error) {
      const parsed = parseError(error);
      logErrorWithContext(error, { context: 'FuturesContractSpecRepository.search', query, userId });
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
      logErrorWithContext(error, { context: 'FuturesContractSpecRepository.create', spec });
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
      logErrorWithContext(error, { context: 'FuturesContractSpecRepository.update', id, updates });
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
      logErrorWithContext(error, { context: 'FuturesContractSpecRepository.delete', id });
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
      logErrorWithContext(error, { context: 'FuturesContractSpecRepository.getBySymbols', symbols, userId });
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
      logErrorWithContext(error, { context: 'FuturesContractSpecRepository.deleteAllForUser', userId });
      throw new Error(`Failed to delete user futures contract specs: ${parsed.message}`, { cause: error });
    }
  }
}
