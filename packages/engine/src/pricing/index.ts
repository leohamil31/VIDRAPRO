import { FINISHES, GLASSES } from '../catalog';
import type { CuttingList, PriceBreakdown, PriceTable, PricingSettings, QuoteTotals } from '../types';

export const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
const round3 = (v: number) => Math.round((v + Number.EPSILON) * 1000) / 1000;
const ceilTo = (v: number, step: number) => (step <= 1 ? Math.ceil(v) : Math.ceil(v / step) * step);

export const DEFAULT_PRICING: PricingSettings = {
  marginPct: 60,
  aluminumLossPct: 8,
  glassRoundMm: 50,
  glassMinAreaM2: 0.25,
  laborPct: 0,
  installationPerItem: 0,
};

/**
 * Customer pricing. Consumes the BOM produced by cutting/ — it never looks at
 * deduction formulas, only at lengths, weights, glass sizes and kit codes.
 */
export function priceCuttingList(list: CuttingList, prices: PriceTable, settings: PricingSettings): PriceBreakdown {
  const missing: string[] = [];
  const qty = list.input.quantity;

  // Aluminum — net weight × (1 + loss) × R$/kg of the chosen finish
  const netKg = list.profiles.reduce((s, p) => s + (p.lengthMm / 1000) * p.kgPerM * p.qty, 0);
  const billedKg = netKg * (1 + settings.aluminumLossPct / 100);
  const pricePerKg = prices.aluminumPerKg[list.input.finish];
  if (list.profiles.length && pricePerKg == null) missing.push(`Alumínio ${FINISHES[list.input.finish].label}`);
  const aluminumCost = billedKg * (pricePerKg ?? 0);

  // Glass — each side rounded UP to the billing step, minimum area per piece
  const glassPieces = list.glasses.map((g) => {
    const realM2 = (g.widthMm * g.heightMm) / 1e6;
    const billedEach = Math.max(
      (ceilTo(g.widthMm, settings.glassRoundMm) * ceilTo(g.heightMm, settings.glassRoundMm)) / 1e6,
      settings.glassMinAreaM2,
    );
    const pricePerM2 = prices.glassPerM2[g.glassCode];
    if (pricePerM2 == null) missing.push(`Vidro ${GLASSES[g.glassCode].label}`);
    const billedM2 = billedEach * g.qty;
    return {
      label: g.label,
      realM2: round3(realM2 * g.qty),
      billedM2: round3(billedM2),
      pricePerM2: pricePerM2 ?? 0,
      cost: billedM2 * (pricePerM2 ?? 0),
    };
  });
  const glassCost = glassPieces.reduce((s, g) => s + g.cost, 0);

  // Accessory kits
  const accLines = list.accessories.map((a) => {
    const unitPrice = prices.accessories[a.code];
    if (unitPrice == null) missing.push(a.name);
    return { code: a.code, name: a.name, qty: a.qty, unitPrice: unitPrice ?? 0, cost: a.qty * (unitPrice ?? 0) };
  });
  const accCost = accLines.reduce((s, a) => s + a.cost, 0);

  const materialCost = aluminumCost + glassCost + accCost;
  const laborCost = materialCost * (settings.laborPct / 100);
  const unitCost = round2(materialCost + laborCost + settings.installationPerItem);
  const unitPrice = round2(unitCost * (1 + settings.marginPct / 100));

  return {
    aluminum: { netKg: round3(netKg), billedKg: round3(billedKg), pricePerKg: pricePerKg ?? 0, cost: round2(aluminumCost) },
    glass: {
      pieces: glassPieces.map((g) => ({ ...g, cost: round2(g.cost) })),
      billedM2: round3(glassPieces.reduce((s, g) => s + g.billedM2, 0)),
      cost: round2(glassCost),
    },
    accessories: { lines: accLines.map((a) => ({ ...a, cost: round2(a.cost) })), cost: round2(accCost) },
    materialCost: round2(materialCost),
    laborCost: round2(laborCost),
    installation: round2(settings.installationPerItem),
    unitCost,
    marginPct: settings.marginPct,
    unitPrice,
    quantity: qty,
    totalCost: round2(unitCost * qty),
    totalPrice: round2(unitPrice * qty),
    missingPrices: [...new Set(missing)],
  };
}

export function quoteTotals(items: { totalPrice: number; totalCost: number }[], discountPct = 0): QuoteTotals {
  const subtotal = round2(items.reduce((s, i) => s + i.totalPrice, 0));
  const totalCost = round2(items.reduce((s, i) => s + i.totalCost, 0));
  const pct = Math.min(Math.max(discountPct, 0), 100);
  const discountValue = round2(subtotal * (pct / 100));
  const total = round2(subtotal - discountValue);
  return { subtotal, discountPct: pct, discountValue, total, totalCost, grossProfit: round2(total - totalCost) };
}
