import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from 'react';

/**
 * Minimal history router (≈40 lines) — keeps the MVP dependency-free.
 * Swap for react-router / TanStack Router when you need loaders or nested layouts.
 */
/** Deploy sub-path (e.g. GitHub Pages "/VIDRAPRO"). Routes inside the app stay root-relative. */
export const BASE = ((import.meta.env.BASE_URL as string | undefined) ?? '/').replace(/\/$/, '');
export const href = (to: string) => `${BASE}${to}`;
const stripBase = (p: string) => (BASE && p.startsWith(BASE) ? p.slice(BASE.length) || '/' : p);

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  if (opts.replace) history.replaceState(null, '', href(to));
  else history.pushState(null, '', href(to));
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0 });
}

export function usePath() {
  const [path, setPath] = useState(() => stripBase(location.pathname));
  useEffect(() => {
    const onPop = () => setPath(stripBase(location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return path;
}

/** match('/orcamentos/:id', '/orcamentos/42') → { id: '42' } */
export function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean);
  const s = path.split('/').filter(Boolean);
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

export function Link({ to, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={href(to)} onClick={handle} {...rest} />;
}
