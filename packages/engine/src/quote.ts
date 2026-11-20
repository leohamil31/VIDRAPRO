import { ENGINE_VERSION, FINISHES, GLASSES } from './catalog';
import { generateCuttingList } from './cutting';
import { findLine } from './lines';
import { priceCuttingList, quoteTotals } from './pricing';
import { TYPOLOGIES } from './typologies';
import type { ItemInput, LineDefinition, PriceTable, PricingSettings, QuoteItemResult } from './types';

/** Customer-facing one-liner. */
export function describeItem(i: ItemInput, customLines: LineDefinition[] = []): string {
  const t = TYPOLOGIES[i.typology];
  const line = findLine(i.line, customLines);
  const parts = [t.label];
  if (line && line.family !== 'TEMPERADO') parts.push(line.name.replace(/ \(.*\)$/, ''));
  parts.push(t.depth && i.depthMm ? `${i.widthMm} × ${i.depthMm} × ${i.heightMm} mm` : `${i.widthMm} × ${i.heightMm} mm`);
  parts.push(`Alumínio ${FINISHES[i.finish].label}`);
  if (i.glassCode !== 'SEM_VIDRO') parts.push(`Vidro ${GLASSES[i.glassCode].label}`);
  return parts.join(' – ');
}

/** Cutting list + price for one quote line. */
export function calculateItem(input: ItemInput, prices: PriceTable, settings: PricingSettings, customLines: LineDefinition[] = []): QuoteItemResult {
  const cutting = generateCuttingList(input, customLines);
  const pricing = priceCuttingList(cutting, prices, settings);
  return { input, description: describeItem(input, customLines), cutting, pricing, engineVersion: ENGINE_VERSION };
}

export function calculateQuote(inputs: ItemInput[], prices: PriceTable, settings: PricingSettings, discountPct = 0, customLines: LineDefinition[] = []) {
  const items = inputs.map((i) => calculateItem(i, prices, settings, customLines));
  return { items, totals: quoteTotals(items.map((r) => r.pricing), discountPct) };
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * WhatsApp message for the END CUSTOMER. The internal quote number is
 * deliberately NOT included — it stays in the company panel only.
 */
export function buildWhatsAppMessage(opts: {
  companyName: string;
  customerName: string;
  items: { description: string; quantity: number; totalPrice: number; locationLabel?: string | null }[];
  total: number;
  discountValue?: number;
  validUntil?: string | null;
  publicUrl?: string;
}): string {
  const lines = [
    `Olá, ${opts.customerName.split(' ')[0]}! 👋`,
    `Segue o seu orçamento da *${opts.companyName}*:`,
    '',
    ...opts.items.map((it, idx) =>
      `${idx + 1}. ${it.quantity}× ${it.description}${it.locationLabel ? ` (${it.locationLabel})` : ''} — ${brl(it.totalPrice)}`),
    '',
    ...(opts.discountValue ? [`Desconto: -${brl(opts.discountValue)}`] : []),
    `*Total: ${brl(opts.total)}*`,
    ...(opts.validUntil ? [`Válido até ${new Date(opts.validUntil + 'T12:00:00').toLocaleDateString('pt-BR')}.`] : []),
    ...(opts.publicUrl ? ['', `Orçamento completo: ${opts.publicUrl}`] : []),
  ];
  return lines.join('\n');
}

export function waMeLink(phoneDigits: string | null | undefined, message: string): string {
  const phone = (phoneDigits ?? '').replace(/\D/g, '');
  const normalized = phone && phone.length <= 11 ? `55${phone}` : phone;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
