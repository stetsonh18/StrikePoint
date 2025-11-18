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
    // Check if user has free forever status
    const preferences = await UserPreferencesRepository.getUserPreferences(userId);
    
    if (preferences.isFreeForever) {
      return {
        priceId: '', // No price needed for free
        amount: 0,
        isEarlyAdopter: false,
        isFreeForever: true,
        discountCode: preferences.discountCode || FREE_FOREVER_DISCOUNT_CODE,
      };
    }

    // Check discount code
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

    // Check early adopter status
    const earlyAdopterResult = await EarlyAdopterService.checkAndSetEarlyAdopter(userId);
    
    if (earlyAdopterResult.isEarlyAdopter) {
      return {
        priceId: EARLY_ADOPTER_PRICE_ID || '',
        amount: earlyAdopterResult.subscriptionPrice,
        isEarlyAdopter: true,
        isFreeForever: false,
      };
    }

    // Regular pricing
    return {
      priceId: REGULAR_PRICE_ID || '',
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
      const { error } = await supabase
        .from('user_preferences')
        .update({
          discount_code: code,
          is_free_forever: true,
          subscription_price: 0,
        })
        .eq('user_id', userId);

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
    
    // Consider trialing, active, and free forever as active
    const isActive = 
      preferences.subscriptionStatus === 'active' || 
      preferences.subscriptionStatus === 'trialing' ||
      preferences.isFreeForever === true || 
      false;
    
    return {
      userId,
      isActive,
      status: preferences.subscriptionStatus || null,
      price: preferences.subscriptionPrice || null,
      isEarlyAdopter: preferences.isEarlyAdopter === true || false,
      isFreeForever: preferences.isFreeForever === true || false,
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

