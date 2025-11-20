import { supabase } from '../api/supabase';
import { UserPreferencesRepository } from '../repositories/userPreferences.repository';
import { logger } from '@/shared/utils/logger';

export interface SubscriptionPricing {
  priceId: string; // Stripe price ID
  amount: number; // Price in dollars
  isEarlyAdopter: boolean;
  isFreeForever: boolean;
  discountCode?: string;
  pricingTier?: 'free_forever' | 'early_adopter' | 'regular';
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

const EARLY_ADOPTER_PRICE_ID = import.meta.env.VITE_STRIPE_EARLY_ADOPTER_PRICE_ID;
const REGULAR_PRICE_ID = import.meta.env.VITE_STRIPE_REGULAR_PRICE_ID;

export class SubscriptionService {
  /**
   * Get subscription pricing preview for a user.
   * All sensitive logic is handled inside the database function.
   */
  static async getPricing(userId: string, discountCode?: string): Promise<SubscriptionPricing> {
    const priceResponse = await supabase.rpc('get_subscription_pricing', {
      p_user_id: userId,
      p_discount_code: discountCode?.trim() || null,
    });

    if (priceResponse.error) {
      logger.error('Error retrieving subscription pricing', priceResponse.error, { userId });
      throw new Error(priceResponse.error.message);
    }

    const pricing = Array.isArray(priceResponse.data) ? priceResponse.data[0] : priceResponse.data;

    if (!pricing) {
      throw new Error('Unable to determine subscription pricing. Please try again.');
    }

    const tier = (pricing.pricing_tier as SubscriptionPricing['pricingTier']) ?? 'regular';
    const isFree = Boolean(pricing.is_free_forever);
    const isEarly = Boolean(pricing.is_early_adopter);

    const priceId = isFree
      ? ''
      : isEarly
        ? (EARLY_ADOPTER_PRICE_ID || REGULAR_PRICE_ID || '')
        : (REGULAR_PRICE_ID || EARLY_ADOPTER_PRICE_ID || '');

    if (!isFree && !priceId) {
      logger.error('Stripe price IDs are not configured', { userId });
      throw new Error('Subscription pricing is not configured. Please contact support.');
    }

    return {
      priceId,
      amount: Number(pricing.amount ?? 0),
      isEarlyAdopter: isEarly,
      isFreeForever: isFree,
      discountCode: pricing.discount_code || undefined,
      pricingTier: tier,
    };
  }

  /**
   * Redeem a discount code securely through Supabase RPC.
   */
  static async redeemDiscountCode(userId: string, code: string): Promise<void> {
    const { data, error } = await supabase.rpc('redeem_discount_code', {
      p_user_id: userId,
      p_discount_code: code.trim(),
    });

    if (error) {
      logger.error('Error redeeming discount code', error, { userId });
      throw new Error(error.message);
    }

    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.success) {
      throw new Error(result?.message || 'Failed to redeem discount code. Please try again.');
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

