import type { Session } from './types';

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string, public details?: unknown) { super(message); }
}

const SESSION_KEY = 'vidrapro.session';
export const sessionStore = {
  get(): Session | null {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null'); } catch { return null; }
  },
  set(s: Session | null) {
    try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); } catch { /* private mode */ }
    window.dispatchEvent(new Event('vidrapro:session'));
  },
};
