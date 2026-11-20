import { GLASSES, PROFILES, SLIDING_PARAMS } from '../catalog';
import type { CuttingList, GlassCut, ItemInput, ProfileCut } from '../types';
import { mm, glassMm, glassWeightKg } from './util';

type Kind = 'JANELA' | 'PORTA';

/**
 * Janela/Porta de correr (Linha Suprema / Gold), cortes a 90°.
 *
 *   Folhas (N)      : 2 ou 4
 *   Largura folha   : 2F → (L − 2·folga + transpasse) / 2
 *                     4F → (L − 2·folga + 2·transpasse + encontro) / 4
 *   Altura folha    : H − descAlturaFolha
 *   Trilhos         : L                (×1 sup, ×1 inf)
 *   Marco lateral   : H − descMarco    (×2)
 *   Montantes       : altura folha     (×N lateral, ×N encontro)
 *   Travessas       : larg. folha − 2·montante (×N sup, ×N inf)
 *   Baguetes        : horiz = larg. folha − 2·montante (×2N)
 *                     vert  = alt. folha − 2·travessa  (×2N)
 *   Vidro           : (larg. folha − 2·montante + 2·encaixe) × (alt. folha − 2·travessa + 2·encaixe)
 */
export function slidingCuttingList(input: ItemInput, kind: Kind, leaves: 2 | 4): CuttingList {
  const line = input.line === 'GOLD' ? 'GOLD' : 'SUPREMA';
  const p = SLIDING_PARAMS[line][kind];
  const prof = PROFILES[line][kind];
  const L = input.widthMm;
  const H = input.heightMm;
  const N = leaves;
  const warnings: string[] = [];

  const leafW =
    N === 2
      ? (L - 2 * p.folgaLateral + p.transpasse) / 2
      : (L - 2 * p.folgaLateral + 2 * p.transpasse + p.encontroCentral) / 4;
  const leafH = H - p.folhaAlturaDesc;

  const railLen = leafW - 2 * p.montanteLargura;
  const beadV = leafH - 2 * p.travessaAltura;

  const cut = (spec: (typeof prof)[keyof typeof prof], lengthMm: number, qty: number, formula: string): ProfileCut => ({
    code: spec.code, name: spec.name, group: spec.group, kgPerM: spec.kgPerM,
    lengthMm: mm(lengthMm), qty, cutAngle: 90, formula,
  });

  const profiles: ProfileCut[] = [
    cut(prof.TRILHO_SUP, L, 1, 'L'),
    cut(prof.TRILHO_INF, L, 1, 'L'),
    cut(prof.MARCO_LATERAL, H - p.marcoLateralDesc, 2, `H − ${p.marcoLateralDesc}`),
    cut(prof.FOLHA_MONTANTE_LATERAL, leafH, N, `H − ${p.folhaAlturaDesc}`),
    cut(prof.FOLHA_MONTANTE_ENCONTRO, leafH, N, `H − ${p.folhaAlturaDesc}`),
    cut(prof.FOLHA_TRAVESSA_SUP, railLen, N, `folha − 2×${p.montanteLargura}`),
    cut(prof.FOLHA_TRAVESSA_INF, railLen, N, `folha − 2×${p.montanteLargura}`),
    { ...cut(prof.BAGUETE, railLen, 2 * N, `folha − 2×${p.montanteLargura}`), name: 'Baguete horizontal' },
    { ...cut(prof.BAGUETE, beadV, 2 * N, `alt. folha − 2×${p.travessaAltura}`), name: 'Baguete vertical' },
  ];

  const spec = GLASSES[input.glassCode];
  const gW = glassMm(leafW - 2 * p.montanteLargura + 2 * p.encaixeVidro);
  const gH = glassMm(leafH - 2 * p.travessaAltura + 2 * p.encaixeVidro);
  const glasses: GlassCut[] = [{
    label: N === 2 ? 'Vidro da folha' : 'Vidro da folha (×4)',
    glassCode: input.glassCode,
    widthMm: gW, heightMm: gH, qty: N, tempered: spec.tempered,
    formula: `(folha − 2×${p.montanteLargura} + 2×${p.encaixeVidro}) × (alt. folha − 2×${p.travessaAltura} + 2×${p.encaixeVidro})`,
    notes: spec.tempered ? 'Temperado: medida final de fábrica, não recortar.' : undefined,
  }];

  const leafKg = glassWeightKg(gW, gH, spec.thicknessMm);
  const maxLeafKg = kind === 'PORTA' ? (line === 'GOLD' ? 90 : 60) : 35;
  if (leafKg > maxLeafKg) {
    warnings.push(
      `Peso do vidro por folha ≈ ${leafKg.toFixed(1)} kg (limite recomendado ${maxLeafKg} kg para ${line === 'GOLD' ? 'Linha Gold' : 'Linha Suprema'}).` +
      (line === 'SUPREMA' && kind === 'PORTA' ? ' Considere a Linha Gold.' : ''),
    );
  }
  if (kind === 'PORTA' && !spec.tempered) {
    warnings.push('Porta com vidro comum: verifique a NBR 7199 — em portas o vidro de segurança (temperado/laminado) é o indicado.');
  }

  const kit = kind === 'PORTA' ? 'KIT_PORTA_CORRER_2F' : N === 2 ? 'KIT_JANELA_2F' : 'KIT_JANELA_4F';
  const kitName = kind === 'PORTA' ? 'Kit porta de correr 2F' : `Kit janela de correr ${N}F`;

  return {
    typology: input.typology,
    line: input.line,
    input,
    profiles,
    glasses,
    accessories: [{ code: kit, name: kitName, qty: 1 }],
    leaves: {
      count: N,
      widthMm: mm(leafW),
      heightMm: mm(leafH),
      fixed: Array.from({ length: N }, () => false),
    },
    warnings,
  };
}

