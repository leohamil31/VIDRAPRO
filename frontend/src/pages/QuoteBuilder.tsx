import { useEffect, useMemo, useState } from 'react';
import {
  allLines, calculateItem, CATEGORY_LABEL, drawingFor, FINISHES, GLASSES, quoteTotals, TYPOLOGIES, typologiesByCategory, validateItem,
  type Category, type Finish, type GlassCode, type QuoteItemResult, type TypologyId,
} from '@vidrapro/engine';
import { Schematic } from '../components/schematic/Schematic';
import { Card, ErrorBox, Field, PageLoader, toast, useLoad, WarningBox } from '../components/ui';
import { Icon } from '../components/ui/Icon';
import { api } from '../lib/api';
import { brl, cx, num, quoteNo } from '../lib/format';
import { Link, navigate } from '../lib/router';
import type { DraftItemInput, QuoteInput } from '../lib/types';

type Draft = DraftItemInput & { key: string };
type Computed = { ok: true; r: QuoteItemResult } | { ok: false; issues: string[] };

const newKey = () => Math.random().toString(36).slice(2, 10);
const FAMILY_DEFAULT_LINE = { ESQUADRIA: 'SUPREMA', FACHADA: 'FACHADA_STICK', GUARDA_CORPO: 'GUARDA_CORPO_AL', TEMPERADO: 'TEMPERADO' } as const;

const defaultItem = (typology: TypologyId = 'JANELA_CORRER_2F', finish: Finish = 'BRANCO'): Draft => {
  const t = TYPOLOGIES[typology];
  return {
    key: newKey(), typology, line: FAMILY_DEFAULT_LINE[t.family], widthMm: t.defaultW, heightMm: t.defaultH,
    depthMm: t.depth?.default, finish, glassCode: t.defaultGlass, quantity: 1, locationLabel: '',
  };
};

export const finishSwatch = (f: Finish) =>
  f === 'AMADEIRADO' ? 'linear-gradient(135deg,#a26a3f,#6e4426 60%,#a26a3f)' : FINISHES[f].hex;

export function QuoteBuilder({ quoteId }: { quoteId?: string }) {
  const ctx = useLoad(() => api.pricingContext(), []);
  const existing = useLoad(() => (quoteId ? api.getQuote(quoteId) : Promise.resolve(null)), [quoteId]);

  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });
  const [notes, setNotes] = useState('');
  const [discountPct, setDiscountPct] = useState(0);
  const [marginPct, setMarginPct] = useState<number | null>(null);
  const [items, setItems] = useState<Draft[]>([defaultItem()]);
  const [active, setActive] = useState(0);
  const [showCut, setShowCut] = useState(false);
  const [showCost, setShowCost] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = existing.data;
    if (!d) return;
    setCustomer({ name: d.quote.customer_name, phone: d.quote.customer_phone ?? '', address: d.quote.customer_address ?? '' });
    setNotes(d.quote.notes ?? '');
    setDiscountPct(d.quote.discount_pct);
    setMarginPct(d.quote.margin_pct);
    setItems(d.items.map((i) => ({
      key: newKey(), typology: i.typology, line: i.line, widthMm: i.width_mm, heightMm: i.height_mm, depthMm: i.depth_mm ?? undefined,
      finish: i.finish, glassCode: i.glass_code, quantity: i.quantity, locationLabel: i.location_label ?? '',
    })));
  }, [existing.data]);

  useEffect(() => { if (ctx.data && marginPct == null) setMarginPct(ctx.data.settings.marginPct); }, [ctx.data, marginPct]);

  const customLines = ctx.data?.lines ?? [];
  const lines = useMemo(() => allLines(customLines), [customLines]);

  const computed: Computed[] = useMemo(() => {
    if (!ctx.data) return [];
    const settings = { ...ctx.data.settings, marginPct: marginPct ?? ctx.data.settings.marginPct };
    return items.map(({ key: _k, locationLabel: _l, ...input }) => {
      const issues = validateItem(input, customLines);
      if (issues.length) return { ok: false, issues };
      try { return { ok: true, r: calculateItem(input, ctx.data!.prices, settings, customLines) }; }
      catch (e) { return { ok: false, issues: [(e as Error).message] }; }
    });
  }, [items, ctx.data, marginPct, customLines]);

  const item = items[active] ?? items[0];
  // thumbnails for the model picker, in the current finish
  const thumbs = useMemo(() => Object.fromEntries((Object.keys(TYPOLOGIES) as TypologyId[]).map((t) => [t, drawingFor({ typology: t })])), []);

  if (ctx.loading || existing.loading) return <PageLoader />;
  if (ctx.error) return <ErrorBox message={ctx.error} />;

  const valid = computed.filter((c): c is { ok: true; r: QuoteItemResult } => c.ok);
  const totals = quoteTotals(valid.map((c) => c.r.pricing), discountPct);
  const missing = [...new Set(valid.flatMap((c) => c.r.pricing.missingPrices))];
  const cur = computed[active];
  const meta = TYPOLOGIES[item.typology];
  const category: Category = meta.category;
  const familyLines = lines.filter((l) => l.family === meta.family);
  const update = (patch: Partial<Draft>) => setItems((xs) => xs.map((x, i) => (i === active ? { ...x, ...patch } : x)));

  function changeTypology(t: TypologyId) {
    const m = TYPOLOGIES[t];
    const sameFamily = TYPOLOGIES[item.typology].family === m.family;
    update({
      typology: t,
      line: sameFamily ? item.line : FAMILY_DEFAULT_LINE[m.family],
      glassCode: m.glasses.includes(item.glassCode) ? item.glassCode : m.defaultGlass,
      widthMm: item.widthMm >= m.minW && item.widthMm <= m.maxW ? item.widthMm : m.defaultW,
      heightMm: item.heightMm >= m.minH && item.heightMm <= m.maxH ? item.heightMm : m.defaultH,
      depthMm: m.depth ? (item.depthMm ?? m.depth.default) : undefined,
    });
  }
  const changeCategory = (c: Category) => { if (c !== category) changeTypology(typologiesByCategory(c)[0].id); };
  const addItem = (copy = false) => {
    setItems((xs) => [...xs, copy ? { ...item, key: newKey() } : defaultItem(item.typology, item.finish)]);
    setActive(items.length);
  };
  const removeItem = (idx: number) => {
    if (items.length === 1) return;
    setItems((xs) => xs.filter((_, i) => i !== idx));
    setActive((a) => Math.max(0, a >= idx ? a - 1 : a));
  };

  async function save(thenView: boolean) {
    setError(null);
    if (customer.name.trim().length < 2) return setError('Informe o nome do cliente.');
    const bad = computed.findIndex((c) => !c.ok);
    if (bad >= 0) { setActive(bad); return setError(`Corrija o item ${bad + 1} antes de salvar.`); }
    if (missing.length) return setError(`Cadastre os preços em Configurações: ${missing.join(', ')}.`);
    const input: QuoteInput = {
      customerName: customer.name.trim(), customerPhone: customer.phone.replace(/\D/g, '') || null,
      customerAddress: customer.address.trim() || null, marginPct: marginPct ?? undefined, discountPct, notes: notes.trim() || null,
      items: items.map(({ key: _k, ...i }) => ({ ...i, depthMm: TYPOLOGIES[i.typology].depth ? i.depthMm : undefined, locationLabel: i.locationLabel?.trim() || null })),
    };
    setSaving(true);
    try {
      const id = quoteId ? (await api.updateQuote(quoteId, input)).id : (await api.createQuote(input)).id;
      toast(quoteId ? 'Orçamento atualizado' : 'Orçamento salvo');
      navigate(thenView ? `/orcamentos/${id}` : `/orcamentos/${id}/editar`, { replace: !thenView });
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  }

  const p = cur?.ok ? cur.r.pricing : null;
  const groups = [...new Set(typologiesByCategory(category).map((t) => t.group))];
  const previewDrawing = cur?.ok ? cur.r.cutting.drawing : drawingFor(item, customLines);

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link to={quoteId ? `/orcamentos/${quoteId}` : '/'} className="btn-ghost -ml-2 px-2"><Icon name="back" /></Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{quoteId ? `Editar orçamento ${existing.data ? quoteNo(existing.data.quote.number) : ''}` : 'Novo orçamento'}</h1>
            <p className="text-sm text-slate-500">Preço, lista de corte e acessórios calculados ao vivo.</p>
          </div>
        </div>
        <div className="hidden gap-2 lg:flex">
          <button className="btn-outline" disabled={saving} onClick={() => save(false)}>Salvar rascunho</button>
          <button className="btn-primary" disabled={saving} onClick={() => save(true)}><Icon name="check" className="h-4 w-4" />Salvar e visualizar</button>
        </div>
      </div>

      {error && <ErrorBox message={error} />}
      {missing.length > 0 && <WarningBox items={[`Sem preço cadastrado: ${missing.join(', ')}. Ajuste em Configurações › Preços.`]} />}

      <div className="grid gap-5 lg:grid-cols-12">
        {/* ---------------- LEFT: inputs ---------------- */}
        <div className="min-w-0 space-y-5 lg:col-span-7">
          <Card>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Cliente</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome"><input className="field" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Nome do cliente" /></Field>
              <Field label="WhatsApp"><input className="field" inputMode="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="(11) 99999-9999" /></Field>
              <Field label="Endereço da obra" className="sm:col-span-2"><input className="field" value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} /></Field>
            </div>
          </Card>

          {/* items strip */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {items.map((it, idx) => {
              const c = computed[idx];
              return (
                <button key={it.key} onClick={() => setActive(idx)}
                  className={cx('flex min-w-44 items-center gap-2.5 rounded-xl border p-2 text-left transition',
                    idx === active ? 'border-brand-400 bg-white shadow-md ring-4 ring-brand-100' : 'border-white/70 bg-white/60 hover:bg-white')}>
                  <div className="h-10 w-12 shrink-0">
                    <Schematic compact drawing={c?.ok ? c.r.cutting.drawing : thumbs[it.typology]} finish={it.finish} glassCode={it.glassCode} className="h-full w-full" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold">{idx + 1}. {it.locationLabel || TYPOLOGIES[it.typology].short}</div>
                    <div className={cx('text-xs', c?.ok ? 'text-slate-500' : 'text-rose-600')}>
                      {c?.ok ? `${it.quantity}× · ${brl(c.r.pricing.totalPrice)}` : 'Corrigir item'}
                    </div>
                  </div>
                </button>
              );
            })}
            <button onClick={() => addItem(false)} className="flex min-w-32 items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-brand-200 px-3 text-sm font-semibold text-brand-600 hover:bg-brand-50">
              <Icon name="plus" className="h-4 w-4" />Item
            </button>
          </div>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Item {active + 1}</h2>
              <div className="flex gap-1">
                <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => addItem(true)}><Icon name="copy" className="h-4 w-4" />Duplicar</button>
                {items.length > 1 && <button className="btn-ghost px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50" onClick={() => removeItem(active)}><Icon name="trash" className="h-4 w-4" />Remover</button>}
              </div>
            </div>

            {/* Section: esquadrias × temperados */}
            <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
              {(['ESQUADRIA', 'TEMPERADO'] as Category[]).map((c) => (
                <button key={c} onClick={() => changeCategory(c)}
                  className={cx('flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition',
                    category === c ? 'bg-white text-brand-700 shadow' : 'text-slate-500 hover:text-slate-700')}>
                  <Icon name={c === 'ESQUADRIA' ? 'layers' : 'box'} className="h-4 w-4" />
                  <span className="hidden sm:inline">{CATEGORY_LABEL[c]}</span>
                  <span className="sm:hidden">{c === 'ESQUADRIA' ? 'Esquadrias' : 'Temperados'}</span>
                </button>
              ))}
            </div>

            {groups.map((g) => (
              <div key={g} className="mb-3">
                <span className="label">{g}</span>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
                  {typologiesByCategory(category).filter((t) => t.group === g).map((m) => (
                    <button key={m.id} onClick={() => changeTypology(m.id)} title={m.label}
                      className={cx('flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition',
                        item.typology === m.id ? 'border-brand-500 bg-brand-50 ring-4 ring-brand-100' : 'border-slate-200 bg-white hover:border-brand-300')}>
                      <div className="h-12 w-full">
                        <Schematic compact drawing={thumbs[m.id]} finish={item.finish} glassCode={m.defaultGlass} className="h-full w-full" />
                      </div>
                      <span className="text-[11px] font-bold leading-tight">{m.short}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {meta.family !== 'TEMPERADO' && (
              <div className="mt-4">
                <div className="flex items-baseline justify-between">
                  <span className="label">{meta.family === 'ESQUADRIA' ? 'Linha de esquadria' : 'Sistema'}</span>
                  <Link to="/configuracoes/linhas" className="text-xs font-semibold text-brand-600">+ Adicionar / editar linhas</Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {familyLines.map((l) => (
                    <button key={l.id} onClick={() => update({ line: l.id })} title={l.description}
                      className={cx('rounded-xl border px-3 py-2 text-sm font-semibold transition',
                        item.line === l.id ? 'border-brand-500 bg-brand-50 text-brand-700 ring-4 ring-brand-100' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300')}>
                      {l.name}{!l.builtIn && <span className="ml-1.5 rounded bg-violet-100 px-1 text-[10px] text-violet-700">minha</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={cx('mt-4 grid grid-cols-2 gap-3', meta.depth ? 'sm:grid-cols-5' : 'sm:grid-cols-4')}>
              <Field label={meta.depth ? 'Frontal (mm)' : 'Largura (mm)'} hint={`${meta.minW}–${meta.maxW}`}>
                <input className="field font-semibold" type="number" inputMode="numeric" value={item.widthMm || ''} onChange={(e) => update({ widthMm: Math.round(Number(e.target.value)) })} />
              </Field>
              {meta.depth && (
                <Field label={meta.depth.label} hint={`${meta.depth.min}–${meta.depth.max}`}>
                  <input className="field font-semibold" type="number" inputMode="numeric" value={item.depthMm || ''} onChange={(e) => update({ depthMm: Math.round(Number(e.target.value)) })} />
                </Field>
              )}
              <Field label="Altura (mm)" hint={`${meta.minH}–${meta.maxH}`}>
                <input className="field font-semibold" type="number" inputMode="numeric" value={item.heightMm || ''} onChange={(e) => update({ heightMm: Math.round(Number(e.target.value)) })} />
              </Field>
              <Field label="Quantidade">
                <div className="flex items-center rounded-xl border border-slate-200 bg-white">
                  <button className="px-3 py-2.5 text-lg font-bold text-slate-500" onClick={() => update({ quantity: Math.max(1, item.quantity - 1) })}>−</button>
                  <input className="w-full min-w-0 bg-transparent text-center font-semibold outline-none" type="number" inputMode="numeric" value={item.quantity || ''} onChange={(e) => update({ quantity: Math.round(Number(e.target.value)) })} />
                  <button className="px-3 py-2.5 text-lg font-bold text-slate-500" onClick={() => update({ quantity: item.quantity + 1 })}>+</button>
                </div>
              </Field>
              <Field label="Ambiente"><input className="field" value={item.locationLabel ?? ''} onChange={(e) => update({ locationLabel: e.target.value })} placeholder="Ex.: Quarto" /></Field>
            </div>

            <div className="mt-4">
              <span className="label">{category === 'TEMPERADO' ? 'Cor dos perfis e ferragens' : 'Acabamento do alumínio'}</span>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(FINISHES) as Finish[]).map((f) => (
                  <button key={f} onClick={() => update({ finish: f })}
                    className={cx('flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition',
                      item.finish === f ? 'border-brand-500 bg-brand-50 text-brand-700 ring-4 ring-brand-100' : 'border-slate-200 bg-white text-slate-600')}>
                    <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: finishSwatch(f) }} />
                    {FINISHES[f].label}
                  </button>
                ))}
              </div>
            </div>

            {meta.usesGlass ? (
              <Field label="Vidro" className="mt-4">
                <select className="field" value={item.glassCode} onChange={(e) => update({ glassCode: e.target.value as GlassCode })}>
                  {meta.glasses.map((g) => <option key={g} value={g}>{GLASSES[g].label}</option>)}
                </select>
              </Field>
            ) : (
              <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">Modelo sem vidro — fechamento em {item.typology.includes('VENEZIANA') ? 'palhetas de veneziana' : 'lambri de alumínio'}.</p>
            )}

            {cur && !cur.ok && <div className="mt-4"><ErrorBox message={cur.issues.join(' ')} /></div>}
            {cur?.ok && cur.r.cutting.warnings.length > 0 && <div className="mt-4"><WarningBox items={cur.r.cutting.warnings} /></div>}
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Condições</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Margem (%)" hint="Markup sobre o custo">
                <input className="field" type="number" value={marginPct ?? ''} onChange={(e) => setMarginPct(Number(e.target.value))} />
              </Field>
              <Field label="Desconto (%)">
                <input className="field" type="number" min={0} max={100} value={discountPct || ''} onChange={(e) => setDiscountPct(Math.min(100, Math.max(0, Number(e.target.value))))} />
              </Field>
              <Field label="Observações" className="sm:col-span-3">
                <textarea className="field min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: instalação inclusa, retirada do vidro antigo…" />
              </Field>
            </div>
          </Card>
        </div>

        {/* ---------------- RIGHT: live preview ---------------- */}
        <div className="min-w-0 space-y-5 lg:col-span-5">
          <div className="space-y-5 lg:sticky lg:top-6">
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{meta.label}</div>
                  <div className="truncate text-xs text-slate-500">
                    {meta.family !== 'TEMPERADO' && `${lines.find((l) => l.id === item.line)?.name ?? item.line} · `}{FINISHES[item.finish].label}{meta.usesGlass && ` · ${GLASSES[item.glassCode].label}`}
                  </div>
                </div>
                <span className="chip shrink-0 bg-brand-50 text-brand-700">Vista interna</span>
              </div>
              <div className="bg-gradient-to-b from-white to-slate-50 p-4">
                <Schematic drawing={previewDrawing} finish={item.finish} glassCode={item.glassCode}
                  dims={{ w: item.widthMm, h: item.heightMm, d: meta.depth ? item.depthMm : undefined }} className="mx-auto h-72 w-full" />
              </div>
              {cur?.ok && (
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 text-center text-xs">
                  <div className="p-2.5"><div className="text-slate-400">Folhas / painéis</div><div className="font-bold">{cur.r.cutting.leaves.count}</div></div>
                  <div className="p-2.5"><div className="text-slate-400">Peça (L×A)</div><div className="font-bold">{cur.r.cutting.leaves.widthMm}×{cur.r.cutting.leaves.heightMm}</div></div>
                  <div className="p-2.5"><div className="text-slate-400">Alumínio</div><div className="font-bold">{num(cur.r.pricing.aluminum.netKg, 2)} kg</div></div>
                </div>
              )}
            </Card>

            <Card>
              {p ? (
                <>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Item {active + 1} · {p.quantity}× {brl(p.unitPrice)}</div>
                      <div className="text-3xl font-extrabold tracking-tight text-brand-700">{brl(p.totalPrice)}</div>
                    </div>
                    <button className="text-xs font-semibold text-slate-500 underline-offset-2 hover:underline" onClick={() => setShowCost(!showCost)}>
                      {showCost ? 'Ocultar custos' : 'Ver custos'}
                    </button>
                  </div>
                  {showCost && (
                    <dl className="mt-4 space-y-1.5 rounded-xl bg-slate-50 p-3 text-sm">
                      <Row k={`Alumínio · ${num(p.aluminum.billedKg, 2)} kg × ${brl(p.aluminum.pricePerKg)}`} v={brl(p.aluminum.cost)} />
                      {p.glass.billedM2 > 0 && <Row k={`Vidro · ${num(p.glass.billedM2, 2)} m² faturados`} v={brl(p.glass.cost)} />}
                      <Row k={`Acessórios (${p.accessories.lines.length} itens)`} v={brl(p.accessories.cost)} />
                      {p.laborCost > 0 && <Row k="Mão de obra" v={brl(p.laborCost)} />}
                      {p.installation > 0 && <Row k="Instalação" v={brl(p.installation)} />}
                      <div className="my-1 border-t border-slate-200" />
                      <Row k="Custo unitário" v={brl(p.unitCost)} strong />
                      <Row k={`Lucro unitário (${p.marginPct}%)`} v={brl(p.unitPrice - p.unitCost)} tone="text-emerald-600" />
                    </dl>
                  )}
                </>
              ) : <div className="text-sm text-slate-500">Preencha medidas válidas para ver o preço.</div>}

              <div className="mt-5 space-y-1.5 border-t border-slate-100 pt-4 text-sm">
                <Row k={`Subtotal (${valid.length} ${valid.length === 1 ? 'item' : 'itens'})`} v={brl(totals.subtotal)} />
                {totals.discountValue > 0 && <Row k={`Desconto ${totals.discountPct}%`} v={`− ${brl(totals.discountValue)}`} tone="text-rose-600" />}
                <div className="flex items-end justify-between pt-1">
                  <span className="font-bold">Total do orçamento</span>
                  <span className="text-2xl font-extrabold tracking-tight">{brl(totals.total)}</span>
                </div>
                {showCost && <Row k="Lucro bruto estimado" v={brl(totals.grossProfit)} tone="text-emerald-600" />}
              </div>
            </Card>

            {cur?.ok && (
              <Card className="p-0">
                <button onClick={() => setShowCut(!showCut)} className="flex w-full items-center justify-between px-5 py-4">
                  <span className="flex items-center gap-2 text-sm font-bold"><Icon name="scissors" className="h-4 w-4 text-brand-600" />Lista de corte e acessórios (1 un.)</span>
                  <Icon name="back" className={cx('h-4 w-4 text-slate-400 transition', showCut ? 'rotate-90' : '-rotate-90')} />
                </button>
                {showCut && (
                  <div className="space-y-4 border-t border-slate-100 px-5 py-4 text-sm">
                    <table className="w-full">
                      <thead className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                        <tr><th className="pb-1">Perfil</th><th className="pb-1 text-right">Medida</th><th className="pb-1 text-right">Qtd</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cur.r.cutting.profiles.map((pr, i) => (
                          <tr key={i}>
                            <td className="py-1.5"><div className="font-medium">{pr.name}</div><div className="text-[11px] text-slate-400">{pr.code} · {pr.formula}</div></td>
                            <td className="py-1.5 text-right font-mono font-semibold">{pr.lengthMm}</td>
                            <td className="py-1.5 text-right">{pr.qty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {cur.r.cutting.glasses.map((g, i) => (
                      <div key={i} className="rounded-xl bg-sky-50 p-3">
                        <div className="flex justify-between gap-2 font-semibold"><span>{g.label}</span><span className="whitespace-nowrap font-mono">{g.widthMm} × {g.heightMm} · {g.qty}×</span></div>
                        <div className="text-[11px] text-slate-500">{GLASSES[g.glassCode].label} · {g.formula}</div>
                        {g.notes && <div className="mt-1 text-[11px] font-medium text-amber-700">{g.notes}</div>}
                      </div>
                    ))}
                    <div>
                      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Acessórios</div>
                      <ul className="divide-y divide-slate-100">
                        {cur.r.cutting.accessories.map((a) => (
                          <li key={a.code} className="flex justify-between gap-3 py-1.5">
                            <span>{a.name}</span>
                            <b className="whitespace-nowrap">{a.unit === 'm' ? `${num(a.qty, 1)} m` : `${a.qty} un`}</b>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sticky action bar */}
      <div className="no-print fixed inset-x-0 bottom-[60px] z-20 border-t border-white/70 bg-white/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="text-[11px] font-semibold uppercase text-slate-500">Total</div>
            <div className="text-xl font-extrabold">{brl(totals.total)}</div>
          </div>
          <button className="btn-primary" disabled={saving} onClick={() => save(true)}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, strong, tone }: { k: string; v: string; strong?: boolean; tone?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className={cx('text-slate-500', strong && 'font-semibold text-ink')}>{k}</dt>
      <dd className={cx('font-semibold tabular-nums', tone)}>{v}</dd>
    </div>
  );
}
