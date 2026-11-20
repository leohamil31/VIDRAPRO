import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/http';

/**
 * Billing gate.
 *   trial (not expired) | active → full access
 *   trial expired | past_due     → read-only (GET), writes return 402
 *   canceled                     → read-only
 * The effective status is exposed in `X-Subscription-Status` so the UI can show a banner.
 */
export function subscriptionGate(req: Request, res: Response, next: NextFunction) {
  const a = req.auth;
  if (!a) return next(new HttpError(401, 'Não autenticado.'));

  const trialExpired = a.subscription === 'trial' && new Date(a.trialEndsAt).getTime() < Date.now();
  const effective = trialExpired ? 'past_due' : a.subscription;
  res.setHeader('X-Subscription-Status', effective);

  const readOnly = effective === 'past_due' || effective === 'canceled';
  if (readOnly && req.method !== 'GET') {
    return next(new HttpError(402, 'Assinatura pendente. Regularize o pagamento para criar ou editar orçamentos.', 'PAYMENT_REQUIRED'));
  }
  next();
}
