import { supabase } from '@/infrastructure/api/supabase';

export interface PortfolioSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string; // ISO date string
  portfolio_value: number;
  net_cash_flow: number;
  total_market_value: number;
  total_realized_pl: number;
  total_unrealized_pl: number;
  daily_pl_change: number | null;
  daily_pl_percent: number | null;
  open_positions_count: number;
  total_positions_count: number;
  positions_breakdown: {
    stocks: { count: number; value: number };
    options: { count: number; value: number };
    crypto: { count: number; value: number };
    futures: { count: number; value: number };
  };
  created_at: string;
  updated_at: string;
}

export interface CreatePortfolioSnapshotDto {
  user_id: string;
  snapshot_date: string; // ISO date string
  portfolio_value: number;
  net_cash_flow: number;
  total_market_value: number;
  total_realized_pl: number;
  total_unrealized_pl: number;
  open_positions_count: number;
  total_positions_count: number;
  positions_breakdown: {
    stocks: { count: number; value: number };
    options: { count: number; value: number };
    crypto: { count: number; value: number };
    futures: { count: number; value: number };
  };
}

export class PortfolioSnapshotRepository {
  /**
   * Create a new portfolio snapshot
   */
  static async create(data: CreatePortfolioSnapshotDto): Promise<PortfolioSnapshot> {
    const { data: snapshot, error } = await supabase
      .from('portfolio_snapshots')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create portfolio snapshot: ${error.message}`);
    }

    return snapshot;
  }

  /**
   * Upsert a portfolio snapshot (insert or update if exists for same date)
   */
  static async upsert(data: CreatePortfolioSnapshotDto): Promise<PortfolioSnapshot> {
    // First try to get existing snapshot
    const existing = await this.getByDate(data.user_id, data.snapshot_date);
    
    if (existing) {
      // Update existing snapshot
      const { data: snapshot, error } = await supabase
        .from('portfolio_snapshots')
        .update({
          portfolio_value: data.portfolio_value,
          net_cash_flow: data.net_cash_flow,
          total_market_value: data.total_market_value,
          total_realized_pl: data.total_realized_pl,
          total_unrealized_pl: data.total_unrealized_pl,
          open_positions_count: data.open_positions_count,
          total_positions_count: data.total_positions_count,
          positions_breakdown: data.positions_breakdown,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update portfolio snapshot: ${error.message}`);
      }

      return snapshot;
    } else {
      // Create new snapshot
      return this.create(data);
    }
  }

  /**
   * Get a snapshot by ID
   */
  static async getById(id: string): Promise<PortfolioSnapshot | null> {
    const { data: snapshot, error } = await supabase
      .from('portfolio_snapshots')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get portfolio snapshot: ${error.message}`);
    }

    return snapshot;
  }

  /**
   * Get a snapshot by user and date
   */
  static async getByDate(userId: string, date: string): Promise<PortfolioSnapshot | null> {
    const { data: snapshot, error } = await supabase
      .from('portfolio_snapshots')
      .select('*')
      .eq('user_id', userId)
      .eq('snapshot_date', date)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get portfolio snapshot by date: ${error.message}`);
    }

    return snapshot;
  }

  /**
   * Get snapshots for a date range
   */
  static async getDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<PortfolioSnapshot[]> {
    const { data: snapshots, error } = await supabase
      .from('portfolio_snapshots')
      .select('*')
      .eq('user_id', userId)
      .gte('snapshot_date', startDate)
      .lte('snapshot_date', endDate)
      .order('snapshot_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to get portfolio snapshots for date range: ${error.message}`);
    }

    return snapshots || [];
  }

  /**
   * Get the latest N snapshots for a user
   */
  static async getLatest(userId: string, limit: number = 30): Promise<PortfolioSnapshot[]> {
    const { data: snapshots, error } = await supabase
      .from('portfolio_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get latest portfolio snapshots: ${error.message}`);
    }

    return snapshots || [];
  }

  /**
   * Get all snapshots for a user
   */
  static async getAll(userId: string): Promise<PortfolioSnapshot[]> {
    const { data: snapshots, error } = await supabase
      .from('portfolio_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to get all portfolio snapshots: ${error.message}`);
    }

    return snapshots || [];
  }

  /**
   * Get the most recent snapshot for a user
   */
  static async getMostRecent(userId: string): Promise<PortfolioSnapshot | null> {
    const { data: snapshot, error } = await supabase
      .from('portfolio_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get most recent portfolio snapshot: ${error.message}`);
    }

    return snapshot;
  }

  /**
   * Get snapshot from N days ago
   */
  static async getFromDaysAgo(userId: string, daysAgo: number): Promise<PortfolioSnapshot | null> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - daysAgo);
    const dateString = targetDate.toISOString().split('T')[0];

    // Get the closest snapshot on or before the target date
    const { data: snapshots, error } = await supabase
      .from('portfolio_snapshots')
      .select('*')
      .eq('user_id', userId)
      .lte('snapshot_date', dateString)
      .order('snapshot_date', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Failed to get portfolio snapshot from ${daysAgo} days ago: ${error.message}`);
    }

    if (!snapshots || snapshots.length === 0) {
      return null;
    }

    return snapshots[0];
  }

  /**
   * Delete a snapshot
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('portfolio_snapshots')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete portfolio snapshot: ${error.message}`);
    }
  }

  /**
   * Delete all snapshots for a user
   */
  static async deleteAllForUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('portfolio_snapshots')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete all portfolio snapshots for user: ${error.message}`);
    }
  }

  /**
   * Get count of snapshots for a user
   */
  static async getCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('portfolio_snapshots')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to get portfolio snapshot count: ${error.message}`);
    }

    return count || 0;
  }
}

