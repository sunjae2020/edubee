import Stripe from 'stripe';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key, { apiVersion: '2026-03-25.dahlia' });
}

// Plan → Stripe Price ID mapping
// Replace with actual Price IDs from your Stripe dashboard
const PLAN_PRICE_IDS: Record<string, { monthly: string; annually: string }> = {
  starter: {
    monthly:  process.env.STRIPE_STARTER_MONTHLY  ?? '',
    annually: process.env.STRIPE_STARTER_ANNUALLY ?? '',
  },
  professional: {
    monthly:  process.env.STRIPE_PRO_MONTHLY  ?? '',
    annually: process.env.STRIPE_PRO_ANNUALLY ?? '',
  },
  enterprise: {
    monthly:  process.env.STRIPE_ENT_MONTHLY  ?? '',
    annually: process.env.STRIPE_ENT_ANNUALLY ?? '',
  },
};

// Create Checkout Session (new subscription / plan upgrade)
export async function createCheckoutSession(params: {
  organisationId: string;
  planType:       string;
  billingCycle:   'monthly' | 'annually';
  successUrl:     string;
  cancelUrl:      string;
  customerEmail?: string;
}): Promise<{ url: string | null; sessionId: string }> {
  const stripe = getStripe();
  const { organisationId, planType, billingCycle,
          successUrl, cancelUrl, customerEmail } = params;

  const priceId = PLAN_PRICE_IDS[planType]?.[billingCycle];
  if (!priceId) throw new Error(`Price ID not found: ${planType}/${billingCycle}`);

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
