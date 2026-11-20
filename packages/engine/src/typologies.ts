import type { Category, GlassCode, LineFamily, TypologyId } from './types';

export interface TypologyMeta {
  id: TypologyId;
  label: string;
  short: string;
  category: Category;
  group: string;               // sub-section inside the category
  family: LineFamily;          // which lines can build it
  usesGlass: boolean;
  glasses: GlassCode[];
  defaultGlass: GlassCode;
  minW: number; maxW: number; minH: number; maxH: number;
  defaultW: number; defaultH: number;
  depth?: { label: string; min: number; max: number; default: number };
}

const COMUM: GlassCode[] = ['COMUM_INCOLOR_4', 'COMUM_FUME_4', 'COMUM_MINIBOREAL_4', 'COMUM_CANELADO_4', 'LAMINADO_INCOLOR_8'];
const TEMP_6_8: GlassCode[] = ['TEMPERADO_INCOLOR_6', 'TEMPERADO_INCOLOR_8', 'TEMPERADO_FUME_8', 'TEMPERADO_VERDE_8', 'TEMPERADO_BRONZE_8'];
const WINDOW: GlassCode[] = [...COMUM, ...TEMP_6_8];
const DOOR: GlassCode[] = ['TEMPERADO_INCOLOR_6', 'TEMPERADO_INCOLOR_8', 'TEMPERADO_FUME_8', 'TEMPERADO_VERDE_8', 'TEMPERADO_BRONZE_8', 'LAMINADO_INCOLOR_8', 'COMUM_MINIBOREAL_4', 'COMUM_CANELADO_4'];
const TEMP_8: GlassCode[] = ['TEMPERADO_INCOLOR_8', 'TEMPERADO_FUME_8', 'TEMPERADO_VERDE_8', 'TEMPERADO_BRONZE_8'];
const TEMP_8_10: GlassCode[] = [...TEMP_8, 'TEMPERADO_INCOLOR_10'];
const SAFETY: GlassCode[] = ['LAMINADO_TEMPERADO_10', 'LAMINADO_TEMPERADO_12', 'LAMINADO_INCOLOR_8'];
const NONE: GlassCode[] = ['SEM_VIDRO'];

type M = Omit<TypologyMeta, 'id'>;
const t = (m: M) => m;

export const TYPOLOGIES: Record<TypologyId, TypologyMeta> = Object.fromEntries(Object.entries({
  // ===================== ESQUADRIAS DE ALUMÍNIO =====================
  JANELA_CORRER_2F: t({ label: 'Janela de Correr 2 Folhas', short: 'Janela 2F', category: 'ESQUADRIA', group: 'Janelas', family: 'ESQUADRIA',
    usesGlass: true, glasses: WINDOW, defaultGlass: 'COMUM_INCOLOR_4', minW: 400, maxW: 2400, minH: 300, maxH: 1600, defaultW: 1200, defaultH: 1000 }),
  JANELA_CORRER_4F: t({ label: 'Janela de Correr 4 Folhas', short: 'Janela 4F', category: 'ESQUADRIA', group: 'Janelas', family: 'ESQUADRIA',
    usesGlass: true, glasses: WINDOW, defaultGlass: 'COMUM_INCOLOR_4', minW: 1200, maxW: 4000, minH: 400, maxH: 1600, defaultW: 2000, defaultH: 1200 }),
  JANELA_VENEZIANA_3F: t({ label: 'Janela Veneziana de Correr 3 Folhas', short: 'Veneziana 3F', category: 'ESQUADRIA', group: 'Janelas', family: 'ESQUADRIA',
    usesGlass: true, glasses: WINDOW, defaultGlass: 'COMUM_INCOLOR_4', minW: 900, maxW: 2400, minH: 800, maxH: 1600, defaultW: 1500, defaultH: 1200 }),
  JANELA_MAXIM_AR: t({ label: 'Janela Maxim-ar', short: 'Maxim-ar', category: 'ESQUADRIA', group: 'Janelas', family: 'ESQUADRIA',
    usesGlass: true, glasses: WINDOW, defaultGlass: 'COMUM_MINIBOREAL_4', minW: 300, maxW: 1500, minH: 300, maxH: 1500, defaultW: 600, defaultH: 600 }),
  JANELA_BASCULANTE: t({ label: 'Janela Basculante', short: 'Basculante', category: 'ESQUADRIA', group: 'Janelas', family: 'ESQUADRIA',
    usesGlass: true, glasses: WINDOW, defaultGlass: 'COMUM_MINIBOREAL_4', minW: 300, maxW: 1500, minH: 300, maxH: 1800, defaultW: 600, defaultH: 800 }),
  JANELA_ABRIR_2F: t({ label: 'Janela de Abrir 2 Folhas', short: 'Abrir 2F', category: 'ESQUADRIA', group: 'Janelas', family: 'ESQUADRIA',
    usesGlass: true, glasses: WINDOW, defaultGlass: 'COMUM_INCOLOR_4', minW: 600, maxW: 1800, minH: 500, maxH: 1600, defaultW: 1000, defaultH: 1000 }),
  FIXO_ALUMINIO: t({ label: 'Fixo / Vitrô Fixo', short: 'Fixo', category: 'ESQUADRIA', group: 'Janelas', family: 'ESQUADRIA',
    usesGlass: true, glasses: WINDOW, defaultGlass: 'COMUM_INCOLOR_4', minW: 200, maxW: 3000, minH: 200, maxH: 3000, defaultW: 1000, defaultH: 600 }),
  PORTA_CORRER_2F: t({ label: 'Porta de Correr 2 Folhas', short: 'Porta 2F', category: 'ESQUADRIA', group: 'Portas', family: 'ESQUADRIA',
    usesGlass: true, glasses: DOOR, defaultGlass: 'TEMPERADO_INCOLOR_6', minW: 1000, maxW: 3200, minH: 1800, maxH: 2800, defaultW: 1600, defaultH: 2100 }),
  PORTA_CORRER_4F: t({ label: 'Porta de Correr 4 Folhas', short: 'Porta 4F', category: 'ESQUADRIA', group: 'Portas', family: 'ESQUADRIA',
    usesGlass: true, glasses: DOOR, defaultGlass: 'TEMPERADO_INCOLOR_6', minW: 2000, maxW: 6000, minH: 1800, maxH: 2800, defaultW: 3000, defaultH: 2200 }),
  PORTA_VENEZIANA_CORRER_3F: t({ label: 'Porta Veneziana de Correr 3 Folhas', short: 'Porta Vene. 3F', category: 'ESQUADRIA', group: 'Portas', family: 'ESQUADRIA',
    usesGlass: true, glasses: DOOR, defaultGlass: 'TEMPERADO_INCOLOR_6', minW: 1400, maxW: 3600, minH: 1800, maxH: 2800, defaultW: 2000, defaultH: 2150 }),
  PORTA_GIRO_VIDRO: t({ label: 'Porta de Giro com Vidro', short: 'Giro Vidro', category: 'ESQUADRIA', group: 'Portas', family: 'ESQUADRIA',
    usesGlass: true, glasses: DOOR, defaultGlass: 'TEMPERADO_INCOLOR_6', minW: 600, maxW: 1200, minH: 1800, maxH: 2700, defaultW: 800, defaultH: 2100 }),
  PORTA_GIRO_2F_VIDRO: t({ label: 'Porta de Giro 2 Folhas com Vidro', short: 'Giro 2F', category: 'ESQUADRIA', group: 'Portas', family: 'ESQUADRIA',
    usesGlass: true, glasses: DOOR, defaultGlass: 'TEMPERADO_INCOLOR_6', minW: 1100, maxW: 2400, minH: 1800, maxH: 2700, defaultW: 1500, defaultH: 2100 }),
  PORTA_GIRO_LAMBRI: t({ label: 'Porta de Giro Lambri', short: 'Porta Lambri', category: 'ESQUADRIA', group: 'Portas', family: 'ESQUADRIA',
    usesGlass: false, glasses: NONE, defaultGlass: 'SEM_VIDRO', minW: 600, maxW: 1200, minH: 1800, maxH: 2700, defaultW: 800, defaultH: 2100 }),
  PORTA_GIRO_VENEZIANA: t({ label: 'Porta de Giro Veneziana', short: 'Porta Vene.', category: 'ESQUADRIA', group: 'Portas', family: 'ESQUADRIA',
    usesGlass: false, glasses: NONE, defaultGlass: 'SEM_VIDRO', minW: 600, maxW: 1200, minH: 1800, maxH: 2700, defaultW: 800, defaultH: 2100 }),
  PAINEL_LAMBRI: t({ label: 'Painel / Fechamento em Lambri', short: 'Painel Lambri', category: 'ESQUADRIA', group: 'Fachadas, lambris e guarda-corpos', family: 'ESQUADRIA',
    usesGlass: false, glasses: NONE, defaultGlass: 'SEM_VIDRO', minW: 300, maxW: 6000, minH: 300, maxH: 3000, defaultW: 2000, defaultH: 1000 }),
  FACHADA_PELE_VIDRO: t({ label: 'Fachada Pele de Vidro', short: 'Fachada', category: 'ESQUADRIA', group: 'Fachadas, lambris e guarda-corpos', family: 'FACHADA',
    usesGlass: true, glasses: ['LAMINADO_INCOLOR_8', 'REFLETIVO_PRATA_8', 'LAMINADO_TEMPERADO_10', 'TEMPERADO_INCOLOR_8'], defaultGlass: 'REFLETIVO_PRATA_8',
    minW: 1000, maxW: 30000, minH: 1000, maxH: 30000, defaultW: 5000, defaultH: 3000 }),
  GUARDA_CORPO_ALUMINIO: t({ label: 'Guarda-corpo de Alumínio com Vidro', short: 'G.corpo Alum.', category: 'ESQUADRIA', group: 'Fachadas, lambris e guarda-corpos', family: 'GUARDA_CORPO',
    usesGlass: true, glasses: SAFETY, defaultGlass: 'LAMINADO_INCOLOR_8', minW: 500, maxW: 20000, minH: 900, maxH: 1300, defaultW: 3000, defaultH: 1100 }),

  // ===================== VIDRO TEMPERADO (BLINDEX) =====================
  BOX_FRONTAL: t({ label: 'Box Frontal', short: 'Box Frontal', category: 'TEMPERADO', group: 'Box para banheiro', family: 'TEMPERADO',
    usesGlass: true, glasses: TEMP_8, defaultGlass: 'TEMPERADO_INCOLOR_8', minW: 700, maxW: 2400, minH: 1700, maxH: 2200, defaultW: 1200, defaultH: 1900 }),
  BOX_CANTO: t({ label: 'Box de Canto (L)', short: 'Box Canto', category: 'TEMPERADO', group: 'Box para banheiro', family: 'TEMPERADO',
    usesGlass: true, glasses: TEMP_8, defaultGlass: 'TEMPERADO_INCOLOR_8', minW: 700, maxW: 1600, minH: 1700, maxH: 2200, defaultW: 1000, defaultH: 1900,
    depth: { label: 'Lateral (mm)', min: 700, max: 1600, default: 900 } }),
  PORTA_PIVOTANTE: t({ label: 'Porta Pivotante', short: 'Pivotante', category: 'TEMPERADO', group: 'Portas', family: 'TEMPERADO',
    usesGlass: true, glasses: TEMP_8_10, defaultGlass: 'TEMPERADO_INCOLOR_10', minW: 600, maxW: 1100, minH: 1800, maxH: 2700, defaultW: 900, defaultH: 2100 }),
  PORTA_ABRIR_TEMPERADO: t({ label: 'Porta de Abrir (Dobradiça)', short: 'Porta Abrir', category: 'TEMPERADO', group: 'Portas', family: 'TEMPERADO',
    usesGlass: true, glasses: TEMP_8_10, defaultGlass: 'TEMPERADO_INCOLOR_10', minW: 600, maxW: 1000, minH: 1800, maxH: 2500, defaultW: 800, defaultH: 2100 }),
  PORTA_CORRER_TEMPERADO: t({ label: 'Porta de Correr (Roldana Aparente)', short: 'Porta Correr', category: 'TEMPERADO', group: 'Portas', family: 'TEMPERADO',
    usesGlass: true, glasses: TEMP_8_10, defaultGlass: 'TEMPERADO_INCOLOR_10', minW: 1200, maxW: 4000, minH: 1800, maxH: 2700, defaultW: 1800, defaultH: 2200 }),
  JANELA_TEMPERADO_2F: t({ label: 'Janela de Correr Temperada 2 Folhas', short: 'Janela Temp 2F', category: 'TEMPERADO', group: 'Janelas e fixos', family: 'TEMPERADO',
    usesGlass: true, glasses: TEMP_8, defaultGlass: 'TEMPERADO_INCOLOR_8', minW: 600, maxW: 2000, minH: 400, maxH: 1600, defaultW: 1200, defaultH: 1000 }),
  JANELA_TEMPERADO_4F: t({ label: 'Janela de Correr Temperada 4 Folhas', short: 'Janela Temp 4F', category: 'TEMPERADO', group: 'Janelas e fixos', family: 'TEMPERADO',
    usesGlass: true, glasses: TEMP_8, defaultGlass: 'TEMPERADO_INCOLOR_8', minW: 1600, maxW: 4000, minH: 400, maxH: 1600, defaultW: 2400, defaultH: 1200 }),
  FIXO_TEMPERADO: t({ label: 'Fixo / Vitrine Temperada', short: 'Fixo Temp', category: 'TEMPERADO', group: 'Janelas e fixos', family: 'TEMPERADO',
    usesGlass: true, glasses: TEMP_8_10, defaultGlass: 'TEMPERADO_INCOLOR_10', minW: 200, maxW: 2400, minH: 200, maxH: 3000, defaultW: 1500, defaultH: 2200 }),
  SACADA_RETRATIL: t({ label: 'Envidraçamento de Sacada (Retrátil)', short: 'Sacada', category: 'TEMPERADO', group: 'Sacadas e guarda-corpos', family: 'TEMPERADO',
    usesGlass: true, glasses: [...TEMP_8, 'TEMPERADO_INCOLOR_10'], defaultGlass: 'TEMPERADO_INCOLOR_8', minW: 1000, maxW: 12000, minH: 900, maxH: 2600, defaultW: 3500, defaultH: 1500 }),
  GUARDA_CORPO_TEMPERADO: t({ label: 'Guarda-corpo Temperado (Perfil U)', short: 'G.corpo Temp', category: 'TEMPERADO', group: 'Sacadas e guarda-corpos', family: 'TEMPERADO',
    usesGlass: true, glasses: ['LAMINADO_TEMPERADO_10', 'LAMINADO_TEMPERADO_12'], defaultGlass: 'LAMINADO_TEMPERADO_10', minW: 500, maxW: 20000, minH: 900, maxH: 1300, defaultW: 3000, defaultH: 1100 }),
} as Record<TypologyId, M>).map(([id, m]) => [id, { id, ...m }])) as Record<TypologyId, TypologyMeta>;

export const CATEGORY_LABEL: Record<'ESQUADRIA' | 'TEMPERADO', string> = {
  ESQUADRIA: 'Esquadrias de alumínio',
  TEMPERADO: 'Vidro temperado (Blindex)',
};

export const typologiesByCategory = (c: 'ESQUADRIA' | 'TEMPERADO') =>
  Object.values(TYPOLOGIES).filter((x) => x.category === c);
