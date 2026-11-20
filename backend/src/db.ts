import { Pool, PoolClient } from 'pg';
import { env } from './env';

/**
 * Two pools, two privilege levels:
 *  - appPool   → role `app_api` (NO BYPASSRLS). Every tenant query runs here
 *                inside withTenant(), so RLS enforces isolation even if a
 *                WHERE tenant_id clause is forgotten.
 *  - adminPool → service role. Only for signup, login lookup, public-token
 *                reads and billing webhooks.
 */
export const appPool = new Pool({ connectionString: env.DATABASE_URL_APP, max: 15 });
export const adminPool = new Pool({ connectionString: env.DATABASE_URL_ADMIN, max: 5 });

export async function withTenant<T>(
  tenantId: string,
  userId: string | null,
  fn: (db: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await appPool.connect();
  try {
    await client.query('BEGIN');
    // `true` = local to this transaction; released connections never leak tenant context.
    await client.query(
      `SELECT set_config('app.tenant_id', $1, true), set_config('app.user_id', $2, true)`,
      [tenantId, userId ?? ''],
    );
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function withAdminTx<T>(fn: (db: PoolClient) => Promise<T>): Promise<T> {
  const client = await adminPool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
