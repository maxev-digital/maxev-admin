import { Pool } from 'pg';

const globalForPg = globalThis as unknown as { dfwPool: Pool };

export const dfwPool = globalForPg.dfwPool ?? new Pool({
  connectionString: process.env.DFWDAILY_DATABASE_URL ?? 'postgresql://dfwdaily:dfwdaily_secure_2026@localhost:5435/dfwdaily',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

if (process.env.NODE_ENV !== 'production') globalForPg.dfwPool = dfwPool;

export async function dfwQuery<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const client = await dfwPool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}
