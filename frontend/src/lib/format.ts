import type { QuoteStatus } from './types';

const brlFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const brl = (v: number | null | undefined) => brlFmt.format(v ?? 0);
export const num = (v: number, digits = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const dateBR = (iso: string | null | undefined) =>
  iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('pt-BR') : '—';
export const quoteNo = (n: number) => `#${String(n).padStart(4, '0')}`;
export const phoneBR = (digits: string | null | undefined) => {
  const d = (digits ?? '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digits ?? '';
};

export const STATUS_META: Record<QuoteStatus, { label: string; chip: string; dot: string }> = {
  rascunho:    { label: 'Rascunho',     chip: 'bg-slate-100 text-slate-600',     dot: 'bg-slate-400' },
  enviado:     { label: 'Enviado',      chip: 'bg-brand-50 text-brand-700',      dot: 'bg-brand-500' },
  aprovado:    { label: 'Aprovado',     chip: 'bg-emerald-50 text-emerald-700',  dot: 'bg-emerald-500' },
  em_producao: { label: 'Em Produção',  chip: 'bg-amber-50 text-amber-700',      dot: 'bg-amber-500' },
  concluido:   { label: 'Concluído',    chip: 'bg-violet-50 text-violet-700',    dot: 'bg-violet-500' },
  perdido:     { label: 'Perdido',      chip: 'bg-rose-50 text-rose-600',        dot: 'bg-rose-400' },
};

export const KANBAN_COLUMNS: QuoteStatus[] = ['rascunho', 'enviado', 'aprovado', 'em_producao', 'concluido'];

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
