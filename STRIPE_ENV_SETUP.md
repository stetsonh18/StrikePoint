# Stripe Environment Variables Setup

## ✅ Stripe Products & Prices Created

### Products
- **Early Adopter**: `prod_TRl0KTIVjBqwPc` - $9.99/month
- **Regular**: `prod_TRl0eDiwZej47S` - $19.99/month

### Recurring Prices (Monthly Subscriptions)
- **Early Adopter Price ID**: `price_1SUrUyLaYJ7VEukpT7OYhGvc` ($9.99/month)
- **Regular Price ID**: `price_1SUrUzLaYJ7VEukpwgaRetjs` ($19.99/month)

### Discount Code
- **Promotion Code ID**: `promo_1SUrgJLaYJ7VEukpn1WoO7hA` (code: `free4ever`)
- **Note**: The "free4ever" discount is handled in application logic, not via Stripe checkout

## Environment Variables

Add these to your `.env.local` file:

```env
# Stripe Configuration
# Get your publishable key from: https://dashboard.stripe.com/apikeys
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY_HERE

# Stripe Price IDs (recurring monthly subscriptions)
VITE_STRIPE_EARLY_ADOPTER_PRICE_ID=price_1SUrUyLaYJ7VEukpT7OYhGvc
VITE_STRIPE_REGULAR_PRICE_ID=price_1SUrUzLaYJ7VEukpwgaRetjs
```

## How to Get Your Stripe Publishable Key

1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Publishable key** (starts with `pk_live_` for live mode or `pk_test_` for test mode)
3. Replace `YOUR_PUBLISHABLE_KEY_HERE` in `.env.local`

## For Supabase Edge Functions

You'll also need to set these as Supabase secrets (for server-side operations):

```bash
# Set Stripe secret key (get from https://dashboard.stripe.com/apikeys)
supabase secrets set STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY_HERE

# Set webhook secret (get from webhook endpoint settings)
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

## Testing

- **Test Mode**: Use `pk_test_...` and `sk_test_...` keys
- **Live Mode**: Use `pk_live_...` and `sk_live_...` keys

Make sure your Stripe Dashboard is in the same mode (test/live) as your keys!

