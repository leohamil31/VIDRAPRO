import { BOX_PARAMS, GLASSES, PIVOT_PARAMS, TEMPERED_PROFILES } from '../catalog';
import type { CuttingList, GlassCut, ItemInput, ProfileCut } from '../types';
import { glassMm, glassWeightKg, mm } from './util';

const pc = (
  spec: (typeof TEMPERED_PROFILES)[keyof typeof TEMPERED_PROFILES],
  lengthMm: number, qty: number, formula: string,
): ProfileCut => ({
  code: spec.code, name: spec.name, group: spec.group, kgPerM: spec.kgPerM,
  lengthMm: mm(lengthMm), qty, cutAngle: 90, formula,
});

/**
 * Box Frontal Padrão — vidro temperado 8mm.
 *
 *   Até 1400mm → 2 painéis (1 fixo + 1 móvel); acima → 4 painéis (2 fixos laterais + 2 móveis centrais)
 *   Largura painel : (L + (N/2)·transpasse) ÷ N
 *   Altura fixo    : H − 15   (U inferior + trilho)
 *   Altura móvel   : H − 35   (roldanas + folga de piso)
 *   Trilho sup.    : L
 *   U inferior     : largura painel (×N/2, sob os fixos)
 *   U lateral      : H − 15 (×2)
 */
export function boxFrontalCuttingList(input: ItemInput): CuttingList {
  const p = BOX_PARAMS;
  const L = input.widthMm;
  const H = input.heightMm;
  const N = L <= p.maxWidth2F ? 2 : 4;
  const half = N / 2;
  const warnings: string[] = [];

  const panelW = (L + half * p.transpasse) / N;
  const fixoH = H - p.trilhoAltura;
  const movelH = H - p.folgaMovel;

  const profiles: ProfileCut[] = [
    pc(TEMPERED_PROFILES.BOX_TRILHO_SUP, L, 1, 'L'),
    pc(TEMPERED_PROFILES.BOX_U_INF, panelW, half, `(L + ${half}×${p.transpasse}) ÷ ${N}`),
    pc(TEMPERED_PROFILES.BOX_U_LAT, H - p.uLateralDesc, 2, `H − ${p.uLateralDesc}`),
  ];
  if (N === 2) profiles.push(pc(TEMPERED_PROFILES.BOX_GUIA, movelH, 1, `H − ${p.folgaMovel}`));

  const spec = GLASSES[input.glassCode];
  const gW = glassMm(panelW);
  const glasses: GlassCut[] = [
    {
      label: N === 2 ? 'Painel fixo' : 'Painéis fixos (laterais)',
      glassCode: input.glassCode, widthMm: gW, heightMm: glassMm(fixoH), qty: half, tempered: true,
      formula: `(L + ${half}×${p.transpasse}) ÷ ${N} × (H − ${p.trilhoAltura})`,
      notes: 'Furos de fixação conforme gabarito do kit (antes da têmpera).',
    },
    {
      label: N === 2 ? 'Painel móvel' : 'Painéis móveis (centrais)',
      glassCode: input.glassCode, widthMm: gW, heightMm: glassMm(movelH), qty: half, tempered: true,
      formula: `(L + ${half}×${p.transpasse}) ÷ ${N} × (H − ${p.folgaMovel})`,
      notes: 'Furos para 2 roldanas + puxador conforme gabarito do kit (antes da têmpera).',
    },
  ];

  if (!spec.tempered) warnings.push('Box exige vidro temperado.');
  if (gW < 350) warnings.push('Painel muito estreito (< 350 mm): confirme a medida do vão.');
  if (gW > 1000) warnings.push('Painel com mais de 1000 mm de largura: confirme a capacidade das roldanas.');

  return {
    typology: input.typology, line: input.line, input, profiles, glasses,
    accessories: [{ code: N === 2 ? 'KIT_BOX_2F' : 'KIT_BOX_4F', name: `Kit box frontal ${N} folhas`, qty: 1 }],
    leaves: {
      count: N, widthMm: mm(panelW), heightMm: mm(movelH),
      fixed: N === 2 ? [true, false] : [true, false, false, true],
    },
    warnings,
  };
}

/**
 * Porta Pivotante — vidro temperado 8/10mm.
 *
 *   Largura vidro : L − 2·4
 *   Altura vidro  : H − 10 (piso) − 5 (superior)
 *   Batente       : H (×1)
 */
export function pivotCuttingList(input: ItemInput): CuttingList {
  const p = PIVOT_PARAMS;
  const L = input.widthMm;
  const H = input.heightMm;
  const spec = GLASSES[input.glassCode];
  const warnings: string[] = [];

  const gW = glassMm(L - 2 * p.folgaLateral);
  const gH = glassMm(H - p.folgaPiso - p.folgaSuperior);
  const kg = glassWeightKg(gW, gH, spec.thicknessMm);

  if (kg > p.maxLeafKg) warnings.push(`Folha ≈ ${kg.toFixed(1)} kg acima de ${p.maxLeafKg} kg: use pivô reforçado ou mola de piso.`);
  if (spec.thicknessMm < 10 && gH > 2200) warnings.push('Altura acima de 2200 mm: recomenda-se vidro 10mm.');

  return {
    typology: input.typology, line: input.line, input,
    profiles: [pc(TEMPERED_PROFILES.PIV_BATENTE, H, 1, 'H')],
    glasses: [{
      label: 'Folha pivotante', glassCode: input.glassCode, widthMm: gW, heightMm: gH, qty: 1, tempered: true,
      formula: `(L − 2×${p.folgaLateral}) × (H − ${p.folgaPiso} − ${p.folgaSuperior})`,
      notes: 'Recortes para pivô superior, pivô inferior, fechadura e furos do puxador conforme gabarito (antes da têmpera).',
    }],
    accessories: [{ code: 'KIT_PIVOTANTE', name: 'Kit pivotante (pivôs, puxador, fechadura)', qty: 1 }],
    leaves: { count: 1, widthMm: gW, heightMm: gH, fixed: [false] },
    warnings,
  };
}
