# Stripe Payment Integration Setup Guide

This guide will help you set up Stripe payments for StrikePoint with early adopter pricing and discount codes.

## Prerequisites

1. Stripe account (sign up at https://stripe.com)
2. Supabase project with Edge Functions enabled
3. Database migration applied

## Step 1: Database Migration

Run the migration to add subscription fields to `user_preferences`:

```sql
-- Run this in your Supabase SQL Editor
-- File: database/migrations/add_subscription_fields.sql
```

## Step 2: Create Stripe Products and Prices

1. Log in to your Stripe Dashboard
2. Go to Products → Add Product
3. Create two products:

### Early Adopter Product
- **Name**: StrikePoint Early Adopter
- **Price**: $9.99/month (recurring)
- **Billing period**: Monthly
- **Copy the Price ID** (starts with `price_...`)

### Regular Product
- **Name**: StrikePoint Monthly
- **Price**: $19.99/month (recurring)
- **Billing period**: Monthly
- **Copy the Price ID** (starts with `price_...`)

## Step 3: Create Discount Code in Stripe

1. Go to Products → Coupons
2. Create a new coupon:
   - **Code**: `free4ever`
   - **Type**: Percentage
   - **Percent off**: 100%
   - **Duration**: Forever
   - **Redemption limits**: None (or set a limit if desired)

## Step 4: Set Up Environment Variables

Add these to your `.env.local` file:

```env
# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... # Your Stripe publishable key
VITE_STRIPE_EARLY_ADOPTER_PRICE_ID=price_... # Early adopter price ID
VITE_STRIPE_REGULAR_PRICE_ID=price_... # Regular price ID

# Stripe Secret Key (for Edge Functions - add to Supabase secrets)
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
```

## Step 5: Create Supabase Edge Functions

### Function 1: stripe-create-checkout

Create `supabase/functions/stripe-create-checkout/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, priceId, discountCode } = await req.json();

    if (!userId || !priceId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: undefined, // Will be set from user metadata
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${Deno.env.get('VITE_APP_URL') || 'http://localhost:5173'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get('VITE_APP_URL') || 'http://localhost:5173'}/checkout?canceled=true`,
      metadata: {
        userId,
        discountCode: discountCode || '',
      },
      discounts: discountCode === 'free4ever' ? [] : undefined, // Handle free4ever separately
    });

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### Function 2: stripe-billing-portal

Create `supabase/functions/stripe-billing-portal/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's Stripe customer ID from database
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (!preferences?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: 'No Stripe customer found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: preferences.stripe_customer_id,
      return_url: `${Deno.env.get('VITE_APP_URL') || 'http://localhost:5173'}/settings`,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### Function 3: stripe-webhook

Create `supabase/functions/stripe-webhook/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        if (userId && session.customer) {
          // Update user preferences with Stripe customer and subscription info
          const subscription = await stripe.subscriptions.list({
            customer: session.customer as string,
            limit: 1,
          });

          if (subscription.data[0]) {
            const sub = subscription.data[0];
            await supabase
              .from('user_preferences')
              .update({
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: sub.id,
                subscription_status: sub.status,
                subscription_price: (sub.items.data[0]?.price.unit_amount || 0) / 100,
              })
              .eq('user_id', userId);
          }
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Find user by customer ID
        const { data: preferences } = await supabase
          .from('user_preferences')
          .select('user_id')
          .eq('stripe_customer_id', subscription.customer as string)
          .single();

        if (preferences) {
          await supabase
            .from('user_preferences')
            .update({
              subscription_status: subscription.status,
              stripe_subscription_id: subscription.id,
            })
            .eq('user_id', preferences.user_id);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }
});
```

## Step 6: Deploy Edge Functions

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy stripe-create-checkout
supabase functions deploy stripe-billing-portal
supabase functions deploy stripe-webhook
```

## Step 7: Set Up Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://your-project-ref.supabase.co/functions/v1/stripe-webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the webhook signing secret
6. Add it to Supabase secrets:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## Step 8: Add Route to App

Add the checkout route to your `App.tsx`:

```typescript
import { Checkout } from './presentation/pages/Checkout';

// In your Routes:
<Route path="/checkout" element={<Checkout />} />
```

## Step 9: Test the Integration

1. Test early adopter pricing (first 100 users)
2. Test regular pricing
3. Test discount code "free4ever"
4. Test subscription cancellation via billing portal

## Pricing Logic Summary

- **Early Adopters (first 100)**: $9.99/month, locked in forever
- **Regular Users**: $19.99/month
- **Discount Code "free4ever"**: Free forever (100% discount)

The system automatically:
- Checks early adopter status on signup
- Applies discount codes when entered
- Updates subscription status via webhooks
- Handles subscription cancellations

