# Stripe Products Setup - Completed via MCP

## ✅ Products Created

The following products have been created in your Stripe account:

### 1. Early Adopter Product
- **Product ID**: `prod_TRl0KTIVjBqwPc`
- **Name**: StrikePoint Early Adopter
- **Description**: Monthly subscription for early adopters - locked in at $9.99/month forever

### 2. Regular Product
- **Product ID**: `prod_TRl0eDiwZej47S`
- **Name**: StrikePoint Monthly
- **Description**: Monthly subscription for regular users - $19.99/month

## ⚠️ Action Required: Create Recurring Prices

The Stripe MCP server doesn't support creating recurring prices directly. You need to create monthly recurring prices for both products manually.

### Option 1: Stripe Dashboard (Recommended)

1. Go to https://dashboard.stripe.com/products
2. Click on "StrikePoint Early Adopter" product
3. Click "Add another price"
4. Configure:
   - **Pricing model**: Standard pricing
   - **Price type**: Recurring
   - **Price**: $9.99
   - **Billing period**: Monthly
5. Click "Add price" and **copy the Price ID** (starts with `price_...`)
6. Repeat for "StrikePoint Monthly" product with $19.99/month

### Option 2: Stripe CLI

```bash
# Create recurring price for Early Adopter ($9.99/month)
stripe prices create \
  --product=prod_TRl0KTIVjBqwPc \
  --unit-amount=999 \
  --currency=usd \
  -d "recurring[interval]=month"

# Create recurring price for Regular ($19.99/month)
stripe prices create \
  --product=prod_TRl0eDiwZej47S \
  --unit-amount=1999 \
  --currency=usd \
  -d "recurring[interval]=month"
```

### Option 3: Stripe API (Node.js)

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Early Adopter price
const earlyAdopterPrice = await stripe.prices.create({
  product: 'prod_TRl0KTIVjBqwPc',
  unit_amount: 999, // $9.99 in cents
  currency: 'usd',
  recurring: {
    interval: 'month',
  },
});

// Regular price
const regularPrice = await stripe.prices.create({
  product: 'prod_TRl0eDiwZej47S',
  unit_amount: 1999, // $19.99 in cents
  currency: 'usd',
  recurring: {
    interval: 'month',
  },
});

console.log('Early Adopter Price ID:', earlyAdopterPrice.id);
console.log('Regular Price ID:', regularPrice.id);
```

## ⚠️ Action Required: Create Discount Code

The "free4ever" discount code needs to be created manually in the Stripe Dashboard:

1. Go to https://dashboard.stripe.com/coupons
2. Click "Create coupon"
3. Configure:
   - **Code**: `free4ever`
   - **Discount type**: Percentage
   - **Percent off**: 100%
   - **Duration**: Forever
   - **Redemption limits**: None (or set a limit if desired)
4. Click "Create coupon"

## Environment Variables

After creating the recurring prices, add these to your `.env.local`:

```env
# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_... # or pk_test_... for test mode
VITE_STRIPE_EARLY_ADOPTER_PRICE_ID=price_... # Copy from Stripe Dashboard
VITE_STRIPE_REGULAR_PRICE_ID=price_... # Copy from Stripe Dashboard

# For Edge Functions (set as Supabase secrets)
STRIPE_SECRET_KEY=sk_live_... # or sk_test_... for test mode
STRIPE_WEBHOOK_SECRET=whsec_... # From webhook endpoint settings
```

## Next Steps

1. ✅ Products created
2. ⏳ Create recurring prices (see above)
3. ⏳ Create "free4ever" coupon (see above)
4. ⏳ Add environment variables
5. ⏳ Deploy Supabase Edge Functions
6. ⏳ Set up Stripe webhook

See `STRIPE_SETUP.md` for complete setup instructions.

