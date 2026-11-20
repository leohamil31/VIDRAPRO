import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import jwt from 'jsonwebtoken';
import { env } from '../env';

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [algo, saltB64, hashB64] = stored.split('$');
  if (algo !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length);
  return timingSafeEqual(actual, expected);
}

export interface AppClaims {
  sub: string;   // users.id
  tid: string;   // tenant id
  role: 'owner' | 'admin' | 'seller' | 'workshop';
}

export const signAppToken = (c: AppClaims) =>
  jwt.sign(c, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d', issuer: 'vidrapro' });

export const verifyAppToken = (token: string) =>
  jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'], issuer: 'vidrapro' }) as AppClaims;

export const verifySupabaseToken = (token: string) => {
  if (!env.SUPABASE_JWT_SECRET) throw new Error('SUPABASE_JWT_SECRET not configured');
  return jwt.verify(token, env.SUPABASE_JWT_SECRET, { algorithms: ['HS256'], audience: 'authenticated' }) as { sub: string; email?: string };
};
