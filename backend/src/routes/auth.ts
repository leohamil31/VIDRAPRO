import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { adminPool, withAdminTx } from '../db';
import { env } from '../env';
import { hashPassword, signAppToken, verifyPassword, verifySupabaseToken } from '../lib/auth';
import { ah, HttpError } from '../lib/http';

export const authRouter = Router();

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'empresa';

const signupSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200).optional(),   // required in local mode
  whatsapp: z.string().regex(/^\d{10,13}$/).optional(),
});

async function createTenantWithOwner(input: z.infer<typeof signupSchema>, authUserId: string | null) {
  return withAdminTx(async (db) => {
    const exists = await db.query('SELECT 1 FROM users WHERE lower(email) = $1', [input.email]);
    if (exists.rowCount) throw new HttpError(409, 'E-mail já cadastrado.');

    const slug = `${slugify(input.companyName)}-${randomBytes(3).toString('hex')}`;
    const { rows: [tenant] } = await db.query(
      `INSERT INTO tenants (name, slug, whatsapp, email) VALUES ($1, $2, $3, $4) RETURNING id, name, trial_ends_at`,
      [input.companyName, slug, input.whatsapp ?? null, input.email]);
    const passwordHash = input.password ? await hashPassword(input.password) : null;
    const { rows: [user] } = await db.query(
      `INSERT INTO users (tenant_id, auth_user_id, email, password_hash, name, role)
       VALUES ($1, $2, $3, $4, $5, 'owner') RETURNING id, name, email, role`,
      [tenant.id, authUserId, input.email, passwordHash, input.name]);
    await db.query('SELECT seed_tenant_prices($1)', [tenant.id]);
    return { tenant, user };
  });
}

/** Local mode: create company + owner, return JWT. */
authRouter.post('/signup', ah(async (req, res) => {
  if (env.AUTH_MODE !== 'local') throw new HttpError(400, 'Use /auth/onboard com Supabase Auth.');
  const input = signupSchema.parse(req.body);
  if (!input.password) throw new HttpError(400, 'Senha obrigatória.');
  const { tenant, user } = await createTenantWithOwner(input, null);
  res.status(201).json({ token: signAppToken({ sub: user.id, tid: tenant.id, role: 'owner' }), user, tenant });
}));

authRouter.post('/login', ah(async (req, res) => {
  if (env.AUTH_MODE !== 'local') throw new HttpError(400, 'Login é feito pelo Supabase Auth.');
  const { email, password } = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string() }).parse(req.body);
  const { rows: [u] } = await adminPool.query(
    `SELECT id, tenant_id, name, email, role, password_hash FROM users WHERE lower(email) = $1 AND active`, [email]);
  // Always run verify to keep timing uniform
  const ok = await verifyPassword(password, u?.password_hash ?? 'scrypt$AAAA$AAAA');
  if (!u || !ok) throw new HttpError(401, 'E-mail ou senha incorretos.');
  res.json({
    token: signAppToken({ sub: u.id, tid: u.tenant_id, role: u.role }),
    user: { id: u.id, name: u.name, email: u.email, role: u.role },
  });
}));

/** Supabase mode: user already exists in auth.users, create the company for them. */
authRouter.post('/onboard', ah(async (req, res) => {
  if (env.AUTH_MODE !== 'supabase') throw new HttpError(400, 'Disponível apenas com Supabase Auth.');
  const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  const claims = verifySupabaseToken(token);
  const input = signupSchema.parse({ ...req.body, email: claims.email ?? req.body.email });
  const result = await createTenantWithOwner(input, claims.sub);
  res.status(201).json(result);
}));
