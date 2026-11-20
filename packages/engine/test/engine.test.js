// Run: npm run build && node --test test/
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist');

const prices = {
  aluminumPerKg: { BRANCO: 48, PRETO: 58, NATURAL_FOSCO: 44, AMADEIRADO: 72 },
  glassPerM2: {
    COMUM_INCOLOR_4: 95, COMUM_MINIBOREAL_4: 120, TEMPERADO_INCOLOR_6: 160, TEMPERADO_INCOLOR_8: 210,
    TEMPERADO_FUME_8: 260, TEMPERADO_VERDE_8: 250, TEMPERADO_INCOLOR_10: 280,
  },
  accessories: { KIT_JANELA_2F: 45, KIT_JANELA_4F: 80, KIT_PORTA_CORRER_2F: 140, KIT_BOX_2F: 180, KIT_BOX_4F: 290, KIT_PIVOTANTE: 420 },
};
const base = { line: 'SUPREMA', finish: 'BRANCO', quantity: 1 };
const find = (list, code, name) => list.profiles.find((p) => p.code === code && (!name || p.name === name));

test('Janela 2F Suprema 1200×1000 — deduções', () => {
  const c = E.generateCuttingList({ ...base, typology: 'JANELA_CORRER_2F', widthMm: 1200, heightMm: 1000, glassCode: 'COMUM_INCOLOR_4' });
  assert.equal(c.leaves.widthMm, 615);                  // (1200 − 20 + 50) / 2
  assert.equal(c.leaves.heightMm, 955);                 // 1000 − 45
  assert.equal(find(c, 'SUP-TS').lengthMm, 1200);
  assert.equal(find(c, 'SUP-ML').lengthMm, 968);        // 1000 − 32
  assert.equal(find(c, 'SUP-ML').qty, 2);
  assert.equal(find(c, 'SUP-TVS').lengthMm, 555);       // 615 − 60
  assert.equal(find(c, 'SUP-BG', 'Baguete vertical').lengthMm, 895);
  assert.deepEqual([c.glasses[0].widthMm, c.glasses[0].heightMm, c.glasses[0].qty], [571, 911, 2]);
  // Overlap sanity: two leaves minus transpasse must equal the clear opening
  assert.equal(2 * c.leaves.widthMm - 50, 1200 - 20);
});

test('Janela 4F — encontro central', () => {
  const c = E.generateCuttingList({ ...base, typology: 'JANELA_CORRER_4F', widthMm: 2000, heightMm: 1200, glassCode: 'COMUM_INCOLOR_4' });
  assert.equal(c.leaves.count, 4);
  assert.equal(c.leaves.widthMm, 525);                  // (2000 − 20 + 100 + 20) / 4
});

test('Porta 2F Gold usa parâmetros e perfis Gold', () => {
  const c = E.generateCuttingList({ ...base, line: 'GOLD', typology: 'PORTA_CORRER_2F', widthMm: 1600, heightMm: 2100, glassCode: 'TEMPERADO_INCOLOR_8' });
  assert.ok(c.profiles.every((p) => p.code.startsWith('GLD-')));
  assert.equal(c.leaves.widthMm, Math.round((1600 - 24 + 64) / 2));
  assert.equal(c.accessories[0].code, 'KIT_PORTA_CORRER_2F');
});

test('Box frontal: 2 painéis até 1400, 4 acima', () => {
  const b2 = E.generateCuttingList({ ...base, line: 'TEMPERADO', typology: 'BOX_FRONTAL', widthMm: 1200, heightMm: 1900, glassCode: 'TEMPERADO_INCOLOR_8' });
  assert.equal(b2.leaves.count, 2);
  assert.equal(b2.glasses[0].widthMm, 625);             // (1200 + 50) / 2
  assert.equal(b2.glasses[0].heightMm, 1885);           // fixo H − 15
  assert.equal(b2.glasses[1].heightMm, 1865);           // móvel H − 35
  const b4 = E.generateCuttingList({ ...b2.input, widthMm: 1800 });
  assert.equal(b4.leaves.count, 4);
  assert.equal(b4.glasses[0].widthMm, 475);             // (1800 + 100) / 4
  assert.equal(b4.accessories[0].code, 'KIT_BOX_4F');
});

test('Pivotante 900×2100 10mm', () => {
  const c = E.generateCuttingList({ ...base, line: 'TEMPERADO', typology: 'PORTA_PIVOTANTE', widthMm: 900, heightMm: 2100, glassCode: 'TEMPERADO_INCOLOR_10' });
  assert.deepEqual([c.glasses[0].widthMm, c.glasses[0].heightMm], [892, 2085]);
  assert.equal(c.warnings.length, 0);                   // ≈ 46.5 kg, under 80 kg
});

test('Validação bloqueia linha/vidro/medidas inválidas', () => {
  assert.throws(() => E.generateCuttingList({ ...base, line: 'GOLD', typology: 'JANELA_CORRER_2F', widthMm: 1200, heightMm: 1000, glassCode: 'COMUM_INCOLOR_4' }), E.EngineValidationError);
  const issues = E.validateItem({ ...base, line: 'TEMPERADO', typology: 'BOX_FRONTAL', widthMm: 5000, heightMm: 1900, glassCode: 'COMUM_INCOLOR_4', quantity: 0 });
  assert.equal(issues.length, 3);
});

test('Precificação: arredondamento de vidro, perda de alumínio, markup', () => {
  const settings = { ...E.DEFAULT_PRICING, marginPct: 50, aluminumLossPct: 10 };
  const r = E.calculateItem({ ...base, line: 'TEMPERADO', typology: 'PORTA_PIVOTANTE', widthMm: 900, heightMm: 2100, glassCode: 'TEMPERADO_INCOLOR_10', quantity: 2 }, prices, settings);
  // glass 892×2085 → billed 900×2100 = 1.89 m² × 280 = 529.20
  assert.equal(r.pricing.glass.billedM2, 1.89);
  assert.equal(r.pricing.glass.cost, 529.2);
  // batente 2.1 m × 0.21 kg/m = 0.441 kg × 1.10 = 0.4851 kg × 48 = 23.28
  assert.equal(r.pricing.aluminum.cost, 23.28);
  assert.equal(r.pricing.unitCost, 972.48);             // 529.20 + 23.28 + 420
  assert.equal(r.pricing.unitPrice, 1458.72);           // × 1.5
  assert.equal(r.pricing.totalPrice, 2917.44);
  assert.deepEqual(r.pricing.missingPrices, []);
});

test('Preço ausente é sinalizado, não quebra', () => {
  const r = E.calculateItem({ ...base, typology: 'JANELA_CORRER_2F', widthMm: 1200, heightMm: 1000, glassCode: 'COMUM_INCOLOR_4', finish: 'AMADEIRADO' },
    { ...prices, aluminumPerKg: { BRANCO: 48 } }, E.DEFAULT_PRICING);
  assert.deepEqual(r.pricing.missingPrices, ['Alumínio Amadeirado']);
});

test('Totais com desconto', () => {
  const t = E.quoteTotals([{ totalPrice: 1000, totalCost: 600 }, { totalPrice: 500.5, totalCost: 300 }], 10);
  assert.deepEqual(t, { subtotal: 1500.5, discountPct: 10, discountValue: 150.05, total: 1350.45, totalCost: 900, grossProfit: 450.45 });
});

test('Otimização de barras de 6 m', () => {
  const c = E.generateCuttingList({ ...base, typology: 'JANELA_CORRER_2F', widthMm: 1200, heightMm: 1000, glassCode: 'COMUM_INCOLOR_4', quantity: 4 });
  const plans = E.optimizeBars([c]);
  const ml = plans.find((p) => p.code === 'SUP-ML');     // 8 × 968 mm → 972 with kerf → 6 per bar → 2 bars
  assert.equal(ml.totalPieces, 8);
  assert.equal(ml.bars.length, 2);
  for (const p of plans) for (const b of p.bars) assert.ok(b.cuts.reduce((s, x) => s + x, 0) <= p.barLengthMm);
});

test('WhatsApp link', () => {
  const msg = E.buildWhatsAppMessage({ companyName: 'Vidros X', customerName: 'Ana Souza', quoteNumber: 7, items: [{ description: 'Box', quantity: 1, totalPrice: 900 }], total: 900 });
  assert.match(msg, /Olá, Ana!/);
  assert.match(E.waMeLink('(11) 99999-8888', msg), /^https:\/\/wa\.me\/5511999998888\?text=/);
});
