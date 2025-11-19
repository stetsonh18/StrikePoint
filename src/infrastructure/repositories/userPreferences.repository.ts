import { supabase } from '@/infrastructure/api/supabase';
import type { UserPreferences } from '@/domain/types/user.types';

export class UserPreferencesRepository {
  /**
   * Get user preferences by user ID
   * Creates default preferences if none exist
   */
  static async getUserPreferences(userId: string): Promise<UserPreferences> {
    // First try to get existing preferences
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" - we'll create defaults
      throw error;
    }

    // If preferences exist, return them
    if (data) {
      return {
        userId: data.user_id,
        currency: data.currency,
        timezone: data.timezone,
        notifications: {
          email: data.email_notifications,
          desktop: data.desktop_notifications,
        },
        isEarlyAdopter: data.is_early_adopter ?? false,
        subscriptionPrice: data.subscription_price ? parseFloat(data.subscription_price) : undefined,
        stripeCustomerId: data.stripe_customer_id || undefined,
        stripeSubscriptionId: data.stripe_subscription_id || undefined,
        discountCode: data.discount_code || undefined,
        isFreeForever: data.is_free_forever ?? false,
        subscriptionStatus: data.subscription_status || undefined,
      };
    }

    // Create default preferences
    const defaultPreferences: UserPreferences = {
      userId,
      currency: 'USD',
      timezone: 'America/New_York',
      notifications: {
        email: true,
        desktop: false,
      },
    };

    await this.updateUserPreferences(userId, defaultPreferences);
    return defaultPreferences;
  }

  /**
   * Update user preferences
   */
  static async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    const updateData: Record<string, unknown> = {};

    if (preferences.currency !== undefined) {
      updateData.currency = preferences.currency;
    }

    if (preferences.timezone !== undefined) {
      updateData.timezone = preferences.timezone;
    }

    if (preferences.notifications) {
      if (preferences.notifications.email !== undefined) {
        updateData.email_notifications = preferences.notifications.email;
      }
      if (preferences.notifications.desktop !== undefined) {
        updateData.desktop_notifications = preferences.notifications.desktop;
      }
    }

    if (preferences.isEarlyAdopter !== undefined) {
      updateData.is_early_adopter = preferences.isEarlyAdopter;
    }

    if (preferences.subscriptionPrice !== undefined) {
      updateData.subscription_price = preferences.subscriptionPrice;
    }

    if (preferences.stripeCustomerId !== undefined) {
      updateData.stripe_customer_id = preferences.stripeCustomerId;
    }

    if (preferences.stripeSubscriptionId !== undefined) {
      updateData.stripe_subscription_id = preferences.stripeSubscriptionId;
    }

    if (preferences.discountCode !== undefined) {
      updateData.discount_code = preferences.discountCode;
    }

    if (preferences.isFreeForever !== undefined) {
      updateData.is_free_forever = preferences.isFreeForever;
    }

    if (preferences.subscriptionStatus !== undefined) {
      updateData.subscription_status = preferences.subscriptionStatus;
    }

    // Try to update first
    const { data: updatedData, error: updateError } = await supabase
      .from('user_preferences')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      // If update fails (no row exists), insert instead
      const insertData = {
        user_id: userId,
        currency: preferences.currency || 'USD',
        timezone: preferences.timezone || 'America/New_York',
        email_notifications: preferences.notifications?.email ?? true,
        desktop_notifications: preferences.notifications?.desktop ?? false,
      };

      const { data: insertedData, error: insertError } = await supabase
        .from('user_preferences')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      return {
        userId: insertedData.user_id,
        currency: insertedData.currency,
        timezone: insertedData.timezone,
        notifications: {
          email: insertedData.email_notifications,
          desktop: insertedData.desktop_notifications,
        },
        isEarlyAdopter: insertedData.is_early_adopter ?? false,
        subscriptionPrice: insertedData.subscription_price ? parseFloat(insertedData.subscription_price) : undefined,
        stripeCustomerId: insertedData.stripe_customer_id || undefined,
        stripeSubscriptionId: insertedData.stripe_subscription_id || undefined,
        discountCode: insertedData.discount_code || undefined,
        isFreeForever: insertedData.is_free_forever ?? false,
        subscriptionStatus: insertedData.subscription_status || undefined,
      };
    }

    return {
      userId: updatedData.user_id,
      currency: updatedData.currency,
      timezone: updatedData.timezone,
      notifications: {
        email: updatedData.email_notifications,
        desktop: updatedData.desktop_notifications,
      },
      isEarlyAdopter: updatedData.is_early_adopter ?? false,
      subscriptionPrice: updatedData.subscription_price ? parseFloat(updatedData.subscription_price) : undefined,
      stripeCustomerId: updatedData.stripe_customer_id || undefined,
      stripeSubscriptionId: updatedData.stripe_subscription_id || undefined,
      discountCode: updatedData.discount_code || undefined,
      isFreeForever: updatedData.is_free_forever ?? false,
      subscriptionStatus: updatedData.subscription_status || undefined,
    };
  }

  /**
   * Check and set early adopter status for a user
   * This atomically checks if spots are available and sets the user's status
   */
  static async checkAndSetEarlyAdopter(userId: string): Promise<{
    isEarlyAdopter: boolean;
    subscriptionPrice: number;
    spotsRemaining: number;
  }> {
    const { data, error } = await supabase.rpc('check_and_set_early_adopter', {
      p_user_id: userId,
    });

    if (error) {
      // Log the error for debugging
      console.error('Error calling check_and_set_early_adopter:', error);
      
      // If function doesn't exist, provide helpful error message
      if (error.message?.includes('function') || error.code === '42883') {
        throw new Error('Early adopter function not found. Please ensure database migrations have been applied.');
      }
      
      throw error;
    }

    // Handle case where data might be null or undefined
    if (!data) {
      throw new Error('No data returned from early adopter check');
    }

    // The function returns a TABLE, so Supabase RPC returns an array
    // Get the first row from the result
    const result = Array.isArray(data) ? data[0] : data;

    if (!result) {
      throw new Error('No result returned from early adopter check');
    }

    return {
      isEarlyAdopter: result.is_early_adopter ?? false,
      subscriptionPrice: parseFloat(String(result.subscription_price)) || 19.99,
      spotsRemaining: result.spots_remaining ?? 0,
    };
  }

  /**
   * Get current early adopter count
   */
  static async getEarlyAdopterCount(): Promise<number> {
    const { data, error } = await supabase.rpc('get_early_adopter_count');

    if (error) {
      throw error;
    }

    return data ?? 0;
  }
}

