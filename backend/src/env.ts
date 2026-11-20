import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL_APP: z.string().url(),
  DATABASE_URL_ADMIN: z.string().url(),
  /** 'local' = built-in email/password + JWT · 'supabase' = verify Supabase Auth JWTs */
  AUTH_MODE: z.enum(['local', 'supabase']).default('local'),
  JWT_SECRET: z.string().min(32),
  SUPABASE_JWT_SECRET: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  LOGO_BUCKET: z.string().default('logos'),
  BILLING_WEBHOOK_SECRET: z.string().min(16),
  APP_PUBLIC_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
});

export const env = schema.parse(process.env);
