/**
 * Offline demo backend. Mirrors the HTTP API using the same engine and
 * persists to localStorage. Enabled when VITE_API_URL is not set.
 */
import {
  buildWhatsAppMessage, calculateItem, optimizeBars, quoteTotals, waMeLink,
  type CuttingList, type Finish, type PriceTable, type PricingSettings,
} from '@vidrapro/engine';
import type { Api } from './api';
import { href } from './router';
import { ApiError, sessionStore } from './session';
import type { MaterialPrice, QuoteDetail, QuoteInput, QuoteItemRow, QuoteRecord, QuoteSummary, Tenant } from './types';

interface DemoDB { tenant: Tenant; prices: MaterialPrice[]; quotes: { record: QuoteRecord; position: number; items: QuoteItemRow[] }[] }

const KEY = 'vidrapro.demo.v1';
let memory: DemoDB | null = null;

export const DEFAULT_PRICES: MaterialPrice[] = [
  ['aluminum', 'BRANCO', 'Alumínio Branco', 48], ['aluminum', 'PRETO', 'Alumínio Preto', 58],
  ['aluminum', 'NATURAL_FOSCO', 'Alumínio Natural Fosco', 44], ['aluminum', 'AMADEIRADO', 'Alumínio Amadeirado', 72],
  ['glass', 'COMUM_INCOLOR_4', 'Vidro Comum Incolor 4mm', 95], ['glass', 'COMUM_MINIBOREAL_4', 'Vidro Comum Mini Boreal 4mm', 120],
  ['glass', 'TEMPERADO_INCOLOR_6', 'Temperado Incolor 6mm', 160], ['glass', 'TEMPERADO_INCOLOR_8', 'Temperado Incolor 8mm', 210],
  ['glass', 'TEMPERADO_FUME_8', 'Temperado Fumê 8mm', 260], ['glass', 'TEMPERADO_VERDE_8', 'Temperado Verde 8mm', 250],
  ['glass', 'TEMPERADO_INCOLOR_10', 'Temperado Incolor 10mm', 280],
  ['accessory', 'KIT_JANELA_2F', 'Kit Janela Correr 2F (roldanas, fecho, escovas)', 45],
  ['accessory', 'KIT_JANELA_4F', 'Kit Janela Correr 4F', 80],
  ['accessory', 'KIT_PORTA_CORRER_2F', 'Kit Porta Correr 2F (roldanas, fechadura)', 140],
  ['accessory', 'KIT_BOX_2F', 'Kit Box Frontal 2 Folhas', 180], ['accessory', 'KIT_BOX_4F', 'Kit Box Frontal 4 Folhas', 290],
  ['accessory', 'KIT_PIVOTANTE', 'Kit Pivotante (pivôs, puxador, fechadura)', 420],
].map(([category, key, label, price]) => ({
  category, key, label, price, active: true,
  unit: category === 'aluminum' ? 'kg' : category === 'glass' ? 'm2' : 'un',
}) as MaterialPrice);

export function toPriceTable(prices: MaterialPrice[]): PriceTable {
  const t: PriceTable = { aluminumPerKg: {}, glassPerM2: {}, accessories: {} };
  for (const p of prices.filter((x) => x.active)) {
    if (p.category === 'aluminum') (t.aluminumPerKg as Record<string, number>)[p.key] = p.price;
    else if (p.category === 'glass') (t.glassPerM2 as Record<string, number>)[p.key] = p.price;
    else t.accessories[p.key] = p.price;
  }
  return t;
}

const settingsOf = (t: Tenant, margin?: number): PricingSettings => ({
  marginPct: margin ?? t.default_margin_pct, aluminumLossPct: t.aluminum_loss_pct, glassRoundMm: t.glass_round_mm,
  glassMinAreaM2: t.glass_min_area_m2, laborPct: t.labor_pct, installationPerItem: t.installation_per_item,
});

const uid = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'[b % 64]).join('');
const addDays = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

function save(db: DemoDB) {
  memory = db;
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* quota / private mode: keep in memory */ }
}

function load(): DemoDB {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return (memory = JSON.parse(raw));
  } catch { /* ignore */ }
  return seed();
}

function build(db: DemoDB, input: QuoteInput) {
  const table = toPriceTable(db.prices);
  const settings = settingsOf(db.tenant, input.marginPct);
  const results = input.items.map(({ locationLabel, ...i }) => ({ locationLabel: locationLabel ?? null, r: calculateItem(i, table, settings) }));
  const missing = [...new Set(results.flatMap((x) => x.r.pricing.missingPrices))];
  if (missing.length) throw new ApiError(422, `Cadastre os preços: ${missing.join(', ')}.`, 'MISSING_PRICES', missing);
  const totals = quoteTotals(results.map((x) => x.r.pricing), input.discountPct);
  const items: QuoteItemRow[] = results.map(({ locationLabel, r }, position) => ({
    id: uid(), position, typology: r.input.typology, line: r.input.line, location_label: locationLabel,
    width_mm: r.input.widthMm, height_mm: r.input.heightMm, finish: r.input.finish, glass_code: r.input.glassCode,
    quantity: r.input.quantity, unit_cost: r.pricing.unitCost, unit_price: r.pricing.unitPrice,
    total_price: r.pricing.totalPrice, description: r.description, price_breakdown: r.pricing, cutting_list: r.cutting,
  }));
  return { items, totals, settings };
}

function seed(): DemoDB {
  const db: DemoDB = {
    tenant: {
      id: uid(), name: 'Vidraçaria Cristal Azul', document: '12.345.678/0001-90', logo_url: null,
      whatsapp: '5511987654321', email: 'contato@cristalazul.com.br', address: 'Av. das Esquadrias, 1200 – São Paulo/SP',
      default_margin_pct: 60, aluminum_loss_pct: 8, glass_round_mm: 50, glass_min_area_m2: 0.25, labor_pct: 0,
      installation_per_item: 0, quote_validity_days: 10,
      quote_footer_notes: 'Prazo de entrega: 15 dias úteis após aprovação. Pagamento: 50% na aprovação + 50% na instalação. Medidas sujeitas a conferência no local.',
      subscription_status: 'trial', trial_ends_at: new Date(Date.now() + 12 * 864e5).toISOString(),
    },
    prices: DEFAULT_PRICES.map((p) => ({ ...p, id: uid() })),
    quotes: [],
  };
  const samples: [string, string, QuoteRecord['status'], QuoteInput['items']][] = [
    ['Mariana Albuquerque', '11991234567', 'rascunho', [
      { typology: 'BOX_FRONTAL', line: 'TEMPERADO', widthMm: 1200, heightMm: 1900, finish: 'PRETO', glassCode: 'TEMPERADO_INCOLOR_8', quantity: 1, locationLabel: 'Banheiro suíte' }]],
    ['Construtora Horizonte', '11930001122', 'enviado', [
      { typology: 'JANELA_CORRER_2F', line: 'SUPREMA', widthMm: 1200, heightMm: 1000, finish: 'BRANCO', glassCode: 'COMUM_INCOLOR_4', quantity: 8, locationLabel: 'Quartos' },
      { typology: 'JANELA_CORRER_4F', line: 'SUPREMA', widthMm: 2000, heightMm: 1200, finish: 'BRANCO', glassCode: 'COMUM_INCOLOR_4', quantity: 4, locationLabel: 'Salas' }]],
    ['Ricardo Menezes', '21998887766', 'enviado', [
      { typology: 'PORTA_CORRER_2F', line: 'GOLD', widthMm: 1800, heightMm: 2150, finish: 'PRETO', glassCode: 'TEMPERADO_INCOLOR_8', quantity: 1, locationLabel: 'Varanda' }]],
    ['Clínica Bem Estar', '11955554444', 'aprovado', [
      { typology: 'PORTA_PIVOTANTE', line: 'TEMPERADO', widthMm: 1000, heightMm: 2200, finish: 'NATURAL_FOSCO', glassCode: 'TEMPERADO_INCOLOR_10', quantity: 1, locationLabel: 'Recepção' }]],
    ['Juliana Prado', '11977776666', 'em_producao', [
      { typology: 'JANELA_CORRER_2F', line: 'SUPREMA', widthMm: 1500, heightMm: 1200, finish: 'AMADEIRADO', glassCode: 'TEMPERADO_INCOLOR_6', quantity: 3, locationLabel: 'Quartos' },
      { typology: 'BOX_FRONTAL', line: 'TEMPERADO', widthMm: 1600, heightMm: 1900, finish: 'BRANCO', glassCode: 'TEMPERADO_FUME_8', quantity: 1, locationLabel: 'Banheiro social' }]],
    ['Paulo Sérgio Lima', '11966665555', 'concluido', [
      { typology: 'JANELA_CORRER_2F', line: 'SUPREMA', widthMm: 1000, heightMm: 600, finish: 'BRANCO', glassCode: 'COMUM_MINIBOREAL_4', quantity: 2, locationLabel: 'Banheiros' }]],
  ];
  samples.forEach(([name, phone, status, items], i) => {
    const { items: rows, totals, settings } = build(db, { customerName: name, discountPct: i === 1 ? 5 : 0, items });
    db.quotes.push({
      position: i,
      items: rows,
      record: {
        id: uid(), number: i + 1, customer_name: name, customer_phone: phone, customer_address: null, status,
        margin_pct: settings.marginPct, discount_pct: totals.discountPct, subtotal: totals.subtotal,
        discount_value: totals.discountValue, total: totals.total, total_cost: totals.totalCost, notes: null,
        valid_until: addDays(10 - i), public_token: token(), created_at: new Date(Date.now() - (6 - i) * 864e5).toISOString(),
      },
    });
  });
  save(db);
  return db;
}

const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 120));

export function createDemoApi(): Api {
  const find = (id: string) => {
    const q = load().quotes.find((x) => x.record.id === id);
    if (!q) throw new ApiError(404, 'Orçamento não encontrado.');
    return q;
  };
  const brand = (t: Tenant) => ({ name: t.name, logo_url: t.logo_url, whatsapp: t.whatsapp, email: t.email, address: t.address, document: t.document, quote_footer_notes: t.quote_footer_notes });

  return {
    mode: 'demo',
    async login(email) {
      const s = { token: 'demo', user: { id: 'demo', name: 'Carlos (Demo)', email, role: 'owner' as const } };
      sessionStore.set(s); return delay(s);
    },
    async signup(d) {
      const db = load(); db.tenant.name = d.companyName; if (d.whatsapp) db.tenant.whatsapp = d.whatsapp; save(db);
      const s = { token: 'demo', user: { id: 'demo', name: d.name, email: d.email, role: 'owner' as const } };
      sessionStore.set(s); return delay(s);
    },
    settings: async () => { const db = load(); return delay({ tenant: db.tenant, prices: db.prices }); },
    async updateSettings(patch) { const db = load(); db.tenant = { ...db.tenant, ...patch }; save(db); return delay({ tenant: db.tenant }); },
    async updatePrices(prices) {
      const db = load();
      for (const p of prices) {
        const cur = db.prices.find((x) => x.category === p.category && x.key === p.key);
        if (cur) Object.assign(cur, p); else db.prices.push({ ...p, id: uid() });
      }
      save(db); return delay({ prices: db.prices });
    },
    async uploadLogo(dataUrl) { const db = load(); db.tenant.logo_url = dataUrl; save(db); return delay({ logo_url: dataUrl }); },
    pricingContext: async () => { const db = load(); return delay({ prices: toPriceTable(db.prices), settings: settingsOf(db.tenant) }); },
    async listQuotes(p) {
      const s = p?.search?.toLowerCase();
      const quotes: QuoteSummary[] = load().quotes
        .filter((q) => !s || q.record.customer_name.toLowerCase().includes(s) || String(q.record.number) === s)
        .map((q) => ({
          id: q.record.id, number: q.record.number, customer_name: q.record.customer_name, customer_phone: q.record.customer_phone,
          status: q.record.status, kanban_position: q.position, total: q.record.total, created_at: q.record.created_at,
          valid_until: q.record.valid_until, item_count: q.items.length,
          typologies: [...new Set(q.items.map((i) => i.typology))].join(','),
        }))
        .sort((a, b) => a.kanban_position - b.kanban_position);
      return delay({ quotes });
    },
    async stats() {
      const qs = load().quotes.map((q) => q.record);
      const sent = qs.filter((q) => q.status !== 'rascunho');
      const won = qs.filter((q) => ['aprovado', 'em_producao', 'concluido'].includes(q.status));
      return delay({
        quotes_month: qs.length,
        pipeline_value: qs.filter((q) => q.status === 'enviado').reduce((s, q) => s + q.total, 0),
        approved_month: won.reduce((s, q) => s + q.total, 0),
        in_production: qs.filter((q) => q.status === 'em_producao').length,
        conversion_pct: sent.length ? Math.round((won.length / sent.length) * 1000) / 10 : null,
      });
    },
    async getQuote(id) {
      const q = find(id);
      return delay<QuoteDetail>({ quote: q.record, items: q.items, tenant: brand(load().tenant) });
    },
    async createQuote(input) {
      const db = load();
      const { items, totals, settings } = build(db, input);
      const number = Math.max(0, ...db.quotes.map((q) => q.record.number)) + 1;
      const record: QuoteRecord = {
        id: uid(), number, customer_name: input.customerName, customer_phone: input.customerPhone ?? null,
        customer_address: input.customerAddress ?? null, status: 'rascunho', margin_pct: settings.marginPct,
        discount_pct: totals.discountPct, subtotal: totals.subtotal, discount_value: totals.discountValue, total: totals.total,
        total_cost: totals.totalCost, notes: input.notes ?? null, valid_until: addDays(db.tenant.quote_validity_days),
        public_token: token(), created_at: new Date().toISOString(),
      };
      db.quotes.push({ record, items, position: -Date.now() });
      save(db); return delay({ id: record.id, number });
    },
    async updateQuote(id, input) {
      const db = load(); const q = db.quotes.find((x) => x.record.id === id);
      if (!q) throw new ApiError(404, 'Orçamento não encontrado.');
      if (!['rascunho', 'enviado'].includes(q.record.status)) throw new ApiError(409, 'Orçamentos aprovados não podem ser editados.');
      const { items, totals, settings } = build(db, input);
      Object.assign(q.record, {
        customer_name: input.customerName, customer_phone: input.customerPhone ?? null, customer_address: input.customerAddress ?? null,
        margin_pct: settings.marginPct, discount_pct: totals.discountPct, subtotal: totals.subtotal,
        discount_value: totals.discountValue, total: totals.total, total_cost: totals.totalCost, notes: input.notes ?? null,
      });
      q.items = items; save(db); return delay({ id });
    },
    async setStatus(id, status, position) {
      const db = load(); const q = db.quotes.find((x) => x.record.id === id);
      if (q) { q.record.status = status; q.position = position ?? Date.now(); save(db); }
      return delay({ ok: true });
    },
    async deleteQuote(id) { const db = load(); db.quotes = db.quotes.filter((q) => q.record.id !== id); save(db); await delay(null); },
    async share(id) {
      const db = load(); const q = db.quotes.find((x) => x.record.id === id);
      if (!q) throw new ApiError(404, 'Orçamento não encontrado.');
      if (q.record.status === 'rascunho') q.record.status = 'enviado';
      save(db);
      const publicUrl = `${location.origin}${href(`/p/${q.record.public_token}`)}`;
      const message = buildWhatsAppMessage({
        companyName: db.tenant.name, customerName: q.record.customer_name, quoteNumber: q.record.number,
        items: q.items.map((i) => ({ description: i.description, quantity: i.quantity, totalPrice: i.total_price, locationLabel: i.location_label })),
        total: q.record.total, discountValue: q.record.discount_value, validUntil: q.record.valid_until, publicUrl,
      });
      return delay({ url: waMeLink(q.record.customer_phone, message), message, publicUrl });
    },
    async cuttingList(id) {
      const q = find(id);
      const lists = q.items.map((i) => i.cutting_list as CuttingList);
      const finishes = [...new Set(lists.map((l) => l.input.finish))] as Finish[];
      return delay({
        quote: { id, number: q.record.number, customer_name: q.record.customer_name, status: q.record.status },
        items: q.items.map((i) => ({ location_label: i.location_label, description: i.description, quantity: i.quantity, cutting: i.cutting_list })),
        bars: finishes.map((f) => ({ finish: f, plans: optimizeBars(lists.filter((l) => l.input.finish === f)) })),
      });
    },
    async publicQuote(tok) {
      const db = load(); const q = db.quotes.find((x) => x.record.public_token === tok);
      if (!q) throw new ApiError(404, 'Orçamento não encontrado.');
      const r = q.record;
      return delay({
        quote: { number: r.number, customer_name: r.customer_name, status: r.status, subtotal: r.subtotal, discount_pct: r.discount_pct, discount_value: r.discount_value, total: r.total, notes: r.notes, valid_until: r.valid_until, created_at: r.created_at },
        tenant: { ...brand(db.tenant), footer: db.tenant.quote_footer_notes },
        items: q.items.map(({ description, location_label, typology, width_mm, height_mm, quantity, unit_price, total_price, finish, glass_code, line }) =>
          ({ description, location_label, typology, width_mm, height_mm, quantity, unit_price, total_price, finish, glass_code, line })),
      });
    },
  };
}

export const resetDemo = () => { memory = null; try { localStorage.removeItem(KEY); } catch { /* ignore */ } };
