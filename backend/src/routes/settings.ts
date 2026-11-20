import { Router } from 'express';
import { z } from 'zod';
import { ACCESSORIES, allLines, validateLineDefinition, type LineDefinition } from '@vidrapro/engine';
import { withTenant } from '../db';
import { env } from '../env';
import { ah, HttpError } from '../lib/http';
import { requireRole } from '../middleware/auth';

export const settingsRouter = Router();

const TENANT_FIELDS = `id, name, slug, document, logo_url, whatsapp, email, address, default_margin_pct,
  aluminum_loss_pct, glass_round_mm, glass_min_area_m2, labor_pct, installation_per_item,
  quote_validity_days, quote_footer_notes, subscription_status, trial_ends_at, current_period_end`;

settingsRouter.get('/', ah(async (req, res) => {
  const a = req.auth!;
  const data = await withTenant(a.tid, a.sub, async (db) => {
    const { rows: [tenant] } = await db.query(`SELECT ${TENANT_FIELDS} FROM tenants WHERE id = current_tenant_id()`);
    const { rows: prices } = await db.query(
      `SELECT id, category, key, label, unit, price::float AS price, active FROM material_prices ORDER BY category, label`);
    return { tenant, prices };
  });
  res.json(data);
}));

const tenantSchema = z.object({
  name: z.string().trim().min(2).max(120),
  document: z.string().trim().max(20).nullable(),
  whatsapp: z.string().regex(/^\d{10,13}$/, 'Somente dígitos com DDD, ex.: 5511999998888').nullable(),
  email: z.string().email().nullable(),
  address: z.string().max(300).nullable(),
  default_margin_pct: z.number().min(0).max(500),
  aluminum_loss_pct: z.number().min(0).max(50),
  glass_round_mm: z.union([z.literal(1), z.literal(10), z.literal(50), z.literal(100)]),
  glass_min_area_m2: z.number().min(0).max(2),
  labor_pct: z.number().min(0).max(200),
  installation_per_item: z.number().min(0).max(100000),
  quote_validity_days: z.number().int().min(1).max(180),
  quote_footer_notes: z.string().max(2000).nullable(),
}).partial();

settingsRouter.put('/', requireRole('owner', 'admin'), ah(async (req, res) => {
  const a = req.auth!;
  const patch = tenantSchema.parse(req.body);
  const keys = Object.keys(patch) as (keyof typeof patch)[];
  if (!keys.length) throw new HttpError(400, 'Nada para atualizar.');
  // Column names come from the zod whitelist above, never from user input.
  const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const tenant = await withTenant(a.tid, a.sub, async (db) =>
    (await db.query(`UPDATE tenants SET ${sets} WHERE id = current_tenant_id() RETURNING ${TENANT_FIELDS}`,
      keys.map((k) => patch[k]))).rows[0]);
  res.json({ tenant });
}));

const pricesSchema = z.array(z.object({
  category: z.enum(['aluminum', 'glass', 'accessory']),
  key: z.string().regex(/^[A-Z0-9_]{2,60}$/),
  label: z.string().trim().min(2).max(120),
  price: z.number().min(0).max(1_000_000),
  active: z.boolean().default(true),
  unit: z.enum(['kg', 'm2', 'un', 'm']).optional(),
})).max(300);

settingsRouter.put('/prices', requireRole('owner', 'admin'), ah(async (req, res) => {
  const a = req.auth!;
  const items = pricesSchema.parse(req.body);
  const unitFor = (p: (typeof items)[number]) =>
    p.category === 'aluminum' ? 'kg' : p.category === 'glass' ? 'm2' : (ACCESSORIES[p.key as keyof typeof ACCESSORIES]?.unit ?? p.unit ?? 'un');
  const prices = await withTenant(a.tid, a.sub, async (db) => {
    for (const p of items) {
      await db.query(
        `INSERT INTO material_prices (tenant_id, category, key, label, unit, price, active)
         VALUES (current_tenant_id(), $1, $2, $3, $4, $5, $6)
         ON CONFLICT (tenant_id, category, key)
         DO UPDATE SET label = EXCLUDED.label, price = EXCLUDED.price, active = EXCLUDED.active`,
        [p.category, p.key, p.label, unitFor(p), p.price, p.active]);
    }
    return (await db.query(
      `SELECT id, category, key, label, unit, price::float AS price, active FROM material_prices ORDER BY category, label`)).rows;
  });
  res.json({ prices });
}));

/**
 * Logo upload. Body: { dataUrl: "data:image/png;base64,..." } (≤ 600 KB).
 * Uploads to Supabase Storage when configured; otherwise stores the data URL (dev only).
 */
settingsRouter.post('/logo', requireRole('owner', 'admin'), ah(async (req, res) => {
  const a = req.auth!;
  const { dataUrl } = z.object({ dataUrl: z.string().max(820_000) }).parse(req.body);
  const m = /^data:(image\/(png|jpeg|webp|svg\+xml));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw new HttpError(400, 'Envie PNG, JPG, WEBP ou SVG.');
  const [, mime, ext, b64] = m;
  const bytes = Buffer.from(b64, 'base64');
  if (bytes.length > 600_000) throw new HttpError(413, 'Logo deve ter no máximo 600 KB.');

  let url = dataUrl;
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    const path = `${a.tid}/logo-${Date.now()}.${ext === 'svg+xml' ? 'svg' : ext}`;
    const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${env.LOGO_BUCKET}/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': mime, 'x-upsert': 'true' },
      body: bytes,
    });
    if (!r.ok) throw new HttpError(502, 'Falha ao enviar logo para o storage.');
    url = `${env.SUPABASE_URL}/storage/v1/object/public/${env.LOGO_BUCKET}/${path}`;
  } else if (env.NODE_ENV === 'production') {
    throw new HttpError(500, 'Storage não configurado.');
  }

  await withTenant(a.tid, a.sub, (db) => db.query(`UPDATE tenants SET logo_url = $1 WHERE id = current_tenant_id()`, [url]));
  res.json({ logo_url: url });
}));

// ---------------------------------------------------------------------------
// Aluminium lines: built-in (read-only, from the engine) + tenant custom lines
// ---------------------------------------------------------------------------
const lineSchema = z.object({
  id: z.string().regex(/^[A-Z0-9_]{2,40}$/),
  name: z.string().trim().min(2).max(80),
  family: z.enum(['ESQUADRIA', 'FACHADA', 'GUARDA_CORPO']),
  description: z.string().max(500).optional(),
  basedOn: z.string().max(40).optional(),
  profiles: z.record(z.object({ code: z.string().trim().min(1).max(30), name: z.string().trim().min(1).max(80), kgPerM: z.number().positive().max(20) })),
  params: z.record(z.record(z.number().min(0).max(5000))),
});

const rowToLine = (r: { key: string; name: string; family: LineDefinition['family']; definition: Partial<LineDefinition> }): LineDefinition => ({
  id: r.key, name: r.name, family: r.family, builtIn: false, description: r.definition.description,
  basedOn: r.definition.basedOn, profiles: r.definition.profiles ?? {}, params: r.definition.params ?? {},
});

settingsRouter.get('/lines', ah(async (req, res) => {
  const a = req.auth!;
  const custom = await withTenant(a.tid, a.sub, async (db) =>
    (await db.query(`SELECT key, name, family, definition FROM product_lines WHERE active ORDER BY name`)).rows.map(rowToLine));
  res.json({ lines: allLines(custom) });
}));

async function saveLine(tid: string, uid: string, body: unknown, expectedId?: string) {
  const line = lineSchema.parse(body) as LineDefinition;
  if (expectedId && line.id !== expectedId) throw new HttpError(400, 'O identificador da linha não pode mudar.');
  if (allLines().some((l) => l.builtIn && l.id === line.id)) throw new HttpError(409, 'Esse identificador é de uma linha padrão. Escolha outro.');
  const issues = validateLineDefinition(line);
  if (issues.length) throw new HttpError(422, issues.join(' '), 'LINE_INVALID', issues);
  const definition = { description: line.description, basedOn: line.basedOn, profiles: line.profiles, params: line.params };
  return withTenant(tid, uid, async (db) => {
    const { rows: [r] } = await db.query(
      `INSERT INTO product_lines (tenant_id, key, name, family, definition, active)
       VALUES (current_tenant_id(), $1, $2, $3, $4, true)
       ON CONFLICT (tenant_id, key) DO UPDATE SET name = EXCLUDED.name, family = EXCLUDED.family,
         definition = EXCLUDED.definition, active = true
       RETURNING key, name, family, definition`,
      [line.id, line.name, line.family, JSON.stringify(definition)]);
    return rowToLine(r);
  });
}

settingsRouter.post('/lines', requireRole('owner', 'admin'), ah(async (req, res) => {
  const a = req.auth!;
  res.status(201).json({ line: await saveLine(a.tid, a.sub, req.body) });
}));

settingsRouter.put('/lines/:id', requireRole('owner', 'admin'), ah(async (req, res) => {
  const a = req.auth!;
  res.json({ line: await saveLine(a.tid, a.sub, req.body, req.params.id) });
}));

/** Soft delete: old quotes keep their snapshot; the line just stops being offered. */
settingsRouter.delete('/lines/:id', requireRole('owner', 'admin'), ah(async (req, res) => {
  const a = req.auth!;
  const n = await withTenant(a.tid, a.sub, async (db) =>
    (await db.query(`UPDATE product_lines SET active = false WHERE key = $1`, [req.params.id])).rowCount);
  if (!n) throw new HttpError(404, 'Linha não encontrada.');
  res.status(204).end();
}));
