import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

/**
 * Returns a lazily initialized Stripe client.
 * If STRIPE_SECRET_KEY is not defined, returns null so the application
 * continues to run normally in local preview/dev without crashing.
 */
export function getStripe(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || !secretKey.trim()) {
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey.trim(), {
      apiVersion: '2025-02-24.acacia' as any,
      typescript: true,
      appInfo: {
        name: 'Forex MT5 Automated Trading SaaS',
        version: '1.0.0',
      },
    });
  }

  return stripeClient;
}

/**
 * Returns whether Stripe credentials are configured in the environment.
 */
export function isStripeConfigured(): boolean {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  return Boolean(secretKey && secretKey.trim().length > 5);
}

/**
 * Returns the public publishable key for client-side Stripe Elements or redirects.
 */
export function getStripePublishableKey(): string {
  return process.env.STRIPE_PUBLISHABLE_KEY || '';
}

/**
 * Returns the Stripe webhook signing secret.
 */
export function getStripeWebhookSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET || '';
}
