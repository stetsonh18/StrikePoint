import { supabase } from '../api/supabase';
import { UserPreferencesRepository } from '../repositories/userPreferences.repository';
import { EarlyAdopterService } from './earlyAdopterService';
import { logger } from '@/shared/utils/logger';

export interface SubscriptionPricing {
  priceId: string; // Stripe price ID
  amount: number; // Price in dollars
  isEarlyAdopter: boolean;
  isFreeForever: boolean;
  discountCode?: string;
}

export interface SubscriptionInfo {
  userId: string;
  isActive: boolean;
  status: string | null;
  price: number | null;
  isEarlyAdopter: boolean;
  isFreeForever: boolean;
  discountCode: string | null;
  customerId: string | null;
  subscriptionId: string | null;
}

const FREE_FOREVER_DISCOUNT_CODE = 'free4ever';
const EARLY_ADOPTER_PRICE_ID = import.meta.env.VITE_STRIPE_EARLY_ADOPTER_PRICE_ID;
const REGULAR_PRICE_ID = import.meta.env.VITE_STRIPE_REGULAR_PRICE_ID;

export class SubscriptionService {
  /**
   * Get subscription pricing for a user
   * Handles early adopter pricing, regular pricing, and discount codes
   */
  static async getPricing(userId: string, discountCode?: string): Promise<SubscriptionPricing> {
    // Check discount code first (before checking preferences)
    if (discountCode === FREE_FOREVER_DISCOUNT_CODE) {
      // Apply free forever discount
      await this.applyDiscountCode(userId, FREE_FOREVER_DISCOUNT_CODE);
      return {
        priceId: '',
        amount: 0,
        isEarlyAdopter: false,
        isFreeForever: true,
        discountCode: FREE_FOREVER_DISCOUNT_CODE,
      };
    }

    // IMPORTANT: Check early adopter status FIRST, before getting preferences
    // This ensures that if the user is eligible, they get early adopter pricing
    // even if their preferences row doesn't exist yet or was just created
    let earlyAdopterResult: { isEarlyAdopter: boolean; subscriptionPrice: number; spotsRemaining: number } | null = null;
    try {
      earlyAdopterResult = await EarlyAdopterService.checkAndSetEarlyAdopter(userId);
      
      if (earlyAdopterResult.isEarlyAdopter) {
        const priceId = EARLY_ADOPTER_PRICE_ID || REGULAR_PRICE_ID || '';
        
        if (!priceId) {
          logger.error('Early adopter price ID not configured', { userId });
          throw new Error('Subscription pricing is not configured. Please contact support.');
        }
        
        return {
          priceId,
          amount: earlyAdopterResult.subscriptionPrice,
          isEarlyAdopter: true,
          isFreeForever: false,
        };
      }
    } catch (error) {
      // Log error but don't fail - we'll check preferences and fall back to regular pricing
      logger.error('Error checking early adopter status', error, { userId });
      // Continue to check preferences below
    }

    // Now check preferences (this will create default preferences if they don't exist)
    const preferences = await UserPreferencesRepository.getUserPreferences(userId);
    
    // Check if user has free forever status
    if (preferences.isFreeForever) {
      return {
        priceId: '', // No price needed for free
        amount: 0,
        isEarlyAdopter: false,
        isFreeForever: true,
        discountCode: preferences.discountCode || FREE_FOREVER_DISCOUNT_CODE,
      };
    }

    // Check if user is already an early adopter (from their preferences)
    // This handles the case where early adopter status was set previously
    if (preferences.isEarlyAdopter) {
      // Use their locked-in price, or default to early adopter price if not set
      const price = preferences.subscriptionPrice || 9.99;
      const priceId = EARLY_ADOPTER_PRICE_ID || REGULAR_PRICE_ID || '';
      
      if (!priceId) {
        logger.error('Early adopter price ID not configured', { userId });
        throw new Error('Subscription pricing is not configured. Please contact support.');
      }
      
      return {
        priceId,
        amount: price,
        isEarlyAdopter: true,
        isFreeForever: false,
      };
    }

    // Regular pricing (fallback if early adopter check fails or no spots available)
    // Try to use regular price ID, but if not available, try early adopter price ID as fallback
    const priceId = REGULAR_PRICE_ID || EARLY_ADOPTER_PRICE_ID || '';
    
    if (!priceId) {
      logger.error('No Stripe price IDs configured', { 
        userId,
        hasEarlyAdopterPriceId: !!EARLY_ADOPTER_PRICE_ID,
        hasRegularPriceId: !!REGULAR_PRICE_ID,
      });
      throw new Error('Subscription pricing is not configured. Please ensure VITE_STRIPE_REGULAR_PRICE_ID or VITE_STRIPE_EARLY_ADOPTER_PRICE_ID is set in your environment variables.');
    }
    
    return {
      priceId,
      amount: 19.99,
      isEarlyAdopter: false,
      isFreeForever: false,
    };
  }

  /**
   * Apply a discount code to a user
   */
  static async applyDiscountCode(userId: string, code: string): Promise<void> {
    if (code === FREE_FOREVER_DISCOUNT_CODE) {
      // Use upsert to ensure the row exists (create if it doesn't, update if it does)
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          discount_code: code,
          is_free_forever: true,
          subscription_price: 0,
          currency: 'USD',
          timezone: 'America/New_York',
          email_notifications: true,
          desktop_notifications: false,
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        logger.error('Error applying discount code', error);
        throw new Error(`Failed to apply discount code: ${error.message}`);
      }
    } else {
      throw new Error(`Invalid discount code: ${code}`);
    }
  }

  /**
   * Get subscription information for a user
   */
  static async getSubscriptionInfo(userId: string): Promise<SubscriptionInfo> {
    const preferences = await UserPreferencesRepository.getUserPreferences(userId);
    
    // Active subscription statuses (only these grant access)
    const ACTIVE_STATUSES = ['active', 'trialing'] as const;
    
    // Inactive subscription statuses (these require resubscription)
    // Note: Stripe statuses include: canceled, past_due, unpaid, incomplete, incomplete_expired
    // When a subscription is canceled, the status becomes 'canceled' (or remains 'active' 
    // until period end if cancel_at_period_end is true, then becomes 'canceled')
    
    const subscriptionStatus = preferences.subscriptionStatus;
    const isFreeForever = preferences.isFreeForever === true;
    
    // User is active if:
    // 1. They have free forever status, OR
    // 2. Their subscription status is one of the active statuses
    const isActive = 
      isFreeForever || 
      (subscriptionStatus !== null && subscriptionStatus !== undefined && 
       ACTIVE_STATUSES.includes(subscriptionStatus as typeof ACTIVE_STATUSES[number]));
    
    return {
      userId,
      isActive,
      status: subscriptionStatus || null,
      price: preferences.subscriptionPrice || null,
      isEarlyAdopter: preferences.isEarlyAdopter === true || false,
      isFreeForever,
      discountCode: preferences.discountCode || null,
      customerId: preferences.stripeCustomerId || null,
      subscriptionId: preferences.stripeSubscriptionId || null,
    };
  }

  /**
   * Check if user needs to subscribe
   */
  static async needsSubscription(userId: string): Promise<boolean> {
    const info = await this.getSubscriptionInfo(userId);
    return !info.isActive && !info.isFreeForever;
  }
}

