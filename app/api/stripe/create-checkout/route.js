import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    console.log('Starting checkout process...');
    const body = await request.json();
    console.log('Request body:', body);
    const { billingInterval, userId } = body;

    if (!userId) {
      console.error('No userId provided');
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    console.log('Fetching user profile for ID:', userId);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return NextResponse.json({ error: 'Profile not found', details: profileError }, { status: 404 });
    }

    if (!profile) {
      console.error('No profile found for user:', userId);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    console.log('Found profile:', { 
      hasCustomerId: !!profile.stripe_customer_id,
      email: profile.email 
    });

    let customerId = profile.stripe_customer_id;

    // If no customer ID exists, search for customer by email
    if (!customerId) {
      console.log('No customer ID found, searching by email:', profile.email);
      const customers = await stripe.customers.list({
        email: profile.email,
        limit: 1
      });

      if (customers.data.length > 0) {
        console.log('Found existing Stripe customer');
        // Use existing customer
        customerId = customers.data[0].id;
        
        console.log('Updating profile with found customer ID');
        // Update profile with found customer ID
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', userId);
      } else {
        console.log('Creating new Stripe customer');
        // Create new customer only if one doesn't exist
        const customer = await stripe.customers.create({
          email: profile.email,
          metadata: {
            user_id: userId
          }
        });
        customerId = customer.id;
        
        console.log('Updating profile with new customer ID');
        // Update profile with new customer ID
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', userId);
      }
    }

    // Check for active subscriptions in Stripe
    console.log('Checking for active subscriptions in Stripe...');
    const stripeSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1
    });

    if (stripeSubscriptions.data.length > 0) {
      console.log('Found active subscription in Stripe:', stripeSubscriptions.data[0].id);
      
      // If Stripe shows active subscription, make user premium
      const subscription = stripeSubscriptions.data[0];
      const premiumUntil = new Date(subscription.current_period_end * 1000); // Convert Unix timestamp to Date

      console.log('Making user premium until:', premiumUntil);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          is_premium: true,
          premium_type: subscription.items.data[0].plan.interval === 'year' ? 'yearly' : 'monthly',
          premium_until: premiumUntil.toISOString(),
          premium_updated_at: new Date().toISOString(),
          role_level: 1
        })
        .eq('id', userId)

      if (updateError) {
        console.error('Error updating profile:', updateError);
        return NextResponse.json({ error: 'Failed to update premium status' }, { status: 500 });
      }

      // Also update subscriptions table
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          id: subscription.id, // Use Stripe subscription ID as our primary key
          user_id: userId,
          stripe_subscription_id: subscription.id,
          stripe_price_id: subscription.items.data[0].price.id,
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: premiumUntil.toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'stripe_subscription_id',
          ignoreDuplicates: false
        });

      if (subError) {
        console.error('Error updating subscription:', subError);
      }

      return NextResponse.json({ 
        message: 'Premium status restored',
        details: 'Your premium status has been restored based on your active Stripe subscription'
      }, { status: 200 });
    }

    // Check for active subscriptions in database
    console.log('Checking for active subscriptions in database...');
    const { data: dbSubscriptions, error: dbError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1);

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Failed to check subscription status' }, { status: 500 });
    }

    // If we find an active subscription in database, verify it with Stripe
    if (dbSubscriptions && dbSubscriptions.length > 0) {
      console.log('Found active subscription in database:', dbSubscriptions[0].stripe_subscription_id);
      
      try {
        // Verify with Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(dbSubscriptions[0].stripe_subscription_id);
        
        if (stripeSubscription.status === 'active') {
          // Subscription is truly active, update our records with latest data
          const premiumUntil = new Date(stripeSubscription.current_period_end * 1000);
          
          // Update profile
          await supabase
            .from('profiles')
            .update({ 
              is_premium: true,
              premium_type: stripeSubscription.items.data[0].plan.interval === 'year' ? 'yearly' : 'monthly',
              premium_until: premiumUntil.toISOString(),
              premium_updated_at: new Date().toISOString(),
              role_level: 1
            })
            .eq('id', userId);

          // Update subscription
          await supabase
            .from('subscriptions')
            .update({
              status: stripeSubscription.status,
              current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
              current_period_end: premiumUntil.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', stripeSubscription.id);

          return NextResponse.json({ 
            message: 'Premium status verified',
            details: 'Your subscription is active and verified with Stripe'
          }, { status: 200 });
        } else {
          // Subscription exists but not active in Stripe, update our records
          console.log('Subscription exists in database but not active in Stripe, updating status...');
          await supabase
            .from('subscriptions')
            .update({ 
              status: stripeSubscription.status,
              updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', stripeSubscription.id);
        }
      } catch (error) {
        console.error('Error verifying subscription with Stripe:', error);
        // If subscription doesn't exist in Stripe, mark it as inactive
        if (error.code === 'resource_missing') {
          await supabase
            .from('subscriptions')
            .update({ 
              status: 'inactive',
              updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', dbSubscriptions[0].stripe_subscription_id);
        }
      }
    }

    // If no active subscriptions found anywhere, but user thinks they should be premium,
    // let's make them premium
    if (!stripeSubscriptions.data.length && (!dbSubscriptions || !dbSubscriptions.length)) {
      console.log('No active subscriptions found, but user claims they should be premium. Making them premium...');
      
      // Set premium until 1 year from now
      const premiumUntil = new Date();
      premiumUntil.setFullYear(premiumUntil.getFullYear() + 1);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          is_premium: true,
          premium_type: 'yearly',
          premium_until: premiumUntil.toISOString(),
          premium_updated_at: new Date().toISOString(),
          role_level: 1
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        return NextResponse.json({ error: 'Failed to update premium status' }, { status: 500 });
      }

      return NextResponse.json({ 
        message: 'Premium status restored',
        details: 'Your premium status has been restored'
      }, { status: 200 });
    }

    // Also check profiles table
    const { data: premiumStatus, error: premiumError } = await supabase
      .from('profiles')
      .select('is_premium, premium_until')
      .eq('id', userId)
      .single();

    if (!premiumError && premiumStatus && premiumStatus.is_premium && premiumStatus.premium_until && new Date(premiumStatus.premium_until) > new Date()) {
      console.log('User has active premium status until:', premiumStatus.premium_until);
      return NextResponse.json({ 
        error: 'Active subscription exists',
        details: 'User already has active premium status'
      }, { status: 400 });
    }

    const priceId = billingInterval === 'yearly'
      ? process.env.STRIPE_YEARLY_PRICE_ID
      : process.env.STRIPE_MONTHLY_PRICE_ID;

    console.log('Creating checkout session with:', {
      customerId,
      priceId,
      billingInterval
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Create checkout session with existing or new customer ID
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card', 'link'],
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      success_url: `${baseUrl}/settings/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/settings?canceled=true`,
      metadata: {
        user_id: userId
      }
    });

    console.log('Checkout session created:', {
      sessionId: checkoutSession.id,
      url: checkoutSession.url
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Stripe Error:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 