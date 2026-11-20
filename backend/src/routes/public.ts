import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { adminPool } from '../db';
import { ah, HttpError } from '../lib/http';

/** Token-based, login-free quote page for the end customer (customer-safe fields only). */
export const publicRouter = Router();

publicRouter.use(rateLimit({ windowMs: 60_000, limit: 60 }));

publicRouter.get('/quotes/:token', ah(async (req, res) => {
  const token = z.string().regex(/^[A-Za-z0-9_-]{20,40}$/).parse(req.params.token);
  const { rows: [r] } = await adminPool.query('SELECT public_quote($1) AS data', [token]);
  if (!r?.data) throw new HttpError(404, 'Orçamento não encontrado.');
  res.setHeader('Cache-Control', 'private, max-age=60');
  res.json(r.data);
}));
