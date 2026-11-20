import type { Finish, GlassCode, ProductLine, ProfileGroup, TypologyId } from './types';

export const ENGINE_VERSION = '1.0.0';

export const FINISHES: Record<Finish, { label: string; hex: string }> = {
  BRANCO:        { label: 'Branco',        hex: '#F4F6F8' },
  PRETO:         { label: 'Preto',         hex: '#1F2329' },
  NATURAL_FOSCO: { label: 'Natural Fosco', hex: '#B9BEC4' },
  AMADEIRADO:    { label: 'Amadeirado',    hex: '#8A5A36' },
};

export interface GlassSpec {
  label: string;
  thicknessMm: number;
  tempered: boolean;
  tint: string; // schematic fill
}

export const GLASSES: Record<GlassCode, GlassSpec> = {
  COMUM_INCOLOR_4:      { label: 'Comum Incolor 4mm',      thicknessMm: 4,  tempered: false, tint: '#DCEFFB' },
  COMUM_MINIBOREAL_4:   { label: 'Mini Boreal 4mm',        thicknessMm: 4,  tempered: false, tint: '#E8EEF3' },
  TEMPERADO_INCOLOR_6:  { label: 'Temperado Incolor 6mm',  thicknessMm: 6,  tempered: true,  tint: '#D4EBFA' },
  TEMPERADO_INCOLOR_8:  { label: 'Temperado Incolor 8mm',  thicknessMm: 8,  tempered: true,  tint: '#CDE7F8' },
  TEMPERADO_FUME_8:     { label: 'Temperado Fumê 8mm',     thicknessMm: 8,  tempered: true,  tint: '#9AA4AE' },
  TEMPERADO_VERDE_8:    { label: 'Temperado Verde 8mm',    thicknessMm: 8,  tempered: true,  tint: '#BFE3D0' },
  TEMPERADO_INCOLOR_10: { label: 'Temperado Incolor 10mm', thicknessMm: 10, tempered: true,  tint: '#C6E2F5' },
};

/** Glass density ≈ 2.5 kg per m² per mm of thickness. */
export const GLASS_KG_PER_M2_MM = 2.5;

// ---------------------------------------------------------------------------
// Profile catalog
// Codes are internal references. Weights (kg/m) are REFERENCE values: every
// shop must validate them against its extrusora catalog (they drive price).
// ---------------------------------------------------------------------------

export interface ProfileSpec { code: string; name: string; group: ProfileGroup; kgPerM: number }

type ProfileRole =
  | 'TRILHO_SUP' | 'TRILHO_INF' | 'MARCO_LATERAL'
  | 'FOLHA_MONTANTE_LATERAL' | 'FOLHA_MONTANTE_ENCONTRO'
  | 'FOLHA_TRAVESSA_SUP' | 'FOLHA_TRAVESSA_INF' | 'BAGUETE';

export const PROFILES: Record<'SUPREMA' | 'GOLD', Record<'JANELA' | 'PORTA', Record<ProfileRole, ProfileSpec>>> = {
  SUPREMA: {
    JANELA: {
      TRILHO_SUP:              { code: 'SUP-TS', name: 'Trilho superior',             group: 'TRILHO',  kgPerM: 0.452 },
      TRILHO_INF:              { code: 'SUP-TI', name: 'Trilho inferior',             group: 'TRILHO',  kgPerM: 0.548 },
      MARCO_LATERAL:           { code: 'SUP-ML', name: 'Marco lateral',               group: 'MARCO',   kgPerM: 0.398 },
      FOLHA_MONTANTE_LATERAL:  { code: 'SUP-FL', name: 'Montante lateral da folha',   group: 'FOLHA',   kgPerM: 0.441 },
      FOLHA_MONTANTE_ENCONTRO: { code: 'SUP-FE', name: 'Montante de encontro',        group: 'FOLHA',   kgPerM: 0.473 },
      FOLHA_TRAVESSA_SUP:      { code: 'SUP-TVS', name: 'Travessa superior da folha', group: 'FOLHA',   kgPerM: 0.382 },
      FOLHA_TRAVESSA_INF:      { code: 'SUP-TVI', name: 'Travessa inferior da folha', group: 'FOLHA',   kgPerM: 0.415 },
      BAGUETE:                 { code: 'SUP-BG', name: 'Baguete',                     group: 'BAGUETE', kgPerM: 0.118 },
    },
    PORTA: {
      TRILHO_SUP:              { code: 'SUP-PTS', name: 'Trilho superior porta',      group: 'TRILHO',  kgPerM: 0.612 },
      TRILHO_INF:              { code: 'SUP-PTI', name: 'Trilho inferior porta',      group: 'TRILHO',  kgPerM: 0.705 },
      MARCO_LATERAL:           { code: 'SUP-PML', name: 'Marco lateral porta',        group: 'MARCO',   kgPerM: 0.521 },
      FOLHA_MONTANTE_LATERAL:  { code: 'SUP-PFL', name: 'Montante lateral porta',     group: 'FOLHA',   kgPerM: 0.598 },
      FOLHA_MONTANTE_ENCONTRO: { code: 'SUP-PFE', name: 'Montante encontro porta',    group: 'FOLHA',   kgPerM: 0.634 },
      FOLHA_TRAVESSA_SUP:      { code: 'SUP-PTVS', name: 'Travessa superior porta',   group: 'FOLHA',   kgPerM: 0.486 },
      FOLHA_TRAVESSA_INF:      { code: 'SUP-PTVI', name: 'Travessa inferior porta',   group: 'FOLHA',   kgPerM: 0.702 },
      BAGUETE:                 { code: 'SUP-BG', name: 'Baguete',                     group: 'BAGUETE', kgPerM: 0.118 },
    },
  },
  GOLD: {
    JANELA: {
      TRILHO_SUP:              { code: 'GLD-TS', name: 'Trilho superior',             group: 'TRILHO',  kgPerM: 0.610 },
      TRILHO_INF:              { code: 'GLD-TI', name: 'Trilho inferior',             group: 'TRILHO',  kgPerM: 0.742 },
      MARCO_LATERAL:           { code: 'GLD-ML', name: 'Marco lateral',               group: 'MARCO',   kgPerM: 0.536 },
      FOLHA_MONTANTE_LATERAL:  { code: 'GLD-FL', name: 'Montante lateral da folha',   group: 'FOLHA',   kgPerM: 0.598 },
      FOLHA_MONTANTE_ENCONTRO: { code: 'GLD-FE', name: 'Montante de encontro',        group: 'FOLHA',   kgPerM: 0.645 },
      FOLHA_TRAVESSA_SUP:      { code: 'GLD-TVS', name: 'Travessa superior da folha', group: 'FOLHA',   kgPerM: 0.517 },
      FOLHA_TRAVESSA_INF:      { code: 'GLD-TVI', name: 'Travessa inferior da folha', group: 'FOLHA',   kgPerM: 0.561 },
      BAGUETE:                 { code: 'GLD-BG', name: 'Baguete',                     group: 'BAGUETE', kgPerM: 0.142 },
    },
    PORTA: {
      TRILHO_SUP:              { code: 'GLD-PTS', name: 'Trilho superior porta',      group: 'TRILHO',  kgPerM: 0.834 },
      TRILHO_INF:              { code: 'GLD-PTI', name: 'Trilho inferior porta',      group: 'TRILHO',  kgPerM: 0.958 },
      MARCO_LATERAL:           { code: 'GLD-PML', name: 'Marco lateral porta',        group: 'MARCO',   kgPerM: 0.702 },
      FOLHA_MONTANTE_LATERAL:  { code: 'GLD-PFL', name: 'Montante lateral porta',     group: 'FOLHA',   kgPerM: 0.811 },
      FOLHA_MONTANTE_ENCONTRO: { code: 'GLD-PFE', name: 'Montante encontro porta',    group: 'FOLHA',   kgPerM: 0.857 },
      FOLHA_TRAVESSA_SUP:      { code: 'GLD-PTVS', name: 'Travessa superior porta',   group: 'FOLHA',   kgPerM: 0.655 },
      FOLHA_TRAVESSA_INF:      { code: 'GLD-PTVI', name: 'Travessa inferior porta',   group: 'FOLHA',   kgPerM: 0.948 },
      BAGUETE:                 { code: 'GLD-BG', name: 'Baguete',                     group: 'BAGUETE', kgPerM: 0.142 },
    },
  },
};

/** Profiles for the tempered-glass systems (sold in the selected finish). */
export const TEMPERED_PROFILES = {
  BOX_TRILHO_SUP:   { code: 'BOX-TS',  name: 'Trilho superior box',         group: 'TRILHO'     as const, kgPerM: 0.540 },
  BOX_U_INF:        { code: 'BOX-UI',  name: 'Perfil U inferior (fixos)',    group: 'MARCO'      as const, kgPerM: 0.155 },
  BOX_U_LAT:        { code: 'BOX-UL',  name: 'Perfil U lateral',             group: 'MARCO'      as const, kgPerM: 0.155 },
  BOX_GUIA:         { code: 'BOX-GD',  name: 'Guia / cantoneira de batida',  group: 'ACABAMENTO' as const, kgPerM: 0.120 },
  PIV_BATENTE:      { code: 'PIV-BT',  name: 'Batente (cantoneira)',         group: 'ACABAMENTO' as const, kgPerM: 0.210 },
};

// ---------------------------------------------------------------------------
// Deduction parameters (mm). Kept as data so the workshop can audit them and a
// future "Fórmulas" screen can override them per tenant.
// ---------------------------------------------------------------------------

export interface SlidingParams {
  marcoLateralDesc: number; // marco lateral = H − this (sits between the trilhos)
  folgaLateral: number;     // gap between leaf and marco, each side
  transpasse: number;       // overlap between adjacent leaves
  encontroCentral: number;  // extra overlap at the 4-leaf central meeting
  folhaAlturaDesc: number;  // leaf height = H − this
  montanteLargura: number;  // visible width of leaf stile (montante)
  travessaAltura: number;   // visible height of leaf rail (travessa)
  encaixeVidro: number;     // glass bite into each profile
}

export const SLIDING_PARAMS: Record<'SUPREMA' | 'GOLD', Record<'JANELA' | 'PORTA', SlidingParams>> = {
  SUPREMA: {
    JANELA: { marcoLateralDesc: 32, folgaLateral: 10, transpasse: 50, encontroCentral: 20, folhaAlturaDesc: 45, montanteLargura: 30, travessaAltura: 30, encaixeVidro: 8 },
    PORTA:  { marcoLateralDesc: 38, folgaLateral: 10, transpasse: 55, encontroCentral: 20, folhaAlturaDesc: 52, montanteLargura: 36, travessaAltura: 40, encaixeVidro: 9 },
  },
  GOLD: {
    JANELA: { marcoLateralDesc: 36, folgaLateral: 12, transpasse: 60, encontroCentral: 24, folhaAlturaDesc: 50, montanteLargura: 38, travessaAltura: 38, encaixeVidro: 10 },
    PORTA:  { marcoLateralDesc: 42, folgaLateral: 12, transpasse: 64, encontroCentral: 24, folhaAlturaDesc: 58, montanteLargura: 44, travessaAltura: 48, encaixeVidro: 11 },
  },
};

export const BOX_PARAMS = {
  transpasse: 50,         // overlap between fixed and sliding panel
  maxWidth2F: 1400,       // above this the box becomes 4 panels
  trilhoAltura: 15,       // fixed panel height = H − this (U inferior + trilho)
  folgaMovel: 35,         // sliding panel height = H − this (roldanas + piso)
  uLateralDesc: 15,       // U lateral = H − this
};

export const PIVOT_PARAMS = {
  folgaLateral: 4,        // each side
  folgaPiso: 10,
  folgaSuperior: 5,
  maxWidth: 1100,
  maxLeafKg: 80,
};

// ---------------------------------------------------------------------------
// Typologies
// ---------------------------------------------------------------------------

export interface TypologyMeta {
  id: TypologyId;
  label: string;
  short: string;
  lines: ProductLine[];
  glasses: GlassCode[];
  defaultGlass: GlassCode;
  minW: number; maxW: number; minH: number; maxH: number;
  defaultW: number; defaultH: number;
}

const TEMPERED_8_10: GlassCode[] = ['TEMPERADO_INCOLOR_8', 'TEMPERADO_FUME_8', 'TEMPERADO_VERDE_8', 'TEMPERADO_INCOLOR_10'];
const WINDOW_GLASS: GlassCode[] = ['COMUM_INCOLOR_4', 'COMUM_MINIBOREAL_4', 'TEMPERADO_INCOLOR_6', 'TEMPERADO_INCOLOR_8', 'TEMPERADO_FUME_8', 'TEMPERADO_VERDE_8'];

export const TYPOLOGIES: Record<TypologyId, TypologyMeta> = {
  JANELA_CORRER_2F: {
    id: 'JANELA_CORRER_2F', label: 'Janela de Correr 2 Folhas', short: 'Janela 2F',
    lines: ['SUPREMA'], glasses: WINDOW_GLASS, defaultGlass: 'COMUM_INCOLOR_4',
    minW: 500, maxW: 2400, minH: 400, maxH: 1600, defaultW: 1200, defaultH: 1000,
  },
  JANELA_CORRER_4F: {
    id: 'JANELA_CORRER_4F', label: 'Janela de Correr 4 Folhas', short: 'Janela 4F',
    lines: ['SUPREMA'], glasses: WINDOW_GLASS, defaultGlass: 'COMUM_INCOLOR_4',
    minW: 1200, maxW: 4000, minH: 400, maxH: 1600, defaultW: 2000, defaultH: 1200,
  },
  PORTA_CORRER_2F: {
    id: 'PORTA_CORRER_2F', label: 'Porta de Correr 2 Folhas', short: 'Porta 2F',
    lines: ['SUPREMA', 'GOLD'], glasses: ['TEMPERADO_INCOLOR_6', 'TEMPERADO_INCOLOR_8', 'TEMPERADO_FUME_8', 'TEMPERADO_VERDE_8', 'COMUM_MINIBOREAL_4'],
    defaultGlass: 'TEMPERADO_INCOLOR_6',
    minW: 1000, maxW: 3200, minH: 1800, maxH: 2800, defaultW: 1600, defaultH: 2100,
  },
  BOX_FRONTAL: {
    id: 'BOX_FRONTAL', label: 'Box Frontal Padrão (Temperado 8mm)', short: 'Box Frontal',
    lines: ['TEMPERADO'], glasses: ['TEMPERADO_INCOLOR_8', 'TEMPERADO_FUME_8', 'TEMPERADO_VERDE_8'], defaultGlass: 'TEMPERADO_INCOLOR_8',
    minW: 700, maxW: 2400, minH: 1700, maxH: 2200, defaultW: 1200, defaultH: 1900,
  },
  PORTA_PIVOTANTE: {
    id: 'PORTA_PIVOTANTE', label: 'Porta Pivotante (Temperado 8/10mm)', short: 'Pivotante',
    lines: ['TEMPERADO'], glasses: TEMPERED_8_10, defaultGlass: 'TEMPERADO_INCOLOR_10',
    minW: 600, maxW: 1100, minH: 1800, maxH: 2700, defaultW: 900, defaultH: 2100,
  },
};

export const LINE_LABEL: Record<ProductLine, string> = {
  SUPREMA: 'Linha Suprema',
  GOLD: 'Linha Gold',
  TEMPERADO: 'Vidro Temperado',
};

export const STANDARD_BAR_MM = 6000;
export const SAW_KERF_MM = 4;
