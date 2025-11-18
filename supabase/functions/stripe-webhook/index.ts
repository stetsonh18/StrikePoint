import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        if (userId && session.customer) {
          // Get subscription details
          const subscription = await stripe.subscriptions.list({
            customer: session.customer as string,
            limit: 1,
          });

          if (subscription.data[0]) {
            const sub = subscription.data[0];
            const priceAmount = sub.items.data[0]?.price.unit_amount || 0;
            
            // Update user preferences with Stripe customer and subscription info
            await supabase
              .from('user_preferences')
              .update({
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: sub.id,
                subscription_status: sub.status,
                subscription_price: priceAmount / 100, // Convert cents to dollars
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
          const priceAmount = subscription.items.data[0]?.price.unit_amount || 0;
          
          await supabase
            .from('user_preferences')
            .update({
              subscription_status: subscription.status,
              stripe_subscription_id: subscription.id,
              subscription_price: priceAmount / 100,
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

