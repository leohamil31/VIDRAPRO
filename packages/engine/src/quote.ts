import { ENGINE_VERSION, FINISHES, GLASSES, LINE_LABEL, TYPOLOGIES } from './catalog';
import { generateCuttingList } from './cutting';
import { priceCuttingList, quoteTotals } from './pricing';
import type { ItemInput, PriceTable, PricingSettings, QuoteItemResult } from './types';

/** Customer-facing one-liner. */
export function describeItem(i: ItemInput): string {
  const t = TYPOLOGIES[i.typology];
  const line = i.line === 'TEMPERADO' ? '' : ` – ${LINE_LABEL[i.line]}`;
  return `${t.label.replace(/ \(.*\)$/, '')}${line} – ${i.widthMm} × ${i.heightMm} mm – ` +
    `Alumínio ${FINISHES[i.finish].label} – Vidro ${GLASSES[i.glassCode].label}`;
}

/** Cutting list + price for one quote line. */
export function calculateItem(input: ItemInput, prices: PriceTable, settings: PricingSettings): QuoteItemResult {
  const cutting = generateCuttingList(input);
  const pricing = priceCuttingList(cutting, prices, settings);
  return { input, description: describeItem(input), cutting, pricing, engineVersion: ENGINE_VERSION };
}

export function calculateQuote(inputs: ItemInput[], prices: PriceTable, settings: PricingSettings, discountPct = 0) {
  const items = inputs.map((i) => calculateItem(i, prices, settings));
  return { items, totals: quoteTotals(items.map((r) => r.pricing), discountPct) };
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** WhatsApp message (plain text, *bold* markup) + wa.me deep link. */
export function buildWhatsAppMessage(opts: {
  companyName: string;
  customerName: string;
  quoteNumber: number;
  items: { description: string; quantity: number; totalPrice: number; locationLabel?: string | null }[];
  total: number;
  discountValue?: number;
  validUntil?: string | null;
  publicUrl?: string;
}): string {
  const lines = [
    `Olá, ${opts.customerName.split(' ')[0]}! 👋`,
    `Segue o orçamento *nº ${opts.quoteNumber}* da *${opts.companyName}*:`,
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
  const normalized = phone && phone.length <= 11 ? `55${phone}` : phone; // assume BR if no DDI
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
