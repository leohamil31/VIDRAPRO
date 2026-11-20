import type { LineDefinition, LineFamily, ProfileGroup, ProfileSpec } from './types';

/**
 * Aluminium lines are pure data. A tenant creates a new line by copying one of
 * these and editing codes, kg/m and deductions — no code change needed.
 *
 * ⚠️ Codes, weights and deductions are REFERENCE values. Validate them against
 * the catalogue of your extruder before producing.
 */

// ---------------------------------------------------------------------------
// Roles: what a profile does inside a model (independent of the line)
// ---------------------------------------------------------------------------
export const PROFILE_ROLES: Record<LineFamily, Record<string, { name: string; group: ProfileGroup; suffix: string }>> = {
  ESQUADRIA: {
    TRILHO_SUP:        { name: 'Trilho superior',                group: 'TRILHO',    suffix: 'TS' },
    TRILHO_INF:        { name: 'Trilho inferior',                group: 'TRILHO',    suffix: 'TI' },
    TRILHO_SUP_3:      { name: 'Trilho superior 3 vias',         group: 'TRILHO',    suffix: 'TS3' },
    TRILHO_INF_3:      { name: 'Trilho inferior 3 vias',         group: 'TRILHO',    suffix: 'TI3' },
    MARCO_LATERAL:     { name: 'Marco lateral',                  group: 'MARCO',     suffix: 'ML' },
    FOLHA_LAT:         { name: 'Montante lateral da folha',      group: 'FOLHA',     suffix: 'FL' },
    FOLHA_ENC:         { name: 'Montante de encontro',           group: 'FOLHA',     suffix: 'FE' },
    FOLHA_TRAV_SUP:    { name: 'Travessa superior da folha',     group: 'FOLHA',     suffix: 'TVS' },
    FOLHA_TRAV_INF:    { name: 'Travessa inferior da folha',     group: 'FOLHA',     suffix: 'TVI' },
    PORTA_TRILHO_SUP:  { name: 'Trilho superior porta',          group: 'TRILHO',    suffix: 'PTS' },
    PORTA_TRILHO_INF:  { name: 'Trilho inferior porta',          group: 'TRILHO',    suffix: 'PTI' },
    PORTA_MARCO_LAT:   { name: 'Marco lateral porta',            group: 'MARCO',     suffix: 'PML' },
    PORTA_FOLHA_LAT:   { name: 'Montante lateral porta',         group: 'FOLHA',     suffix: 'PFL' },
    PORTA_FOLHA_ENC:   { name: 'Montante de encontro porta',     group: 'FOLHA',     suffix: 'PFE' },
    PORTA_TRAV_SUP:    { name: 'Travessa superior porta',        group: 'FOLHA',     suffix: 'PTVS' },
    PORTA_TRAV_INF:    { name: 'Travessa inferior porta',        group: 'FOLHA',     suffix: 'PTVI' },
    MARCO_GIRO:        { name: 'Marco (maxim-ar / basculante / fixo)', group: 'MARCO', suffix: 'MG' },
    FOLHA_GIRO:        { name: 'Folha de abrir / maxim-ar',      group: 'FOLHA',     suffix: 'FG' },
    MARCO_PORTA:       { name: 'Marco / batente de porta de giro', group: 'MARCO',   suffix: 'MP' },
    FOLHA_PORTA:       { name: 'Montante / travessa de porta de giro', group: 'FOLHA', suffix: 'FP' },
    RODAPE_PORTA:      { name: 'Rodapé de porta',                group: 'FOLHA',     suffix: 'RD' },
    TRAVESSA_INTERM:   { name: 'Travessa intermediária',         group: 'FOLHA',     suffix: 'TIM' },
    BAGUETE:           { name: 'Baguete',                        group: 'BAGUETE',   suffix: 'BG' },
    LAMBRI:            { name: 'Lambri (lambril)',               group: 'LAMBRI',    suffix: 'LB' },
    PALHETA:           { name: 'Palheta de veneziana',           group: 'VENEZIANA', suffix: 'PV' },
  },
  FACHADA: {
    COLUNA:            { name: 'Coluna (montante) da fachada',   group: 'ESTRUTURA', suffix: 'COL' },
    TRAVESSA:          { name: 'Travessa da fachada',            group: 'ESTRUTURA', suffix: 'TRV' },
    PRESSOR:           { name: 'Perfil pressor',                 group: 'BAGUETE',   suffix: 'PRS' },
    ARREMATE:          { name: 'Capa / arremate externo',        group: 'ACABAMENTO', suffix: 'CAP' },
  },
  GUARDA_CORPO: {
    CORRIMAO:          { name: 'Corrimão',                       group: 'ESTRUTURA', suffix: 'COR' },
    BASE:              { name: 'Perfil de base (inferior)',      group: 'ESTRUTURA', suffix: 'BAS' },
    COLUNA:            { name: 'Coluna do guarda-corpo',         group: 'ESTRUTURA', suffix: 'COL' },
    BAGUETE:           { name: 'Baguete do guarda-corpo',        group: 'BAGUETE',   suffix: 'BG' },
  },
  TEMPERADO: {},
};

export const PARAM_LABELS: Record<string, { label: string; keys: Record<string, string> }> = {
  correr: { label: 'Janelas de correr', keys: {
    marcoLateralDesc: 'Desconto do marco lateral (H − x)', folgaLateral: 'Folga lateral da folha',
    transpasse: 'Transpasse entre folhas', encontroCentral: 'Encontro central (4 folhas)',
    folhaAlturaDesc: 'Desconto de altura da folha (H − x)', montanteLargura: 'Largura do montante',
    travessaAltura: 'Altura da travessa', encaixeVidro: 'Encaixe do vidro no perfil' } },
  correrPorta: { label: 'Portas de correr', keys: {
    marcoLateralDesc: 'Desconto do marco lateral (H − x)', folgaLateral: 'Folga lateral da folha',
    transpasse: 'Transpasse entre folhas', encontroCentral: 'Encontro central (4 folhas)',
    folhaAlturaDesc: 'Desconto de altura da folha (H − x)', montanteLargura: 'Largura do montante',
    travessaAltura: 'Altura da travessa', encaixeVidro: 'Encaixe do vidro no perfil' } },
  abrir: { label: 'Maxim-ar, basculante, abrir e fixo', keys: {
    marcoFace: 'Face do marco', recobrimento: 'Recobrimento folha/marco', folga: 'Folga entre folhas',
    folhaFace: 'Face da folha', encaixeVidro: 'Encaixe do vidro', basculanteModulo: 'Altura máx. de cada basculante' } },
  portaGiro: { label: 'Portas de giro', keys: {
    marcoFace: 'Face do marco', folgaLateral: 'Folga lateral', folgaSuperior: 'Folga superior', folgaPiso: 'Folga de piso',
    folhaFace: 'Face do montante da folha', rodape: 'Altura do rodapé', intermediaria: 'Altura da travessa intermediária',
    alturaIntermediaria: 'Eixo da travessa intermediária (do piso)', encaixeVidro: 'Encaixe do vidro' } },
  lambri: { label: 'Lambri', keys: { modulo: 'Largura útil do lambril', reforcoMax: 'Vão máx. entre reforços' } },
  veneziana: { label: 'Veneziana', keys: { passo: 'Passo entre palhetas', desconto: 'Desconto do comprimento da palheta' } },
  fachada: { label: 'Fachada', keys: {
    moduloLargura: 'Largura máx. do módulo', moduloAltura: 'Altura máx. do módulo', colunaFace: 'Face da coluna',
    travessaFace: 'Face da travessa', encaixeVidro: 'Encaixe do vidro' } },
  guardaCorpo: { label: 'Guarda-corpo', keys: {
    vaoMax: 'Vão máx. entre colunas', colunaFace: 'Face da coluna', corrimaoAltura: 'Altura do corrimão',
    baseAltura: 'Altura do perfil de base', encaixeVidro: 'Encaixe do vidro' } },
};

// ---------------------------------------------------------------------------
// Built-in lines (generated from a base + factors so they stay consistent)
// ---------------------------------------------------------------------------
const BASE_KG: Record<string, number> = {
  TRILHO_SUP: 0.452, TRILHO_INF: 0.548, TRILHO_SUP_3: 0.650, TRILHO_INF_3: 0.780, MARCO_LATERAL: 0.398,
  FOLHA_LAT: 0.441, FOLHA_ENC: 0.473, FOLHA_TRAV_SUP: 0.382, FOLHA_TRAV_INF: 0.415,
  PORTA_TRILHO_SUP: 0.612, PORTA_TRILHO_INF: 0.705, PORTA_MARCO_LAT: 0.521, PORTA_FOLHA_LAT: 0.598,
  PORTA_FOLHA_ENC: 0.634, PORTA_TRAV_SUP: 0.486, PORTA_TRAV_INF: 0.702,
  MARCO_GIRO: 0.520, FOLHA_GIRO: 0.480, MARCO_PORTA: 0.740, FOLHA_PORTA: 0.680, RODAPE_PORTA: 1.050,
  TRAVESSA_INTERM: 0.620, BAGUETE: 0.118, LAMBRI: 0.620, PALHETA: 0.210,
};

const BASE_PARAMS = {
  correr:      { marcoLateralDesc: 32, folgaLateral: 10, transpasse: 50, encontroCentral: 20, folhaAlturaDesc: 45, montanteLargura: 30, travessaAltura: 30, encaixeVidro: 8 },
  correrPorta: { marcoLateralDesc: 38, folgaLateral: 10, transpasse: 55, encontroCentral: 20, folhaAlturaDesc: 52, montanteLargura: 36, travessaAltura: 40, encaixeVidro: 9 },
  abrir:       { marcoFace: 32, recobrimento: 10, folga: 3, folhaFace: 34, encaixeVidro: 8, basculanteModulo: 350 },
  portaGiro:   { marcoFace: 40, folgaLateral: 3, folgaSuperior: 3, folgaPiso: 8, folhaFace: 45, rodape: 110, intermediaria: 60, alturaIntermediaria: 1000, encaixeVidro: 9 },
  lambri:      { modulo: 100, reforcoMax: 1000 },
  veneziana:   { passo: 40, desconto: 2 },
};

/** Keys that are clearances or fixed values — not scaled with the profile size. */
const UNSCALED = new Set(['folgaLateral', 'folga', 'folgaSuperior', 'folgaPiso', 'alturaIntermediaria', 'basculanteModulo', 'modulo', 'reforcoMax', 'passo', 'desconto']);

function makeEsquadriaLine(id: string, name: string, prefix: string, kgFactor: number, sizeFactor: number, description: string): LineDefinition {
  const profiles: Record<string, ProfileSpec> = {};
  for (const [role, meta] of Object.entries(PROFILE_ROLES.ESQUADRIA)) {
    profiles[role] = { code: `${prefix}-${meta.suffix}`, name: meta.name, kgPerM: Math.round(BASE_KG[role] * kgFactor * 1000) / 1000 };
  }
  const params: Record<string, Record<string, number>> = {};
  for (const [group, values] of Object.entries(BASE_PARAMS)) {
    params[group] = {};
    for (const [k, v] of Object.entries(values)) params[group][k] = UNSCALED.has(k) ? v : Math.round(v * sizeFactor);
  }
  return { id, name, family: 'ESQUADRIA', description, builtIn: true, profiles, params };
}

export const BUILTIN_LINES: LineDefinition[] = [
  makeEsquadriaLine('SUPREMA', 'Linha Suprema (25 mm)', 'SU', 1.0, 1.0,
    'Linha residencial mais usada do mercado. Janelas e portas de correr, giro, maxim-ar e basculante em vãos normais.'),
  makeEsquadriaLine('GOLD', 'Linha Gold (32 mm)', 'GO', 1.35, 1.2,
    'Perfis mais robustos para vãos grandes e vidros pesados. Mais cara por kg de alumínio.'),
  makeEsquadriaLine('LINHA_30', 'Linha 30', 'L30', 1.18, 1.1,
    'Intermediária entre Suprema e Gold. Boa para portas de giro e lambris.'),
  makeEsquadriaLine('INOVA', 'Linha Inova', 'INV', 1.25, 1.15,
    'Residencial médio/alto padrão, maior estanqueidade e acabamento.'),
  makeEsquadriaLine('LINHA_16', 'Linha 16 (econômica)', 'L16', 0.72, 0.85,
    'Econômica para vãos pequenos (vitrôs, banheiros). Evite em portas e vãos grandes.'),
  {
    id: 'FACHADA_STICK', name: 'Fachada Pele de Vidro (Stick)', family: 'FACHADA', builtIn: true,
    description: 'Fachada cortina montada em obra: colunas, travessas, pressor e capa.',
    profiles: {
      COLUNA:   { code: 'FS-COL', name: 'Coluna (montante) da fachada', kgPerM: 2.10 },
      TRAVESSA: { code: 'FS-TRV', name: 'Travessa da fachada',          kgPerM: 1.35 },
      PRESSOR:  { code: 'FS-PRS', name: 'Perfil pressor',               kgPerM: 0.55 },
      ARREMATE: { code: 'FS-CAP', name: 'Capa / arremate externo',      kgPerM: 0.32 },
    },
    params: { fachada: { moduloLargura: 1250, moduloAltura: 1500, colunaFace: 52, travessaFace: 52, encaixeVidro: 12 } },
  },
  {
    id: 'GUARDA_CORPO_AL', name: 'Guarda-corpo de alumínio', family: 'GUARDA_CORPO', builtIn: true,
    description: 'Colunas, corrimão e base de alumínio com vidro laminado.',
    profiles: {
      CORRIMAO: { code: 'GC-COR', name: 'Corrimão',                  kgPerM: 1.10 },
      BASE:     { code: 'GC-BAS', name: 'Perfil de base (inferior)', kgPerM: 0.95 },
      COLUNA:   { code: 'GC-COL', name: 'Coluna do guarda-corpo',    kgPerM: 1.45 },
      BAGUETE:  { code: 'GC-BG',  name: 'Baguete do guarda-corpo',   kgPerM: 0.20 },
    },
    params: { guardaCorpo: { vaoMax: 1200, colunaFace: 50, corrimaoAltura: 60, baseAltura: 45, encaixeVidro: 12 } },
  },
  {
    id: 'TEMPERADO', name: 'Vidro temperado (Blindex)', family: 'TEMPERADO', builtIn: true,
    description: 'Sistemas em vidro temperado com ferragens e perfis de alumínio.',
    profiles: {}, params: {},
  },
];

export const DEFAULT_LINE_BY_FAMILY: Record<LineFamily, string> = {
  ESQUADRIA: 'SUPREMA', FACHADA: 'FACHADA_STICK', GUARDA_CORPO: 'GUARDA_CORPO_AL', TEMPERADO: 'TEMPERADO',
};

/** Built-ins first, then tenant lines (a custom line can't shadow a built-in id). */
export function allLines(custom: LineDefinition[] = []): LineDefinition[] {
  const builtInIds = new Set(BUILTIN_LINES.map((l) => l.id));
  return [...BUILTIN_LINES, ...custom.filter((c) => !builtInIds.has(c.id)).map((c) => ({ ...c, builtIn: false }))];
}

export function findLine(id: string, custom: LineDefinition[] = []): LineDefinition | undefined {
  return allLines(custom).find((l) => l.id === id);
}

/** Create an editable copy of any line. */
export function cloneLine(source: LineDefinition, id: string, name: string): LineDefinition {
  return {
    ...structuredCloneSafe(source), id, name, builtIn: false, basedOn: source.id,
    description: `Baseada em ${source.name}. Ajuste códigos, pesos e descontos conforme o catálogo do seu fornecedor.`,
  };
}

/** Checks a (custom) line has every role/param its family needs. */
export function validateLineDefinition(line: LineDefinition): string[] {
  const issues: string[] = [];
  if (!/^[A-Z0-9_]{2,40}$/.test(line.id)) issues.push('Identificador da linha deve ter 2–40 letras maiúsculas, números ou _.');
  if (!line.name || line.name.trim().length < 2) issues.push('Informe o nome da linha.');
  const ref = BUILTIN_LINES.find((l) => l.family === line.family);
  if (!ref) return [...issues, 'Família de linha inválida.'];
  for (const role of Object.keys(ref.profiles)) {
    const p = line.profiles?.[role];
    if (!p) issues.push(`Perfil ausente: ${PROFILE_ROLES[line.family][role]?.name ?? role}.`);
    else if (!(p.kgPerM > 0 && p.kgPerM < 20)) issues.push(`Peso inválido em ${p.name || role} (kg/m).`);
  }
  for (const [group, values] of Object.entries(ref.params)) {
    for (const key of Object.keys(values)) {
      const v = line.params?.[group]?.[key];
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 5000) issues.push(`Parâmetro inválido: ${PARAM_LABELS[group]?.keys[key] ?? key}.`);
    }
  }
  return issues;
}

function structuredCloneSafe<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}
