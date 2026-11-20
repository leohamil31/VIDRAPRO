import type { CuttingList, Finish, GlassCode, ItemInput, LineDefinition, PriceBreakdown, PriceTable, PricingSettings, ProductLine, TypologyId } from '@vidrapro/engine';

export type { LineDefinition };

export type QuoteStatus = 'rascunho' | 'enviado' | 'aprovado' | 'em_producao' | 'concluido' | 'perdido';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled';
export type Role = 'owner' | 'admin' | 'seller' | 'workshop';

export interface Tenant {
  id: string;
  name: string;
  document: string | null;
  logo_url: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  default_margin_pct: number;
  aluminum_loss_pct: number;
  glass_round_mm: 1 | 10 | 50 | 100;
  glass_min_area_m2: number;
  labor_pct: number;
  installation_per_item: number;
  quote_validity_days: number;
  quote_footer_notes: string | null;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string;
}

export type TenantBrand = Pick<Tenant, 'name' | 'logo_url' | 'whatsapp' | 'email' | 'address' | 'document'> & {
  quote_footer_notes?: string | null;
};

export interface MaterialPrice {
  id?: string;
  category: 'aluminum' | 'glass' | 'accessory';
  key: string;
  label: string;
  unit: 'kg' | 'm2' | 'un' | 'm';
  group?: string;
  price: number;
  active: boolean;
}

export interface QuoteSummary {
  id: string;
  number: number;
  customer_name: string;
  customer_phone: string | null;
  status: QuoteStatus;
  kanban_position: number;
  total: number;
  created_at: string;
  valid_until: string | null;
  item_count: number;
  typologies: string | null;
}

export interface QuoteItemRow {
  id?: string;
  position: number;
  typology: TypologyId;
  line: ProductLine;
  location_label: string | null;
  width_mm: number;
  height_mm: number;
  depth_mm?: number | null;
  finish: Finish;
  glass_code: GlassCode;
  quantity: number;
  unit_cost?: number;
  unit_price: number;
  total_price: number;
  description: string;
  price_breakdown?: PriceBreakdown;
  cutting_list: CuttingList;
}

export interface QuoteRecord {
  id: string;
  number: number;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  status: QuoteStatus;
  margin_pct: number;
  discount_pct: number;
  subtotal: number;
  discount_value: number;
  total: number;
  total_cost?: number;
  notes: string | null;
  valid_until: string | null;
  public_token: string;
  created_at: string;
}

export interface QuoteDetail { quote: QuoteRecord; items: QuoteItemRow[]; tenant: TenantBrand }

export type DraftItemInput = ItemInput & { locationLabel?: string | null };

export interface QuoteInput {
  customerName: string;
  customerPhone?: string | null;
  customerAddress?: string | null;
  marginPct?: number;
  discountPct: number;
  notes?: string | null;
  items: DraftItemInput[];
}

export interface Stats {
  quotes_month: number;
  pipeline_value: number;
  approved_month: number;
  in_production: number;
  conversion_pct: number | null;
}

export interface PublicQuote {
  /** No `number`: the internal quote number is never shown to the customer. */
  quote: Pick<QuoteRecord, 'customer_name' | 'status' | 'subtotal' | 'discount_pct' | 'discount_value' | 'total' | 'notes' | 'valid_until' | 'created_at'>;
  tenant: TenantBrand & { footer?: string | null };
  items: Pick<QuoteItemRow, 'description' | 'location_label' | 'typology' | 'width_mm' | 'height_mm' | 'depth_mm' | 'quantity' | 'unit_price' | 'total_price' | 'finish' | 'glass_code' | 'line'>[];
}

export interface CuttingListResponse {
  quote: { id: string; number: number; customer_name: string; status: QuoteStatus };
  items: { location_label: string | null; description: string; quantity: number; cutting: CuttingList }[];
  bars: { finish: Finish; plans: import('@vidrapro/engine').BarPlan[] }[];
}

export interface PricingContext { prices: PriceTable; settings: PricingSettings; lines: LineDefinition[] }

export interface Session {
  token: string;
  user: { id: string; name: string; email: string; role: Role };
}
