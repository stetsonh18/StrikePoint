# Stripe Coupon Integration - free4ever

## Overview

The "free4ever" discount code is integrated with both Stripe and the application. The Stripe coupon exists and is properly configured, but for a 100% off forever discount, the application handles it directly (bypassing Stripe checkout) since no payment is required.

## Stripe Coupon Configuration

**Coupon Details:**
- **Coupon ID**: `free4ever`
- **Promotion Code**: `free4ever`
- **Promotion Code API ID**: `promo_1SUrgJLaYJ7VEukp`
- **Discount**: 100% off
- **Duration**: Forever
- **Redemption Limit**: 5 redemptions (0/5 used)
- **Status**: Active

You can verify the coupon exists using:
```bash
# Via Stripe CLI or API
stripe coupons retrieve free4ever
```

## Application Integration

### How It Works

1. **User enters "free4ever" code** in the checkout page
2. **Application validates** the code matches `FREE_FOREVER_DISCOUNT_CODE = 'free4ever'`
3. **Application applies discount** directly to `user_preferences` table:
   - Sets `is_free_forever = true`
   - Sets `discount_code = 'free4ever'`
   - Sets `subscription_price = 0`
4. **User gets instant access** without going through Stripe checkout

### Why Bypass Stripe Checkout?

For a 100% off forever discount:
- ✅ No payment method needed
- ✅ No Stripe checkout session needed
- ✅ Instant activation
- ✅ Simpler user experience

The Stripe coupon exists for:
- ✅ Tracking and analytics
- ✅ Future use if needed
- ✅ Consistency with other discount codes

### Code Flow

1. **Checkout Page** (`src/presentation/pages/Checkout.tsx`):
   - User enters discount code
   - `handleDiscountCodeChange` validates code
   - `SubscriptionService.getPricing` checks if code is "free4ever"
   - If yes, sets `isFreeForever = true` and enables "Activate Free Access" button

2. **Subscription Service** (`src/infrastructure/services/subscription.service.ts`):
   - `getPricing()`: Detects "free4ever" code and applies it
   - `applyDiscountCode()`: Updates database with free forever status

3. **Database** (`user_preferences` table):
   - `is_free_forever`: Boolean flag
   - `discount_code`: Stores "free4ever"
   - `subscription_price`: Set to 0

### Stripe Checkout Integration

For paid subscriptions, the checkout session:
- ✅ Enables `allow_promotion_codes` for other discount codes
- ✅ Disables promotion codes when "free4ever" is used (since it's handled app-side)
- ✅ Supports 14-day free trial for paid subscriptions

## Testing

### Test the free4ever Code

1. Navigate to `/checkout`
2. Enter "free4ever" in the discount code field
3. Verify:
   - ✅ Code validates successfully
   - ✅ Shows "Free Forever" plan
   - ✅ Shows "$0 per month"
   - ✅ "Activate Free Access" button is enabled
4. Click "Activate Free Access"
5. Verify:
   - ✅ Success toast appears
   - ✅ User is redirected to home page
   - ✅ User has access (no subscription required)

### Verify Database

```sql
SELECT 
  user_id,
  is_free_forever,
  discount_code,
  subscription_price,
  subscription_status
FROM user_preferences
WHERE discount_code = 'free4ever';
```

Expected:
- `is_free_forever = true`
- `discount_code = 'free4ever'`
- `subscription_price = 0`
- `subscription_status = NULL` (no Stripe subscription needed)

## Stripe Dashboard

The coupon can be viewed in Stripe Dashboard:
- **Location**: Products → Coupons → "Free Forever"
- **Status**: Active
- **Redemptions**: Tracked in Stripe (though not used for app-side activation)

## Future Enhancements

If you want to use Stripe's promotion code system for "free4ever":

1. Remove app-side handling
2. Apply coupon in checkout session:
   ```typescript
   discounts: [{
     promotion_code: 'free4ever' // or promo_1SUrgJLaYJ7VEukp
   }]
   ```
3. Handle in webhook when subscription is created

However, the current approach is recommended for 100% off forever discounts.

## Troubleshooting

### Issue: Button is disabled
- **Fix**: Ensure `pricing.isFreeForever` is true
- **Check**: Button disabled condition: `(!pricing.isFreeForever && !pricing.priceId)`

### Issue: Discount not applying
- **Check**: Database row exists in `user_preferences`
- **Fix**: `applyDiscountCode` uses upsert to create/update row

### Issue: User still needs subscription
- **Check**: `is_free_forever` is set to `true` in database
- **Check**: `getSubscriptionInfo` checks `isFreeForever` for access

## Summary

✅ Stripe coupon "free4ever" exists and is configured correctly
✅ Application handles free forever discount directly (optimal for 100% off)
✅ Button fix allows activation when `isFreeForever` is true
✅ Database upsert ensures row exists before updating
✅ Integration is complete and working

