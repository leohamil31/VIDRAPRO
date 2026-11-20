import { useEffect, useState, type ReactNode } from 'react';
import { cx, STATUS_META } from '../../lib/format';
import type { QuoteStatus } from '../../lib/types';
import { Icon } from './Icon';

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('glass p-5', className)}>{children}</div>;
}

export function Field({ label, hint, error, children, className }: {
  label: string; hint?: string; error?: string; children: ReactNode; className?: string;
}) {
  return (
    <label className={cx('block', className)}>
      <span className="label">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-rose-600">{error}</span>
        : hint ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  );
}

export function StatusChip({ status }: { status: QuoteStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={cx('chip', m.chip)}>
      <span className={cx('h-1.5 w-1.5 rounded-full', m.dot)} />
      {m.label}
    </span>
  );
}

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return <span className={cx('inline-block animate-spin rounded-full border-2 border-brand-200 border-t-brand-600', className)} />;
}

export function PageLoader() {
  return <div className="flex min-h-[50vh] items-center justify-center"><Spinner className="h-8 w-8" /></div>;
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" /> <span>{message}</span>
    </div>
  );
}

export function WarningBox({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
      {items.map((w) => (
        <div key={w} className="flex gap-2"><Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />{w}</div>
      ))}
    </div>
  );
}

/** Tiny global toast */
let pushToast: ((msg: string) => void) | null = null;
export const toast = (msg: string) => pushToast?.(msg);
export function Toaster() {
  const [msgs, setMsgs] = useState<{ id: number; msg: string }[]>([]);
  useEffect(() => {
    pushToast = (msg) => {
      const id = Date.now() + Math.random();
      setMsgs((m) => [...m, { id, msg }]);
      setTimeout(() => setMsgs((m) => m.filter((x) => x.id !== id)), 3200);
    };
    return () => { pushToast = null; };
  }, []);
  return (
    <div className="no-print pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6">
      {msgs.map((m) => (
        <div key={m.id} className="pointer-events-auto flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-xl">
          <Icon name="check" className="h-4 w-4 text-emerald-400" />{m.msg}
        </div>
      ))}
    </div>
  );
}

/** Data-loading hook with reload */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    fn().then((data) => alive && setState({ data, loading: false }))
      .catch((e: Error) => alive && setState({ error: e.message, loading: false }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, reload: () => setTick((t) => t + 1), setData: (data: T) => setState({ data, loading: false }) };
}
