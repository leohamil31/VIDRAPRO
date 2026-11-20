import type { PoolClient } from 'pg';
import type { PriceTable, PricingSettings } from '@vidrapro/engine';

/** Loads the tenant's price table + pricing settings (RLS-scoped client). */
export async function loadPricingContext(db: PoolClient, marginOverride?: number) {
  const [{ rows: [t] }, { rows: prices }] = await Promise.all([
    db.query(`SELECT * FROM tenants WHERE id = current_tenant_id()`),
    db.query(`SELECT category, key, price FROM material_prices WHERE active`),
  ]);

  const table: PriceTable = { aluminumPerKg: {}, glassPerM2: {}, accessories: {} };
  for (const p of prices) {
    const v = Number(p.price);
    if (p.category === 'aluminum') (table.aluminumPerKg as Record<string, number>)[p.key] = v;
    else if (p.category === 'glass') (table.glassPerM2 as Record<string, number>)[p.key] = v;
    else table.accessories[p.key] = v;
  }

  const settings: PricingSettings = {
    marginPct: marginOverride ?? Number(t.default_margin_pct),
    aluminumLossPct: Number(t.aluminum_loss_pct),
    glassRoundMm: Number(t.glass_round_mm),
    glassMinAreaM2: Number(t.glass_min_area_m2),
    laborPct: Number(t.labor_pct),
    installationPerItem: Number(t.installation_per_item),
  };

  return { tenant: t, table, settings };
}
