import express from 'express';
import { constructWebhookEvent } from '../services/stripeService.js';
import { getDefaultFeatures }    from '../middleware/featureGuard.js';
import { db }                    from '@workspace/db';
import { organisations }         from '@workspace/db/schema';
import { eq }                    from 'drizzle-orm';

const router = express.Router();

// ⚠️ Webhook requires raw body — registered BEFORE express.json() in app.ts
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      return res.status(400).json({ message: 'Missing stripe-signature header' });
    }

    let event;
    try {
      event = constructWebhookEvent(req.body, signature);
    } catch (err) {
      console.error('[WEBHOOK] Signature verification failed:', err);
      return res.status(400).json({ message: 'Webhook signature failed' });
    }

    try {
      switch (event.type) {

        // Payment succeeded → activate plan
        case 'checkout.session.completed': {
          const session = event.data.object as Record<string, unknown>;
          const meta    = session.metadata as Record<string, string>;
          const { organisationId, planType } = meta ?? {};

          if (organisationId && planType) {
            await db.update(organisations).set({
              planType,
              planStatus:              'active',
              stripeSubscriptionId:    session.subscription as string,
              features:                getDefaultFeatures(planType),
              modifiedOn:              new Date(),
            }).where(eq(organisations.id, organisationId));

            console.log('[WEBHOOK] Plan activated:', organisationId, planType);
          }
          break;
        }

        // Subscription renewed
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Record<string, unknown>;
          const subId   = invoice.subscription as string;
          if (subId) {
            await db.update(organisations).set({
              planStatus: 'active', modifiedOn: new Date(),
            }).where(eq(organisations.stripeSubscriptionId, subId));
          }
          break;
        }

        // Payment failed → suspend
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Record<string, unknown>;
          const subId   = invoice.subscription as string;
          if (subId) {
            await db.update(organisations).set({
              planStatus: 'suspended', modifiedOn: new Date(),
            }).where(eq(organisations.stripeSubscriptionId, subId));
            console.log('[WEBHOOK] Payment failed, plan suspended:', subId);
          }
          break;
        }

        // Subscription cancelled
        case 'customer.subscription.deleted': {
          const sub   = event.data.object as Record<string, unknown>;
          const subId = sub.id as string;
          if (subId) {
            await db.update(organisations).set({
              planStatus: 'cancelled', modifiedOn: new Date(),
            }).where(eq(organisations.stripeSubscriptionId, subId));
          }
          break;
        }

        default:
          console.log('[WEBHOOK] Unhandled event type:', event.type);
      }

      return res.json({ received: true });
    } catch (err) {
      console.error('[WEBHOOK] Processing error:', err);
      return res.status(500).json({ message: 'Webhook processing failed' });
    }
  }
);

export default router;
