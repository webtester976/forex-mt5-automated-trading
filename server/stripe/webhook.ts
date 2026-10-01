import { Request, Response } from 'express';
import Stripe from 'stripe';
import { getStripe, getStripeWebhookSecret } from './client.js';
import { db } from '../db/store.js';
import { SubscriptionStatus } from '../../src/types/index.js';

export interface WebhookProcessingResult {
  success: boolean;
  duplicate: boolean;
  eventId: string;
  eventType: string;
  message: string;
  details?: any;
}

/**
 * Core event handler for Stripe webhook events.
 * Guarantees idempotency: duplicate events will NOT duplicate payments or subscriptions.
 */
export async function processStripeEvent(event: Stripe.Event, rawIp = '127.0.0.1'): Promise<WebhookProcessingResult> {
  const eventId = event.id;
  const eventType = event.type;

  // 1. Idempotency Guard
  if (db.isWebhookProcessed(eventId)) {
    console.log(`[Stripe Webhook] Idempotency guard triggered: event ${eventId} (${eventType}) was already processed.`);
    return {
      success: true,
      duplicate: true,
      eventId,
      eventType,
      message: 'Event was already processed previously.',
    };
  }

  console.log(`[Stripe Webhook] Processing event ${eventId}: ${eventType}`);

  // 2. Event Handling
  switch (eventType) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId || (session.client_reference_id as string);
      const planId = session.metadata?.planId;
      const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
      const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
      const amountTotal = session.amount_total ? session.amount_total / 100 : 0;

      if (!userId) {
        console.warn(`[Stripe Webhook] Warning: checkout.session.completed missing userId metadata for session ${session.id}`);
        break;
      }

      const plan = db.subscriptionPlans.find(p => p.id === planId || p.code === planId) || db.subscriptionPlans[0];
      const user = db.users.find(u => u.id === userId);

      // Determine subscription period duration based on plan interval
      let durationDays = 30;
      if (plan.interval === 'quarterly') durationDays = 90;
      else if (plan.interval === 'biannual') durationDays = 180;
      else if (plan.interval === 'yearly') durationDays = 365;

      const startDate = new Date();
      const endDate = new Date(Date.now() + durationDays * 86400000);

      // Activate or update subscription in PostgreSQL and memory
      const sub = await db.createOrUpdateSubscription({
        id: stripeSubscriptionId || `sub_${Date.now()}`,
        userId,
        planId: plan.id,
        planName: plan.name,
        status: 'active',
        stripeCustomerId: stripeCustomerId || undefined,
        stripeSubscriptionId: stripeSubscriptionId || undefined,
        currentPeriodStart: startDate.toISOString(),
        currentPeriodEnd: endDate.toISOString(),
        cancelAtPeriodEnd: false,
        priceUsd: amountTotal || plan.priceUsd,
        interval: plan.interval,
      });

      // Generate invoice number
      const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Record payment with idempotency key
      const payment = await db.recordPayment({
        id: `pay_${Date.now()}`,
        userId,
        subscriptionId: sub.id,
        provider: 'stripe',
        transactionId: session.payment_intent ? String(session.payment_intent) : `txn_${session.id}`,
        amountUsd: amountTotal || plan.priceUsd,
        currency: (session.currency || 'USD').toUpperCase(),
        status: 'succeeded',
        invoiceNumber,
        idempotencyKey: eventId,
        stripeCustomerId: stripeCustomerId || undefined,
        stripePaymentIntentId: session.payment_intent ? String(session.payment_intent) : undefined,
        createdAt: new Date().toISOString(),
      });

      // Record invoice
      await db.recordInvoice({
        id: `inv_${Date.now()}`,
        paymentId: payment.id,
        userId,
        subscriptionId: sub.id,
        invoiceNumber,
        subtotal: amountTotal || plan.priceUsd,
        tax: 0.00,
        total: amountTotal || plan.priceUsd,
        status: 'paid',
        issuedDate: new Date().toISOString().split('T')[0],
        stripeInvoiceId: session.invoice ? String(session.invoice) : undefined,
      });

      // Mark webhook processed in PostgreSQL and memory
      await db.markWebhookProcessed(eventId, eventType);

      // Audit Log
      db.recordAudit(
        userId,
        user?.email || 'customer@forexsaas.com',
        user?.role || 'customer',
        'STRIPE_CHECKOUT_COMPLETED',
        'subscriptions',
        `Stripe checkout succeeded for ${plan.name} ($${amountTotal || plan.priceUsd}). Subscription activated until ${endDate.toISOString().split('T')[0]}.`,
        rawIp,
        sub.id
      );

      return {
        success: true,
        duplicate: false,
        eventId,
        eventType,
        message: `Subscription successfully activated for user ${userId}.`,
        details: { subscriptionId: sub.id, paymentId: payment.id },
      };
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as any;
      const stripeCustomerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
      const stripeSubscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
      const amountPaid = invoice.amount_paid ? invoice.amount_paid / 100 : 0;

      // Find subscription by stripeSubscriptionId or stripeCustomerId
      const sub = db.subscriptions.find(
        s => (stripeSubscriptionId && s.stripeSubscriptionId === stripeSubscriptionId) ||
             (stripeCustomerId && s.stripeCustomerId === stripeCustomerId)
      );

      if (sub) {
        // Renew subscription period by 30 days or plan interval
        let durationDays = 30;
        if (sub.interval === 'quarterly') durationDays = 90;
        else if (sub.interval === 'biannual') durationDays = 180;
        else if (sub.interval === 'yearly') durationDays = 365;

        const newEnd = new Date(Date.now() + durationDays * 86400000).toISOString();
        await db.updateSubscriptionStatus(sub.id, 'active', newEnd);

        const invoiceNumber = invoice.number || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const payment = await db.recordPayment({
          id: `pay_${Date.now()}`,
          userId: sub.userId,
          subscriptionId: sub.id,
          provider: 'stripe',
          transactionId: invoice.payment_intent ? String(invoice.payment_intent) : `txn_inv_${invoice.id}`,
          amountUsd: amountPaid || sub.priceUsd,
          currency: (invoice.currency || 'USD').toUpperCase(),
          status: 'succeeded',
          invoiceNumber,
          idempotencyKey: eventId,
          stripeCustomerId: stripeCustomerId || undefined,
          createdAt: new Date().toISOString(),
        });

        await db.recordInvoice({
          id: `inv_${Date.now()}`,
          paymentId: payment.id,
          userId: sub.userId,
          subscriptionId: sub.id,
          invoiceNumber,
          subtotal: amountPaid || sub.priceUsd,
          tax: invoice.tax ? invoice.tax / 100 : 0,
          total: amountPaid || sub.priceUsd,
          status: 'paid',
          issuedDate: new Date().toISOString().split('T')[0],
          pdfUrl: invoice.invoice_pdf || undefined,
          hostedInvoiceUrl: invoice.hosted_invoice_url || undefined,
          stripeInvoiceId: invoice.id,
        });

        await db.markWebhookProcessed(eventId, eventType);

        db.recordAudit(
          sub.userId,
          'billing@stripe.com',
          'system',
          'INVOICE_PAYMENT_SUCCEEDED',
          'payments',
          `Stripe recurring renewal succeeded ($${amountPaid || sub.priceUsd}). Subscription active until ${newEnd.split('T')[0]}.`,
          rawIp,
          sub.id
        );
      } else {
        await db.markWebhookProcessed(eventId, eventType);
      }

      return {
        success: true,
        duplicate: false,
        eventId,
        eventType,
        message: 'Invoice payment succeeded processed.',
      };
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as any;
      const stripeCustomerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
      const stripeSubscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;

      const sub = db.subscriptions.find(
        s => (stripeSubscriptionId && s.stripeSubscriptionId === stripeSubscriptionId) ||
             (stripeCustomerId && s.stripeCustomerId === stripeCustomerId)
      );

      if (sub) {
        await db.updateSubscriptionStatus(sub.id, 'past_due');

        await db.recordPayment({
          id: `pay_fail_${Date.now()}`,
          userId: sub.userId,
          subscriptionId: sub.id,
          provider: 'stripe',
          transactionId: invoice.payment_intent ? String(invoice.payment_intent) : `txn_fail_${invoice.id}`,
          amountUsd: invoice.amount_due ? invoice.amount_due / 100 : sub.priceUsd,
          currency: (invoice.currency || 'USD').toUpperCase(),
          status: 'failed',
          invoiceNumber: invoice.number || `INV-${Date.now().toString().slice(-4)}`,
          idempotencyKey: eventId,
          stripeCustomerId: stripeCustomerId || undefined,
          createdAt: new Date().toISOString(),
        });

        await db.markWebhookProcessed(eventId, eventType);

        db.recordAudit(
          sub.userId,
          'billing@stripe.com',
          'system',
          'INVOICE_PAYMENT_FAILED',
          'subscriptions',
          `Stripe invoice payment failed. Subscription marked as past_due.`,
          rawIp,
          sub.id
        );
      } else {
        await db.markWebhookProcessed(eventId, eventType);
      }

      return {
        success: true,
        duplicate: false,
        eventId,
        eventType,
        message: 'Invoice payment failure processed and subscription updated to past_due.',
      };
    }

    case 'customer.subscription.deleted': {
      const stripeSub = event.data.object as Stripe.Subscription;
      const stripeSubId = stripeSub.id;

      const sub = db.subscriptions.find(s => s.stripeSubscriptionId === stripeSubId || s.id === stripeSubId);
      if (sub) {
        await db.updateSubscriptionStatus(sub.id, 'canceled');
        await db.markWebhookProcessed(eventId, eventType);

        db.recordAudit(
          sub.userId,
          'billing@stripe.com',
          'system',
          'SUBSCRIPTION_CANCELED_AT_STRIPE',
          'subscriptions',
          `Stripe canceled subscription ${stripeSubId}. Status set to canceled.`,
          rawIp,
          sub.id
        );
      } else {
        await db.markWebhookProcessed(eventId, eventType);
      }

      return {
        success: true,
        duplicate: false,
        eventId,
        eventType,
        message: 'Subscription deleted event processed.',
      };
    }

    case 'customer.subscription.updated': {
      const stripeSub = event.data.object as Stripe.Subscription;
      const stripeSubId = stripeSub.id;

      let mappedStatus: SubscriptionStatus = 'active';
      if (stripeSub.status === 'past_due') mappedStatus = 'past_due';
      else if (stripeSub.status === 'canceled') mappedStatus = 'canceled';
      else if (stripeSub.status === 'trialing') mappedStatus = 'trialing';
      else if (stripeSub.status === 'incomplete' || stripeSub.status === 'incomplete_expired') mappedStatus = 'incomplete';
      else if (stripeSub.status === 'unpaid') mappedStatus = 'past_due';

      const currentPeriodEnd = (stripeSub as any).current_period_end
        ? new Date((stripeSub as any).current_period_end * 1000).toISOString()
        : undefined;

      const sub = await db.updateSubscriptionStatus(stripeSubId, mappedStatus, currentPeriodEnd);
      await db.markWebhookProcessed(eventId, eventType);

      return {
        success: true,
        duplicate: false,
        eventId,
        eventType,
        message: `Subscription updated to status ${mappedStatus}.`,
        details: { subscriptionId: sub?.id, status: mappedStatus },
      };
    }

    default: {
      console.log(`[Stripe Webhook] Unhandled event type: ${eventType}`);
      await db.markWebhookProcessed(eventId, eventType);
      return {
        success: true,
        duplicate: false,
        eventId,
        eventType,
        message: `Unhandled event type ${eventType} recorded.`,
      };
    }
  }

  await db.markWebhookProcessed(eventId, eventType);
  return {
    success: true,
    duplicate: false,
    eventId,
    eventType,
    message: 'Event processed successfully.',
  };
}

/**
 * Express Route Handler for incoming Stripe Webhook HTTP POST
 */
export async function stripeWebhookRouteHandler(req: Request, res: Response): Promise<void> {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = getStripeWebhookSecret();
  const stripe = getStripe();

  let event: Stripe.Event;

  // 1. Signature Verification if secret is configured
  if (webhookSecret && stripe) {
    if (!sig) {
      console.error('[Stripe Webhook Error] Missing stripe-signature header');
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    try {
      const rawBody = (req as any).rawBody || req.body;
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
      console.error(`[Stripe Webhook Error] Signature verification failed:`, err.message);
      res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
      return;
    }
  } else {
    // If webhook secret is not set yet in test mode, safely parse event from body
    event = req.body as Stripe.Event;
    if (!event || !event.type || !event.id) {
      res.status(400).json({ error: 'Invalid webhook payload structure' });
      return;
    }
  }

  try {
    const result = await processStripeEvent(event, req.ip);
    res.status(200).json(result);
  } catch (err: any) {
    console.error('[Stripe Webhook Execution Error]', err);
    res.status(500).json({ error: 'Internal error processing webhook', message: err.message });
  }
}
