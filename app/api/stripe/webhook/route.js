import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req) {
  const supabase = createRouteHandlerClient({ cookies });
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const { data: user } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', subscription.customer)
          .single();

        if (!user) {
          throw new Error('User not found');
        }

        // Update subscription record
        await supabase
          .from('subscriptions')
          .upsert({
            user_id: user.id,
            stripe_subscription_id: subscription.id,
            stripe_price_id: subscription.items.data[0].price.id,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000),
            current_period_end: new Date(subscription.current_period_end * 1000),
            cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
          });

        // Update premium_until in profiles
        if (subscription.status === 'active') {
          await supabase
            .from('profiles')
            .update({
              premium_until: new Date(subscription.current_period_end * 1000),
            })
            .eq('id', user.id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const { data: user } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', subscription.customer)
          .single();

        if (!user) {
          throw new Error('User not found');
        }

        // Update subscription status
        await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            canceled_at: new Date(subscription.canceled_at * 1000),
          })
          .eq('stripe_subscription_id', subscription.id);

        // Remove premium access if it's not already expired
        await supabase
          .from('profiles')
          .update({
            premium_until: null,
          })
          .eq('id', user.id)
          .gt('premium_until', new Date());
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 