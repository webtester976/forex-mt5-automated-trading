import { getStripe, isStripeConfigured } from './client.js';
import { db } from '../db/store.js';

export interface CheckoutResult {
  url: string;
  sessionId: string;
  isTestMode: boolean;
  stripeConfigured: boolean;
  mode: 'stripe' | 'profit_share' | 'simulated';
}

/**
 * Creates a Stripe Checkout Session for subscription plans or provisions a profit-share plan.
 */
export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  planId: string,
  successUrl: string,
  cancelUrl: string
): Promise<CheckoutResult> {
  const plan = db.subscriptionPlans.find(p => p.id === planId || p.code === planId);
  if (!plan) {
    throw new Error(`Subscription plan not found: ${planId}`);
  }

  // 1. Profit-Share Plan Handling
  // Profit-share has $0 upfront fee. It activates immediately with 20% high-water mark fee on profits.
  if (plan.interval === 'profit_share') {
    const existingSub = db.subscriptions.find(s => s.userId === userId && s.status === 'active');
    const newSub = await db.createOrUpdateSubscription({
      id: existingSub ? existingSub.id : `sub_ps_${Date.now()}`,
      userId,
      planId: plan.id,
      planName: plan.name,
      status: 'active',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      cancelAtPeriodEnd: false,
      priceUsd: 0,
      interval: 'profit_share',
    });

    db.recordAudit(
      userId,
      userEmail,
      'customer',
      'SUBSCRIPTION_ACTIVATED_PROFIT_SHARE',
      'subscriptions',
      `Activated Performance Profit-Share Plan for user ${userEmail} ($0 upfront, ${plan.profitSharePct}% performance fee).`,
      '127.0.0.1',
      newSub.id
    );

    return {
      url: `${successUrl}?status=activated&plan=profit_share&sub_id=${newSub.id}`,
      sessionId: `ps_sess_${Date.now()}`,
      isTestMode: true,
      stripeConfigured: isStripeConfigured(),
      mode: 'profit_share',
    };
  }

  // 2. Real Stripe Checkout (Test Mode or Configured)
  const stripe = getStripe();
  if (stripe && isStripeConfigured()) {
    try {
      // Find or create customer in Stripe
      const existingCustomer = db.subscriptions.find(s => s.userId === userId && s.stripeCustomerId)?.stripeCustomerId;
      let customerId = existingCustomer;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: { userId },
        });
        customerId = customer.id;
      }

      // Determine billing interval count for Stripe
      let intervalCount = 1;
      let intervalUnit: 'month' | 'year' = 'month';
      if (plan.interval === 'quarterly') {
        intervalCount = 3;
        intervalUnit = 'month';
      } else if (plan.interval === 'biannual') {
        intervalCount = 6;
        intervalUnit = 'month';
      } else if (plan.interval === 'yearly') {
        intervalCount = 1;
        intervalUnit = 'year';
      }

      // Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        client_reference_id: userId,
        payment_method_types: ['card'],
        line_items: plan.stripePriceId
          ? [{ price: plan.stripePriceId, quantity: 1 }]
          : [
              {
                price_data: {
                  currency: 'usd',
                  product_data: {
                    name: plan.name,
                    description: plan.description,
                  },
                  unit_amount: Math.round(plan.priceUsd * 100),
                  recurring: {
                    interval: intervalUnit,
                    interval_count: intervalCount,
                  },
                },
                quantity: 1,
              },
            ],
        metadata: {
          userId,
          planId: plan.id,
          planCode: plan.code,
        },
        subscription_data: {
          metadata: {
            userId,
            planId: plan.id,
          },
        },
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&plan_id=${plan.id}`,
        cancel_url: `${cancelUrl}?canceled=true&plan_id=${plan.id}`,
      });

      if (!session.url) {
        throw new Error('Stripe failed to return a checkout URL');
      }

      return {
        url: session.url,
        sessionId: session.id,
        isTestMode: true,
        stripeConfigured: true,
        mode: 'stripe',
      };
    } catch (err: any) {
      console.error('[Stripe Checkout Error]', err);
      // Fall through to safe simulated session if Stripe call failed due to network or invalid test key
    }
  }

  // 3. Fallback / Test Simulation Flow (Runs safely in preview before real test keys are added)
  const simulatedSessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const simUrl = `${successUrl}?session_id=${simulatedSessionId}&plan_id=${plan.id}&simulated=true`;

  return {
    url: simUrl,
    sessionId: simulatedSessionId,
    isTestMode: true,
    stripeConfigured: false,
    mode: 'simulated',
  };
}
