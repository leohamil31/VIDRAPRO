// Run: npm test  (tsc + node --test)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist');

// Price table built from the engine's own default list → no missing prices
const prices = { aluminumPerKg: {}, glassPerM2: {}, accessories: {} };
for (const p of E.DEFAULT_PRICE_LIST) {
  if (p.category === 'aluminum') prices.aluminumPerKg[p.key] = p.price;
  else if (p.category === 'glass') prices.glassPerM2[p.key] = p.price;
  else prices.accessories[p.key] = p.price;
}
const settings = { ...E.DEFAULT_PRICING };
const linesFor = (meta) => E.BUILTIN_LINES.filter((l) => l.family === meta.family);
const item = (typology, extra = {}) => {
  const m = E.TYPOLOGIES[typology];
  return { typology, line: E.DEFAULT_LINE_BY_FAMILY[m.family], widthMm: m.defaultW, heightMm: m.defaultH,
    depthMm: m.depth?.default, finish: 'BRANCO', glassCode: m.defaultGlass, quantity: 1, ...extra };
};
const acc = (c, code) => c.accessories.find((a) => a.code === code)?.qty ?? 0;
const prof = (c, code, name) => c.profiles.find((p) => p.code === code && (!name || p.name === name));

// ---------------------------------------------------------------------------
// 1. Smoke / property test: EVERY model × EVERY compatible line × min/default/max
// ---------------------------------------------------------------------------
test('todos os modelos × todas as linhas × medidas mín/padrão/máx geram lista válida e preço', () => {
  let runs = 0;
  for (const meta of Object.values(E.TYPOLOGIES)) {
    const sizes = [
      [meta.minW, meta.minH], [meta.defaultW, meta.defaultH], [meta.maxW, meta.maxH],
      [meta.minW, meta.maxH], [meta.maxW, meta.minH],
    ];
    for (const line of linesFor(meta)) for (const glassCode of meta.glasses) for (const [w, h] of sizes) {
      const input = item(meta.id, { line: line.id, widthMm: w, heightMm: h, glassCode });
      const ctx = `${meta.id}/${line.id}/${glassCode}/${w}x${h}`;
      const r = E.calculateItem(input, prices, settings);
      const c = r.cutting;
      assert.ok(c.profiles.length > 0, `${ctx}: sem perfis`);
      for (const p of c.profiles) {
        assert.ok(Number.isFinite(p.lengthMm) && p.lengthMm > 0, `${ctx}: perfil ${p.name} = ${p.lengthMm}`);
        assert.ok(Number.isInteger(p.qty) && p.qty > 0, `${ctx}: qtd ${p.name}`);
        assert.ok(p.kgPerM > 0, `${ctx}: kg/m ${p.name}`);
      }
      if (meta.usesGlass) assert.ok(c.glasses.length > 0, `${ctx}: sem vidro`);
      else assert.equal(c.glasses.length, 0, `${ctx}: não deveria ter vidro`);
      for (const g of c.glasses) {
        assert.ok(g.widthMm > 0 && g.heightMm > 0, `${ctx}: vidro ${g.label} ${g.widthMm}x${g.heightMm}`);
        assert.ok(g.widthMm <= w, `${ctx}: vidro mais largo que o vão`);
        const embed = meta.id === 'GUARDA_CORPO_TEMPERADO' ? 100 : 0;
        assert.ok(g.heightMm <= h + embed, `${ctx}: vidro mais alto que o vão`);
      }
      assert.ok(c.accessories.length > 0, `${ctx}: sem acessórios`);
      for (const a of c.accessories) assert.ok(a.qty > 0 && E.ACCESSORIES[a.code], `${ctx}: acessório ${a.code}`);
      assert.ok(c.drawing.panels.length > 0, `${ctx}: desenho vazio`);
      for (const pn of c.drawing.panels) {
        assert.ok(pn.w > 0 && pn.h > 0, `${ctx}: painel do desenho inválido`);
        assert.ok(pn.x >= -1 && pn.x + pn.w <= c.drawing.widthMm + 1, `${ctx}: painel fora do desenho (x)`);
      }
      assert.deepEqual(r.pricing.missingPrices, [], `${ctx}: preços ausentes`);
      assert.ok(r.pricing.unitPrice > r.pricing.unitCost && r.pricing.unitCost > 0, `${ctx}: preço`);
      runs++;
    }
  }
  assert.ok(runs > 500, `rodou ${runs} combinações`);
});

test('27 modelos, separados em esquadrias e temperados', () => {
  assert.equal(Object.keys(E.TYPOLOGIES).length, 27);
  assert.equal(E.typologiesByCategory('ESQUADRIA').length, 17);
  assert.equal(E.typologiesByCategory('TEMPERADO').length, 10);
});

test('5 linhas de esquadria de mercado + linhas de sistema', () => {
  const esq = E.BUILTIN_LINES.filter((l) => l.family === 'ESQUADRIA').map((l) => l.id);
  assert.deepEqual(esq, ['SUPREMA', 'GOLD', 'LINHA_30', 'INOVA', 'LINHA_16']);
  for (const l of E.BUILTIN_LINES) assert.deepEqual(E.validateLineDefinition(l), [], l.id);
});

// ---------------------------------------------------------------------------
// 2. Exact deductions
// ---------------------------------------------------------------------------
test('Janela 2F Suprema 1200×1000 — deduções e acessórios', () => {
  const c = E.generateCuttingList(item('JANELA_CORRER_2F', { widthMm: 1200, heightMm: 1000 }));
  assert.equal(c.leaves.widthMm, 615);                // (1200 − 20 + 50) / 2
  assert.equal(c.leaves.heightMm, 955);
  assert.equal(prof(c, 'SU-ML').lengthMm, 968);
  assert.equal(prof(c, 'SU-TVS').lengthMm, 555);
  assert.deepEqual([c.glasses[0].widthMm, c.glasses[0].heightMm, c.glasses[0].qty], [571, 911, 2]);
  assert.equal(acc(c, 'ROLDANA_JANELA'), 4);
  assert.equal(acc(c, 'FECHO_CONCHA'), 1);
  assert.equal(acc(c, 'PUXADOR_CONCHA'), 2);
  assert.equal(acc(c, 'ESCOVA_VEDACAO'), 6.3);        // 2 × 2 × (615 + 955) = 6280 mm → 6,3 m
  assert.equal(acc(c, 'BATENTE_STOP'), 2);
  assert.equal(acc(c, 'PARAFUSO_KIT'), 1);
});

test('Gold usa perfis e descontos próprios', () => {
  const c = E.generateCuttingList(item('PORTA_CORRER_2F', { line: 'GOLD', widthMm: 1600, heightMm: 2100, glassCode: 'TEMPERADO_INCOLOR_8' }));
  assert.ok(c.profiles.every((p) => p.code.startsWith('GO-')));
  assert.equal(acc(c, 'ROLDANA_PORTA'), 4);
  assert.equal(acc(c, 'FECHADURA_CORRER'), 1);
});

test('Veneziana 3F: 2 folhas de palheta + 1 de vidro, trilho 3 vias', () => {
  const c = E.generateCuttingList(item('JANELA_VENEZIANA_3F', { widthMm: 1500, heightMm: 1200 }));
  assert.ok(prof(c, 'SU-TS3') && prof(c, 'SU-TI3'));
  assert.equal(c.glasses[0].qty, 1);
  const pal = prof(c, 'SU-PV');
  const leafH = 1200 - 45, inner = leafH - 60;
  assert.equal(pal.qty, 2 * Math.floor(inner / 40));
});

test('Basculante divide em folhas de até 350 mm', () => {
  const c = E.generateCuttingList(item('JANELA_BASCULANTE', { widthMm: 600, heightMm: 800 }));
  assert.equal(c.leaves.count, Math.ceil((800 - 64) / 350));  // 3
  assert.equal(acc(c, 'PIVO_BASCULANTE'), 3);
  assert.equal(acc(c, 'HASTE_BASCULANTE'), 1);
});

test('Porta de giro lambri: réguas por módulo, sem vidro, ferragens completas', () => {
  const c = E.generateCuttingList(item('PORTA_GIRO_LAMBRI', { widthMm: 800, heightMm: 2100 }));
  assert.equal(c.glasses.length, 0);
  assert.ok(prof(c, 'SU-LB').qty >= 18);
  for (const code of ['DOBRADICA_ALUMINIO', 'FECHADURA_GIRO', 'MACANETA', 'CILINDRO_CHAVE']) assert.ok(acc(c, code) > 0, code);
});

test('Porta de giro 2 folhas leva ferrolho', () => {
  const c = E.generateCuttingList(item('PORTA_GIRO_2F_VIDRO'));
  assert.equal(acc(c, 'FERROLHO'), 2);
  assert.equal(acc(c, 'DOBRADICA_ALUMINIO'), 6);
});

test('Fachada 5000×3000: 4 × 2 módulos', () => {
  const c = E.generateCuttingList(item('FACHADA_PELE_VIDRO', { widthMm: 5000, heightMm: 3000 }));
  assert.equal(c.glasses[0].qty, 8);
  assert.equal(prof(c, 'FS-COL').qty, 5);
  assert.equal(acc(c, 'ANCORAGEM_FACHADA'), 15);
  assert.ok(c.warnings.some((w) => /NBR 10821/.test(w)));
});

test('Guarda-corpo alumínio 3000 mm: 4 colunas, 3 painéis laminados', () => {
  const c = E.generateCuttingList(item('GUARDA_CORPO_ALUMINIO', { widthMm: 3000, heightMm: 1100 }));
  assert.equal(prof(c, 'GC-COL').qty, 4);
  assert.equal(c.glasses[0].qty, 3);
  assert.equal(acc(c, 'FIXADOR_COLUNA'), 4);
});

test('Box frontal: 2 painéis até 1400, 4 acima; ferragens itemizadas', () => {
  const b2 = E.generateCuttingList(item('BOX_FRONTAL', { widthMm: 1200, heightMm: 1900 }));
  assert.equal(b2.glasses[0].widthMm, 625);
  assert.equal(b2.glasses[0].heightMm, 1885);
  assert.equal(b2.glasses[1].heightMm, 1865);
  assert.equal(acc(b2, 'ROLDANA_BOX'), 2);
  assert.equal(acc(b2, 'PUXADOR_BOX'), 1);
  const b4 = E.generateCuttingList(item('BOX_FRONTAL', { widthMm: 1800 }));
  assert.equal(b4.leaves.count, 4);
  assert.equal(acc(b4, 'ROLDANA_BOX'), 4);
});

test('Box de canto usa largura e lateral', () => {
  const c = E.generateCuttingList(item('BOX_CANTO', { widthMm: 1000, depthMm: 900 }));
  assert.equal(c.glasses.length, 4);
  assert.equal(c.glasses[2].widthMm, 475);            // (900 + 50) / 2
  assert.equal(acc(c, 'SUPORTE_CANTO_BOX'), 1);
  assert.equal(c.drawing.widthMm, 1900);
  assert.throws(() => E.generateCuttingList(item('BOX_CANTO', { depthMm: undefined })), E.EngineValidationError);
});

test('Pivotante 900×2100 10mm', () => {
  const c = E.generateCuttingList(item('PORTA_PIVOTANTE', { widthMm: 900, heightMm: 2100 }));
  assert.deepEqual([c.glasses[0].widthMm, c.glasses[0].heightMm], [892, 2085]);
  for (const code of ['PIVO_SUPERIOR', 'PIVO_INFERIOR', 'FECHADURA_TEMPERADO', 'PUXADOR_TEMPERADO']) assert.equal(acc(c, code), 1, code);
});

test('Sacada 3500 mm: painéis ≤ 700', () => {
  const c = E.generateCuttingList(item('SACADA_RETRATIL', { widthMm: 3500 }));
  assert.ok(c.glasses[0].widthMm <= 700);
  assert.equal(acc(c, 'ROLDANA_SACADA'), c.glasses[0].qty);
});

// ---------------------------------------------------------------------------
// 3. Custom lines
// ---------------------------------------------------------------------------
test('Linha personalizada copiada da Suprema altera o cálculo', () => {
  const sublime = E.cloneLine(E.findLine('SUPREMA'), 'SUBLIME', 'Linha Sublime');
  sublime.params.correr.transpasse = 70;
  sublime.profiles.TRILHO_SUP.code = 'SB-001';
  assert.deepEqual(E.validateLineDefinition(sublime), []);
  const c = E.generateCuttingList(item('JANELA_CORRER_2F', { line: 'SUBLIME', widthMm: 1200, heightMm: 1000 }), [sublime]);
  assert.equal(c.leaves.widthMm, 625);                // (1200 − 20 + 70) / 2
  assert.equal(c.profiles[0].code, 'SB-001');
  assert.match(E.describeItem(c.input, [sublime]), /Linha Sublime/);
});

test('Linha incompleta dá erro legível, não quebra', () => {
  const bad = E.cloneLine(E.findLine('SUPREMA'), 'RUIM', 'Ruim');
  delete bad.profiles.BAGUETE;
  assert.ok(E.validateLineDefinition(bad).some((m) => /Perfil ausente/.test(m)));
  assert.throws(() => E.generateCuttingList(item('JANELA_CORRER_2F', { line: 'RUIM' }), [bad]), /não possui o perfil/);
});

test('Validação: modelo × linha incompatível', () => {
  assert.ok(E.validateItem(item('BOX_FRONTAL', { line: 'SUPREMA' })).some((m) => /não é fabricado/.test(m)));
  assert.ok(E.validateItem(item('JANELA_CORRER_2F', { line: 'NAO_EXISTE' })).some((m) => /não encontrada/.test(m)));
});

// ---------------------------------------------------------------------------
// 4. Pricing, totals, bars, WhatsApp, drawing fallback
// ---------------------------------------------------------------------------
test('Precificação: vidro arredondado, perda de alumínio, acessórios por metro', () => {
  const s = { ...E.DEFAULT_PRICING, marginPct: 50, aluminumLossPct: 10 };
  const r = E.calculateItem(item('PORTA_PIVOTANTE', { widthMm: 900, heightMm: 2100, quantity: 2 }), prices, s);
  assert.equal(r.pricing.glass.billedM2, 1.89);       // 900 × 2100
  assert.equal(r.pricing.glass.cost, 529.2);
  const j = E.calculateItem(item('JANELA_CORRER_2F'), prices, s);
  const esc = j.pricing.accessories.lines.find((l) => l.code === 'ESCOVA_VEDACAO');
  assert.equal(esc.unit, 'm');
  assert.equal(esc.cost, Math.round(esc.qty * 1.2 * 100) / 100);
});

test('Totais com desconto', () => {
  const t = E.quoteTotals([{ totalPrice: 1000, totalCost: 600 }, { totalPrice: 500.5, totalCost: 300 }], 10);
  assert.deepEqual(t, { subtotal: 1500.5, discountPct: 10, discountValue: 150.05, total: 1350.45, totalCost: 900, grossProfit: 450.45 });
});

test('Barras de 6 m nunca excedem o comprimento', () => {
  const lists = Object.values(E.TYPOLOGIES).map((m) => E.generateCuttingList(item(m.id, { quantity: 3 })));
  for (const plan of E.optimizeBars(lists)) for (const b of plan.bars) {
    if (b.cuts.length > 1) assert.ok(b.cuts.reduce((s, x) => s + x, 0) <= plan.barLengthMm, plan.code);
  }
});

test('Mensagem de WhatsApp não contém o número do orçamento', () => {
  const msg = E.buildWhatsAppMessage({ companyName: 'Vidros X', customerName: 'Ana Souza', items: [{ description: 'Box', quantity: 1, totalPrice: 900 }], total: 900 });
  assert.match(msg, /Olá, Ana!/);
  assert.doesNotMatch(msg, /nº|#\d/);
  assert.match(E.waMeLink('(11) 99999-8888', msg), /^https:\/\/wa\.me\/5511999998888\?text=/);
});

test('drawingFor nunca quebra (linha desconhecida, medida fora da faixa)', () => {
  for (const m of Object.values(E.TYPOLOGIES)) {
    const d = E.drawingFor({ typology: m.id, line: 'LINHA_APAGADA', widthMm: 99999, heightMm: -5 });
    assert.ok(d && d.panels.length > 0, m.id);
  }
  assert.equal(E.drawingFor({ typology: 'NAO_EXISTE' }), null);
});
