import { useEffect, useMemo, useState } from 'react';
import { cloneLine, PARAM_LABELS, PROFILE_ROLES, type LineDefinition, type LineFamily } from '@vidrapro/engine';
import { Card, ErrorBox, Field, PageLoader, toast, useLoad } from '../components/ui';
import { Icon } from '../components/ui/Icon';
import { api } from '../lib/api';
import { cx } from '../lib/format';

const FAMILY_LABEL: Record<LineFamily, string> = {
  ESQUADRIA: 'Esquadrias', FACHADA: 'Fachadas', GUARDA_CORPO: 'Guarda-corpos', TEMPERADO: 'Temperado',
};

const toId = (name: string) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'NOVA_LINHA';

/**
 * Lines screen. Built-in lines are read-only; "Copiar" creates an editable
 * line (codes, kg/m and every deduction) that shows up in the quote builder.
 */
export function LinesManager() {
  const { data, error, loading, reload } = useLoad(() => api.listLines(), []);
  const [selected, setSelected] = useState<string>('SUPREMA');
  const [draft, setDraft] = useState<LineDefinition | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBase, setNewBase] = useState('SUPREMA');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const lines = useMemo(() => (data?.lines ?? []).filter((l) => l.family !== 'TEMPERADO'), [data]);
  const current = lines.find((l) => l.id === selected);

  useEffect(() => {
    if (isNew) return;
    setDraft(current && !current.builtIn ? JSON.parse(JSON.stringify(current)) : null);
    setErr(null);
  }, [current, isNew]);

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorBox message={error} />;

  function startCopy(base: LineDefinition, name: string) {
    const nm = name.trim() || `${base.name.replace(/ \(.*\)$/, '')} (cópia)`;
    let id = toId(nm);
    let n = 2;
    while (lines.some((l) => l.id === id)) id = `${toId(nm).slice(0, 36)}_${n++}`;
    setDraft(cloneLine(base, id, nm));
    setIsNew(true);
    setSelected(id);
    setErr(null);
  }

  async function save() {
    if (!draft) return;
    setBusy(true); setErr(null);
    try {
      await api.saveLine(draft, isNew);
      toast(isNew ? 'Linha criada — já disponível no orçamento' : 'Linha salva');
      setIsNew(false); setNewName('');
      reload();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  async function remove(l: LineDefinition) {
    if (!confirm(`Excluir a linha "${l.name}"? Orçamentos já salvos não mudam.`)) return;
    await api.deleteLine(l.id);
    toast('Linha excluída');
    setSelected('SUPREMA'); reload();
  }

  const view = isNew ? draft : current && !current.builtIn ? draft : current;
  const editable = Boolean(draft) && (isNew || (current && !current.builtIn));
  const setProfile = (role: string, key: 'code' | 'name' | 'kgPerM', v: string) =>
    setDraft((d) => d && ({ ...d, profiles: { ...d.profiles, [role]: { ...d.profiles[role], [key]: key === 'kgPerM' ? Number(v) : v } } }));
  const setParam = (g: string, k: string, v: string) =>
    setDraft((d) => d && ({ ...d, params: { ...d.params, [g]: { ...d.params[g], [k]: Number(v) } } }));

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {/* list */}
      <div className="space-y-4 lg:col-span-4">
        <Card>
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-500">Nova linha</h2>
          <p className="mb-3 text-xs text-slate-400">Copie uma linha parecida e ajuste códigos, pesos e descontos pelo catálogo do seu fornecedor (ex.: Sublime, Imperial, Elegance…).</p>
          <div className="space-y-2">
            <input className="field" placeholder="Nome (ex.: Linha Sublime)" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <select className="field" value={newBase} onChange={(e) => setNewBase(e.target.value)}>
              {lines.map((l) => <option key={l.id} value={l.id}>Copiar de: {l.name}</option>)}
            </select>
            <button className="btn-primary w-full" onClick={() => startCopy(lines.find((l) => l.id === newBase)!, newName)}>
              <Icon name="plus" className="h-4 w-4" />Criar linha
            </button>
          </div>
        </Card>
        {(['ESQUADRIA', 'FACHADA', 'GUARDA_CORPO'] as LineFamily[]).map((fam) => (
          <Card key={fam} className="p-3">
            <div className="px-2 pb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{FAMILY_LABEL[fam]}</div>
            <div className="space-y-1">
              {lines.filter((l) => l.family === fam).map((l) => (
                <button key={l.id} onClick={() => { setIsNew(false); setSelected(l.id); }}
                  className={cx('flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition',
                    selected === l.id && !isNew ? 'bg-brand-600 text-white' : 'hover:bg-white')}>
                  <Icon name={l.builtIn ? 'layers' : 'edit'} className="h-4 w-4 shrink-0 opacity-70" />
                  <span className="flex-1 truncate font-semibold">{l.name}</span>
                  <span className={cx('rounded px-1.5 text-[10px] font-bold', l.builtIn ? 'bg-slate-100 text-slate-500' : 'bg-violet-100 text-violet-700')}>{l.builtIn ? 'padrão' : 'minha'}</span>
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* detail */}
      <div className="space-y-4 lg:col-span-8">
        {view && (
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wide text-brand-600">{FAMILY_LABEL[view.family]} · {view.id}</div>
                {editable
                  ? <input className="field mt-1 text-lg font-bold" value={draft!.name} onChange={(e) => setDraft({ ...draft!, name: e.target.value })} />
                  : <h2 className="text-xl font-extrabold">{view.name}</h2>}
                <p className="mt-1 text-sm text-slate-500">{view.description}</p>
              </div>
              <div className="flex gap-2">
                {!editable && <button className="btn-outline" onClick={() => startCopy(view, '')}><Icon name="copy" className="h-4 w-4" />Copiar e editar</button>}
                {editable && !isNew && <button className="btn-ghost text-rose-600 hover:bg-rose-50" onClick={() => remove(view)}><Icon name="trash" className="h-4 w-4" />Excluir</button>}
                {editable && <button className="btn-primary" disabled={busy} onClick={save}><Icon name="check" className="h-4 w-4" />{isNew ? 'Criar linha' : 'Salvar'}</button>}
              </div>
            </div>
            {!editable && <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">Linha padrão (somente leitura). Valores de referência: use “Copiar e editar” para ajustar ao catálogo do seu fornecedor.</p>}
            {err && <div className="mt-3"><ErrorBox message={err} /></div>}
          </Card>
        )}

        {view && (
          <Card className="p-0">
            <div className="border-b border-slate-100 px-5 py-3 text-sm font-bold">Perfis ({Object.keys(view.profiles).length})</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-2">Função</th><th className="px-2 py-2">Código</th><th className="px-2 py-2">Nome no catálogo</th><th className="px-4 py-2 text-right">kg/m</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(view.profiles).map(([role, p]) => (
                    <tr key={role}>
                      <td className="px-4 py-1.5 text-xs text-slate-500">{PROFILE_ROLES[view.family]?.[role]?.name ?? role}</td>
                      <td className="px-2 py-1.5">{editable ? <input className="field py-1.5 font-mono text-xs" value={p.code} onChange={(e) => setProfile(role, 'code', e.target.value)} /> : <span className="font-mono text-xs">{p.code}</span>}</td>
                      <td className="px-2 py-1.5">{editable ? <input className="field py-1.5" value={p.name} onChange={(e) => setProfile(role, 'name', e.target.value)} /> : p.name}</td>
                      <td className="px-4 py-1.5 text-right">{editable ? <input className="field w-24 py-1.5 text-right tabular-nums" type="number" step="0.001" value={p.kgPerM} onChange={(e) => setProfile(role, 'kgPerM', e.target.value)} /> : <span className="tabular-nums">{p.kgPerM.toFixed(3)}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {view && Object.entries(view.params).map(([group, values]) => (
          <Card key={group}>
            <h3 className="mb-3 text-sm font-bold">Descontos — {PARAM_LABELS[group]?.label ?? group} <span className="font-normal text-slate-400">(mm)</span></h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Object.entries(values).map(([k, v]) => (
                <Field key={k} label={PARAM_LABELS[group]?.keys[k] ?? k}>
                  {editable
                    ? <input className="field tabular-nums" type="number" value={v} onChange={(e) => setParam(group, k, e.target.value)} />
                    : <div className="rounded-xl bg-slate-50 px-3 py-2.5 font-semibold tabular-nums">{v}</div>}
                </Field>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
