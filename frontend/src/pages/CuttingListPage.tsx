import { FINISHES, GLASSES, type ProfileGroup } from '@vidrapro/engine';
import { ErrorBox, PageLoader, StatusChip, useLoad, WarningBox } from '../components/ui';
import { Icon } from '../components/ui/Icon';
import { api } from '../lib/api';
import { cx, quoteNo } from '../lib/format';
import { Link } from '../lib/router';

const GROUP_LABEL: Record<ProfileGroup, string> = {
  TRILHO: 'Trilho', MARCO: 'Marco', FOLHA: 'Folha', BAGUETE: 'Baguete', ACABAMENTO: 'Acabamento',
};
const GROUP_TONE: Record<ProfileGroup, string> = {
  TRILHO: 'bg-sky-50 text-sky-700', MARCO: 'bg-brand-50 text-brand-700', FOLHA: 'bg-violet-50 text-violet-700',
  BAGUETE: 'bg-amber-50 text-amber-700', ACABAMENTO: 'bg-slate-100 text-slate-600',
};

/** Workshop sheet — no prices, only cuts. Prints on A4. */
export function CuttingListPage({ quoteId }: { quoteId: string }) {
  const { data, error, loading } = useLoad(() => api.cuttingList(quoteId), [quoteId]);
  if (loading) return <PageLoader />;
  if (error || !data) return <ErrorBox message={error ?? 'Não encontrado'} />;

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link to={`/orcamentos/${quoteId}`} className="btn-ghost -ml-2 px-2"><Icon name="back" /></Link>
          <h1 className="text-2xl font-extrabold tracking-tight">Lista de corte {quoteNo(data.quote.number)}</h1>
          <StatusChip status={data.quote.status} />
        </div>
        <button className="btn-primary" onClick={() => window.print()}><Icon name="printer" className="h-4 w-4" />Imprimir para a oficina</button>
      </div>

      <div className="print-sheet glass space-y-6 p-5 sm:p-8">
        <div className="flex items-end justify-between border-b border-slate-200 pb-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400">Ordem de produção</div>
            <div className="text-xl font-extrabold">{quoteNo(data.quote.number)} · {data.quote.customer_name}</div>
          </div>
          <div className="text-right text-xs text-slate-500">Medidas em mm · cortes a 90° salvo indicação</div>
        </div>

        {data.items.map((it, idx) => (
          <section key={idx} className="avoid-break space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-bold">
                <span className="mr-2 rounded-md bg-ink px-2 py-0.5 text-xs text-white">{idx + 1}</span>
                {it.location_label && <span className="text-brand-600">{it.location_label} · </span>}{it.description}
              </h2>
              <span className="chip bg-brand-600 text-white">Produzir {it.quantity}×</span>
            </div>
            <WarningBox items={it.cutting.warnings} />

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Grupo</th><th className="px-3 py-2">Código</th><th className="px-3 py-2">Peça</th>
                    <th className="px-3 py-2 text-right">Medida</th><th className="px-3 py-2 text-right">Qtd/un</th>
                    <th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2">Fórmula</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {it.cutting.profiles.map((p, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2"><span className={cx('chip', GROUP_TONE[p.group])}>{GROUP_LABEL[p.group]}</span></td>
                      <td className="px-3 py-2 font-mono text-xs">{p.code}</td>
                      <td className="px-3 py-2">{p.name}</td>
                      <td className="px-3 py-2 text-right font-mono text-base font-bold">{p.lengthMm}</td>
                      <td className="px-3 py-2 text-right">{p.qty}</td>
                      <td className="px-3 py-2 text-right font-bold">{p.qty * it.quantity}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{p.formula}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {it.cutting.glasses.map((g, i) => (
                <div key={i} className="rounded-xl border border-sky-200 bg-sky-50/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-sky-700">{g.tempered ? 'Pedido de têmpera' : 'Corte de vidro'} · {GLASSES[g.glassCode].label}</div>
                      <div className="font-semibold">{g.label}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-lg font-extrabold">{g.widthMm} × {g.heightMm}</div>
                      <div className="text-xs font-semibold">{g.qty * it.quantity} peça(s)</div>
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">{g.formula}</div>
                  {g.notes && <div className="mt-1 text-xs font-semibold text-amber-700">⚠ {g.notes}</div>}
                </div>
              ))}
              {it.cutting.accessories.map((a) => (
                <div key={a.code} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm">
                  <span><Icon name="box" className="mr-1.5 inline h-4 w-4 text-slate-400" />{a.name}</span>
                  <b>{a.qty * it.quantity} un</b>
                </div>
              ))}
            </div>
          </section>
        ))}

        {data.bars.map(({ finish, plans }) => (
          <section key={finish} className="avoid-break space-y-3 border-t border-slate-200 pt-5">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Icon name="ruler" className="h-5 w-5 text-brand-600" />
              Plano de corte em barras de 6 m — Alumínio {FINISHES[finish].label}
              <span className="chip bg-ink text-white">{plans.reduce((s, p) => s + p.bars.length, 0)} barras</span>
            </h2>
            <div className="space-y-3">
              {plans.map((p) => (
                <div key={p.code} className="avoid-break">
                  <div className="mb-1 flex justify-between text-xs">
                    <span><b className="font-mono">{p.code}</b> · {p.name} · {p.totalPieces} peças</span>
                    <span className="text-slate-500">{p.bars.length} barra(s) · aproveitamento {p.utilizationPct.toLocaleString('pt-BR')}%</span>
                  </div>
                  <div className="space-y-1">
                    {p.bars.map((b, bi) => (
                      <div key={bi} className="flex h-6 overflow-hidden rounded-md bg-slate-100 ring-1 ring-slate-200">
                        {b.cuts.map((c, ci) => (
                          <div key={ci} style={{ width: `${(c / p.barLengthMm) * 100}%` }}
                            className="flex items-center justify-center border-r-2 border-white bg-brand-500/85 text-[10px] font-bold text-white print:bg-slate-300 print:text-ink">
                            {c}
                          </div>
                        ))}
                        <div className="flex flex-1 items-center justify-center text-[10px] text-slate-400">{b.wasteMm > 120 ? `sobra ${b.wasteMm}` : ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
