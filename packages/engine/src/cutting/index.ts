import { FINISHES, GLASSES, SAW_KERF_MM, STANDARD_BAR_MM, TYPOLOGIES } from '../catalog';
import type { BarPlan, CuttingList, ItemInput, ProfileCut } from '../types';
import { slidingCuttingList } from './sliding';
import { boxFrontalCuttingList, pivotCuttingList } from './tempered';

export class EngineValidationError extends Error {
  constructor(public issues: string[]) {
    super(issues.join(' '));
    this.name = 'EngineValidationError';
  }
}

/** Hard validation — anything returned here blocks the calculation. */
export function validateItem(input: ItemInput): string[] {
  const issues: string[] = [];
  const meta = TYPOLOGIES[input.typology];
  if (!meta) return [`Tipologia inválida: ${String(input.typology)}`];

  if (!meta.lines.includes(input.line)) issues.push(`${meta.label} não está disponível na linha ${input.line}.`);
  if (!FINISHES[input.finish]) issues.push(`Acabamento inválido: ${String(input.finish)}.`);
  if (!GLASSES[input.glassCode]) issues.push(`Vidro inválido: ${String(input.glassCode)}.`);
  else if (!meta.glasses.includes(input.glassCode)) issues.push(`${GLASSES[input.glassCode].label} não é permitido em ${meta.label}.`);

  const { widthMm: w, heightMm: h, quantity: q } = input;
  if (!Number.isFinite(w) || w < meta.minW || w > meta.maxW) issues.push(`Largura deve estar entre ${meta.minW} e ${meta.maxW} mm.`);
  if (!Number.isFinite(h) || h < meta.minH || h > meta.maxH) issues.push(`Altura deve estar entre ${meta.minH} e ${meta.maxH} mm.`);
  if (!Number.isInteger(q) || q < 1 || q > 500) issues.push('Quantidade deve ser um inteiro entre 1 e 500.');
  return issues;
}

/** Workshop entry point: dimensions → profiles, glass and kits for ONE unit. */
export function generateCuttingList(input: ItemInput): CuttingList {
  const issues = validateItem(input);
  if (issues.length) throw new EngineValidationError(issues);

  switch (input.typology) {
    case 'JANELA_CORRER_2F': return slidingCuttingList(input, 'JANELA', 2);
    case 'JANELA_CORRER_4F': return slidingCuttingList(input, 'JANELA', 4);
    case 'PORTA_CORRER_2F':  return slidingCuttingList(input, 'PORTA', 2);
    case 'BOX_FRONTAL':      return boxFrontalCuttingList(input);
    case 'PORTA_PIVOTANTE':  return pivotCuttingList(input);
  }
}

/**
 * Bar optimisation (First-Fit Decreasing) over one or more cutting lists,
 * multiplying by each item's quantity. Groups by profile code, so the same
 * profile used in several quote items shares bars.
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
      if (len > barLengthMm) {
        // Oversized piece: needs splicing / special-length bar. Give it its own "bar".
        bars.push({ cuts: [len], free: 0 });
        continue;
      }
      const need = len + kerfMm;
      const bar = bars.find((b) => b.free >= need || b.free === len); // last cut may skip kerf
      if (bar) { bar.cuts.push(len); bar.free -= Math.min(need, bar.free); }
      else bars.push({ cuts: [len], free: barLengthMm - need });
    }
    const used = lengths.reduce((s, l) => s + l, 0);
    const total = bars.length * barLengthMm;
    plans.push({
      code, name, barLengthMm,
      bars: bars.map((b) => ({ cuts: b.cuts, wasteMm: Math.max(0, b.free) })),
      totalPieces: lengths.length,
      utilizationPct: total ? Math.round((used / total) * 1000) / 10 : 0,
    });
  }
  return plans.sort((a, b) => a.code.localeCompare(b.code));
}

const baseName = (p: ProfileCut) => (p.group === 'BAGUETE' ? 'Baguete' : p.name);
