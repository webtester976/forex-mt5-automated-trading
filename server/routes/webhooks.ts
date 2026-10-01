import { Router, Request, Response } from 'express';
import { db } from '../db/store.js';
import { stripeWebhookRouteHandler, processStripeEvent } from '../stripe/webhook.js';

const router = Router();

// Official Stripe Webhook endpoint
// Handles signature verification when STRIPE_WEBHOOK_SECRET is set, idempotency, and PostgreSQL updates
router.post('/stripe', stripeWebhookRouteHandler);

// Generic / test payment webhook
router.post('/payment', async (req: Request, res: Response): Promise<void> => {
  const { eventType, idempotencyKey, userId, planId, amountUsd, transactionId } = req.body;

  if (!idempotencyKey) {
    res.status(400).json({ error: 'Idempotency key required' });
    return;
  }

  // Idempotency check
  if (db.isWebhookProcessed(idempotencyKey)) {
    res.json({ status: 'already_processed', message: 'Payment event was already processed previously.' });
    return;
  }

  if (eventType === 'checkout.session.completed' || eventType === 'payment_intent.succeeded') {
    const user = db.users.find(u => u.id === userId);
    const plan = db.subscriptionPlans.find(p => p.id === planId) || db.subscriptionPlans[0];

    if (user && plan) {
      const syntheticEvent = {
        id: idempotencyKey,
        object: 'event' as const,
        type: 'checkout.session.completed' as const,
        data: {
          object: {
            id: `cs_${idempotencyKey}`,
            client_reference_id: userId,
            metadata: { userId, planId: plan.id },
            amount_total: Math.round((amountUsd || plan.priceUsd) * 100),
            currency: 'usd',
            payment_intent: transactionId || `txn_${idempotencyKey}`,
          },
        },
      };

      await processStripeEvent(syntheticEvent as any, req.ip);
    }
  }

  res.json({ received: true });
});

export default router;
