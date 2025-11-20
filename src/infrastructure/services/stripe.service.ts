import { loadStripe, Stripe } from '@stripe/stripe-js';
import { supabase } from '../api/supabase';
import { logger } from '@/shared/utils/logger';

// Initialize Stripe - will be loaded lazily
let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Get Stripe instance
 */
export function getStripe(): Promise<Stripe | null> {
  const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  
  if (!stripePublishableKey) {
    logger.error('Stripe publishable key not found in environment variables');
    return Promise.resolve(null);
  }

  if (!stripePromise) {
    stripePromise = loadStripe(stripePublishableKey);
  }

  return stripePromise;
}

/**
 * Create a Stripe checkout session
 */
export async function createCheckoutSession(
  priceId: string,
  discountCode?: string
): Promise<{ sessionId: string; url: string }> {
  const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
    body: {
      priceId,
      discountCode,
    },
  });

  if (error) {
    logger.error('Error creating checkout session', error);
    throw new Error(`Failed to create checkout session: ${error.message}`);
  }

  return data;
}

/**
 * Create a Stripe billing portal session
 */
export async function createBillingPortalSession(): Promise<{ url: string }> {
  const { data, error } = await supabase.functions.invoke('stripe-billing-portal', {
    body: {},
  });

  if (error) {
    logger.error('Error creating billing portal session', error);
    throw new Error(`Failed to create billing portal session: ${error.message}`);
  }

  return data;
}

/**
 * Get subscription status for a user
 */
export async function getSubscriptionStatus(userId: string): Promise<{
  status: string | null;
  customerId: string | null;
  subscriptionId: string | null;
}> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('subscription_status, stripe_customer_id, stripe_subscription_id')
    .eq('user_id', userId)
    .single();

  if (error) {
    logger.error('Error getting subscription status', error);
    throw new Error(`Failed to get subscription status: ${error.message}`);
  }

  return {
    status: data?.subscription_status || null,
    customerId: data?.stripe_customer_id || null,
    subscriptionId: data?.stripe_subscription_id || null,
  };
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(): Promise<void> {
  const { data, error } = await supabase.functions.invoke('stripe-cancel-subscription', {
    body: {},
  });

  if (error) {
    logger.error('Error canceling subscription', error);
    throw new Error(`Failed to cancel subscription: ${error.message}`);
  }

  return data;
}

