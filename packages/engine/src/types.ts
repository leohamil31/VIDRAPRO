/**
 * VidraPro Engine — shared types.
 *
 * The engine is split in two independent layers:
 *   1. cutting/  → pure geometry: dimensions in, Bill of Materials (BOM) out.
 *                  Knows nothing about money. Used by the workshop.
 *   2. pricing/  → consumes the BOM + tenant price table, returns costs/prices.
 *                  Knows nothing about deductions.
 * quote.ts glues both for a quote item.
 */

export type Finish = 'BRANCO' | 'PRETO' | 'NATURAL_FOSCO' | 'AMADEIRADO';

export type TypologyId =
  | 'JANELA_CORRER_2F'
  | 'JANELA_CORRER_4F'
  | 'PORTA_CORRER_2F'
  | 'BOX_FRONTAL'
  | 'PORTA_PIVOTANTE';

export type ProductLine = 'SUPREMA' | 'GOLD' | 'TEMPERADO';

/** Glass codes follow `${PROCESS}_${COLOR}_${THICKNESS}` and are the price-table keys. */
export type GlassCode =
  | 'COMUM_INCOLOR_4'
  | 'COMUM_MINIBOREAL_4'
  | 'TEMPERADO_INCOLOR_6'
  | 'TEMPERADO_INCOLOR_8'
  | 'TEMPERADO_FUME_8'
  | 'TEMPERADO_VERDE_8'
  | 'TEMPERADO_INCOLOR_10';

export type ProfileGroup = 'MARCO' | 'TRILHO' | 'FOLHA' | 'BAGUETE' | 'ACABAMENTO';

export interface ItemInput {
  typology: TypologyId;
  line: ProductLine;
  widthMm: number;   // vão (opening) width
  heightMm: number;  // vão (opening) height
  finish: Finish;
  glassCode: GlassCode;
  quantity: number;
}

// ---------------------------------------------------------------------------
// Cutting list (workshop)
// ---------------------------------------------------------------------------

export interface ProfileCut {
  code: string;          // profile reference
  name: string;
  group: ProfileGroup;
  lengthMm: number;      // cut length
  qty: number;           // pieces per ONE unit of the item
  cutAngle: 45 | 90;
  kgPerM: number;
  formula: string;       // human-readable deduction, shown in the workshop list
}

export interface GlassCut {
  label: string;         // "Folha móvel", "Fixo"
  glassCode: GlassCode;
  widthMm: number;
  heightMm: number;
  qty: number;           // per ONE unit
  tempered: boolean;
  formula: string;
  notes?: string;        // furos/recortes — must be sent to the tempering plant
}

export interface AccessoryLine {
  code: string;          // price-table key
  name: string;
  qty: number;           // per ONE unit
}

export interface LeafGeometry {
  count: number;
  widthMm: number;
  heightMm: number;
  /** for schematic rendering: which leaves are fixed */
  fixed: boolean[];
}

export interface CuttingList {
  typology: TypologyId;
  line: ProductLine;
  input: ItemInput;
  profiles: ProfileCut[];
  glasses: GlassCut[];
  accessories: AccessoryLine[];
  leaves: LeafGeometry;
  warnings: string[];
}

export interface BarPlan {
  code: string;
  name: string;
  barLengthMm: number;
  bars: { cuts: number[]; wasteMm: number }[];
  totalPieces: number;
  utilizationPct: number;
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

export interface PriceTable {
  aluminumPerKg: Partial<Record<Finish, number>>;
  glassPerM2: Partial<Record<GlassCode, number>>;
  accessories: Record<string, number>;
}

export interface PricingSettings {
  /** markup over cost, e.g. 60 → price = cost × 1.60 */
  marginPct: number;
  /** aluminum cutting loss/scrap, applied over net weight */
  aluminumLossPct: number;
  /** tempered glass billing: round each side UP to this step (industry practice: 50mm) */
  glassRoundMm: number;
  /** minimum billed area per glass piece */
  glassMinAreaM2: number;
  /** labor as % of material cost (0 if included in margin) */
  laborPct: number;
  /** fixed installation fee per unit (R$) */
  installationPerItem: number;
}

export interface PriceBreakdown {
  aluminum: { netKg: number; billedKg: number; pricePerKg: number; cost: number };
  glass: {
    pieces: { label: string; realM2: number; billedM2: number; pricePerM2: number; cost: number }[];
    billedM2: number;
    cost: number;
  };
  accessories: { lines: { code: string; name: string; qty: number; unitPrice: number; cost: number }[]; cost: number };
  materialCost: number;   // per unit
  laborCost: number;      // per unit
  installation: number;   // per unit
  unitCost: number;       // per unit
  marginPct: number;
  unitPrice: number;      // per unit, selling
  quantity: number;
  totalCost: number;
  totalPrice: number;
  missingPrices: string[];
}

export interface QuoteItemResult {
  input: ItemInput;
  description: string;
  cutting: CuttingList;
  pricing: PriceBreakdown;
  engineVersion: string;
}

export interface QuoteTotals {
  subtotal: number;
  discountPct: number;
  discountValue: number;
  total: number;
  totalCost: number;
  grossProfit: number;
}
