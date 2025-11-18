import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/application/stores/auth.store';
import { SubscriptionService } from '@/infrastructure/services/subscription.service';
import { createCheckoutSession, getStripe } from '@/infrastructure/services/stripe.service';
import { useToast } from '@/shared/hooks/useToast';
import { Loader2, CreditCard, Gift, CheckCircle2 } from 'lucide-react';

export function Checkout() {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || '';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  
  const [discountCode, setDiscountCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pricing, setPricing] = useState<Awaited<ReturnType<typeof SubscriptionService.getPricing>> | null>(null);
  const [isLoadingPricing, setIsLoadingPricing] = useState(true);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get discount code from URL if present and load initial pricing
  useEffect(() => {
    if (!userId) return;

    const code = searchParams.get('code');
    const initialCode = code || discountCode;

    const loadPricing = async () => {
      try {
        const pricingData = await SubscriptionService.getPricing(userId, initialCode || undefined);
        setPricing(pricingData);
        if (code) {
          setDiscountCode(code);
        }
      } catch (error) {
        toast.error('Failed to load pricing', {
          description: error instanceof Error ? error.message : 'Please try again.',
        });
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
      // If free forever, just apply the discount
      if (pricing.isFreeForever) {
        await SubscriptionService.applyDiscountCode(userId, discountCode || 'free4ever');
        toast.success('Free subscription activated!', {
          description: 'You now have lifetime access to StrikePoint.',
        });
        navigate('/');
        return;
      }

      // If no price ID, something went wrong
      if (!pricing.priceId) {
        throw new Error('No price available. Please contact support.');
      }

      // Create checkout session
      const { sessionId, url } = await createCheckoutSession(
        userId,
        pricing.priceId,
        discountCode || undefined
      );

      // Redirect to Stripe Checkout
      const stripe = await getStripe();
      if (stripe) {
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

  if (isLoadingPricing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4">
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

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={isLoading || !pricing}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-colors"
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

