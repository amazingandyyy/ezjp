import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  const supabase = createRouteHandlerClient({ cookies });
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // First, check if there's an active subscription
    if (profile.stripe_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
        
        // Check if subscription is active
        const isActive = subscription.status === 'active' || subscription.status === 'trialing';
        
        if (isActive) {
          // Update profile with current subscription status
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              is_premium: true,
              stripe_customer_id: subscription.customer,
              premium_type: subscription.items.data[0].price.recurring.interval,
              premium_updated_at: new Date().toISOString(),
            })
            .eq('id', session.user.id);

          if (updateError) {
            throw updateError;
          }

          return NextResponse.json({ 
            success: true, 
            message: 'Membership restored successfully',
            subscription: {
              status: subscription.status,
              interval: subscription.items.data[0].price.recurring.interval,
              current_period_end: subscription.current_period_end
            }
          });
        }
      } catch (stripeError) {
        console.error('Stripe subscription error:', stripeError);
      }
    }

    // If no active subscription found, check recent successful checkout sessions
    try {
      const checkoutSessions = await stripe.checkout.sessions.list({
        limit: 5,
        expand: ['data.subscription'],
        customer: profile.stripe_customer_id,
      });

      // Find a successful session for this user
      const successfulSession = checkoutSessions.data.find(session => {
        const subscription = session.subscription;
        return session.payment_status === 'paid' && 
               subscription && 
               (subscription.status === 'active' || subscription.status === 'trialing') &&
               !profile.stripe_subscription_id; // Only use if we don't already have a subscription ID
      });

      if (successfulSession && successfulSession.subscription) {
        console.log('Found successful session:', {
          customer: successfulSession.customer,
          subscription: successfulSession.subscription.id,
          status: successfulSession.subscription.status
        });
        // Update profile with the new subscription
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            is_premium: true,
            stripe_customer_id: successfulSession.customer,
            stripe_subscription_id: successfulSession.subscription.id,
            premium_type: successfulSession.subscription.items.data[0].price.recurring.interval,
            premium_updated_at: new Date().toISOString(),
          })
          .eq('id', session.user.id);

        if (updateError) {
          throw updateError;
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Membership restored from recent checkout',
          subscription: {
            status: successfulSession.subscription.status,
            interval: successfulSession.subscription.items.data[0].price.recurring.interval,
            current_period_end: successfulSession.subscription.current_period_end
          }
        });
      }
    } catch (checkoutError) {
      console.error('Error checking recent checkouts:', checkoutError);
    }

    // If still no active subscription found, clear subscription data
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_premium: false,
        stripe_subscription_id: null,
        premium_updated_at: new Date().toISOString(),
      })
      .eq('id', session.user.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
    }

    return NextResponse.json({ 
      error: 'No active subscription found',
      message: 'Please contact support if you believe this is an error'
    }, { status: 404 });

  } catch (error) {
    console.error('Error restoring membership:', error);
    return NextResponse.json({ 
      error: 'Failed to restore membership',
      message: error.message 
    }, { status: 500 });
  }
} 