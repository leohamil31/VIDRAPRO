import { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { Toaster } from './components/ui';
import { sessionStore } from './lib/api';
import { match, navigate, usePath } from './lib/router';
import type { Session } from './lib/types';
import { CuttingListPage } from './pages/CuttingListPage';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { PublicQuotePage, QuoteViewPage } from './pages/QuoteView';
import { QuoteBuilder } from './pages/QuoteBuilder';
import { Settings } from './pages/Settings';

function useSession() {
  const [s, setS] = useState<Session | null>(() => sessionStore.get());
  useEffect(() => {
    const h = () => setS(sessionStore.get());
    window.addEventListener('vidrapro:session', h);
    return () => window.removeEventListener('vidrapro:session', h);
  }, []);
  return s;
}

export default function App() {
  const path = usePath();
  const session = useSession();

  // Public, login-free routes
  const pub = match('/p/:token', path);
  if (pub) return <><PublicQuotePage token={pub.token} /><Toaster /></>;

  if (!session) {
    if (path !== '/login') queueMicrotask(() => navigate('/login', { replace: true }));
    return <><Login /><Toaster /></>;
  }
  if (path === '/login') queueMicrotask(() => navigate('/', { replace: true }));

  let page;
  let m: Record<string, string> | null;
  if (path === '/' || path === '/login') page = <Dashboard />;
  else if (path === '/orcamentos/novo') page = <QuoteBuilder />;
  else if ((m = match('/orcamentos/:id/editar', path))) page = <QuoteBuilder quoteId={m.id} />;
  else if ((m = match('/orcamentos/:id/corte', path))) page = <CuttingListPage quoteId={m.id} />;
  else if ((m = match('/orcamentos/:id', path))) page = <QuoteViewPage quoteId={m.id} />;
  else if (path.startsWith('/configuracoes')) page = <Settings />;
  else page = <div className="glass p-10 text-center text-slate-500">Página não encontrada.</div>;

  return (
    <>
      <Layout path={path} session={session}>{page}</Layout>
      <Toaster />
    </>
  );
}
