import { useState, type FormEvent } from 'react';
import { Logo } from '../components/Layout';
import { ErrorBox, Field } from '../components/ui';
import { Icon } from '../components/ui/Icon';
import { api } from '../lib/api';
import { navigate } from '../lib/router';

export function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [form, setForm] = useState({ companyName: '', name: '', email: api.mode === 'demo' ? 'demo@vidrapro.app' : '', password: api.mode === 'demo' ? 'demo1234' : '', whatsapp: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      if (mode === 'login') await api.login(form.email, form.password);
      else await api.signup({ ...form, whatsapp: form.whatsapp.replace(/\D/g, '') || undefined });
      navigate('/', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-sky-500 p-12 text-white lg:flex lg:flex-col">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 left-10 h-96 w-96 rounded-full bg-sky-300/30 blur-3xl" />
        <div className="relative rounded-2xl bg-white/95 px-4 py-3 shadow-xl self-start"><Logo /></div>
        <div className="relative mt-auto max-w-lg">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">Orçamento de esquadria e vidro temperado em 60 segundos.</h1>
          <p className="mt-4 text-lg text-white/85">Medidas do vão → preço para o cliente, lista de corte para a oficina e link no WhatsApp. Tudo junto.</p>
          <ul className="mt-8 space-y-3 text-white/90">
            {['Janelas e portas de correr Suprema / Gold', 'Box frontal e porta pivotante em temperado', 'Otimização de barras de 6 m', 'PDF com a sua logo + envio por WhatsApp'].map((t) => (
              <li key={t} className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-white/20"><Icon name="check" className="h-4 w-4" /></span>{t}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="glass w-full max-w-md space-y-4 p-7">
          <div className="lg:hidden"><Logo /></div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{mode === 'login' ? 'Entrar' : 'Criar conta grátis'}</h2>
            <p className="mt-1 text-sm text-slate-500">{mode === 'login' ? 'Acesse o painel da sua vidraçaria.' : '14 dias grátis, sem cartão.'}</p>
          </div>
          {mode === 'signup' && (
            <>
              <Field label="Nome da empresa"><input className="field" required value={form.companyName} onChange={set('companyName')} placeholder="Vidraçaria Exemplo" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Seu nome"><input className="field" required value={form.name} onChange={set('name')} /></Field>
                <Field label="WhatsApp"><input className="field" inputMode="tel" value={form.whatsapp} onChange={set('whatsapp')} placeholder="11 99999-9999" /></Field>
              </div>
            </>
          )}
          <Field label="E-mail"><input className="field" type="email" required autoComplete="email" value={form.email} onChange={set('email')} /></Field>
          <Field label="Senha" hint={mode === 'signup' ? 'Mínimo 8 caracteres' : undefined}>
            <input className="field" type="password" required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={set('password')} />
          </Field>
          {error && <ErrorBox message={error} />}
          <button className="btn-primary w-full py-3" disabled={busy}>{busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}</button>
          <p className="text-center text-sm text-slate-500">
            {mode === 'login' ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
            <button type="button" className="font-semibold text-brand-600" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
              {mode === 'login' ? 'Teste grátis' : 'Entrar'}
            </button>
          </p>
          {api.mode === 'demo' && <p className="rounded-lg bg-brand-50 p-2 text-center text-xs text-brand-700">Modo demonstração: clique em <b>Entrar</b>.</p>}
        </form>
      </section>
    </div>
  );
}
