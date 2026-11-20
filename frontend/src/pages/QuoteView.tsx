import { useState } from 'react';
import { type Finish, type GlassCode, type ProductLine, type TypologyId } from '@vidrapro/engine';
import { Logo } from '../components/Layout';
import { Schematic } from '../components/schematic/Schematic';
import { ErrorBox, PageLoader, StatusChip, toast, useLoad } from '../components/ui';
import { Icon } from '../components/ui/Icon';
import { api } from '../lib/api';
import { brl, dateBR, KANBAN_COLUMNS, phoneBR, quoteNo, STATUS_META } from '../lib/format';
import { Link, navigate } from '../lib/router';
import type { QuoteStatus, TenantBrand } from '../lib/types';

interface DocItem {
  description: string; location_label: string | null; typology: TypologyId; line: ProductLine;
  width_mm: number; height_mm: number; quantity: number; unit_price: number; total_price: number;
  finish: Finish; glass_code: GlassCode;
}
interface DocProps {
  tenant: TenantBrand & { footer?: string | null };
  number: number; customerName: string; customerPhone?: string | null; customerAddress?: string | null;
  createdAt: string; validUntil: string | null; notes: string | null;
  items: DocItem[]; subtotal: number; discountPct: number; discountValue: number; total: number;
}

/** Branded, printable A4 quote. Used by the internal view and by the public link. */
export function QuoteDocument(d: DocProps) {
  const footer = d.tenant.footer ?? d.tenant.quote_footer_notes;
  return (
    <article className="print-sheet glass mx-auto max-w-[860px] overflow-hidden p-0">
      <header className="relative overflow-hidden bg-gradient-to-br from-brand-700 to-brand-500 px-6 py-6 text-white sm:px-10 sm:py-8 print:bg-none print:text-ink print:px-0">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 print:hidden" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            {d.tenant.logo_url
              ? <img src={d.tenant.logo_url} alt={d.tenant.name} className="h-16 w-16 rounded-xl bg-white object-contain p-1.5 shadow-lg sm:h-20 sm:w-20" />
              : <div className="grid h-16 w-16 place-items-center rounded-xl bg-white/20 text-2xl font-extrabold">{d.tenant.name.slice(0, 1)}</div>}
            <div>
              <div className="text-xl font-extrabold tracking-tight sm:text-2xl">{d.tenant.name}</div>
              <div className="mt-0.5 space-y-0.5 text-xs text-white/85 print:text-slate-500">
                {d.tenant.document && <div>CNPJ {d.tenant.document}</div>}
                {d.tenant.address && <div>{d.tenant.address}</div>}
                <div>{[d.tenant.whatsapp && phoneBR(d.tenant.whatsapp), d.tenant.email].filter(Boolean).join(' · ')}</div>
              </div>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70 print:text-slate-400">Orçamento</div>
            <div className="text-3xl font-extrabold">{quoteNo(d.number)}</div>
            <div className="mt-1 text-xs text-white/85 print:text-slate-500">Emitido em {dateBR(d.createdAt)}{d.validUntil && <> · Válido até <b>{dateBR(d.validUntil)}</b></>}</div>
          </div>
        </div>
      </header>

      <div className="space-y-6 px-6 py-6 sm:px-10 sm:py-8 print:px-0">
        <section className="rounded-xl bg-slate-50 p-4 text-sm print:border print:border-slate-200 print:bg-white">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Cliente</div>
          <div className="text-base font-bold">{d.customerName}</div>
          <div className="text-slate-500">{[d.customerPhone && phoneBR(d.customerPhone), d.customerAddress].filter(Boolean).join(' · ')}</div>
        </section>

        <section>
          <div className="hidden grid-cols-[96px_1fr_60px_110px_110px] gap-4 border-b border-slate-200 pb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 sm:grid">
            <span>Esquema</span><span>Descrição</span><span className="text-center">Qtd</span><span className="text-right">Unitário</span><span className="text-right">Total</span>
          </div>
          <div className="divide-y divide-slate-100">
            {d.items.map((it, i) => (
              <div key={i} className="avoid-break grid grid-cols-[72px_1fr] gap-x-4 gap-y-1 py-4 sm:grid-cols-[96px_1fr_60px_110px_110px] sm:items-center">
                <div className="row-span-2 h-20 rounded-lg bg-gradient-to-b from-white to-slate-50 p-1 ring-1 ring-slate-100 sm:row-span-1">
                  <Schematic compact typology={it.typology} widthMm={it.width_mm} heightMm={it.height_mm} finish={it.finish} glassCode={it.glass_code} className="h-full w-full" />
                </div>
                <div>
                  {it.location_label && <div className="text-[11px] font-bold uppercase tracking-wide text-brand-600">{it.location_label}</div>}
                  <div className="text-sm font-semibold leading-snug">{it.description}</div>
                </div>
                <div className="flex justify-between text-sm sm:contents">
                  <span className="text-slate-500 sm:text-center sm:text-ink">{it.quantity}<span className="sm:hidden"> × {brl(it.unit_price)}</span></span>
                  <span className="hidden text-right tabular-nums sm:block">{brl(it.unit_price)}</span>
                  <span className="text-right font-bold tabular-nums">{brl(it.total_price)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="avoid-break ml-auto w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="tabular-nums">{brl(d.subtotal)}</span></div>
          {d.discountValue > 0 && <div className="flex justify-between text-rose-600"><span>Desconto ({d.discountPct}%)</span><span className="tabular-nums">− {brl(d.discountValue)}</span></div>}
          <div className="flex items-end justify-between border-t border-slate-200 pt-2">
            <span className="font-bold">Total</span>
            <span className="text-2xl font-extrabold tracking-tight text-brand-700 tabular-nums">{brl(d.total)}</span>
          </div>
        </section>

        {(d.notes || footer) && (
          <section className="avoid-break space-y-2 rounded-xl border border-slate-100 p-4 text-xs leading-relaxed text-slate-600">
            {d.notes && <p><b className="text-ink">Observações:</b> {d.notes}</p>}
            {footer && <p className="whitespace-pre-line">{footer}</p>}
          </section>
        )}

        <section className="avoid-break grid grid-cols-2 gap-10 pt-8 text-center text-xs text-slate-500">
          <div className="border-t border-slate-300 pt-2">{d.tenant.name}</div>
          <div className="border-t border-slate-300 pt-2">De acordo — {d.customerName}</div>
        </section>
      </div>
    </article>
  );
}

export function QuoteViewPage({ quoteId }: { quoteId: string }) {
  const { data, error, loading, reload } = useLoad(() => api.getQuote(quoteId), [quoteId]);
  const [busy, setBusy] = useState(false);
  if (loading && !data) return <PageLoader />;
  if (error || !data) return <ErrorBox message={error ?? 'Não encontrado'} />;
  const q = data.quote;
  const editable = ['rascunho', 'enviado'].includes(q.status);

  async function share() {
    // open synchronously to avoid popup blockers, then set the URL
    const win = window.open('', '_blank');
    setBusy(true);
    try {
      const r = await api.share(quoteId);
      if (win) win.location.href = r.url; else location.href = r.url;
      reload();
    } catch (e) { win?.close(); toast((e as Error).message); } finally { setBusy(false); }
  }
  async function copyLink() {
    const r = await api.share(quoteId);
    await navigator.clipboard?.writeText(r.publicUrl).catch(() => undefined);
    toast('Link do orçamento copiado'); reload();
  }
  async function setStatus(s: QuoteStatus) { await api.setStatus(quoteId, s); toast(`Status: ${STATUS_META[s].label}`); reload(); }
  async function remove() {
    if (!confirm(`Excluir o orçamento ${quoteNo(q.number)}?`)) return;
    await api.deleteQuote(quoteId); toast('Orçamento excluído'); navigate('/');
  }

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" className="btn-ghost -ml-2 px-2"><Icon name="back" /></Link>
          <h1 className="text-2xl font-extrabold tracking-tight">Orçamento {quoteNo(q.number)}</h1>
          <StatusChip status={q.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="field w-auto py-2 text-sm font-semibold" value={q.status} onChange={(e) => setStatus(e.target.value as QuoteStatus)}>
            {KANBAN_COLUMNS.concat('perdido').map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
          {editable && <Link to={`/orcamentos/${quoteId}/editar`} className="btn-outline"><Icon name="edit" className="h-4 w-4" />Editar</Link>}
          <Link to={`/orcamentos/${quoteId}/corte`} className="btn-outline"><Icon name="scissors" className="h-4 w-4" />Lista de corte</Link>
          <button className="btn-outline" onClick={copyLink}><Icon name="link" className="h-4 w-4" />Link</button>
          <button className="btn-outline" onClick={() => window.print()}><Icon name="printer" className="h-4 w-4" />PDF</button>
          <button className="btn-whatsapp" disabled={busy} onClick={share}><Icon name="whatsapp" className="h-4 w-4" />Enviar no WhatsApp</button>
          <button className="btn-ghost text-rose-600 hover:bg-rose-50" onClick={remove} title="Excluir"><Icon name="trash" className="h-4 w-4" /></button>
        </div>
      </div>

      {q.total_cost != null && (
        <div className="no-print glass flex flex-wrap gap-x-8 gap-y-2 px-5 py-3 text-sm">
          <span className="text-slate-500">Uso interno —</span>
          <span>Custo <b>{brl(q.total_cost)}</b></span>
          <span>Margem <b>{q.margin_pct}%</b></span>
          <span className="text-emerald-700">Lucro bruto <b>{brl(q.total - q.total_cost)}</b></span>
        </div>
      )}

      <QuoteDocument
        tenant={data.tenant} number={q.number} customerName={q.customer_name} customerPhone={q.customer_phone}
        customerAddress={q.customer_address} createdAt={q.created_at} validUntil={q.valid_until} notes={q.notes}
        items={data.items} subtotal={q.subtotal} discountPct={q.discount_pct} discountValue={q.discount_value} total={q.total}
      />
    </div>
  );
}

/** /p/:token — what the end customer opens from WhatsApp. */
export function PublicQuotePage({ token }: { token: string }) {
  const { data, error, loading } = useLoad(() => api.publicQuote(token), [token]);
  if (loading) return <PageLoader />;
  if (error || !data) return <div className="p-6"><ErrorBox message="Orçamento não encontrado ou expirado." /></div>;
  const q = data.quote;
  const wa = data.tenant.whatsapp
    ? `https://wa.me/${data.tenant.whatsapp}?text=${encodeURIComponent(`Olá! Quero aprovar o orçamento ${quoteNo(q.number)}.`)}`
    : null;
  return (
    <div className="px-4 py-6 sm:py-10">
      <div className="no-print mx-auto mb-4 flex max-w-[860px] flex-wrap items-center justify-end gap-2">
        <button className="btn-outline" onClick={() => window.print()}><Icon name="printer" className="h-4 w-4" />Salvar PDF</button>
        {wa && <a className="btn-whatsapp" href={wa} target="_blank" rel="noreferrer"><Icon name="whatsapp" className="h-4 w-4" />Aprovar pelo WhatsApp</a>}
      </div>
      <QuoteDocument tenant={data.tenant} number={q.number} customerName={q.customer_name} createdAt={q.created_at}
        validUntil={q.valid_until} notes={q.notes} items={data.items} subtotal={q.subtotal} discountPct={q.discount_pct}
        discountValue={q.discount_value} total={q.total} />
      <div className="no-print mx-auto mt-6 flex max-w-[860px] items-center justify-center gap-2 text-xs text-slate-400">
        Gerado com <Logo className="scale-75" />
      </div>
    </div>
  );
}
