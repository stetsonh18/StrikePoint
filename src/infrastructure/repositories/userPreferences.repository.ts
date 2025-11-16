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
    const updateData: any = {};

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
    };
  }
}

