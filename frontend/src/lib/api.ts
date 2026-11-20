import { createDemoApi } from './demo';
import { ApiError, sessionStore } from './session';
import type {
  CuttingListResponse, LineDefinition, MaterialPrice, PricingContext, PublicQuote, QuoteDetail, QuoteInput, QuoteStatus,
  QuoteSummary, Session, Stats, Tenant,
} from './types';

/** Single contract implemented by the HTTP client and by the offline demo. */
export interface Api {
  mode: 'http' | 'demo';
  login(email: string, password: string): Promise<Session>;
  signup(data: { companyName: string; name: string; email: string; password: string; whatsapp?: string }): Promise<Session>;
  settings(): Promise<{ tenant: Tenant; prices: MaterialPrice[] }>;
  updateSettings(patch: Partial<Tenant>): Promise<{ tenant: Tenant }>;
  updatePrices(prices: MaterialPrice[]): Promise<{ prices: MaterialPrice[] }>;
  uploadLogo(dataUrl: string): Promise<{ logo_url: string }>;
  pricingContext(): Promise<PricingContext>;
  listQuotes(params?: { search?: string }): Promise<{ quotes: QuoteSummary[] }>;
  stats(): Promise<Stats>;
  getQuote(id: string): Promise<QuoteDetail>;
  createQuote(input: QuoteInput): Promise<{ id: string; number: number }>;
  updateQuote(id: string, input: QuoteInput): Promise<{ id: string }>;
  setStatus(id: string, status: QuoteStatus, position?: number): Promise<unknown>;
  deleteQuote(id: string): Promise<void>;
  share(id: string): Promise<{ url: string; message: string; publicUrl: string }>;
  cuttingList(id: string): Promise<CuttingListResponse>;
  /** Built-in + custom lines */
  listLines(): Promise<{ lines: LineDefinition[] }>;
  saveLine(line: LineDefinition, isNew: boolean): Promise<{ line: LineDefinition }>;
  deleteLine(id: string): Promise<void>;
  publicQuote(token: string): Promise<PublicQuote>;
}

export { ApiError, sessionStore };

/** Subscription status reported by the API on every response (drives the billing banner). */
export let lastSubscriptionStatus: string | null = null;

function createHttpApi(baseUrl: string): Api {
  async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = sessionStore.get()?.token;
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const sub = res.headers.get('X-Subscription-Status');
    if (sub && sub !== lastSubscriptionStatus) {
      lastSubscriptionStatus = sub;
      window.dispatchEvent(new CustomEvent('vidrapro:subscription', { detail: sub }));
    }
    if (res.status === 401) sessionStore.set(null);
    if (res.status === 204) return undefined as T;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, data.error ?? 'Erro inesperado.', data.code, data.details);
    return data as T;
  }

  return {
    mode: 'http',
    async login(email, password) {
      const s = await req<Session>('POST', '/auth/login', { email, password });
      sessionStore.set(s); return s;
    },
    async signup(data) {
      const s = await req<Session>('POST', '/auth/signup', data);
      sessionStore.set(s); return s;
    },
    settings: () => req('GET', '/settings'),
    updateSettings: (patch) => req('PUT', '/settings', patch),
    updatePrices: (prices) => req('PUT', '/settings/prices', prices),
    uploadLogo: (dataUrl) => req('POST', '/settings/logo', { dataUrl }),
    pricingContext: () => req('GET', '/quotes/pricing-context'),
    listQuotes: (p) => req('GET', `/quotes${p?.search ? `?search=${encodeURIComponent(p.search)}` : ''}`),
    stats: () => req('GET', '/quotes/stats'),
    getQuote: (id) => req('GET', `/quotes/${id}`),
    createQuote: (input) => req('POST', '/quotes', input),
    updateQuote: (id, input) => req('PUT', `/quotes/${id}`, input),
    setStatus: (id, status, position) => req('PATCH', `/quotes/${id}/status`, { status, position }),
    deleteQuote: (id) => req('DELETE', `/quotes/${id}`),
    share: (id) => req('POST', `/quotes/${id}/share`),
    cuttingList: (id) => req('GET', `/quotes/${id}/cutting-list`),
    listLines: () => req('GET', '/settings/lines'),
    saveLine: (line, isNew) => req(isNew ? 'POST' : 'PUT', isNew ? '/settings/lines' : `/settings/lines/${line.id}`, line),
    deleteLine: (id) => req('DELETE', `/settings/lines/${id}`),
    publicQuote: (token) => req('GET', `/public/quotes/${token}`),
  };
}

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

/** No VITE_API_URL → offline demo (localStorage), handy for sales demos and UI work. */
export const api: Api = API_URL
  ? createHttpApi(API_URL.replace(/\/$/, ''))
  : createDemoApi();
