import { useState, type DragEvent } from 'react';
import { TYPOLOGIES, type TypologyId } from '@vidrapro/engine';
import { brl, cx, dateBR, KANBAN_COLUMNS, quoteNo, STATUS_META } from '../../lib/format';
import { Link } from '../../lib/router';
import type { QuoteStatus, QuoteSummary } from '../../lib/types';
import { Icon } from '../ui/Icon';

interface Props {
  quotes: QuoteSummary[];
  onMove: (id: string, status: QuoteStatus, position: number) => void;
}

/**
 * Pipeline kanban. Desktop: HTML5 drag & drop between columns.
 * Touch: horizontal snap-scroll columns + status selector on each card.
 */
export function Kanban({ quotes, onMove }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<QuoteStatus | null>(null);

  const byStatus = (s: QuoteStatus) =>
    quotes.filter((q) => q.status === s).sort((a, b) => a.kanban_position - b.kanban_position);

  const drop = (status: QuoteStatus) => (e: DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || dragId;
    setOver(null); setDragId(null);
    if (!id) return;
    const col = byStatus(status).filter((q) => q.id !== id);
    // drop at the end of the column
    const position = col.length ? col[col.length - 1].kanban_position + 1 : 0;
    onMove(id, status, position);
  };

  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0 xl:grid xl:grid-cols-5 xl:overflow-visible">
      {KANBAN_COLUMNS.map((status) => {
        const items = byStatus(status);
        const total = items.reduce((s, q) => s + q.total, 0);
        const meta = STATUS_META[status];
        return (
          <section key={status}
            onDragOver={(e) => { e.preventDefault(); setOver(status); }}
            onDragLeave={() => setOver((o) => (o === status ? null : o))}
            onDrop={drop(status)}
            className={cx('flex w-[82vw] max-w-[320px] shrink-0 snap-start flex-col rounded-2xl border p-3 transition sm:w-72 xl:w-auto xl:max-w-none',
              over === status ? 'border-brand-300 bg-brand-50/70' : 'border-white/70 bg-white/45')}>
            <header className="mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className={cx('h-2 w-2 shrink-0 rounded-full', meta.dot)} />
                <h3 className="truncate text-sm font-bold">{meta.label}</h3>
                <span className="ml-auto rounded-full bg-white px-2 text-xs font-semibold text-slate-500">{items.length}</span>
              </div>
              <div className="mt-0.5 pl-4 text-xs font-semibold text-slate-400">{brl(total)}</div>
            </header>
            <div className="flex min-h-24 flex-1 flex-col gap-2.5">
              {items.map((q) => (
                <article key={q.id} draggable
                  onDragStart={(e) => { setDragId(q.id); e.dataTransfer.setData('text/plain', q.id); e.dataTransfer.effectAllowed = 'move'; }}
                  onDragEnd={() => setDragId(null)}
                  className={cx('group rounded-xl border border-white bg-white/90 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
                    dragId === q.id && 'opacity-40')}>
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/orcamentos/${q.id}`} className="min-w-0">
                      <div className="text-[11px] font-bold text-brand-600">{quoteNo(q.number)}</div>
                      <div className="truncate font-semibold text-ink">{q.customer_name}</div>
                    </Link>
                    <Icon name="grip" className="hidden h-4 w-4 shrink-0 cursor-grab text-slate-300 sm:block" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(q.typologies ?? '').split(',').filter(Boolean).map((t) => (
                      <span key={t} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                        {TYPOLOGIES[t as TypologyId]?.short ?? t}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <div className="text-base font-bold">{brl(q.total)}</div>
                      <div className="text-[11px] text-slate-400">{q.item_count} {q.item_count === 1 ? 'item' : 'itens'} · {dateBR(q.created_at).slice(0, 5)}</div>
                    </div>
                    <select aria-label="Mover para"
                      className="rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[11px] font-semibold text-slate-600 xl:opacity-0 xl:group-hover:opacity-100"
                      value={q.status} onChange={(e) => onMove(q.id, e.target.value as QuoteStatus, Date.now())}>
                      {KANBAN_COLUMNS.concat('perdido').map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                    </select>
                  </div>
                </article>
              ))}
              {!items.length && (
                <div className="grid flex-1 place-items-center rounded-xl border-2 border-dashed border-slate-200 py-6 text-xs text-slate-400">
                  Arraste aqui
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
