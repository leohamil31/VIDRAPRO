import { Router } from 'express';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import {
  buildWhatsAppMessage, calculateItem, optimizeBars, quoteTotals, waMeLink,
  type CuttingList, type ItemInput,
} from '@vidrapro/engine';
import { withTenant } from '../db';
import { env } from '../env';
import { ah, HttpError } from '../lib/http';
import { loadPricingContext } from '../lib/pricing';
import { requireRole } from '../middleware/auth';

export const quotesRouter = Router();

const STATUSES = ['rascunho', 'enviado', 'aprovado', 'em_producao', 'concluido', 'perdido'] as const;

const itemSchema = z.object({
  typology: z.enum(['JANELA_CORRER_2F', 'JANELA_CORRER_4F', 'PORTA_CORRER_2F', 'BOX_FRONTAL', 'PORTA_PIVOTANTE']),
  line: z.enum(['SUPREMA', 'GOLD', 'TEMPERADO']),
  widthMm: z.number().int(),
  heightMm: z.number().int(),
  finish: z.enum(['BRANCO', 'PRETO', 'NATURAL_FOSCO', 'AMADEIRADO']),
  glassCode: z.enum(['COMUM_INCOLOR_4', 'COMUM_MINIBOREAL_4', 'TEMPERADO_INCOLOR_6', 'TEMPERADO_INCOLOR_8',
    'TEMPERADO_FUME_8', 'TEMPERADO_VERDE_8', 'TEMPERADO_INCOLOR_10']),
  quantity: z.number().int(),
  locationLabel: z.string().trim().max(80).optional().nullable(),
});

const quoteSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().max(20).optional().nullable(),
  customerAddress: z.string().trim().max(300).optional().nullable(),
  marginPct: z.number().min(0).max(500).optional(),
  discountPct: z.number().min(0).max(100).default(0),
  notes: z.string().max(2000).optional().nullable(),
  items: z.array(itemSchema).min(1).max(100),
});

/** Server-side authoritative calculation — the client preview is never trusted. */
async function computeQuote(db: PoolClient, body: z.infer<typeof quoteSchema>) {
  const ctx = await loadPricingContext(db, body.marginPct);
  const results = body.items.map((raw) => {
    const { locationLabel, ...input } = raw;
    return { locationLabel: locationLabel ?? null, result: calculateItem(input as ItemInput, ctx.table, ctx.settings) };
  });
  const missing = [...new Set(results.flatMap((r) => r.result.pricing.missingPrices))];
  if (missing.length) throw new HttpError(422, `Cadastre os preços: ${missing.join(', ')}.`, 'MISSING_PRICES', missing);
  const totals = quoteTotals(results.map((r) => r.result.pricing), body.discountPct);
  return { ctx, results, totals };
}

async function insertItems(db: PoolClient, quoteId: string, results: Awaited<ReturnType<typeof computeQuote>>['results']) {
  for (const [pos, { locationLabel, result: r }] of results.entries()) {
    await db.query(
      `INSERT INTO quote_items (tenant_id, quote_id, position, typology, line, location_label, width_mm, height_mm,
         finish, glass_code, quantity, unit_cost, unit_price, total_price, description, price_breakdown, cutting_list, engine_version)
       VALUES (current_tenant_id(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [quoteId, pos, r.input.typology, r.input.line, locationLabel, r.input.widthMm, r.input.heightMm, r.input.finish,
        r.input.glassCode, r.input.quantity, r.pricing.unitCost, r.pricing.unitPrice, r.pricing.totalPrice, r.description,
        JSON.stringify(r.pricing), JSON.stringify(r.cutting), r.engineVersion]);
  }
}

// ---------------------------------------------------------------------------
// Live preview (optional — the frontend also runs the engine locally)
// ---------------------------------------------------------------------------
quotesRouter.post('/preview', ah(async (req, res) => {
  const a = req.auth!;
  const body = quoteSchema.extend({ customerName: z.string().default('Prévia') }).parse(req.body);
  const out = await withTenant(a.tid, a.sub, (db) => computeQuote(db, body));
  res.json({ items: out.results.map((r) => r.result), totals: out.totals });
}));

// ---------------------------------------------------------------------------
// Pricing context for the client-side engine (prices + settings)
// ---------------------------------------------------------------------------
quotesRouter.get('/pricing-context', ah(async (req, res) => {
  const a = req.auth!;
  const ctx = await withTenant(a.tid, a.sub, (db) => loadPricingContext(db));
  res.json({ prices: ctx.table, settings: ctx.settings });
}));

// ---------------------------------------------------------------------------
// List (kanban)
// ---------------------------------------------------------------------------
quotesRouter.get('/', ah(async (req, res) => {
  const a = req.auth!;
  const q = z.object({ status: z.enum(STATUSES).optional(), search: z.string().max(80).optional() }).parse(req.query);
  const rows = await withTenant(a.tid, a.sub, async (db) => (await db.query(
    `SELECT q.id, q.number, q.customer_name, q.customer_phone, q.status, q.kanban_position,
            q.total::float AS total, q.created_at, q.updated_at, q.valid_until,
            (SELECT count(*)::int FROM quote_items i WHERE i.quote_id = q.id) AS item_count,
            (SELECT string_agg(DISTINCT i.typology::text, ',') FROM quote_items i WHERE i.quote_id = q.id) AS typologies
       FROM quotes q
      WHERE ($1::quote_status IS NULL OR q.status = $1)
        AND ($2::text IS NULL OR q.customer_name ILIKE '%' || $2 || '%' OR q.number::text = $2)
      ORDER BY q.status, q.kanban_position, q.created_at DESC
      LIMIT 500`, [q.status ?? null, q.search ?? null])).rows);
  res.json({ quotes: rows });
}));

// Dashboard KPIs
quotesRouter.get('/stats', ah(async (req, res) => {
  const a = req.auth!;
  const stats = await withTenant(a.tid, a.sub, async (db) => (await db.query(
    `SELECT
       count(*) FILTER (WHERE created_at >= date_trunc('month', now()))::int                          AS quotes_month,
       coalesce(sum(total) FILTER (WHERE status IN ('enviado'))::float, 0)                             AS pipeline_value,
       coalesce(sum(total) FILTER (WHERE approved_at >= date_trunc('month', now()))::float, 0)         AS approved_month,
       count(*) FILTER (WHERE status = 'em_producao')::int                                             AS in_production,
       round(100.0 * count(*) FILTER (WHERE status IN ('aprovado','em_producao','concluido'))
             / nullif(count(*) FILTER (WHERE status <> 'rascunho'), 0), 1)::float                      AS conversion_pct
     FROM quotes`)).rows[0]);
  res.json(stats);
}));

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------
quotesRouter.post('/', ah(async (req, res) => {
  const a = req.auth!;
  const body = quoteSchema.parse(req.body);
  const quote = await withTenant(a.tid, a.sub, async (db) => {
    const { ctx, results, totals } = await computeQuote(db, body);
    const { rows: [q] } = await db.query(
      `INSERT INTO quotes (tenant_id, customer_name, customer_phone, customer_address, margin_pct, discount_pct,
         subtotal, discount_value, total, total_cost, notes, valid_until, created_by)
       VALUES (current_tenant_id(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, current_date + $11::int, $12)
       RETURNING id, number, public_token`,
      [body.customerName, body.customerPhone ?? null, body.customerAddress ?? null, ctx.settings.marginPct,
        totals.discountPct, totals.subtotal, totals.discountValue, totals.total, totals.totalCost, body.notes ?? null,
        ctx.tenant.quote_validity_days, a.sub]);
    await insertItems(db, q.id, results);
    return { ...q, totals };
  });
  res.status(201).json(quote);
}));

quotesRouter.get('/:id', ah(async (req, res) => {
  const a = req.auth!;
  const id = z.string().uuid().parse(req.params.id);
  const data = await withTenant(a.tid, a.sub, async (db) => {
    const { rows: [quote] } = await db.query(
      `SELECT q.*, q.subtotal::float AS subtotal, q.discount_value::float AS discount_value, q.total::float AS total,
              q.total_cost::float AS total_cost, q.margin_pct::float AS margin_pct, q.discount_pct::float AS discount_pct
         FROM quotes q WHERE q.id = $1`, [id]);
    if (!quote) throw new HttpError(404, 'Orçamento não encontrado.');
    const { rows: items } = await db.query(
      `SELECT id, position, typology, line, location_label, width_mm, height_mm, finish, glass_code, quantity,
              unit_cost::float AS unit_cost, unit_price::float AS unit_price, total_price::float AS total_price,
              description, price_breakdown, cutting_list, engine_version
         FROM quote_items WHERE quote_id = $1 ORDER BY position`, [id]);
    const { rows: [tenant] } = await db.query(
      `SELECT name, logo_url, whatsapp, email, address, document, quote_footer_notes FROM tenants WHERE id = current_tenant_id()`);
    return { quote, items, tenant };
  });
  // Workshop users don't see money
  if (a.role === 'workshop') {
    data.quote.total_cost = undefined;
    for (const i of data.items) { i.price_breakdown = undefined; i.unit_cost = undefined; }
  }
  res.json(data);
}));

quotesRouter.put('/:id', requireRole('owner', 'admin', 'seller'), ah(async (req, res) => {
  const a = req.auth!;
  const id = z.string().uuid().parse(req.params.id);
  const body = quoteSchema.parse(req.body);
  const out = await withTenant(a.tid, a.sub, async (db) => {
    const { rows: [cur] } = await db.query(`SELECT status FROM quotes WHERE id = $1 FOR UPDATE`, [id]);
    if (!cur) throw new HttpError(404, 'Orçamento não encontrado.');
    if (!['rascunho', 'enviado'].includes(cur.status)) {
      throw new HttpError(409, 'Orçamentos aprovados não podem ser editados. Duplique para criar uma revisão.');
    }
    const { ctx, results, totals } = await computeQuote(db, body);
    await db.query(
      `UPDATE quotes SET customer_name=$2, customer_phone=$3, customer_address=$4, margin_pct=$5, discount_pct=$6,
         subtotal=$7, discount_value=$8, total=$9, total_cost=$10, notes=$11 WHERE id=$1`,
      [id, body.customerName, body.customerPhone ?? null, body.customerAddress ?? null, ctx.settings.marginPct,
        totals.discountPct, totals.subtotal, totals.discountValue, totals.total, totals.totalCost, body.notes ?? null]);
    await db.query(`DELETE FROM quote_items WHERE quote_id = $1`, [id]);
    await insertItems(db, id, results);
    return { id, totals };
  });
  res.json(out);
}));

quotesRouter.patch('/:id/status', ah(async (req, res) => {
  const a = req.auth!;
  const id = z.string().uuid().parse(req.params.id);
  const { status, position } = z.object({ status: z.enum(STATUSES), position: z.number().optional() }).parse(req.body);
  // Workshop can only move production cards
  if (a.role === 'workshop' && !['em_producao', 'concluido'].includes(status)) {
    throw new HttpError(403, 'A oficina só pode mover para Em Produção / Concluído.');
  }
  const row = await withTenant(a.tid, a.sub, async (db) => (await db.query(
    `UPDATE quotes SET status = $2, kanban_position = coalesce($3, extract(epoch from now()))
      WHERE id = $1 RETURNING id, status, kanban_position`, [id, status, position ?? null])).rows[0]);
  if (!row) throw new HttpError(404, 'Orçamento não encontrado.');
  res.json(row);
}));

quotesRouter.delete('/:id', requireRole('owner', 'admin'), ah(async (req, res) => {
  const a = req.auth!;
  const id = z.string().uuid().parse(req.params.id);
  const n = await withTenant(a.tid, a.sub, async (db) => (await db.query(`DELETE FROM quotes WHERE id = $1`, [id])).rowCount);
  if (!n) throw new HttpError(404, 'Orçamento não encontrado.');
  res.status(204).end();
}));

// ---------------------------------------------------------------------------
// Workshop: consolidated cutting list + 6 m bar optimisation
// ---------------------------------------------------------------------------
quotesRouter.get('/:id/cutting-list', ah(async (req, res) => {
  const a = req.auth!;
  const id = z.string().uuid().parse(req.params.id);
  const data = await withTenant(a.tid, a.sub, async (db) => {
    const { rows: [quote] } = await db.query(`SELECT id, number, customer_name, status FROM quotes WHERE id = $1`, [id]);
    if (!quote) throw new HttpError(404, 'Orçamento não encontrado.');
    const { rows } = await db.query(
      `SELECT location_label, description, quantity, finish, cutting_list FROM quote_items WHERE quote_id = $1 ORDER BY position`, [id]);
    return { quote, rows };
  });
  const lists = data.rows.map((r) => r.cutting_list as CuttingList);
  res.json({
    quote: data.quote,
    items: data.rows.map((r) => ({ location_label: r.location_label, description: r.description, quantity: r.quantity, cutting: r.cutting_list })),
    // bars are grouped per finish: profiles of different colours never share a bar
    bars: Object.entries(groupBy(lists, (l) => l.input.finish)).map(([finish, ls]) => ({ finish, plans: optimizeBars(ls) })),
  });
}));

// ---------------------------------------------------------------------------
// WhatsApp share — marks as "enviado" and returns the wa.me link
// ---------------------------------------------------------------------------
quotesRouter.post('/:id/share', ah(async (req, res) => {
  const a = req.auth!;
  const id = z.string().uuid().parse(req.params.id);
  const out = await withTenant(a.tid, a.sub, async (db) => {
    const { rows: [q] } = await db.query(
      `UPDATE quotes SET status = CASE WHEN status = 'rascunho' THEN 'enviado'::quote_status ELSE status END
        WHERE id = $1 RETURNING number, customer_name, customer_phone, total::float AS total,
                                discount_value::float AS discount_value, valid_until::text, public_token`, [id]);
    if (!q) throw new HttpError(404, 'Orçamento não encontrado.');
    const { rows: items } = await db.query(
      `SELECT description, quantity, total_price::float AS "totalPrice", location_label AS "locationLabel"
         FROM quote_items WHERE quote_id = $1 ORDER BY position`, [id]);
    const { rows: [t] } = await db.query(`SELECT name FROM tenants WHERE id = current_tenant_id()`);
    return { q, items, companyName: t.name };
  });
  const publicUrl = `${env.APP_PUBLIC_URL}/p/${out.q.public_token}`;
  const message = buildWhatsAppMessage({
    companyName: out.companyName, customerName: out.q.customer_name, quoteNumber: out.q.number,
    items: out.items, total: out.q.total, discountValue: out.q.discount_value, validUntil: out.q.valid_until, publicUrl,
  });
  res.json({ url: waMeLink(out.q.customer_phone, message), message, publicUrl });
}));

function groupBy<T>(arr: T[], key: (t: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, x) => { (acc[key(x)] ??= []).push(x); return acc; }, {});
}
