import { useEffect, useRef, useState } from 'react';
import { FINISHES, type Finish } from '@vidrapro/engine';
import { Card, ErrorBox, Field, PageLoader, toast, useLoad } from '../components/ui';
import { Icon } from '../components/ui/Icon';
import { api } from '../lib/api';
import { cx, dateBR } from '../lib/format';
import type { MaterialPrice, Tenant } from '../lib/types';

const SECTIONS: { cat: MaterialPrice['category']; title: string; unit: string; hint: string }[] = [
  { cat: 'aluminum', title: 'Alumínio por acabamento', unit: 'R$/kg', hint: 'Preço do perfil por kg. A perda de corte é somada automaticamente.' },
  { cat: 'glass', title: 'Vidros', unit: 'R$/m²', hint: 'Temperado é faturado com arredondamento por lado (padrão 5 cm).' },
  { cat: 'accessory', title: 'Kits de acessórios', unit: 'R$/kit', hint: 'Roldanas, fechos, escovas, pivôs, puxadores…' },
];

export function Settings() {
  const { data, error, loading } = useLoad(() => api.settings(), []);
  const [t, setT] = useState<Tenant | null>(null);
  const [prices, setPrices] = useState<MaterialPrice[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (data) { setT(data.tenant); setPrices(data.prices); } }, [data]);
  if (loading || !t) return error ? <ErrorBox message={error} /> : <PageLoader />;

  const set = <K extends keyof Tenant>(k: K, v: Tenant[K]) => { setT({ ...t, [k]: v }); setDirty(true); };
  const setPrice = (key: string, cat: string, price: number) => {
    setPrices((ps) => ps.map((p) => (p.key === key && p.category === cat ? { ...p, price } : p))); setDirty(true);
  };

  async function onLogo(file: File) {
    if (file.size > 600_000) return toast('Logo deve ter no máximo 600 KB');
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file);
    });
    try { const { logo_url } = await api.uploadLogo(dataUrl); setT((cur) => (cur ? { ...cur, logo_url } : cur)); toast('Logo atualizada'); }
    catch (e) { toast((e as Error).message); }
  }

  async function save() {
    if (!t) return;
    setSaving(true); setErr(null);
    try {
      const { tenant } = await api.updateSettings({
        name: t.name, document: t.document || null, whatsapp: t.whatsapp?.replace(/\D/g, '') || null, email: t.email || null,
        address: t.address || null, default_margin_pct: Number(t.default_margin_pct), aluminum_loss_pct: Number(t.aluminum_loss_pct),
        glass_round_mm: Number(t.glass_round_mm) as Tenant['glass_round_mm'], glass_min_area_m2: Number(t.glass_min_area_m2),
        labor_pct: Number(t.labor_pct), installation_per_item: Number(t.installation_per_item),
        quote_validity_days: Number(t.quote_validity_days), quote_footer_notes: t.quote_footer_notes || null,
      });
      const r = await api.updatePrices(prices.map(({ category, key, label, price, active, unit }) => ({ category, key, label, price: Number(price), active, unit })));
      setT(tenant); setPrices(r.prices); setDirty(false); toast('Configurações salvas');
    } catch (e) { setErr((e as Error).message); } finally { setSaving(false); }
  }

  const trialDays = Math.ceil((new Date(t.trial_ends_at).getTime() - Date.now()) / 864e5);

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Configurações da Empresa</h1>
          <p className="text-sm text-slate-500">Dados que aparecem no orçamento e preços usados pelo motor de cálculo.</p>
        </div>
        <button className="btn-primary hidden lg:inline-flex" disabled={!dirty || saving} onClick={save}><Icon name="check" className="h-4 w-4" />{saving ? 'Salvando…' : 'Salvar alterações'}</button>
      </div>
      {err && <ErrorBox message={err} />}

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-5">
          <Card>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Identidade</h2>
            <div className="mb-5 flex items-center gap-4">
              <button onClick={() => fileRef.current?.click()}
                className="group relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-brand-200 bg-white hover:border-brand-400">
                {t.logo_url ? <img src={t.logo_url} alt="Logo" className="h-full w-full object-contain p-2" />
                  : <Icon name="upload" className="h-7 w-7 text-brand-400" />}
                <span className="absolute inset-x-0 bottom-0 bg-ink/70 py-1 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">Trocar</span>
              </button>
              <div className="text-sm text-slate-500"><b className="text-ink">Logo da empresa</b><br />PNG, JPG, WEBP ou SVG até 600 KB. Aparece no PDF e no link enviado ao cliente.</div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden"
                onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])} />
            </div>
            <div className="grid gap-3">
              <Field label="Nome fantasia"><input className="field" value={t.name} onChange={(e) => set('name', e.target.value)} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="CNPJ / CPF"><input className="field" value={t.document ?? ''} onChange={(e) => set('document', e.target.value)} /></Field>
                <Field label="WhatsApp" hint="Com DDI, só dígitos: 5511999998888">
                  <input className="field" inputMode="tel" value={t.whatsapp ?? ''} onChange={(e) => set('whatsapp', e.target.value.replace(/\D/g, ''))} />
                </Field>
              </div>
              <Field label="E-mail"><input className="field" type="email" value={t.email ?? ''} onChange={(e) => set('email', e.target.value)} /></Field>
              <Field label="Endereço"><input className="field" value={t.address ?? ''} onChange={(e) => set('address', e.target.value)} /></Field>
              <Field label="Rodapé do orçamento" hint="Prazo, forma de pagamento, garantia…">
                <textarea className="field min-h-24" value={t.quote_footer_notes ?? ''} onChange={(e) => set('quote_footer_notes', e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Regras de preço</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Margem padrão (%)" hint="Markup sobre o custo"><input className="field" type="number" value={t.default_margin_pct} onChange={(e) => set('default_margin_pct', Number(e.target.value))} /></Field>
              <Field label="Perda de alumínio (%)"><input className="field" type="number" value={t.aluminum_loss_pct} onChange={(e) => set('aluminum_loss_pct', Number(e.target.value))} /></Field>
              <Field label="Arredondar vidro">
                <select className="field" value={t.glass_round_mm} onChange={(e) => set('glass_round_mm', Number(e.target.value) as Tenant['glass_round_mm'])}>
                  <option value={1}>Medida exata</option><option value={10}>1 cm</option><option value={50}>5 cm (padrão)</option><option value={100}>10 cm</option>
                </select>
              </Field>
              <Field label="Área mínima vidro (m²)"><input className="field" type="number" step="0.05" value={t.glass_min_area_m2} onChange={(e) => set('glass_min_area_m2', Number(e.target.value))} /></Field>
              <Field label="Mão de obra (% material)"><input className="field" type="number" value={t.labor_pct} onChange={(e) => set('labor_pct', Number(e.target.value))} /></Field>
              <Field label="Instalação por peça (R$)"><input className="field" type="number" value={t.installation_per_item} onChange={(e) => set('installation_per_item', Number(e.target.value))} /></Field>
              <Field label="Validade (dias)"><input className="field" type="number" value={t.quote_validity_days} onChange={(e) => set('quote_validity_days', Number(e.target.value))} /></Field>
            </div>
          </Card>

          <Card>
            <h2 id="assinatura" className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Assinatura</h2>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold capitalize">{{ trial: 'Período de teste', active: 'Ativa', past_due: 'Pagamento pendente', canceled: 'Cancelada' }[t.subscription_status]}</div>
                <div className="text-sm text-slate-500">
                  {t.subscription_status === 'trial' ? (trialDays > 0 ? `${trialDays} dias restantes · até ${dateBR(t.trial_ends_at)}` : 'Teste encerrado') : 'Gerenciada pelo provedor de pagamento'}
                </div>
              </div>
              <span className={cx('chip', t.subscription_status === 'active' ? 'bg-emerald-50 text-emerald-700' : t.subscription_status === 'trial' ? 'bg-brand-50 text-brand-700' : 'bg-amber-50 text-amber-700')}>
                {t.subscription_status}
              </span>
            </div>
          </Card>
        </div>

        <div className="space-y-5 lg:col-span-7">
          {SECTIONS.map((s) => (
            <Card key={s.cat}>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{s.title}</h2>
                <span className="text-xs text-slate-400">{s.unit}</span>
              </div>
              <p className="mb-3 text-xs text-slate-400">{s.hint}</p>
              <div className="divide-y divide-slate-100">
                {prices.filter((p) => p.category === s.cat).map((p) => (
                  <div key={p.key} className="flex items-center gap-3 py-2">
                    {s.cat === 'aluminum' && (
                      <span className="h-6 w-6 shrink-0 rounded-lg border border-black/10"
                        style={{ background: p.key === 'AMADEIRADO' ? 'linear-gradient(135deg,#a26a3f,#6e4426 60%,#a26a3f)' : FINISHES[p.key as Finish]?.hex }} />
                    )}
                    <span className="flex-1 text-sm font-medium">{p.label}</span>
                    <div className="relative w-36">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
                      <input className="field pl-9 text-right font-semibold tabular-nums" type="number" step="0.01" min={0}
                        value={p.price} onChange={(e) => setPrice(p.key, p.category, Number(e.target.value))} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
          <p className="px-1 text-xs text-slate-400">
            Os pesos (kg/m) dos perfis e as fórmulas de desconto são valores de referência do motor. Confira com o catálogo da sua extrusora antes de produzir.
          </p>
        </div>
      </div>

      <div className={cx('no-print fixed inset-x-0 bottom-[60px] z-20 border-t border-white/70 bg-white/90 px-4 py-3 backdrop-blur-xl transition lg:hidden', !dirty && 'translate-y-[200%]')}>
        <button className="btn-primary w-full" disabled={saving} onClick={save}>{saving ? 'Salvando…' : 'Salvar alterações'}</button>
      </div>
    </div>
  );
}
