import { useEffect, useState } from 'react';
import { Kanban } from '../components/quote/Kanban';
import { ErrorBox, PageLoader, toast, useLoad } from '../components/ui';
import { Icon, type IconName } from '../components/ui/Icon';
import { api } from '../lib/api';
import { brl, STATUS_META } from '../lib/format';
import { Link } from '../lib/router';
import type { QuoteStatus, QuoteSummary } from '../lib/types';

function Kpi({ icon, label, value, sub, tone }: { icon: IconName; label: string; value: string; sub?: string; tone: string }) {
  return (
    <div className="glass flex items-center gap-4 p-4 sm:p-5">
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone}`}><Icon name={icon} /></div>
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        <div className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">{value}</div>
        {sub && <div className="text-xs text-slate-400">{sub}</div>}
      </div>
    </div>
  );
}

export function Dashboard() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 250); return () => clearTimeout(t); }, [search]);

  const list = useLoad(() => api.listQuotes({ search: debounced || undefined }), [debounced]);
  const stats = useLoad(() => api.stats(), [list.data]);

  async function move(id: string, status: QuoteStatus, position: number) {
    const prev = list.data?.quotes ?? [];
    const next: QuoteSummary[] = prev.map((q) => (q.id === id ? { ...q, status, kanban_position: position } : q));
    list.setData({ quotes: next }); // optimistic
    try {
      await api.setStatus(id, status, position);
      toast(`Movido para ${STATUS_META[status].label}`);
      stats.reload();
    } catch (e) {
      list.setData({ quotes: prev });
      toast((e as Error).message);
    }
  }

  const s = stats.data;
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Painel</h1>
          <p className="text-sm text-slate-500">Acompanhe seus orçamentos do rascunho à instalação.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="field pl-9" placeholder="Buscar cliente ou nº" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Link to="/orcamentos/novo" className="btn-primary whitespace-nowrap"><Icon name="plus" className="h-4 w-4" />Novo</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon="file" tone="bg-brand-50 text-brand-600" label="Orçamentos no mês" value={String(s?.quotes_month ?? '—')} />
        <Kpi icon="trend" tone="bg-sky-50 text-sky-600" label="Em negociação" value={s ? brl(s.pipeline_value) : '—'} sub="status Enviado" />
        <Kpi icon="wallet" tone="bg-emerald-50 text-emerald-600" label="Aprovado no mês" value={s ? brl(s.approved_month) : '—'}
          sub={s?.conversion_pct != null ? `conversão ${s.conversion_pct.toLocaleString('pt-BR')}%` : undefined} />
        <Kpi icon="scissors" tone="bg-amber-50 text-amber-600" label="Em produção" value={String(s?.in_production ?? '—')} sub="ordens na oficina" />
      </div>

      {list.error && <ErrorBox message={list.error} />}
      {list.loading && !list.data ? <PageLoader /> : list.data && (
        list.data.quotes.length || debounced ? <Kanban quotes={list.data.quotes} onMove={move} /> : (
          <div className="glass flex flex-col items-center gap-3 p-12 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Icon name="file" className="h-7 w-7" /></div>
            <h2 className="text-lg font-bold">Nenhum orçamento ainda</h2>
            <p className="max-w-sm text-sm text-slate-500">Antes do primeiro orçamento, revise seus preços de alumínio, vidro e kits em Configurações.</p>
            <div className="flex gap-2">
              <Link to="/configuracoes" className="btn-outline">Configurar preços</Link>
              <Link to="/orcamentos/novo" className="btn-primary">Criar orçamento</Link>
            </div>
          </div>
        )
      )}
    </div>
  );
}
