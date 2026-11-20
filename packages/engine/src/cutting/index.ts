import { FINISHES, GLASSES, SAW_KERF_MM, STANDARD_BAR_MM } from '../catalog';
import { DEFAULT_LINE_BY_FAMILY, findLine } from '../lines';
import { TYPOLOGIES } from '../typologies';
import type { BarPlan, CuttingList, Drawing, ItemInput, LineDefinition, ProfileCut } from '../types';
import * as E from './esquadrias';
import * as T from './temperados';

export class EngineValidationError extends Error {
  constructor(public issues: string[]) {
    super(issues.join(' '));
    this.name = 'EngineValidationError';
  }
}

/** Hard validation — anything returned blocks the calculation. */
export function validateItem(input: ItemInput, customLines: LineDefinition[] = []): string[] {
  const issues: string[] = [];
  const meta = TYPOLOGIES[input.typology];
  if (!meta) return [`Modelo inválido: ${String(input.typology)}`];

  const line = findLine(input.line, customLines);
  if (!line) issues.push(`Linha não encontrada: ${String(input.line)}.`);
  else if (line.family !== meta.family) issues.push(`${meta.label} não é fabricado na ${line.name}.`);
  if (!FINISHES[input.finish]) issues.push(`Acabamento inválido: ${String(input.finish)}.`);
  if (!GLASSES[input.glassCode]) issues.push(`Vidro inválido: ${String(input.glassCode)}.`);
  else if (!meta.glasses.includes(input.glassCode)) issues.push(`${GLASSES[input.glassCode].label} não é permitido em ${meta.label}.`);

  const { widthMm: w, heightMm: h, quantity: q } = input;
  if (!Number.isFinite(w) || w < meta.minW || w > meta.maxW) issues.push(`Largura deve estar entre ${meta.minW} e ${meta.maxW} mm.`);
  if (!Number.isFinite(h) || h < meta.minH || h > meta.maxH) issues.push(`Altura deve estar entre ${meta.minH} e ${meta.maxH} mm.`);
  if (meta.depth) {
    const d = input.depthMm;
    if (d == null || !Number.isFinite(d) || d < meta.depth.min || d > meta.depth.max) issues.push(`${meta.depth.label.replace(' (mm)', '')} deve estar entre ${meta.depth.min} e ${meta.depth.max} mm.`);
  }
  if (!Number.isInteger(q) || q < 1 || q > 500) issues.push('Quantidade deve ser um inteiro entre 1 e 500.');
  return issues;
}

/** Workshop entry point: dimensions + line → profiles, glass, accessories and drawing for ONE unit. */
export function generateCuttingList(input: ItemInput, customLines: LineDefinition[] = []): CuttingList {
  const issues = validateItem(input, customLines);
  if (issues.length) throw new EngineValidationError(issues);
  const line = findLine(input.line, customLines)!;
  try {
    return dispatch(input, line);
  } catch (err) {
    // Custom lines missing a role/param end up here with a readable message
    throw new EngineValidationError([(err as Error).message]);
  }
}

function dispatch(i: ItemInput, l: LineDefinition): CuttingList {
  switch (i.typology) {
    case 'JANELA_CORRER_2F':          return E.sliding(i, l, false, ['VIDRO', 'VIDRO']);
    case 'JANELA_CORRER_4F':          return E.sliding(i, l, false, ['VIDRO', 'VIDRO', 'VIDRO', 'VIDRO']);
    case 'JANELA_VENEZIANA_3F':       return E.sliding(i, l, false, ['VENEZIANA', 'VIDRO', 'VENEZIANA']);
    case 'PORTA_CORRER_2F':           return E.sliding(i, l, true, ['VIDRO', 'VIDRO']);
    case 'PORTA_CORRER_4F':           return E.sliding(i, l, true, ['VIDRO', 'VIDRO', 'VIDRO', 'VIDRO']);
    case 'PORTA_VENEZIANA_CORRER_3F': return E.sliding(i, l, true, ['VENEZIANA', 'VIDRO', 'VENEZIANA']);
    case 'JANELA_MAXIM_AR':           return E.maximAr(i, l);
    case 'JANELA_BASCULANTE':         return E.basculante(i, l);
    case 'JANELA_ABRIR_2F':           return E.abrir2F(i, l);
    case 'FIXO_ALUMINIO':             return E.fixoAluminio(i, l);
    case 'PORTA_GIRO_VIDRO':          return E.portaGiro(i, l, 'VIDRO', 1);
    case 'PORTA_GIRO_2F_VIDRO':       return E.portaGiro(i, l, 'VIDRO', 2);
    case 'PORTA_GIRO_LAMBRI':         return E.portaGiro(i, l, 'LAMBRI', 1);
    case 'PORTA_GIRO_VENEZIANA':      return E.portaGiro(i, l, 'VENEZIANA', 1);
    case 'PAINEL_LAMBRI':             return E.painelLambri(i, l);
    case 'FACHADA_PELE_VIDRO':        return E.fachada(i, l);
    case 'GUARDA_CORPO_ALUMINIO':     return E.guardaCorpoAluminio(i, l);
    case 'BOX_FRONTAL':               return T.boxFrontal(i, l);
    case 'BOX_CANTO':                 return T.boxCanto(i, l);
    case 'PORTA_PIVOTANTE':           return T.pivotante(i, l);
    case 'PORTA_ABRIR_TEMPERADO':     return T.portaAbrirTemperado(i, l);
    case 'PORTA_CORRER_TEMPERADO':    return T.portaCorrerTemperado(i, l);
    case 'JANELA_TEMPERADO_2F':       return T.janelaTemperada(i, l, 2);
    case 'JANELA_TEMPERADO_4F':       return T.janelaTemperada(i, l, 4);
    case 'FIXO_TEMPERADO':            return T.fixoTemperado(i, l);
    case 'SACADA_RETRATIL':           return T.sacada(i, l);
    case 'GUARDA_CORPO_TEMPERADO':    return T.guardaCorpoTemperado(i, l);
  }
}

/**
 * Drawing for previews and customer documents. Never throws: out-of-range
 * sizes are clamped and an unknown (custom) line falls back to the family default.
 */
export function drawingFor(input: Partial<ItemInput> & Pick<ItemInput, 'typology'>, customLines: LineDefinition[] = []): Drawing | null {
  const meta = TYPOLOGIES[input.typology];
  if (!meta) return null;
  const clamp = (v: number | undefined, a: number, b: number, d: number) => (v && Number.isFinite(v) ? Math.min(Math.max(v, a), b) : d);
  const line = findLine(input.line ?? '', customLines);
  const safe: ItemInput = {
    typology: meta.id,
    line: line && line.family === meta.family ? line.id : DEFAULT_LINE_BY_FAMILY[meta.family],
    widthMm: clamp(input.widthMm, meta.minW, meta.maxW, meta.defaultW),
    heightMm: clamp(input.heightMm, meta.minH, meta.maxH, meta.defaultH),
    depthMm: meta.depth ? clamp(input.depthMm, meta.depth.min, meta.depth.max, meta.depth.default) : undefined,
    finish: input.finish && FINISHES[input.finish] ? input.finish : 'BRANCO',
    glassCode: input.glassCode && meta.glasses.includes(input.glassCode) ? input.glassCode : meta.defaultGlass,
    quantity: 1,
  };
  try { return generateCuttingList(safe, customLines).drawing; } catch { return null; }
}

/**
 * Bar optimisation (First-Fit Decreasing) across cutting lists × quantity.
 * Same profile code in several items shares bars. Pieces longer than a bar are
 * listed alone (need splicing or special-length bars).
 */
export function optimizeBars(lists: CuttingList[], barLengthMm = STANDARD_BAR_MM, kerfMm = SAW_KERF_MM): BarPlan[] {
  const byCode = new Map<string, { name: string; lengths: number[] }>();
  for (const list of lists) {
    for (const p of list.profiles) {
      const entry = byCode.get(p.code) ?? { name: baseName(p), lengths: [] };
      for (let i = 0; i < p.qty * list.input.quantity; i++) entry.lengths.push(p.lengthMm);
      byCode.set(p.code, entry);
    }
  }
  const plans: BarPlan[] = [];
  for (const [code, { name, lengths }] of byCode) {
    const sorted = [...lengths].sort((a, b) => b - a);
    const bars: { cuts: number[]; free: number }[] = [];
    for (const len of sorted) {
      if (len > barLengthMm) { bars.push({ cuts: [len], free: 0 }); continue; }
      const need = len + kerfMm;
      const bar = bars.find((b) => b.free >= need || b.free === len);
      if (bar) { bar.cuts.push(len); bar.free -= Math.min(need, bar.free); }
      else bars.push({ cuts: [len], free: barLengthMm - need });
    }
    const used = lengths.reduce((s, l) => s + l, 0);
    const total = bars.reduce((s, b) => s + Math.max(barLengthMm, b.cuts[0]), 0);
    plans.push({
      code, name, barLengthMm,
      bars: bars.map((b) => ({ cuts: b.cuts, wasteMm: Math.max(0, b.free) })),
      totalPieces: lengths.length,
      utilizationPct: total ? Math.round((used / total) * 1000) / 10 : 0,
    });
  }
  return plans.sort((a, b) => a.code.localeCompare(b.code));
}

const baseName = (p: ProfileCut) => (p.group === 'BAGUETE' ? 'Baguete' : p.name.replace(/ (horizontal|vertical).*$/i, ''));
