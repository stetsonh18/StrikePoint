# 14-Day Free Trial & Subscription Cancellation Setup

## ✅ Changes Completed

### 1. 14-Day Free Trial
- **Edge Function Updated**: `supabase/functions/stripe-create-checkout/index.ts`
  - Added `trial_period_days: 14` to checkout session creation
  - All new subscriptions now include a 14-day free trial

### 2. Subscription Cancellation
- **New Edge Function**: `supabase/functions/stripe-cancel-subscription/index.ts`
  - Cancels subscription at period end (customer keeps access until period ends)
  - Updates subscription status in database

- **Stripe Service Updated**: `src/infrastructure/services/stripe.service.ts`
  - Added `cancelSubscription()` function

- **Settings Page Updated**: `src/presentation/pages/Settings.tsx`
  - Added subscription management section
  - Shows subscription status, price, and plan type
  - "Manage Billing" button (opens Stripe billing portal)
  - "Cancel Subscription" button with confirmation dialog
  - Special handling for trial period cancellations

### 3. UI Updates

#### Landing Page (`src/presentation/pages/Landing.tsx`)
- Added prominent "14-day free trial" messaging
- Updated hero section: "🎁 Start your 14-day free trial today - No credit card required!"
- Updated pricing section: "✨ 14-day free trial - Try all features risk-free"

#### Checkout Page (`src/presentation/pages/Checkout.tsx`)
- Added trial information display
- Shows "14-day free trial" badge for paid plans
- Clear messaging: "Start your free trial today. No charges until after 14 days."

#### Pricing Card (`src/presentation/components/PricingCard.tsx`)
- Added "✨ 14-day free trial" text to both early adopter and regular pricing

### 4. Subscription Service Updates
- Updated `getSubscriptionInfo()` to treat `trialing` status as active
- Users in trial period have full access to the app

## How It Works

### Free Trial Flow
1. User signs up and goes to checkout
2. Stripe checkout session is created with `trial_period_days: 14`
3. User enters payment method (required for trial)
4. Trial starts immediately - no charge for 14 days
5. After 14 days, Stripe automatically charges the subscription
6. Subscription status is tracked as `trialing` during trial, then `active`

### Cancellation Flow
1. User goes to Settings → Subscription section
2. Clicks "Cancel Subscription"
3. Confirmation dialog appears
4. If in trial: warns that cancellation ends trial immediately
5. If active: subscription canceled at period end (keeps access until period ends)
6. Status updated in database via webhook

## Deployment Steps

### 1. Deploy New Edge Function
```bash
supabase functions deploy stripe-cancel-subscription
```

### 2. Update Existing Edge Function
```bash
supabase functions deploy stripe-create-checkout
```

### 3. Test the Integration
1. Create a test subscription (use test mode)
2. Verify trial period shows correctly
3. Test cancellation flow
4. Verify webhook updates subscription status

## Important Notes

- **Payment Method Required**: Stripe requires a payment method even for free trials
- **Trial Cancellation**: If user cancels during trial, trial ends immediately
- **Active Cancellation**: If user cancels during active subscription, they keep access until period end
- **Webhook Updates**: Subscription status is automatically updated via Stripe webhooks

## Subscription Status Values

- `trialing` - In 14-day free trial
- `active` - Active subscription (post-trial)
- `canceled` - Canceled (but may still have access until period end)
- `past_due` - Payment failed
- `unpaid` - Payment overdue

## User Experience

### During Trial
- Full access to all features
- Status shows as "Free Trial" in Settings
- Can cancel anytime (ends trial immediately)

### After Trial
- Automatic charge after 14 days
- Status shows as "Active" in Settings
- Can cancel (keeps access until period end)

### Cancellation
- Clear messaging about what happens
- Different behavior for trial vs active subscriptions
- Access maintained until period end (for active subscriptions)

