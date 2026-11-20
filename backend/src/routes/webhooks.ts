import { createHmac, timingSafeEqual } from 'node:crypto';
import express, { Router } from 'express';
import { z } from 'zod';
import { withAdminTx } from '../db';
import { env } from '../env';
import { ah, HttpError } from '../lib/http';
import { invalidateAuthCache } from '../middleware/auth';

/**
 * Provider-agnostic billing webhook.
 *
 * Expected (normalized) payload — write a 10-line adapter per provider
 * (Stripe `customer.subscription.updated`, Asaas `PAYMENT_OVERDUE`, Pagar.me…):
 *   {
 *     "id": "evt_123",                       // idempotency key
 *     "provider": "stripe",
 *     "type": "subscription.activated" | "invoice.paid" | "invoice.payment_failed" | "subscription.canceled",
 *     "data": { "tenant_id"?: uuid, "customer_id": "cus_…", "subscription_id"?: "sub_…", "current_period_end"?: ISO }
 *   }
 * Signature: header `X-Signature: sha256=<hex HMAC of raw body with BILLING_WEBHOOK_SECRET>`.
 */
export const webhooksRouter = Router();

const eventSchema = z.object({
  id: z.string().min(3),
  provider: z.string().default('generic'),
  type: z.enum(['subscription.activated', 'invoice.paid', 'invoice.payment_failed', 'subscription.canceled']),
  data: z.object({
    tenant_id: z.string().uuid().optional(),
    customer_id: z.string().optional(),
    subscription_id: z.string().optional(),
    current_period_end: z.string().datetime().optional(),
  }),
});

const STATUS_BY_EVENT = {
  'subscription.activated': 'active',
  'invoice.paid': 'active',
  'invoice.payment_failed': 'past_due',
  'subscription.canceled': 'canceled',
} as const;

function verifySignature(raw: Buffer, header: string | undefined) {
  if (!header?.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', env.BILLING_WEBHOOK_SECRET).update(raw).digest();
  const given = Buffer.from(header.slice(7), 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

webhooksRouter.post('/billing', express.raw({ type: 'application/json', limit: '256kb' }), ah(async (req, res) => {
  const raw = req.body as Buffer;
  if (!verifySignature(raw, req.header('x-signature'))) throw new HttpError(401, 'Assinatura inválida.');
  const evt = eventSchema.parse(JSON.parse(raw.toString('utf8')));

  const result = await withAdminTx(async (db) => {
    const ins = await db.query(
      `INSERT INTO billing_events (id, provider, type, payload) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
      [evt.id, evt.provider, evt.type, JSON.stringify(evt)]);
    if (!ins.rowCount) return { duplicate: true as const };

    const { rows: [t] } = await db.query(
      `UPDATE tenants
          SET subscription_status = $1,
              billing_provider = $2,
              billing_customer_id = coalesce($4, billing_customer_id),
              billing_subscription_id = coalesce($5, billing_subscription_id),
              current_period_end = coalesce($6::timestamptz, current_period_end)
        WHERE ($3::uuid IS NOT NULL AND id = $3) OR ($3::uuid IS NULL AND billing_customer_id = $4)
        RETURNING id`,
      [STATUS_BY_EVENT[evt.type], evt.provider, evt.data.tenant_id ?? null, evt.data.customer_id ?? null,
        evt.data.subscription_id ?? null, evt.data.current_period_end ?? null]);
    if (t) await db.query(`UPDATE billing_events SET tenant_id = $1 WHERE id = $2`, [t.id, evt.id]);
    return { duplicate: false as const, tenantId: t?.id as string | undefined };
  });

  if (!result.duplicate && result.tenantId) invalidateAuthCache(result.tenantId);
  // Always 200 for valid signatures so the provider doesn't retry forever on unknown customers.
  res.json({ received: true, duplicate: result.duplicate, matched: !result.duplicate && Boolean(result.tenantId) });
}));
