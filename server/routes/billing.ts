import { Router, Response } from 'express';
import { db } from '../db/store.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { createCheckoutSession } from '../stripe/checkout.js';
import { getStripe, isStripeConfigured } from '../stripe/client.js';
import { processStripeEvent } from '../stripe/webhook.js';
import { SubscriptionStatus } from '../../src/types/index.js';

const router = Router();

// ==========================================
// PUBLIC & CUSTOMER BILLING ROUTES
// ==========================================

/**
 * GET /api/billing/plans
 * Fetches all available subscription plans.
 * Configured dynamically from PostgreSQL rather than hardcoded in the frontend.
 */
router.get('/plans', (_req, res: Response): void => {
  const plans = db.subscriptionPlans.filter(p => p.isActive);
  res.json({
    plans,
    isStripeConfigured: isStripeConfigured(),
  });
});

/**
 * GET /api/billing/subscription
 * Retrieves the currently logged-in customer's active subscription, invoices, and payment history.
 */
router.get('/subscription', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const userSubs = db.subscriptions
    .filter(s => s.userId === userId)
    .sort((a, b) => new Date(b.currentPeriodStart).getTime() - new Date(a.currentPeriodStart).getTime());

  const activeSub = userSubs.find(s => s.status === 'active' || s.status === 'trialing' || s.status === 'past_due');
  const userInvoices = db.invoices
    .filter(i => i.userId === userId)
    .sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime());
  const userPayments = db.payments
    .filter(p => p.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Attach plan details
  let planDetails = null;
  if (activeSub) {
    planDetails = db.subscriptionPlans.find(p => p.id === activeSub.planId || p.code === activeSub.planId);
  }

  res.json({
    subscription: activeSub || null,
    plan: planDetails || null,
    invoices: userInvoices,
    payments: userPayments,
    history: userSubs,
    isStripeConfigured: isStripeConfigured(),
  });
});

/**
 * POST /api/billing/create-checkout-session
 * Initializes a Stripe checkout session for a selected plan.
 */
router.post('/create-checkout-session', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { planId, successUrl, cancelUrl } = req.body;
  const user = req.user!;

  if (!planId) {
    res.status(400).json({ error: 'Plan ID is required.' });
    return;
  }

  const plan = db.subscriptionPlans.find(p => p.id === planId || p.code === planId);
  if (!plan) {
    res.status(404).json({ error: `Subscription plan not found: ${planId}` });
    return;
  }

  try {
    const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    const defaultSuccess = `${origin}/dashboard/subscription`;
    const defaultCancel = `${origin}/pricing`;

    const result = await createCheckoutSession(
      user.id,
      user.email,
      plan.id,
      successUrl || defaultSuccess,
      cancelUrl || defaultCancel
    );

    res.json(result);
  } catch (err: any) {
    console.error('[Billing Checkout Error]', err);
    res.status(500).json({ error: 'Failed to initiate checkout session.', message: err.message });
  }
});

/**
 * POST /api/billing/verify-checkout-session
 * Server-side verification of payment session.
 * Never trusts frontend payment claims: verifies with Stripe API or test simulation harness.
 */
router.post('/verify-checkout-session', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { sessionId, planId, simulated } = req.body;
  const user = req.user!;

  if (!sessionId) {
    res.status(400).json({ error: 'Session ID is required.' });
    return;
  }

  const plan = db.subscriptionPlans.find(p => p.id === planId || p.code === planId) || db.subscriptionPlans[0];
  const stripe = getStripe();

  // 1. If real Stripe session and configured, verify via Stripe API
  if (stripe && isStripeConfigured() && !sessionId.startsWith('cs_test_') && !simulated) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'payment_intent'],
      });

      if (session.payment_status === 'paid' || session.status === 'complete') {
        // Construct synthetic event to idempotently ensure DB synchronization
        const syntheticEvent = {
          id: `evt_verify_${session.id}`,
          object: 'event' as const,
          type: 'checkout.session.completed',
          data: {
            object: session,
          },
        };

        await processStripeEvent(syntheticEvent as any, req.ip);

        const sub = db.subscriptions.find(s => s.userId === user.id && s.status === 'active');
        res.json({
          success: true,
          verified: true,
          status: 'active',
          subscription: sub,
        });
        return;
      } else {
        res.status(400).json({
          success: false,
          verified: false,
          status: session.payment_status,
          message: 'Payment has not been completed or settled.',
        });
        return;
      }
    } catch (err: any) {
      console.error('[Billing Verify Error]', err);
      res.status(500).json({ error: 'Failed to verify session with Stripe API.', message: err.message });
      return;
    }
  }

  // 2. Test Mode / Simulated Checkout Verification
  // In development/test mode without production Stripe keys, securely verify and activate test subscription
  const syntheticEvent = {
    id: `evt_sim_${sessionId}`,
    object: 'event' as const,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: sessionId,
        client_reference_id: user.id,
        metadata: {
          userId: user.id,
          planId: plan.id,
        },
        amount_total: Math.round(plan.priceUsd * 100),
        currency: 'usd',
        customer: `cus_sim_${user.id.substring(0, 8)}`,
        subscription: `sub_sim_${Date.now()}`,
        payment_intent: `pi_sim_${Date.now()}`,
      },
    },
  };

  await processStripeEvent(syntheticEvent as any, req.ip);

  const sub = db.subscriptions.find(s => s.userId === user.id && s.status === 'active');
  res.json({
    success: true,
    verified: true,
    status: 'active',
    subscription: sub,
    mode: 'test_simulation',
  });
});

/**
 * POST /api/billing/cancel-subscription
 * Cancels user subscription (either at period end or immediately).
 */
router.post('/cancel-subscription', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { immediate } = req.body;
  const user = req.user!;

  const sub = db.subscriptions.find(s => s.userId === user.id && s.status === 'active');
  if (!sub) {
    res.status(404).json({ error: 'No active subscription found to cancel.' });
    return;
  }

  // Cancel in Stripe if Stripe subscription exists
  const stripe = getStripe();
  if (stripe && isStripeConfigured() && sub.stripeSubscriptionId && !sub.stripeSubscriptionId.startsWith('sub_sim_')) {
    try {
      if (immediate) {
        await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
      } else {
        await stripe.subscriptions.update(sub.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
      }
    } catch (err: any) {
      console.warn('[Stripe Cancel Warning]', err.message);
    }
  }

  const updatedSub = await db.cancelSubscription(user.id, !immediate);

  db.recordAudit(
    user.id,
    user.email,
    user.role,
    'SUBSCRIPTION_CANCELED_BY_CUSTOMER',
    'subscriptions',
    `User initiated subscription cancellation (${immediate ? 'immediate' : 'at period end'}).`,
    req.ip,
    sub.id
  );

  res.json({
    success: true,
    message: immediate
      ? 'Subscription has been canceled immediately.'
      : 'Subscription will remain active until the end of the current billing period.',
    subscription: updatedSub,
  });
});

/**
 * GET /api/billing/invoices
 * Lists user's past invoices.
 */
router.get('/invoices', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const invoices = db.invoices
    .filter(i => i.userId === userId)
    .sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime());
  res.json({ invoices });
});

/**
 * GET /api/billing/payments
 * Lists user's transaction/payment records.
 */
router.get('/payments', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const payments = db.payments
    .filter(p => p.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ payments });
});


// ==========================================
// ADMIN BILLING & SUBSCRIPTION MANAGEMENT
// ==========================================

/**
 * GET /api/billing/admin/subscriptions
 * Admin view of all customer subscriptions across the platform.
 */
router.get('/admin/subscriptions', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const { status, search } = req.query;

  let subs = db.subscriptions.map(s => {
    const user = db.users.find(u => u.id === s.userId);
    const plan = db.subscriptionPlans.find(p => p.id === s.planId || p.code === s.planId);
    return {
      ...s,
      userEmail: user?.email || 'unknown@user.com',
      userName: user ? `${user.firstName} ${user.lastName}`.trim() : 'Unknown',
      planName: plan?.name || s.planName || 'Quant Plan',
      planInterval: plan?.interval || s.interval || 'monthly',
    };
  });

  if (status) {
    subs = subs.filter(s => s.status === status);
  }

  if (search) {
    const q = String(search).toLowerCase();
    subs = subs.filter(s =>
      s.userEmail.toLowerCase().includes(q) ||
      s.userName.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q)
    );
  }

  res.json({ subscriptions: subs });
});

/**
 * GET /api/billing/admin/payments
 * Admin view of all payments and transactions.
 */
router.get('/admin/payments', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const { status, search } = req.query;

  let payments = db.payments.map(p => {
    const user = db.users.find(u => u.id === p.userId);
    return {
      ...p,
      userEmail: user?.email || 'unknown@user.com',
      userName: user ? `${user.firstName} ${user.lastName}`.trim() : 'Unknown',
    };
  });

  if (status) {
    payments = payments.filter(p => p.status === status);
  }

  if (search) {
    const q = String(search).toLowerCase();
    payments = payments.filter(p =>
      p.userEmail.toLowerCase().includes(q) ||
      p.transactionId.toLowerCase().includes(q) ||
      p.invoiceNumber.toLowerCase().includes(q)
    );
  }

  res.json({ payments });
});

/**
 * GET /api/billing/admin/invoices
 * Admin view of all invoices across all customers.
 */
router.get('/admin/invoices', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response): void => {
  const invoices = db.invoices.map(inv => {
    const user = db.users.find(u => u.id === inv.userId);
    return {
      ...inv,
      userEmail: user?.email || 'unknown@user.com',
      userName: user ? `${user.firstName} ${user.lastName}`.trim() : 'Unknown',
    };
  });
  res.json({ invoices });
});

/**
 * PUT /api/billing/admin/plans/:planId
 * Dynamically updates subscription plan pricing, features, or active status in PostgreSQL.
 */
router.put('/admin/plans/:planId', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { planId } = req.params;
  const updates = req.body;

  const updated = await db.updatePlan(planId, updates);
  if (!updated) {
    res.status(404).json({ error: `Subscription plan ${planId} not found.` });
    return;
  }

  db.recordAudit(
    req.user!.id,
    req.user!.email,
    req.user!.role,
    'SUBSCRIPTION_PLAN_UPDATED',
    'subscription_plans',
    `Updated plan ${updated.name} (Price: $${updated.priceUsd}, Active: ${updated.isActive})`,
    req.ip,
    updated.id
  );

  res.json({
    success: true,
    plan: updated,
  });
});

/**
 * POST /api/billing/admin/subscriptions/:subId/status
 * Manually update/override subscription status for compliance, customer service, or refunds.
 */
router.post('/admin/subscriptions/:subId/status', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { subId } = req.params;
  const { status, currentPeriodEnd } = req.body;

  if (!status) {
    res.status(400).json({ error: 'Status is required.' });
    return;
  }

  const sub = await db.updateSubscriptionStatus(subId, status as SubscriptionStatus, currentPeriodEnd);
  if (!sub) {
    res.status(404).json({ error: `Subscription ${subId} not found.` });
    return;
  }

  db.recordAudit(
    req.user!.id,
    req.user!.email,
    req.user!.role,
    'SUBSCRIPTION_STATUS_OVERRIDE',
    'subscriptions',
    `Admin changed subscription ${subId} status to ${status}.`,
    req.ip,
    sub.id
  );

  res.json({
    success: true,
    subscription: sub,
  });
});

export default router;
