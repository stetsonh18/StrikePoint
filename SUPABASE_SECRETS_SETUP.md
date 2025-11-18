# Setting Up Supabase Secrets for Stripe

## Overview

Supabase Edge Functions need access to your Stripe secret key and webhook secret. These are stored as encrypted secrets in Supabase and are only accessible to your Edge Functions.

## Step 1: Get Your Stripe Keys

### Stripe Secret Key
1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Secret key** (starts with `sk_live_` for live mode or `sk_test_` for test mode)
   - ⚠️ **Never share this key publicly** - it's only for server-side use

### Stripe Webhook Secret
1. Go to https://dashboard.stripe.com/webhooks
2. Click on your webhook endpoint (or create one if you haven't)
3. Click "Reveal" next to "Signing secret"
4. Copy the webhook secret (starts with `whsec_`)

## Step 2: Set Secrets Using Supabase CLI

### Option A: Using Supabase CLI (Recommended)

```bash
# Make sure you're logged in and linked to your project
supabase login
supabase link --project-ref bqxdaevogklfhsqjqqta

# Set Stripe secret key
supabase secrets set STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY_HERE

# Set Stripe webhook secret
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# Verify secrets are set (this won't show the values, just confirms they exist)
supabase secrets list
```

### Option B: Using Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/bqxdaevogklfhsqjqqta/settings/functions
2. Scroll down to "Secrets" section
3. Click "Add new secret"
4. Add each secret:
   - **Name**: `STRIPE_SECRET_KEY`
   - **Value**: `sk_live_...` (your Stripe secret key)
5. Click "Add new secret" again:
   - **Name**: `STRIPE_WEBHOOK_SECRET`
   - **Value**: `whsec_...` (your webhook secret)

## Step 3: Verify Secrets Are Set

```bash
# List all secrets (values are hidden for security)
supabase secrets list
```

You should see:
- `STRIPE_SECRET_KEY` ✓
- `STRIPE_WEBHOOK_SECRET` ✓

## Step 4: Set Up Stripe Webhook Endpoint

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. **Endpoint URL**: `https://bqxdaevogklfhsqjqqta.supabase.co/functions/v1/stripe-webhook`
4. **Description**: "StrikePoint Subscription Webhooks"
5. **Events to send**:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
6. Click "Add endpoint"
7. Copy the **Signing secret** (starts with `whsec_`)
8. Use this secret in Step 2 above

## Important Notes

- **Never commit secrets to git** - they're stored securely in Supabase
- **Use test keys for development** - switch to live keys when ready for production
- **Secrets are project-specific** - each Supabase project has its own secrets
- **Secrets are encrypted** - Supabase encrypts them at rest

## Testing

After setting up secrets, test your Edge Functions:

```bash
# Test checkout creation
curl -X POST https://bqxdaevogklfhsqjqqta.supabase.co/functions/v1/stripe-create-checkout \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user-id","priceId":"price_1SUrUyLaYJ7VEukpT7OYhGvc"}'
```

## Troubleshooting

### Secret not found error
- Make sure you've set the secret in the correct project
- Verify the secret name matches exactly (case-sensitive)
- Redeploy your Edge Functions after adding secrets

### Webhook not receiving events
- Verify the webhook URL is correct
- Check that the webhook secret matches
- Ensure the webhook endpoint is active in Stripe Dashboard

