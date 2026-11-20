import type { NextFunction, Request, Response } from 'express';
import { adminPool } from '../db';
import { env } from '../env';
import { verifyAppToken, verifySupabaseToken, type AppClaims } from '../lib/auth';
import { HttpError } from '../lib/http';

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled';

export interface AuthContext extends AppClaims {
  subscription: SubscriptionStatus;
  trialEndsAt: string;
}

declare module 'express-serve-static-core' {
  interface Request { auth?: AuthContext }
}

// Small in-memory cache so we don't hit the DB on every request for tenant status.
const cache = new Map<string, { ctx: AuthContext; exp: number }>();
const TTL_MS = 30_000;
export const invalidateAuthCache = (tenantId: string) => {
  for (const [k, v] of cache) if (v.ctx.tid === tenantId) cache.delete(k);
};

async function resolve(token: string): Promise<AuthContext> {
  const hit = cache.get(token);
  if (hit && hit.exp > Date.now()) return hit.ctx;

  let row;
  if (env.AUTH_MODE === 'supabase') {
    const claims = verifySupabaseToken(token);
    ({ rows: [row] } = await adminPool.query(
      `SELECT u.id, u.tenant_id, u.role, t.subscription_status, t.trial_ends_at
         FROM users u JOIN tenants t ON t.id = u.tenant_id
        WHERE u.auth_user_id = $1 AND u.active`, [claims.sub]));
    if (!row) throw new HttpError(403, 'Conta sem empresa vinculada. Conclua o cadastro.', 'ONBOARDING_REQUIRED');
  } else {
    const claims = verifyAppToken(token);
    ({ rows: [row] } = await adminPool.query(
      `SELECT u.id, u.tenant_id, u.role, t.subscription_status, t.trial_ends_at
         FROM users u JOIN tenants t ON t.id = u.tenant_id
        WHERE u.id = $1 AND u.tenant_id = $2 AND u.active`, [claims.sub, claims.tid]));
    if (!row) throw new HttpError(401, 'Sessão inválida.');
  }

  const ctx: AuthContext = {
    sub: row.id, tid: row.tenant_id, role: row.role,
    subscription: row.subscription_status, trialEndsAt: row.trial_ends_at,
  };
  cache.set(token, { ctx, exp: Date.now() + TTL_MS });
  return ctx;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new HttpError(401, 'Não autenticado.');
    req.auth = await resolve(token);
    next();
  } catch (err) {
    next(err instanceof HttpError ? err : new HttpError(401, 'Token inválido ou expirado.'));
  }
}

export const requireRole = (...roles: AppClaims['role'][]) =>
  (req: Request, _res: Response, next: NextFunction) =>
    req.auth && roles.includes(req.auth.role) ? next() : next(new HttpError(403, 'Permissão insuficiente.'));
