import { supabase } from '../api/supabase';
import { logger } from '@/shared/utils/logger';
import { parseError } from '@/shared/utils/errorHandler';
import type {
  StrategyPlanFilters,
  StrategyPlanGenerationPayload,
  StrategyAlignmentSnapshot,
  StrategyAlignmentResult,
  StrategyAssetType,
  StrategyPlanUpdate,
  TradingStrategyPlan,
} from '@/domain/types';

interface StrategyPlanListResponse {
  data: TradingStrategyPlan[];
}

interface StrategyPlanFunctionResponse {
  plan: TradingStrategyPlan;
  aiPlan: Record<string, unknown>;
}

export class StrategyPlanRepository {
  static async list(userId: string, filters?: StrategyPlanFilters): Promise<StrategyPlanListResponse> {
    try {
      let query = supabase
        .from('trading_strategy_plans')
        .select('*')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false })
        .order('updated_at', { ascending: false });

      if (filters?.asset_type) {
        if (Array.isArray(filters.asset_type)) {
          query = query.in('asset_type', filters.asset_type);
        } else {
          query = query.eq('asset_type', filters.asset_type);
        }
      }

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters?.is_primary !== undefined) {
        query = query.eq('is_primary', filters.is_primary);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { data: data ?? [] };
    } catch (error) {
      const parsed = parseError(error);
      logger.error('[StrategyPlanRepository] list failed', parsed);
      throw new Error(parsed.message);
    }
  }

  static async getById(id: string): Promise<TradingStrategyPlan | null> {
    try {
      const { data, error } = await supabase.from('trading_strategy_plans').select('*').eq('id', id).maybeSingle();

      if (error) throw error;

      return data ?? null;
    } catch (error) {
      const parsed = parseError(error);
      logger.error('[StrategyPlanRepository] getById failed', parsed);
      throw new Error(parsed.message);
    }
  }

  static async update(id: string, updates: StrategyPlanUpdate): Promise<TradingStrategyPlan> {
    try {
      const { data, error } = await supabase
        .from('trading_strategy_plans')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      const parsed = parseError(error);
      logger.error('[StrategyPlanRepository] update failed', parsed);
      throw new Error(parsed.message);
    }
  }

  static async remove(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('trading_strategy_plans').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      const parsed = parseError(error);
      logger.error('[StrategyPlanRepository] remove failed', parsed);
      throw new Error(parsed.message);
    }
  }

  static async setPrimary(planId: string, assetType: StrategyAssetType, userId: string): Promise<TradingStrategyPlan> {
    try {
      const { error: unsetError } = await supabase
        .from('trading_strategy_plans')
        .update({ is_primary: false })
        .eq('user_id', userId)
        .eq('asset_type', assetType);

      if (unsetError) throw unsetError;

      return this.update(planId, { is_primary: true });
    } catch (error) {
      const parsed = parseError(error);
      logger.error('[StrategyPlanRepository] setPrimary failed', parsed);
      throw new Error(parsed.message);
    }
  }

  static async generateWithAI(payload: StrategyPlanGenerationPayload): Promise<StrategyPlanFunctionResponse> {
    try {
      const { data, error } = await supabase.functions.invoke<StrategyPlanFunctionResponse>(
        'generate-strategy-plan',
        {
          body: payload,
        }
      );

      if (error) throw error;
      if (!data) throw new Error('No response from strategy generator');

      return data;
    } catch (error) {
      const parsed = parseError(error);
      logger.error('[StrategyPlanRepository] generateWithAI failed', parsed);
      throw new Error(parsed.message);
    }
  }

  static async evaluateAlignment(planId: string): Promise<StrategyAlignmentResult> {
    try {
      const { data, error } = await supabase.functions.invoke<StrategyAlignmentResult>(
        'evaluate-strategy-alignment',
        {
          body: { planId },
        }
      );

      if (error) throw error;
      if (!data) throw new Error('No alignment data returned');

      return data;
    } catch (error) {
      const parsed = parseError(error);
      logger.error('[StrategyPlanRepository] evaluateAlignment failed', parsed);
      throw new Error(parsed.message);
    }
  }

  static async getAlignmentHistory(planId: string, limit = 12): Promise<StrategyAlignmentSnapshot[]> {
    try {
      const { data, error } = await supabase
        .from('strategy_alignment_snapshots')
        .select('*')
        .eq('plan_id', planId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data ?? [];
    } catch (error) {
      const parsed = parseError(error);
      logger.error('[StrategyPlanRepository] getAlignmentHistory failed', parsed);
      throw new Error(parsed.message);
    }
  }
}

