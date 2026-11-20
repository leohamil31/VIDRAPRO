import { GLASSES } from '../catalog';
import type { CuttingList, DrawingPanel, LineDefinition, ItemInput } from '../types';
import { Bom, glassKg, metres, mm } from './bom';

type LeafKind = 'VIDRO' | 'VENEZIANA';

// ===========================================================================
// JANELAS / PORTAS DE CORRER (2, 3 ou 4 folhas; vidro e/ou veneziana)
//   Largura folha  2F: (L − 2·folga + T) / 2
//                  3F: (L − 2·folga + 2T) / 3
//                  4F: (L − 2·folga + 2T + E) / 4
//   Altura folha    : H − descAlturaFolha
//   Trilhos         : L     ·  Marco lateral: H − descMarco
//   Travessas       : folha − 2·montante
//   Vidro           : (folha − 2·mont + 2·enc) × (alt. folha − 2·trav + 2·enc)
//   Palhetas        : ⌊(alt. folha − 2·trav) / passo⌋ × (folha − 2·mont − desc)
// ===========================================================================
export function sliding(input: ItemInput, line: LineDefinition, porta: boolean, kinds: LeafKind[]): CuttingList {
  const b = new Bom(input, line);
  const N = kinds.length;
  const g = porta ? 'correrPorta' : 'correr';
  const p = b.params(g, ['marcoLateralDesc', 'folgaLateral', 'transpasse', 'encontroCentral', 'folhaAlturaDesc', 'montanteLargura', 'travessaAltura', 'encaixeVidro'] as const);
  const L = input.widthMm, H = input.heightMm;
  const R = porta
    ? { ts: 'PORTA_TRILHO_SUP', ti: 'PORTA_TRILHO_INF', ml: 'PORTA_MARCO_LAT', fl: 'PORTA_FOLHA_LAT', fe: 'PORTA_FOLHA_ENC', tvs: 'PORTA_TRAV_SUP', tvi: 'PORTA_TRAV_INF' }
    : { ts: 'TRILHO_SUP', ti: 'TRILHO_INF', ml: 'MARCO_LATERAL', fl: 'FOLHA_LAT', fe: 'FOLHA_ENC', tvs: 'FOLHA_TRAV_SUP', tvi: 'FOLHA_TRAV_INF' };
  if (N === 3) { R.ts = 'TRILHO_SUP_3'; R.ti = 'TRILHO_INF_3'; }

  const f = p.folgaLateral, T = p.transpasse, E = p.encontroCentral;
  const leafW = N === 2 ? (L - 2 * f + T) / 2 : N === 3 ? (L - 2 * f + 2 * T) / 3 : (L - 2 * f + 2 * T + E) / 4;
  const leafWf = N === 2 ? `(L − 2×${f} + ${T}) ÷ 2` : N === 3 ? `(L − 2×${f} + 2×${T}) ÷ 3` : `(L − 2×${f} + 2×${T} + ${E}) ÷ 4`;
  const leafH = H - p.folhaAlturaDesc;
  const rail = leafW - 2 * p.montanteLargura;
  const innerH = leafH - 2 * p.travessaAltura;

  b.cut(R.ts, L, 1, 'L');
  b.cut(R.ti, L, 1, 'L');
  b.cut(R.ml, H - p.marcoLateralDesc, 2, `H − ${p.marcoLateralDesc}`);
  b.cut(R.fl, leafH, N, `H − ${p.folhaAlturaDesc}`);
  b.cut(R.fe, leafH, N, `H − ${p.folhaAlturaDesc}`);
  b.cut(R.tvs, rail, N, `folha ${leafWf} − 2×${p.montanteLargura}`);
  b.cut(R.tvi, rail, N, `folha − 2×${p.montanteLargura}`);

  const nGlass = kinds.filter((k) => k === 'VIDRO').length;
  const nVen = N - nGlass;
  b.cut('BAGUETE', rail, 2 * nGlass, `folha − 2×${p.montanteLargura}`, { name: 'Baguete horizontal' });
  b.cut('BAGUETE', innerH, 2 * nGlass, `alt. folha − 2×${p.travessaAltura}`, { name: 'Baguete vertical' });

  if (nVen) {
    const v = b.params('veneziana', ['passo', 'desconto'] as const);
    const count = Math.floor(innerH / v.passo);
    b.cut('PALHETA', rail - v.desconto, count * nVen, `folha − 2×${p.montanteLargura} − ${v.desconto} · ${count} por folha (passo ${v.passo})`);
  }

  const gW = rail + 2 * p.encaixeVidro, gH = innerH + 2 * p.encaixeVidro;
  b.glass(nVen ? 'Vidro da folha de vidro' : 'Vidro da folha', gW, gH, nGlass,
    `(folha − 2×${p.montanteLargura} + 2×${p.encaixeVidro}) × (alt. folha − 2×${p.travessaAltura} + 2×${p.encaixeVidro})`);

  // Accessories
  b.add(porta ? 'ROLDANA_PORTA' : 'ROLDANA_JANELA', 2 * N);
  if (porta) {
    b.add('FECHADURA_CORRER', 1); b.add('CILINDRO_CHAVE', 1); b.add('PUXADOR_CONCHA', 2);
    if (N > 2) b.add('FECHO_CONCHA', N - 2);
  } else {
    b.add('PUXADOR_CONCHA', N);
    if (N === 4) { b.add('FECHO_CENTRAL', 1); b.add('FECHO_CONCHA', 2); } else b.add('FECHO_CONCHA', N - 1);
  }
  b.add('ESCOVA_VEDACAO', metres(N * 2 * (leafW + leafH)));
  b.addGlassSeal(gW, gH, nGlass);
  b.add('BATENTE_STOP', 2);
  b.addInstallation(2 * (L + H));

  // Checks
  const spec = GLASSES[input.glassCode];
  if (nGlass) {
    const kg = glassKg(gW, gH, input.glassCode);
    const ref = line.profiles[porta ? 'PORTA_FOLHA_LAT' : 'FOLHA_LAT']?.kgPerM ?? 0.45;
    const limit = Math.round((porta ? 60 : 35) * (ref / (porta ? 0.598 : 0.441)));
    b.warnIf(kg > limit, `Vidro por folha ≈ ${kg.toFixed(1)} kg, acima do recomendado (${limit} kg) para ${line.name}. Considere uma linha mais robusta.`);
  }
  b.warnIf(porta && nGlass > 0 && !spec.tempered && !spec.laminated, 'Porta com vidro comum: pela NBR 7199 use vidro de segurança (temperado ou laminado).');
  b.warnIf(porta && (line.profiles.PORTA_FOLHA_LAT?.kgPerM ?? 1) < 0.45, `${line.name} é leve para portas — confirme com o fornecedor.`);

  // Drawing
  const xs = N === 2 ? [f, L - f - leafW] : N === 3 ? [0, 1, 2].map((i) => f + i * (leafW - T)) : [f, f + leafW - T, L - f - 2 * leafW + T, L - f - leafW];
  const layers: (0 | 1)[] = N === 2 ? [0, 1] : N === 3 ? [0, 1, 0] : [0, 1, 1, 0];
  const y = (H - leafH) / 2;
  const panels: DrawingPanel[] = kinds.map((k, i) => ({
    x: xs[i], y, w: leafW, h: leafH, fill: k === 'VIDRO' ? 'glass' : 'veneziana', motion: 'slide', sash: true, layer: layers[i],
  }));
  return b.build(
    { count: N, widthMm: mm(leafW), heightMm: mm(leafH), fixed: kinds.map(() => false) },
    { widthMm: L, heightMm: H, frame: 'aluminum', frameFaceMm: p.montanteLargura, panels, floor: porta },
  );
}

// ===========================================================================
// MAXIM-AR / BASCULANTE / ABRIR 2F / FIXO  (marco perimetral a 45°)
// ===========================================================================
const ABRIR_KEYS = ['marcoFace', 'recobrimento', 'folga', 'folhaFace', 'encaixeVidro', 'basculanteModulo'] as const;

function frame45(b: Bom, L: number, H: number) {
  b.cut('MARCO_GIRO', L, 2, 'L (corte 45°)', { angle: 45 });
  b.cut('MARCO_GIRO', H, 2, 'H (corte 45°)', { angle: 45 });
  b.add('CANTONEIRA_ESQUADRO', 4);
}

function sash45(b: Bom, w: number, h: number, qty: number, wf: string, hf: string) {
  b.cut('FOLHA_GIRO', w, 2 * qty, wf, { angle: 45 });
  b.cut('FOLHA_GIRO', h, 2 * qty, hf, { angle: 45 });
  b.add('CANTONEIRA_ESQUADRO', 4 * qty);
}

export function maximAr(input: ItemInput, line: LineDefinition): CuttingList {
  const b = new Bom(input, line);
  const p = b.params('abrir', ABRIR_KEYS);
  const L = input.widthMm, H = input.heightMm;
  const d = p.marcoFace - p.recobrimento;
  const fw = L - 2 * d, fh = H - 2 * d;
  frame45(b, L, H);
  sash45(b, fw, fh, 1, `L − 2×(${p.marcoFace} − ${p.recobrimento})`, `H − 2×(${p.marcoFace} − ${p.recobrimento})`);
  const iw = fw - 2 * p.folhaFace, ih = fh - 2 * p.folhaFace;
  b.cut('BAGUETE', iw, 2, `folha − 2×${p.folhaFace}`, { name: 'Baguete horizontal' });
  b.cut('BAGUETE', ih, 2, `alt. folha − 2×${p.folhaFace}`, { name: 'Baguete vertical' });
  const gW = iw + 2 * p.encaixeVidro, gH = ih + 2 * p.encaixeVidro;
  b.glass('Vidro da folha', gW, gH, 1, `(folha − 2×${p.folhaFace} + 2×${p.encaixeVidro}) × (alt. folha − 2×${p.folhaFace} + 2×${p.encaixeVidro})`);
  const big = L > 1000 || H > 1000;
  b.add('BRACO_MAXIM_AR', big ? 2 : 1);
  b.add('FECHO_MAXIM_AR', L > 1000 ? 2 : 1);
  b.add('GUARNICAO_EPDM', metres(2 * (fw + fh)));
  b.addGlassSeal(gW, gH, 1);
  b.addInstallation(2 * (L + H));
  const kg = glassKg(gW, gH, input.glassCode);
  b.warnIf(kg > 25, `Folha ≈ ${kg.toFixed(1)} kg: use braço maxim-ar reforçado.`);
  return b.build(
    { count: 1, widthMm: mm(fw), heightMm: mm(fh), fixed: [false] },
    { widthMm: L, heightMm: H, frame: 'aluminum', frameFaceMm: p.marcoFace,
      panels: [{ x: d, y: d, w: fw, h: fh, fill: 'glass', motion: 'top-hung', sash: true }] },
  );
}

export function basculante(input: ItemInput, line: LineDefinition): CuttingList {
  const b = new Bom(input, line);
  const p = b.params('abrir', ABRIR_KEYS);
  const L = input.widthMm, H = input.heightMm;
  const innerH = H - 2 * p.marcoFace;
  const n = Math.max(1, Math.ceil(innerH / p.basculanteModulo));
  const fw = L - 2 * p.marcoFace - 2 * p.folga;
  const fh = (innerH - (n + 1) * p.folga) / n;
  frame45(b, L, H);
  sash45(b, fw, fh, n, `L − 2×${p.marcoFace} − 2×${p.folga}`, `(H − 2×${p.marcoFace} − ${n + 1}×${p.folga}) ÷ ${n}`);
  const iw = fw - 2 * p.folhaFace, ih = fh - 2 * p.folhaFace;
  b.cut('BAGUETE', iw, 2 * n, `folha − 2×${p.folhaFace}`, { name: 'Baguete horizontal' });
  b.cut('BAGUETE', ih, 2 * n, `alt. folha − 2×${p.folhaFace}`, { name: 'Baguete vertical' });
  const gW = iw + 2 * p.encaixeVidro, gH = ih + 2 * p.encaixeVidro;
  b.glass(`Vidro da basculante (${n} folhas)`, gW, gH, n, `(folha − 2×${p.folhaFace} + 2×${p.encaixeVidro}) × (alt. folha − 2×${p.folhaFace} + 2×${p.encaixeVidro})`);
  b.add('PIVO_BASCULANTE', n);
  b.add('HASTE_BASCULANTE', 1);
  b.addGlassSeal(gW, gH, n);
  b.addInstallation(2 * (L + H));
  b.warnIf(fh < 120, 'Folhas muito baixas: reduza o número de folhas ou aumente a altura.');
  const panels: DrawingPanel[] = Array.from({ length: n }, (_, i) => ({
    x: p.marcoFace + p.folga, y: p.marcoFace + p.folga + i * (fh + p.folga), w: fw, h: fh, fill: 'glass', motion: 'tilt', sash: true,
  }));
  return b.build(
    { count: n, widthMm: mm(fw), heightMm: mm(fh), fixed: panels.map(() => false) },
    { widthMm: L, heightMm: H, frame: 'aluminum', frameFaceMm: p.marcoFace, panels },
  );
}

export function abrir2F(input: ItemInput, line: LineDefinition): CuttingList {
  const b = new Bom(input, line);
  const p = b.params('abrir', ABRIR_KEYS);
  const L = input.widthMm, H = input.heightMm;
  const d = p.marcoFace - p.recobrimento;
  const fw = (L - 2 * d + p.recobrimento) / 2, fh = H - 2 * d;
  frame45(b, L, H);
  sash45(b, fw, fh, 2, `(L − 2×${d} + ${p.recobrimento}) ÷ 2`, `H − 2×${d}`);
  const iw = fw - 2 * p.folhaFace, ih = fh - 2 * p.folhaFace;
  b.cut('BAGUETE', iw, 4, `folha − 2×${p.folhaFace}`, { name: 'Baguete horizontal' });
  b.cut('BAGUETE', ih, 4, `alt. folha − 2×${p.folhaFace}`, { name: 'Baguete vertical' });
  const gW = iw + 2 * p.encaixeVidro, gH = ih + 2 * p.encaixeVidro;
  b.glass('Vidro da folha', gW, gH, 2, `(folha − 2×${p.folhaFace} + 2×${p.encaixeVidro}) × (alt. folha − 2×${p.folhaFace} + 2×${p.encaixeVidro})`);
  b.add('DOBRADICA_ALUMINIO', (fh > 1200 ? 3 : 2) * 2);
  b.add('FECHO_CENTRAL', 1);
  b.add('FERROLHO', 1);
  b.add('GUARNICAO_EPDM', metres(2 * 2 * (fw + fh)));
  b.addGlassSeal(gW, gH, 2);
  b.addInstallation(2 * (L + H));
  return b.build(
    { count: 2, widthMm: mm(fw), heightMm: mm(fh), fixed: [false, false] },
    { widthMm: L, heightMm: H, frame: 'aluminum', frameFaceMm: p.marcoFace, panels: [
      { x: d, y: d, w: fw, h: fh, fill: 'glass', motion: 'hinge-left', sash: true },
      { x: L - d - fw, y: d, w: fw, h: fh, fill: 'glass', motion: 'hinge-right', sash: true },
    ] },
  );
}

export function fixoAluminio(input: ItemInput, line: LineDefinition): CuttingList {
  const b = new Bom(input, line);
  const p = b.params('abrir', ABRIR_KEYS);
  const L = input.widthMm, H = input.heightMm;
  frame45(b, L, H);
  const iw = L - 2 * p.marcoFace, ih = H - 2 * p.marcoFace;
  b.cut('BAGUETE', iw, 2, `L − 2×${p.marcoFace}`, { name: 'Baguete horizontal' });
  b.cut('BAGUETE', ih, 2, `H − 2×${p.marcoFace}`, { name: 'Baguete vertical' });
  const gW = iw + 2 * p.encaixeVidro, gH = ih + 2 * p.encaixeVidro;
  b.glass('Vidro fixo', gW, gH, 1, `(L − 2×${p.marcoFace} + 2×${p.encaixeVidro}) × (H − 2×${p.marcoFace} + 2×${p.encaixeVidro})`);
  b.addGlassSeal(gW, gH, 1);
  b.addInstallation(2 * (L + H));
  b.warnIf(gW * gH > 3_000_000 && !GLASSES[input.glassCode].tempered && !GLASSES[input.glassCode].laminated,
    'Vidro comum acima de 3 m²: verifique espessura pela NBR 7199.');
  return b.build(
    { count: 1, widthMm: mm(gW), heightMm: mm(gH), fixed: [true] },
    { widthMm: L, heightMm: H, frame: 'aluminum', frameFaceMm: p.marcoFace,
      panels: [{ x: p.marcoFace, y: p.marcoFace, w: iw, h: ih, fill: 'glass', motion: 'fixed', label: 'FIXO' }] },
  );
}

// ===========================================================================
// PORTAS DE GIRO (vidro, lambri, veneziana; 1 ou 2 folhas)
//   Folha: (L − 2·marco − 2·folga) [÷ 2]  ×  (H − marco − folga sup − folga piso)
//   Montantes: alt. folha · Travessa sup / intermediária / rodapé: folha − 2·montante
// ===========================================================================
export function portaGiro(input: ItemInput, line: LineDefinition, kind: 'VIDRO' | 'LAMBRI' | 'VENEZIANA', leaves: 1 | 2): CuttingList {
  const b = new Bom(input, line);
  const p = b.params('portaGiro', ['marcoFace', 'folgaLateral', 'folgaSuperior', 'folgaPiso', 'folhaFace', 'rodape', 'intermediaria', 'alturaIntermediaria', 'encaixeVidro'] as const);
  const L = input.widthMm, H = input.heightMm;
  const total = L - 2 * p.marcoFace - 2 * p.folgaLateral;
  const fw = leaves === 1 ? total : (total - p.folgaLateral) / 2;
  const fh = H - p.marcoFace - p.folgaSuperior - p.folgaPiso;
  const iw = fw - 2 * p.folhaFace;
  const innerH = fh - p.folhaFace - p.rodape - p.intermediaria;
  const lower = Math.min(Math.max(p.alturaIntermediaria - p.folgaPiso - p.rodape - p.intermediaria / 2, 150), innerH - 150);
  const upper = innerH - lower;

  b.cut('MARCO_PORTA', H, 2, 'H (laterais, corte 45° no topo)', { angle: 45 });
  b.cut('MARCO_PORTA', L, 1, 'L (travessa superior, 45°)', { angle: 45 });
  const fwf = leaves === 1 ? `L − 2×${p.marcoFace} − 2×${p.folgaLateral}` : `(L − 2×${p.marcoFace} − 3×${p.folgaLateral}) ÷ 2`;
  b.cut('FOLHA_PORTA', fh, 2 * leaves, `H − ${p.marcoFace} − ${p.folgaSuperior} − ${p.folgaPiso}`, { name: 'Montante da folha' });
  b.cut('FOLHA_PORTA', iw, leaves, `folha ${fwf} − 2×${p.folhaFace}`, { name: 'Travessa superior da folha' });
  b.cut('RODAPE_PORTA', iw, leaves, `folha − 2×${p.folhaFace}`);
  b.cut('TRAVESSA_INTERM', iw, leaves, `folha − 2×${p.folhaFace} · eixo a ${p.alturaIntermediaria} mm do piso`);
  b.cut('BAGUETE', iw, 4 * leaves, `folha − 2×${p.folhaFace}`, { name: 'Baguete horizontal' });
  b.cut('BAGUETE', upper, 2 * leaves, 'vão superior', { name: 'Baguete vertical (superior)' });
  b.cut('BAGUETE', lower, 2 * leaves, 'vão inferior', { name: 'Baguete vertical (inferior)' });

  const fill = kind === 'VIDRO' ? 'glass' : kind === 'LAMBRI' ? 'lambri' : 'veneziana';
  if (kind === 'VIDRO') {
    const e = p.encaixeVidro;
    b.glass('Vidro superior', iw + 2 * e, upper + 2 * e, leaves, `(folha − 2×${p.folhaFace} + 2×${e}) × (vão sup. + 2×${e})`);
    b.glass('Vidro inferior', iw + 2 * e, lower + 2 * e, leaves, `(folha − 2×${p.folhaFace} + 2×${e}) × (vão inf. + 2×${e})`);
    b.addGlassSeal(iw + 2 * e, upper + lower + 4 * e, leaves);
    const spec = GLASSES[input.glassCode];
    b.warnIf(!spec.tempered && !spec.laminated && (upper + lower) > 900, 'Porta com vidro comum: pela NBR 7199 use temperado ou laminado na parte inferior.');
  } else if (kind === 'LAMBRI') {
    const mod = b.param('lambri', 'modulo');
    const n = Math.ceil(upper / mod) + Math.ceil(lower / mod);
    b.cut('LAMBRI', iw, n * leaves, `folha − 2×${p.folhaFace} · ${n} réguas por folha (módulo ${mod})`);
  } else {
    const v = b.params('veneziana', ['passo', 'desconto'] as const);
    const n = Math.floor(upper / v.passo) + Math.floor(lower / v.passo);
    b.cut('PALHETA', iw - v.desconto, n * leaves, `folha − 2×${p.folhaFace} − ${v.desconto} · ${n} por folha (passo ${v.passo})`);
  }

  b.add('DOBRADICA_ALUMINIO', (fh > 2300 ? 4 : 3) * leaves);
  b.add('FECHADURA_GIRO', 1); b.add('MACANETA', 1); b.add('CILINDRO_CHAVE', 1);
  if (leaves === 2) b.add('FERROLHO', 2);
  b.add('ESCOVA_VEDACAO', metres(fw * leaves));
  b.add('ESPUMA_PU', 1);
  b.addInstallation(2 * H + L);
  b.warnIf(fw > 1000, 'Folha acima de 1000 mm: confirme dobradiças e linha com o fornecedor.');

  const x0 = p.marcoFace + p.folgaLateral, y0 = p.marcoFace + p.folgaSuperior;
  const panels: DrawingPanel[] = [];
  for (let i = 0; i < leaves; i++) {
    const x = i === 0 ? x0 : L - x0 - fw;
    panels.push({ x, y: y0, w: fw, h: fh, fill: 'none', motion: i === 0 ? 'hinge-left' : 'hinge-right', sash: true });
    panels.push({ x: x + p.folhaFace, y: y0 + p.folhaFace, w: iw, h: upper, fill, motion: 'fixed' });
    panels.push({ x: x + p.folhaFace, y: y0 + p.folhaFace + upper + p.intermediaria, w: iw, h: lower, fill, motion: 'fixed' });
  }
  return b.build(
    { count: leaves, widthMm: mm(fw), heightMm: mm(fh), fixed: Array.from({ length: leaves }, () => false) },
    { widthMm: L, heightMm: H, frame: 'aluminum', frameFaceMm: p.marcoFace, panels, floor: true },
  );
}

// ===========================================================================
// PAINEL / FECHAMENTO EM LAMBRI
// ===========================================================================
export function painelLambri(input: ItemInput, line: LineDefinition): CuttingList {
  const b = new Bom(input, line);
  const mf = b.param('abrir', 'marcoFace');
  const { modulo, reforcoMax } = b.params('lambri', ['modulo', 'reforcoMax'] as const);
  const L = input.widthMm, H = input.heightMm;
  frame45(b, L, H);
  const iw = L - 2 * mf, ih = H - 2 * mf;
  const boards = Math.ceil(ih / modulo);
  const reinf = Math.max(0, Math.ceil(iw / reforcoMax) - 1);
  b.cut('LAMBRI', iw, boards, `L − 2×${mf} · ${boards} réguas (módulo ${modulo})`);
  b.cut('TRAVESSA_INTERM', ih, reinf, `H − 2×${mf} · reforço a cada ${reforcoMax} mm`, { name: 'Reforço vertical' });
  b.addInstallation(2 * (L + H));
  b.warnIf(iw > 6000, 'Réguas acima de 6 m exigem emenda.');
  const lines = Array.from({ length: reinf }, (_, i) => {
    const x = mf + ((i + 1) * iw) / (reinf + 1);
    return { x1: x, y1: mf, x2: x, y2: H - mf, kind: 'mullion' as const };
  });
  return b.build(
    { count: 1, widthMm: mm(iw), heightMm: mm(ih), fixed: [true] },
    { widthMm: L, heightMm: H, frame: 'aluminum', frameFaceMm: mf,
      panels: [{ x: mf, y: mf, w: iw, h: ih, fill: 'lambri', motion: 'fixed' }], lines },
  );
}

// ===========================================================================
// FACHADA PELE DE VIDRO (stick)
// ===========================================================================
export function fachada(input: ItemInput, line: LineDefinition): CuttingList {
  const b = new Bom(input, line);
  const p = b.params('fachada', ['moduloLargura', 'moduloAltura', 'colunaFace', 'travessaFace', 'encaixeVidro'] as const);
  const L = input.widthMm, H = input.heightMm;
  const cols = Math.ceil(L / p.moduloLargura), rows = Math.ceil(H / p.moduloAltura);
  const modW = L / cols, modH = H / rows;
  const trav = modW - p.colunaFace;
  b.cut('COLUNA', H, cols + 1, `H · ${cols + 1} colunas (módulo ${mm(modW)} mm)`);
  b.cut('TRAVESSA', trav, cols * (rows + 1), `módulo ${mm(modW)} − ${p.colunaFace} · ${rows + 1} níveis`);
  b.cut('PRESSOR', H, cols + 1, 'H', { name: 'Pressor vertical' });
  b.cut('PRESSOR', trav, cols * (rows + 1), `módulo − ${p.colunaFace}`, { name: 'Pressor horizontal' });
  b.cut('ARREMATE', H, cols + 1, 'H', { name: 'Capa vertical' });
  b.cut('ARREMATE', trav, cols * (rows + 1), `módulo − ${p.colunaFace}`, { name: 'Capa horizontal' });
  const gW = modW - p.colunaFace + 2 * p.encaixeVidro, gH = modH - p.travessaFace + 2 * p.encaixeVidro;
  b.glass(`Vidro do módulo (${cols} × ${rows})`, gW, gH, cols * rows,
    `(L ÷ ${cols} − ${p.colunaFace} + 2×${p.encaixeVidro}) × (H ÷ ${rows} − ${p.travessaFace} + 2×${p.encaixeVidro})`);
  b.add('ANCORAGEM_FACHADA', (cols + 1) * (rows + 1));
  b.addGlassSeal(gW, gH, cols * rows);
  b.add('SILICONE_ESTRUTURAL', Math.ceil((2 * (gW + gH) * cols * rows) / 1000 / 6));
  b.add('PARAFUSO_KIT', Math.ceil((cols * rows) / 2));
  b.warnings.push('Fachada exige projeto estrutural (pressão de vento — NBR 10821 / NBR 6123) e ART do responsável.');
  b.warnIf(H > 6000, 'Colunas acima de 6 m exigem emenda (luva de dilatação) — conferir com o projeto.');
  const panels: DrawingPanel[] = [];
  const lines: NonNullable<CuttingList['drawing']['lines']> = [];
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    panels.push({ x: c * modW + p.colunaFace / 2, y: r * modH + p.travessaFace / 2, w: modW - p.colunaFace, h: modH - p.travessaFace, fill: 'glass', motion: 'fixed' });
  }
  for (let c = 0; c <= cols; c++) lines.push({ x1: c * modW, y1: 0, x2: c * modW, y2: H, kind: 'mullion' });
  for (let r = 0; r <= rows; r++) lines.push({ x1: 0, y1: r * modH, x2: L, y2: r * modH, kind: 'mullion' });
  return b.build(
    { count: cols * rows, widthMm: mm(modW), heightMm: mm(modH), fixed: panels.map(() => true) },
    { widthMm: L, heightMm: H, frame: 'facade', frameFaceMm: p.colunaFace, panels, lines },
  );
}

// ===========================================================================
// GUARDA-CORPO DE ALUMÍNIO COM VIDRO
// ===========================================================================
export function guardaCorpoAluminio(input: ItemInput, line: LineDefinition): CuttingList {
  const b = new Bom(input, line);
  const p = b.params('guardaCorpo', ['vaoMax', 'colunaFace', 'corrimaoAltura', 'baseAltura', 'encaixeVidro'] as const);
  const L = input.widthMm, H = input.heightMm;
  const posts = Math.ceil(L / p.vaoMax) + 1, spans = posts - 1;
  const iw = (L - posts * p.colunaFace) / spans;
  const ih = H - p.corrimaoAltura - p.baseAltura;
  b.cut('CORRIMAO', L, 1, 'L');
  b.cut('BASE', L, 1, 'L');
  b.cut('COLUNA', H - p.corrimaoAltura, posts, `H − ${p.corrimaoAltura} · ${posts} colunas`);
  b.cut('BAGUETE', iw, 2 * spans, `vão entre colunas (L − ${posts}×${p.colunaFace}) ÷ ${spans}`);
  const gW = iw + 2 * p.encaixeVidro, gH = ih + 2 * p.encaixeVidro;
  b.glass('Painel de vidro', gW, gH, spans, `(vão + 2×${p.encaixeVidro}) × (H − ${p.corrimaoAltura} − ${p.baseAltura} + 2×${p.encaixeVidro})`,
    'Guarda-corpo: vidro laminado obrigatório (NBR 14718).');
  b.add('FIXADOR_COLUNA', posts);
  b.add('TAMPA_CORRIMAO', 2);
  b.addGlassSeal(gW, gH, spans);
  b.add('PARAFUSO_KIT', Math.ceil(posts / 2));
  b.warnIf(!GLASSES[input.glassCode].laminated, 'NBR 14718: guarda-corpo exige vidro laminado.');
  b.warnIf(H < 1100, 'NBR 14718: altura mínima usual de 1,10 m em sacadas e terraços — confirme o uso.');
  const panels: DrawingPanel[] = Array.from({ length: spans }, (_, i) => ({
    x: p.colunaFace + i * (iw + p.colunaFace), y: p.corrimaoAltura, w: iw, h: ih, fill: 'glass', motion: 'fixed',
  }));
  const lines: NonNullable<CuttingList['drawing']['lines']> = [
    { x1: 0, y1: p.corrimaoAltura / 2, x2: L, y2: p.corrimaoAltura / 2, kind: 'rail' },
    { x1: 0, y1: H - p.baseAltura / 2, x2: L, y2: H - p.baseAltura / 2, kind: 'rail' },
    ...Array.from({ length: posts }, (_, i) => {
      const x = p.colunaFace / 2 + i * (iw + p.colunaFace);
      return { x1: x, y1: p.corrimaoAltura, x2: x, y2: H, kind: 'post' as const };
    }),
  ];
  return b.build(
    { count: spans, widthMm: mm(iw), heightMm: mm(ih), fixed: panels.map(() => true) },
    { widthMm: L, heightMm: H, frame: 'rail', frameFaceMm: p.colunaFace, panels, lines, floor: true },
  );
}
