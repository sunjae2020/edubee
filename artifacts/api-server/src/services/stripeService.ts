import Stripe from 'stripe';
import { db } from '@workspace/db';
import { platformPlans } from '@workspace/db/schema';
import { eq } from 'drizzle-orm';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key, { apiVersion: '2026-03-25.dahlia' });
}

export type BillingCycle = 'monthly' | 'annually';

// ─── Resolve Price ID: DB first, env var fallback ─────────────────────────────
async function resolvePriceId(planCode: string, cycle: BillingCycle): Promise<string | null> {
  // 1. Check DB
  const [plan] = await db
    .select({ stripePriceMonthly: platformPlans.stripePriceMonthly, stripePriceAnnually: platformPlans.stripePriceAnnually })
    .from(platformPlans)
    .where(eq(platformPlans.code, planCode))
    .limit(1);

  if (plan) {
    const dbId = cycle === 'monthly' ? plan.stripePriceMonthly : plan.stripePriceAnnually;
    if (dbId) return dbId;
  }

  // 2. Env var fallback (legacy support)
  const key = `STRIPE_${planCode.toUpperCase()}_${cycle === 'monthly' ? 'MONTHLY' : 'ANNUALLY'}`;
  return process.env[key] ?? null;
}

// Create Checkout Session (new subscription / plan upgrade)
export async function createCheckoutSession(params: {
  organisationId: string;
  planType:       string;
  billingCycle:   BillingCycle;
  successUrl:     string;
  cancelUrl:      string;
  customerEmail?: string;
}): Promise<{ url: string | null; sessionId: string }> {
  const stripe = getStripe();
  const { organisationId, planType, billingCycle,
          successUrl, cancelUrl, customerEmail } = params;

  // Enterprise: no self-serve checkout — direct to sales
  if (planType === 'enterprise') {
    throw new Error('Enterprise plans require a custom quote. Please contact sales.');
  }

  const priceId = await resolvePriceId(planType, billingCycle);
  if (!priceId) {
    throw new Error(
      `Stripe Price ID not configured for "${planType}/${billingCycle}". ` +
      `Set it in the Stripe Settings page or as an environment variable.`
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode:                 'subscription',
    payment_method_types: ['card'],
    line_items:           [{ price: priceId, quantity: 1 }],
    success_url:          successUrl,
    cancel_url:           cancelUrl,
    customer_email:       customerEmail,
    metadata:             { organisationId, planType, billingCycle },
    subscription_data:    { metadata: { organisationId, planType } },
  });

  return { url: session.url, sessionId: session.id };
}

// Create Customer Portal session (manage billing / cancel subscription)
export async function createPortalSession(params: {
  customerId: string;
  returnUrl:  string;
}): Promise<string> {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer:   params.customerId,
    return_url: params.returnUrl,
  });
  return session.url;
}

// Verify and parse incoming Webhook event
export function constructWebhookEvent(
  payload:   Buffer | string,
  signature: string
): Stripe.Event {
  const key = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key) throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(payload, signature, key);
}
