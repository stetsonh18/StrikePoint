import { supabase } from '../api/supabase';

/**
 * Service to trigger AI insight generation
 * Calls the Supabase Edge Function that uses Claude API
 */
export class AIInsightGenerationService {
  /**
   * Generate insights of a specific type
   */
  static async generateInsights(
    insightType: 'risk_warning' | 'opportunity' | 'pattern' | 'performance' | 'strategy'
  ): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      // Get the current user's session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('User not authenticated');
      }

      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: { insightType },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('[AI Insight Generation] Edge Function error:', error);
        throw error;
      }

      return {
        success: data.success,
        count: data.count,
      };
    } catch (error) {
      console.error('[AI Insight Generation] Error:', error);
      return {
        success: false,
        count: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate all types of insights
   */
  static async generateAllInsights(): Promise<{
    success: boolean;
    totalCount: number;
    results: Array<{ type: string; count: number; error?: string }>;
  }> {
    const types: Array<'risk_warning' | 'opportunity' | 'pattern' | 'performance' | 'strategy'> = [
      'risk_warning',
      'opportunity',
      'pattern',
      'performance',
      'strategy',
    ];

    const results = await Promise.allSettled(
      types.map(type => this.generateInsights(type))
    );

    const processedResults = results.map((result, index) => {
      const type = types[index];
      if (result.status === 'fulfilled') {
        return {
          type,
          count: result.value.count,
          error: result.value.error,
        };
      } else {
        return {
          type,
          count: 0,
          error: result.reason?.message || 'Unknown error',
        };
      }
    });

    const totalCount = processedResults.reduce((sum, r) => sum + r.count, 0);
    const allSucceeded = processedResults.every(r => !r.error);

    return {
      success: allSucceeded,
      totalCount,
      results: processedResults,
    };
  }

  /**
   * Generate insights with rate limiting (max once per hour)
   */
  static async generateInsightsSafe(
    insightType: 'risk_warning' | 'opportunity' | 'pattern' | 'performance' | 'strategy'
  ): Promise<{ success: boolean; count: number; error?: string; rateLimited?: boolean }> {
    const lastGenKey = `ai_insights_last_gen_${insightType}`;
    const lastGenTime = localStorage.getItem(lastGenKey);

    if (lastGenTime) {
      const timeSinceLastGen = Date.now() - parseInt(lastGenTime, 10);
      const oneHour = 60 * 60 * 1000;

      if (timeSinceLastGen < oneHour) {
        return {
          success: false,
          count: 0,
          error: 'Rate limited: Please wait at least 1 hour between generations',
          rateLimited: true,
        };
      }
    }

    const result = await this.generateInsights(insightType);

    if (result.success) {
      localStorage.setItem(lastGenKey, Date.now().toString());
    }

    return result;
  }
}
