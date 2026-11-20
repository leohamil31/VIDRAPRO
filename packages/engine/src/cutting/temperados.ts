import { GLASSES, TEMPERED_PARAMS as TP, TEMPERED_PROFILES as P } from '../catalog';
import type { CuttingList, DrawingPanel, ItemInput, LineDefinition } from '../types';
import { Bom, glassKg, halves, metres, mm } from './bom';

const T = TP.transpasse;
const HOLES = 'Furos e recortes conforme gabarito da ferragem — fazer ANTES da têmpera.';

/** Panels for fixed/sliding tempered systems: N panels with (N/2) overlaps. */
function panelLayout(L: number, N: number, fixed: boolean[], heights: (fixed: boolean) => number, H: number): DrawingPanel[] {
  const w = (L + (N / 2) * T) / N;
  const xs = N === 2 ? [0, L - w] : [0, w - T, L - 2 * w + T, L - w];
  return xs.map((x, i) => {
    const h = heights(fixed[i]);
    return { x, y: H - h - (fixed[i] ? 0 : 10), w, h, fill: 'glass', motion: fixed[i] ? 'fixed' : 'slide', layer: fixed[i] ? 0 : 1, label: fixed[i] ? 'FIXO' : undefined };
  });
}

function requireTempered(b: Bom) {
  b.warnIf(!GLASSES[b.input.glassCode].tempered, 'Este sistema exige vidro temperado.');
}

// ---------------------------------------------------------------------------
export function boxFrontal(input: ItemInput, line: LineDefinition): CuttingList {
  const b = new Bom(input, line);
  const L = input.widthMm, H = input.heightMm;
  const N = L <= TP.box.maxWidth2F ? 2 : 4, half = N / 2;
  const w = (L + half * T) / N;
  const fH = H - TP.box.alturaFixoDesc, mH = H - TP.box.alturaMovelDesc;
  b.cutFixed(P.BOX_TRILHO, 'TRILHO', L, 1, 'L');
  b.cutFixed(P.U_INFERIOR, 'MARCO', w, half, `(L + ${half}×${T}) ÷ ${N}`);
  b.cutFixed(P.U_LATERAL, 'MARCO', H - TP.box.uLateralDesc, 2, `H − ${TP.box.uLateralDesc}`);
  if (N === 2) b.cutFixed(P.CANTONEIRA, 'ACABAMENTO', mH, 1, `H − ${TP.box.alturaMovelDesc}`);
  b.glass(N === 2 ? 'Painel fixo' : 'Painéis fixos (laterais)', w, fH, half, `(L + ${half}×${T}) ÷ ${N} × (H − ${TP.box.alturaFixoDesc})`, `Furos de fixação. ${HOLES}`);
  b.glass(N === 2 ? 'Painel móvel' : 'Painéis móveis (centrais)', w, mH, half, `(L + ${half}×${T}) ÷ ${N} × (H − ${TP.box.alturaMovelDesc})`, `Furos para 2 roldanas + puxador. ${HOLES}`);
  b.add('ROLDANA_BOX', 2 * half); b.add('PUXADOR_BOX', half); b.add('BATEDOR_BOX', 2);
  b.add('FIXADOR_VIDRO', 2 * half); b.add('PARAFUSO_KIT', 1); b.add('SILICONE', 1);
  requireTempered(b);
  b.warnIf(w > 1000, 'Painel com mais de 1000 mm: confirme a capacidade das roldanas.');
  const fixed = N === 2 ? [true, false] : [true, false, false, true];
  return b.build(
    { count: N, widthMm: mm(w), heightMm: mm(mH), fixed },
    { widthMm: L, heightMm: H, frame: 'tempered', frameFaceMm: 15, floor: true,
      panels: panelLayout(L, N, fixed, (f) => (f ? fH : mH), H),
      lines: [{ x1: 0, y1: 8, x2: L, y2: 8, kind: 'track' }] },
  );
}

export function boxCanto(input: ItemInput, line: LineDefinition): CuttingList {
  const b = new Bom(input, line);
  const L = input.widthMm, D = input.depthMm ?? 900, H = input.heightMm;
  const wF = (L + T) / 2, wS = (D + T) / 2;
  const fH = H - TP.box.alturaFixoDesc, mH = H - TP.box.alturaMovelDesc;
  b.cutFixed(P.BOX_TRILHO, 'TRILHO', L, 1, 'L (frontal)');
  b.cutFixed(P.BOX_TRILHO, 'TRILHO', D, 1, 'P (lateral)');
  b.cutFixed(P.U_INFERIOR, 'MARCO', wF, 1, `(L + ${T}) ÷ 2`);
  b.cutFixed(P.U_INFERIOR, 'MARCO', wS, 1, `(P + ${T}) ÷ 2`);
  b.cutFixed(P.U_LATERAL, 'MARCO', H - TP.box.uLateralDesc, 2, `H − ${TP.box.uLateralDesc}`);
  b.glass('Fixo frontal', wF, fH, 1, `(L + ${T}) ÷ 2 × (H − ${TP.box.alturaFixoDesc})`, `Furos de fixação. ${HOLES}`);
  b.glass('Móvel frontal', wF, mH, 1, `(L + ${T}) ÷ 2 × (H − ${TP.box.alturaMovelDesc})`, `Furos para roldanas + puxador. ${HOLES}`);
  b.glass('Fixo lateral', wS, fH, 1, `(P + ${T}) ÷ 2 × (H − ${TP.box.alturaFixoDesc})`, `Furos de fixação. ${HOLES}`);
  b.glass('Móvel lateral', wS, mH, 1, `(P + ${T}) ÷ 2 × (H − ${TP.box.alturaMovelDesc})`, `Furos para roldanas + puxador. ${HOLES}`);
  b.add('ROLDANA_BOX', 4); b.add('PUXADOR_BOX', 2); b.add('SUPORTE_CANTO_BOX', 1); b.add('BATEDOR_BOX', 2);
  b.add('FIXADOR_VIDRO', 4); b.add('PARAFUSO_KIT', 1); b.add('SILICONE', 1);
  requireTempered(b);
  // drawing: front (0..L) + side unfolded (L..L+D). Openings meet at the corner.
  const yF = H - fH, yM = H - mH - 10;
  return b.build(
    { count: 4, widthMm: mm(wF), heightMm: mm(mH), fixed: [true, false, false, true] },
    { widthMm: L + D, heightMm: H, frame: 'tempered', frameFaceMm: 15, floor: true,
      panels: [
        { x: 0, y: yF, w: wF, h: fH, fill: 'glass', motion: 'fixed', layer: 0, label: 'FIXO' },
        { x: L - wF, y: yM, w: wF, h: mH, fill: 'glass', motion: 'slide', layer: 1 },
        { x: L, y: yM, w: wS, h: mH, fill: 'glass', motion: 'slide', layer: 1 },
        { x: L + D - wS, y: yF, w: wS, h: fH, fill: 'glass', motion: 'fixed', layer: 0, label: 'FIXO' },
      ],
      lines: [{ x1: 0, y1: 8, x2: L + D, y2: 8, kind: 'track' }, { x1: L, y1: 0, x2: L, y2: H, kind: 'corner' }] },
  );
}

// ---------------------------------------------------------------------------
export function pivotante(input: ItemInput, line: LineDefinition): CuttingList {
  const b = new Bom(input, line);
  const p = TP.pivot;
  const L = input.widthMm, H = input.heightMm;
  const gW = L - 2 * p.folgaLateral, gH = H - p.folgaPiso - p.folgaSuperior;
  b.cutFixed(P.BATENTE, 'ACABAMENTO', H, 1, 'H');
  b.glass('Folha pivotante', gW, gH, 1, `(L − 2×${p.folgaLateral}) × (H − ${p.folgaPiso} − ${p.folgaSuperior})`,
    `Recortes para pivô superior, pivô inferior, fechadura e furos do puxador. ${HOLES}`);
  b.add('PIVO_SUPERIOR', 1); b.add('PIVO_INFERIOR', 1); b.add('FECHADURA_TEMPERADO', 1); b.add('PUXADOR_TEMPERADO', 1);
  b.add('PARAFUSO_KIT', 1);
  const kg = glassKg(gW, gH, input.glassCode);
  b.warnIf(kg > p.maxLeafKg, `Folha ≈ ${kg.toFixed(1)} kg acima de ${p.maxLeafKg} kg: use pivô reforçado ou mola de piso.`);
  b.warnIf(GLASSES[input.glassCode].thicknessMm < 10 && gH > 2200, 'Altura acima de 2200 mm: recomenda-se vidro 10 mm.');
  requireTempered(b);
  return b.build(
    { count: 1, widthMm: mm(gW), heightMm: mm(gH), fixed: [false] },
    { widthMm: L, heightMm: H, frame: 'none', frameFaceMm: 0, floor: true,
      panels: [{ x: p.folgaLateral, y: p.folgaSuperior, w: gW, h: gH, fill: 'glass', motion: 'pivot' }] },
  );
}

export function portaAbrirTemperado(input: ItemInput, line: LineDefinition): CuttingList {
  const b = new Bom(input, line);
  const p = TP.abrir;
  const L = input.widthMm, H = input.heightMm;
  const gW = L - 2 * p.folgaLateral, gH = H - p.folgaPiso - p.folgaSuperior;
  b.cutFixed(P.BATENTE, 'ACABAMENTO', H, 1, 'H');
  b.cutFixed(P.BATENTE, 'ACABAMENTO', L, 1, 'L (superior)');
  b.glass('Folha de abrir', gW, gH, 1, `(L − 2×${p.folgaLateral}) × (H − ${p.folgaPiso} − ${p.folgaSuperior})`,
    `Recortes para dobradiças, fechadura e puxador. ${HOLES}`);
  b.add('DOBRADICA_TEMPERADO', gH > 2200 ? 3 : 2); b.add('FECHADURA_TEMPERADO', 1); b.add('PUXADOR_TEMPERADO', 1);
  b.add('PARAFUSO_KIT', 1);
  const kg = glassKg(gW, gH, input.glassCode);
  b.warnIf(kg > 70, `Folha ≈ ${kg.toFixed(1)} kg: use 3 dobradiças ou porta pivotante.`);
  requireTempered(b);
  return b.build(
    { count: 1, widthMm: mm(gW), heightMm: mm(gH), fixed: [false] },
    { widthMm: L, heightMm: H, frame: 'none', frameFaceMm: 0, floor: true,
      panels: [{ x: p.folgaLateral, y: p.folgaSuperior, w: gW, h: gH, fill: 'glass', motion: 'hinge-left' }] },
  );
}

export function portaCorrerTemperado(input: ItemInput, line: LineDefinition): CuttingList {
  const b = new Bom(input, line);
  const p = TP.correr;
  const L = input.widthMm, H = input.heightMm;
  const N = L <= p.maxWidth2F ? 2 : 4, half = N / 2;
  const w = (L + half * T) / N;
  const fH = H - p.alturaFixoDesc, mH = H - p.alturaMovelDesc;
  b.cutFixed(P.TRILHO_APARENTE, 'TRILHO', L, 1, 'L');
  b.cutFixed(P.U_INFERIOR, 'MARCO', w, half, `(L + ${half}×${T}) ÷ ${N}`);
  b.cutFixed(P.U_LATERAL, 'MARCO', fH, half, `H − ${p.alturaFixoDesc}`);
  b.glass(N === 2 ? 'Painel fixo' : 'Painéis fixos', w, fH, half, `(L + ${half}×${T}) ÷ ${N} × (H − ${p.alturaFixoDesc})`, `Furos de fixação. ${HOLES}`);
  b.glass(N === 2 ? 'Folha de correr' : 'Folhas de correr', w, mH, half, `(L + ${half}×${T}) ÷ ${N} × (H − ${p.alturaMovelDesc})`,
    `Furos para 2 roldanas aparentes, fechadura e puxador. ${HOLES}`);
  b.add('ROLDANA_APARENTE', 2 * half); b.add('GUIA_INFERIOR', half); b.add('FECHADURA_TEMPERADO', 1);
  b.add('PUXADOR_TEMPERADO', half); b.add('FIXADOR_VIDRO', 2 * half); b.add('PARAFUSO_KIT', 1); b.add('SILICONE', 1);
  requireTempered(b);
  const kg = glassKg(w, mH, input.glassCode);
  b.warnIf(kg > 90, `Folha ≈ ${kg.toFixed(1)} kg: confirme a capacidade do kit de roldanas.`);
  const fixed = N === 2 ? [true, false] : [true, false, false, true];
  return b.build(
    { count: N, widthMm: mm(w), heightMm: mm(mH), fixed },
    { widthMm: L, heightMm: H, frame: 'tempered', frameFaceMm: 20, floor: true,
      panels: panelLayout(L, N, fixed, (f) => (f ? fH : mH), H),
      lines: [{ x1: 0, y1: 10, x2: L, y2: 10, kind: 'track' }] },
  );
}

export function janelaTemperada(input: ItemInput, line: LineDefinition, N: 2 | 4): CuttingList {
  const b = new Bom(input, line);
  const L = input.widthMm, H = input.heightMm, half = N / 2;
  const w = (L + half * T) / N, h = H - TP.janela.alturaDesc;
  b.cutFixed(P.JANELA_TRILHO_SUP, 'TRILHO', L, 1, 'L');
  b.cutFixed(P.JANELA_TRILHO_INF, 'TRILHO', L, 1, 'L');
  b.cutFixed(P.U_LATERAL, 'MARCO', H, 2, 'H');
  b.glass('Folhas fixas', w, h, half, `(L + ${half}×${T}) ÷ ${N} × (H − ${TP.janela.alturaDesc})`, `Furos de fixação. ${HOLES}`);
  b.glass('Folhas de correr', w, h, half, `(L + ${half}×${T}) ÷ ${N} × (H − ${TP.janela.alturaDesc})`, `Furos para roldanas e trinco. ${HOLES}`);
  b.add('ROLDANA_JANELA_TEMP', 2 * half); b.add('TRINCO_JANELA_TEMP', half); b.add('FIXADOR_VIDRO', 2 * half);
  b.add('ESCOVA_VEDACAO', metres(2 * L)); b.addInstallation(2 * (L + H));
  requireTempered(b);
  const fixed = N === 2 ? [true, false] : [true, false, false, true];
  return b.build(
    { count: N, widthMm: mm(w), heightMm: mm(h), fixed },
    { widthMm: L, heightMm: H, frame: 'aluminum', frameFaceMm: 20,
      panels: panelLayout(L, N, fixed, () => h, H - 20).map((pn) => ({ ...pn, y: 20 })) },
  );
}

export function fixoTemperado(input: ItemInput, line: LineDefinition): CuttingList {
  const b = new Bom(input, line);
  const f = TP.fixo.folga;
  const L = input.widthMm, H = input.heightMm;
  b.cutFixed(P.U_INFERIOR, 'MARCO', L, 1, 'L');
  b.cutFixed(P.U_SUPERIOR, 'MARCO', L, 1, 'L');
  b.cutFixed(P.U_LATERAL, 'MARCO', H, 2, 'H');
  b.glass('Vidro fixo', L - 2 * f, H - 2 * f, 1, `(L − 2×${f}) × (H − 2×${f})`);
  b.add('CALCO_U', 2 * Math.ceil(L / 300) + 2 * Math.ceil(H / 300));
  b.add('PARAFUSO_KIT', 1); b.add('SILICONE', halves((2 * (L + H)) / 1000 / 8));
  requireTempered(b);
  return b.build(
    { count: 1, widthMm: mm(L - 2 * f), heightMm: mm(H - 2 * f), fixed: [true] },
    { widthMm: L, heightMm: H, frame: 'aluminum', frameFaceMm: 12,
      panels: [{ x: f, y: f, w: L - 2 * f, h: H - 2 * f, fill: 'glass', motion: 'fixed', label: 'FIXO' }] },
  );
}

// ---------------------------------------------------------------------------
export function sacada(input: ItemInput, line: LineDefinition): CuttingList {
  const b = new Bom(input, line);
  const p = TP.sacada;
  const L = input.widthMm, H = input.heightMm;
  const usable = L - 2 * p.folgaLateral;
  const n = Math.ceil(usable / p.painelMax);
  const w = (usable - (n - 1) * p.junta) / n, h = H - p.alturaDesc;
  b.cutFixed(P.SACADA_TRILHO_SUP, 'TRILHO', L, 1, 'L');
  b.cutFixed(P.SACADA_TRILHO_INF, 'TRILHO', L, 1, 'L');
  b.cutFixed(P.SACADA_PERFIL_FOLHA, 'FOLHA', w, 2 * n, `(L − 2×${p.folgaLateral} − ${n - 1}×${p.junta}) ÷ ${n}`);
  b.cutFixed(P.SACADA_ARREMATE, 'ACABAMENTO', H, 2, 'H');
  b.glass(`Painel de sacada (${n} folhas)`, w, h, n, `(L − 2×${p.folgaLateral} − ${n - 1}×${p.junta}) ÷ ${n} × (H − ${p.alturaDesc})`, `Furos dos pivôs/carrinhos conforme sistema. ${HOLES}`);
  b.add('ROLDANA_SACADA', n); b.add('PIVO_SACADA', 2); b.add('FECHO_SACADA', n);
  b.add('ESCOVA_VEDACAO', metres(2 * L)); b.addInstallation(2 * (L + H));
  requireTempered(b);
  b.warnIf(L > 6000, 'Vãos acima de 6 m: divida em 2 conjuntos (abertura para os dois lados).');
  b.warnings.push('Envidraçamento de sacada: verifique a NBR 16259 e a autorização do condomínio.');
  const panels: DrawingPanel[] = Array.from({ length: n }, (_, i) => ({
    x: p.folgaLateral + i * (w + p.junta), y: p.alturaDesc / 2, w, h, fill: 'glass', motion: 'fold',
  }));
  return b.build(
    { count: n, widthMm: mm(w), heightMm: mm(h), fixed: panels.map(() => false) },
    { widthMm: L, heightMm: H, frame: 'aluminum', frameFaceMm: p.alturaDesc / 2, panels },
  );
}

export function guardaCorpoTemperado(input: ItemInput, line: LineDefinition): CuttingList {
  const b = new Bom(input, line);
  const p = TP.guardaCorpo;
  const L = input.widthMm, H = input.heightMm;
  const n = Math.ceil(L / p.painelMax);
  const w = (L - 2 * p.folgaLateral - (n - 1) * p.junta) / n;
  const gH = H - p.folgaTopo + p.embutimento;
  b.cutFixed(P.GC_PERFIL_U, 'ESTRUTURA', L, 1, 'L');
  b.cutFixed(P.GC_CORRIMAO, 'ESTRUTURA', L, 1, 'L');
  b.glass(`Painel do guarda-corpo (${n})`, w, gH, n, `(L − 2×${p.folgaLateral} − ${n - 1}×${p.junta}) ÷ ${n} × (H − ${p.folgaTopo} + ${p.embutimento} embutido)`,
    'Laminado temperado obrigatório (NBR 14718). Lapidação em todas as bordas.');
  b.add('CALCO_U', 2 * Math.ceil(L / 300)); b.add('TAMPA_CORRIMAO', 2);
  b.add('PARAFUSO_KIT', Math.ceil(L / 1000)); b.add('SILICONE', halves((2 * L) / 1000 / 8));
  b.warnIf(!GLASSES[input.glassCode].laminated, 'NBR 14718: guarda-corpo exige vidro laminado.');
  b.warnIf(H < 1100, 'NBR 14718: altura mínima usual de 1,10 m em sacadas e terraços — confirme o uso.');
  b.warnings.push('Perfil U de base exige fixação em laje/viga conforme projeto (chumbadores químicos).');
  const panels: DrawingPanel[] = Array.from({ length: n }, (_, i) => ({
    x: p.folgaLateral + i * (w + p.junta), y: p.folgaTopo, w, h: H - p.folgaTopo - 20, fill: 'glass', motion: 'fixed',
  }));
  return b.build(
    { count: n, widthMm: mm(w), heightMm: mm(gH), fixed: panels.map(() => true) },
    { widthMm: L, heightMm: H, frame: 'rail', frameFaceMm: 40, panels, floor: true,
      lines: [{ x1: 0, y1: 20, x2: L, y2: 20, kind: 'rail' }, { x1: 0, y1: H - 10, x2: L, y2: H - 10, kind: 'rail' }] },
  );
}
