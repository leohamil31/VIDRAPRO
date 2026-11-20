import { useEffect, useId, useState, type ReactNode } from 'react';
import { ENGINE_VERSION, TYPOLOGIES } from '@vidrapro/engine';
import { api, lastSubscriptionStatus, sessionStore } from '../lib/api';
import { cx } from '../lib/format';
import { Link, navigate } from '../lib/router';
import type { Session } from '../lib/types';
import { Icon, type IconName } from './ui/Icon';

const NAV: { to: string; label: string; icon: IconName; match: (p: string) => boolean }[] = [
  { to: '/', label: 'Painel', icon: 'home', match: (p) => p === '/' },
  { to: '/orcamentos/novo', label: 'Novo orçamento', icon: 'plus', match: (p) => p.startsWith('/orcamentos/novo') },
  { to: '/configuracoes', label: 'Configurações', icon: 'settings', match: (p) => p.startsWith('/configuracoes') },
];

export function Logo({ className = '' }: { className?: string }) {
  const gid = `lg-${useId().replace(/:/g, '')}`; // unique: a hidden copy must not own the gradient
  return (
    <div className={cx('flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#599fff" /><stop offset="1" stopColor="#1647de" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill={`url(#${gid})`} />
        <rect x="7" y="7" width="18" height="18" rx="1.5" fill="none" stroke="#fff" strokeWidth="2" />
        <path d="M16 7v18" stroke="#fff" strokeWidth="2" />
        <path d="M9.5 11.5l3-2.5M18.5 11.5l3-2.5" stroke="#fff" strokeOpacity=".7" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <span className="text-lg font-extrabold tracking-tight text-ink">Vidra<span className="text-brand-600">Pro</span></span>
    </div>
  );
}

function SubscriptionBanner() {
  const [status, setStatus] = useState<string | null>(lastSubscriptionStatus);
  useEffect(() => {
    const h = (e: Event) => setStatus((e as CustomEvent<string>).detail);
    window.addEventListener('vidrapro:subscription', h);
    return () => window.removeEventListener('vidrapro:subscription', h);
  }, []);
  if (status !== 'past_due' && status !== 'canceled') return null;
  return (
    <div className="no-print flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-white">
      <Icon name="alert" className="h-4 w-4" />
      {status === 'past_due' ? 'Pagamento pendente — sua conta está em modo somente leitura.' : 'Assinatura cancelada — modo somente leitura.'}
      <Link to="/configuracoes" className="underline">Regularizar</Link>
    </div>
  );
}

export function Layout({ path, session, children }: { path: string; session: Session; children: ReactNode }) {
  const logout = () => { sessionStore.set(null); navigate('/login', { replace: true }); };
  return (
    <div className="min-h-screen pb-20 lg:pb-0 lg:pl-64">
      <SubscriptionBanner />
      {/* Desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/60 bg-white/60 p-5 backdrop-blur-xl lg:flex">
        <Logo />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to}
              className={cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                n.match(path) ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25' : 'text-slate-600 hover:bg-white')}>
              <Icon name={n.icon} className="h-5 w-5" />{n.label}
            </Link>
          ))}
        </nav>
        <div className="mb-3 text-center text-[11px] font-semibold text-slate-400">
          Versão {ENGINE_VERSION} · {Object.keys(TYPOLOGIES).length} modelos
        </div>
        {api.mode === 'demo' && (
          <div className="mb-3 rounded-xl border border-brand-100 bg-brand-50 p-3 text-xs text-brand-800">
            <b>Modo demonstração.</b> Dados salvos só neste navegador. Defina <code>VITE_API_URL</code> para usar a API.
          </div>
        )}
        <div className="flex items-center gap-3 rounded-xl bg-white/80 p-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
            {session.user.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{session.user.name}</div>
            <div className="truncate text-xs text-slate-400">{session.user.email}</div>
          </div>
          <button onClick={logout} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Sair">
            <Icon name="logout" className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-white/60 bg-white/70 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-baseline gap-2"><Logo /><span className="text-[10px] font-semibold text-slate-400">v{ENGINE_VERSION}</span></div>
        <button onClick={logout} className="rounded-lg p-2 text-slate-500" title="Sair"><Icon name="logout" /></button>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-white/60 bg-white/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to}
            className={cx('flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold', n.match(path) ? 'text-brand-600' : 'text-slate-500')}>
            <Icon name={n.icon} className="h-5 w-5" />{n.label.replace(' orçamento', '')}
          </Link>
        ))}
      </nav>
    </div>
  );
}
