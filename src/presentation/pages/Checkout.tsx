import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/application/stores/auth.store';
import { SubscriptionService } from '@/infrastructure/services/subscription.service';
import { createCheckoutSession, getStripe } from '@/infrastructure/services/stripe.service';
import { useToast } from '@/shared/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, CreditCard, Gift, CheckCircle2, Home, LogOut } from 'lucide-react';

type StripeCheckout = {
  redirectToCheckout: (options: { sessionId: string }) => Promise<{ error?: { message?: string } }>;
};

function hasRedirectToCheckout(stripe: unknown): stripe is StripeCheckout {
  return Boolean(
    stripe && typeof (stripe as Partial<StripeCheckout>).redirectToCheckout === 'function'
  );
}

export function Checkout() {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || '';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  
  const [discountCode, setDiscountCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pricing, setPricing] = useState<Awaited<ReturnType<typeof SubscriptionService.getPricing>> | null>(null);
  const [isLoadingPricing, setIsLoadingPricing] = useState(true);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle checkout success redirect
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const canceled = searchParams.get('canceled');
    
    if (sessionId && userId) {
      // Checkout was successful, invalidate subscription queries and wait for webhook
      queryClient.invalidateQueries({ queryKey: ['subscription-status', userId] });
      queryClient.invalidateQueries({ queryKey: ['needs-subscription', userId] });
      
      // Wait a moment for webhook to process, then check subscription status
      const checkSubscription = async () => {
        let attempts = 0;
        const maxAttempts = 10; // Wait up to 5 seconds (10 * 500ms)
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const info = await SubscriptionService.getSubscriptionInfo(userId);
          if (info.isActive) {
            toast.success('Subscription activated!', {
              description: 'Welcome to StrikePoint!',
            });
            navigate('/');
            return;
          }
          
          attempts++;
        }
        
        // If still not active after waiting, redirect anyway (webhook might be delayed)
        toast.success('Checkout completed!', {
          description: 'Your subscription is being processed. You\'ll have access shortly.',
        });
        navigate('/');
      };
      
      checkSubscription();
    } else if (canceled === 'true') {
      toast.info('Checkout canceled', {
        description: 'You can complete your subscription anytime.',
      });
    }
  }, [searchParams, userId, queryClient, navigate, toast]);

  // Get discount code from URL if present and load initial pricing
  useEffect(() => {
    if (!userId) return;

    const code = searchParams.get('code');
    const initialCode = code || discountCode;
    const sessionId = searchParams.get('session_id');
    
    // Skip loading pricing if we're handling a success redirect
    if (sessionId) {
      setIsLoadingPricing(false);
      return;
    }

    const loadPricing = async () => {
      try {
        const pricingData = await SubscriptionService.getPricing(userId, initialCode || undefined);
        setPricing(pricingData);
        if (code) {
          setDiscountCode(code);
        }
      } catch (error) {
        console.error('Failed to load pricing:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        toast.error('Failed to load pricing', {
          description: errorMessage,
        });
        // Set pricing to null so error message is shown
        setPricing(null);
      } finally {
        setIsLoadingPricing(false);
      }
    };

    loadPricing();
  }, [userId, searchParams, toast]); // Only run once when userId or URL changes

  const handleCheckout = async () => {
    if (!userId || !pricing) return;

    setIsLoading(true);

    try {
      // If server indicates free access, redeem code if provided and bypass checkout
      if (pricing.isFreeForever) {
        if (discountCode) {
          await SubscriptionService.redeemDiscountCode(userId, discountCode);
        }
        // Invalidate subscription queries to refresh status
        queryClient.invalidateQueries({ queryKey: ['subscription-status', userId] });
        queryClient.invalidateQueries({ queryKey: ['needs-subscription', userId] });
        toast.success('Free subscription activated!', {
          description: 'You now have lifetime access to StrikePoint.',
        });
        navigate('/');
        return;
      }

      // If no price ID, something went wrong
      if (!pricing.priceId) {
        toast.error('Pricing configuration error', {
          description: 'Unable to load subscription pricing. Please refresh the page or contact support.',
        });
        setIsLoading(false);
        return;
      }

      // Create checkout session
      const { sessionId, url } = await createCheckoutSession(
        pricing.priceId,
        discountCode || undefined
      );

      // Redirect to Stripe Checkout
      const stripe = await getStripe();
      if (hasRedirectToCheckout(stripe)) {
        await stripe.redirectToCheckout({ sessionId });
      } else {
        // Fallback: redirect to URL directly
        window.location.href = url;
      }
    } catch (error) {
      toast.error('Failed to start checkout', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
      setIsLoading(false);
    }
  };

  const handleDiscountCodeChange = (code: string) => {
    setDiscountCode(code);
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Debounce the pricing update (wait 500ms after user stops typing)
    setIsValidatingCode(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const pricingData = await SubscriptionService.getPricing(userId, code || undefined);
        setPricing(pricingData);
      } catch (error) {
        toast.error('Invalid discount code', {
          description: error instanceof Error ? error.message : 'Please check your code and try again.',
        });
      } finally {
        setIsValidatingCode(false);
      }
    }, 500);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  if (!user) {
    navigate('/login');
    return null;
  }

  // Show loading state if handling success redirect
  const sessionId = searchParams.get('session_id');
  if (sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
          <p className="text-slate-600 dark:text-slate-400">
            Activating your subscription...
          </p>
        </div>
      </div>
    );
  }

  if (isLoadingPricing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const handleSignOut = async () => {
    try {
      const signOut = useAuthStore.getState().signOut;
      await signOut();
      navigate('/');
      toast.success('Signed out successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to sign out');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4">
      {/* Navigation Bar */}
      <div className="max-w-2xl mx-auto mb-6 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Subscribe to StrikePoint
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Choose your plan and start tracking your trades
            </p>
          </div>

          {/* Pricing Display */}
          {pricing && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {pricing.isFreeForever ? (
                      <span className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-emerald-600" />
                        Free Forever
                      </span>
                    ) : pricing.isEarlyAdopter ? (
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        Early Adopter
                      </span>
                    ) : (
                      'Monthly Subscription'
                    )}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {pricing.isFreeForever
                      ? 'Lifetime access with discount code'
                      : pricing.isEarlyAdopter
                      ? 'Locked in forever • 14-day free trial'
                      : 'Billed monthly • 14-day free trial'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-slate-900 dark:text-white">
                    {pricing.isFreeForever ? (
                      <span className="text-emerald-600">$0</span>
                    ) : (
                      `$${pricing.amount.toFixed(2)}`
                    )}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">per month</div>
                </div>
              </div>

              {!pricing.isFreeForever && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                    ✨ 14-Day Free Trial
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                    Start your free trial today. No charges until after 14 days. Cancel anytime during the trial.
                  </p>
                </div>
              )}

              {pricing.isEarlyAdopter && (
                <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-2">
                  🎉 You're an early adopter! This price is locked in forever.
                </p>
              )}

              {pricing.isFreeForever && (
                <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-2">
                  🎁 You've unlocked lifetime free access with your discount code!
                </p>
              )}
            </div>
          )}

          {/* Discount Code Input */}
          <div className="space-y-2">
            <label htmlFor="discount-code" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Discount Code (Optional)
            </label>
            <div className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <input
                  id="discount-code"
                  type="text"
                  value={discountCode}
                  onChange={(e) => handleDiscountCodeChange(e.target.value)}
                  placeholder="Enter discount code"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {isValidatingCode && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  </div>
                )}
              </div>
            </div>
            {discountCode && !isValidatingCode && pricing?.isFreeForever && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                ✓ Valid discount code! You'll get free access forever.
              </p>
            )}
          </div>

          {/* Error message if pricing failed to load */}
          {!isLoadingPricing && !pricing && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-700 dark:text-red-400">
                Failed to load pricing information. Please refresh the page or contact support.
              </p>
            </div>
          )}

          {/* Error message if pricing loaded but priceId is missing */}
          {pricing && !pricing.priceId && !pricing.isFreeForever && (
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Unable to start subscription. Please ensure your Stripe configuration is set up correctly.
              </p>
            </div>
          )}

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={isLoading || !pricing || (!pricing.isFreeForever && !pricing.priceId)}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : pricing?.isFreeForever ? (
              <>
                <Gift className="w-5 h-5" />
                Activate Free Access
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Subscribe Now
              </>
            )}
          </button>

          <p className="text-xs text-center text-slate-500 dark:text-slate-400">
            Secure payment powered by Stripe. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}

