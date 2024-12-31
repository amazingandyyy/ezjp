import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase client with service role key for managing subscriptions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function CheckoutSuccess({ searchParams }) {
  console.log('Starting checkout success flow with params:', searchParams);
  const { session_id } = searchParams;

  if (!session_id) {
    console.log('No session_id found in params');
    redirect('/settings?error=missing_session');
  }

  try {
    console.log('Retrieving checkout session:', session_id);
    // Get the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['subscription']
    });
    
    console.log('Retrieved session:', {
      id: session.id,
      customer: session.customer,
      metadata: session.metadata,
      subscription: session.subscription?.id,
      status: session.subscription?.status
    });
    
    if (!session) {
      console.log('No session found');
      redirect('/settings?error=invalid_session');
    }

    const userId = session.metadata.user_id;
    if (!userId) {
      console.log('No user_id found in session metadata');
      redirect('/settings?error=missing_user_id');
    }

    console.log('Checking existing subscription for user:', userId);
    // Check if user already has this subscription in database
    const { data: existingSubscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('stripe_subscription_id', session.subscription.id)
      .single();

    if (subscriptionError && subscriptionError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error fetching subscription:', subscriptionError);
      redirect(`/settings?error=subscription_fetch_failed&details=${encodeURIComponent(subscriptionError.message)}`);
    }

    console.log('Found subscription:', existingSubscription);

    // If subscription exists and is active, update profile
    if (existingSubscription) {
      console.log('Subscription already exists, updating profile');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          is_premium: true,
          premium_type: session.subscription.items.data[0].price.recurring.interval,
          premium_updated_at: new Date().toISOString(),
          premium_until: new Date(session.subscription.current_period_end * 1000).toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        redirect(`/settings?error=update_failed&details=${encodeURIComponent(updateError.message)}`);
      }

      redirect('/settings?premiumUpgradeSuccess=true');
    }

    // If subscription doesn't exist, create it
    console.log('Creating new subscription record');
    const { error: insertError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        stripe_subscription_id: session.subscription.id,
        stripe_price_id: session.subscription.items.data[0].price.id,
        status: session.subscription.status,
        current_period_start: new Date(session.subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(session.subscription.current_period_end * 1000).toISOString(),
        cancel_at: session.subscription.cancel_at ? new Date(session.subscription.cancel_at * 1000).toISOString() : null,
        canceled_at: session.subscription.canceled_at ? new Date(session.subscription.canceled_at * 1000).toISOString() : null
      });

    if (insertError) {
      console.error('Error inserting subscription:', insertError);
      redirect(`/settings?error=subscription_create_failed&details=${encodeURIComponent(insertError.message)}`);
    }

    // Update profile with premium status
    console.log('Updating profile with premium status');
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        is_premium: true,
        stripe_customer_id: session.customer,
        premium_type: session.subscription.items.data[0].price.recurring.interval,
        premium_updated_at: new Date().toISOString(),
        premium_until: new Date(session.subscription.current_period_end * 1000).toISOString()
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      redirect(`/settings?error=profile_update_failed&details=${encodeURIComponent(profileError.message)}`);
    }

    console.log('Successfully updated profile and subscription, redirecting to success');
    redirect('/settings?premiumUpgradeSuccess=true');
  } catch (error) {
    console.error('Error processing checkout success:', error);
    redirect(`/settings?error=process_failed&details=${error.name}_${error.message}`);
  }
} 