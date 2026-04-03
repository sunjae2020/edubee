import Stripe from 'stripe';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key, { apiVersion: '2026-03-25.dahlia' });
}

// ─── Plan → Stripe Price ID mapping (Solo / Starter / Growth / Enterprise) ────
// Enterprise is custom-priced — no Stripe Price ID required.
const PLAN_PRICE_IDS: Record<string, { monthly: string; annually: string } | null> = {
  solo: {
    monthly:  process.env.STRIPE_SOLO_MONTHLY  ?? '',
    annually: process.env.STRIPE_SOLO_ANNUALLY ?? '',
  },
  starter: {
    monthly:  process.env.STRIPE_STARTER_MONTHLY  ?? '',
    annually: process.env.STRIPE_STARTER_ANNUALLY ?? '',
  },
  growth: {
    monthly:  process.env.STRIPE_GROWTH_MONTHLY  ?? '',
    annually: process.env.STRIPE_GROWTH_ANNUALLY ?? '',
  },
  // Enterprise is handled offline — no self-serve checkout
  enterprise: null,
};

export type BillingCycle = 'monthly' | 'annually';

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

  const planEntry = PLAN_PRICE_IDS[planType];

  // Enterprise: no self-serve checkout — direct to sales
  if (planEntry === null) {
    throw new Error('Enterprise plans require a custom quote. Please contact sales.');
  }

  if (!planEntry) {
    throw new Error(`Unknown plan type: ${planType}`);
  }

  const priceId = planEntry[billingCycle];
  if (!priceId) {
    throw new Error(`Stripe Price ID not configured for ${planType}/${billingCycle}. Add the env var.`);
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
