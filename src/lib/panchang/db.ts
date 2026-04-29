// Postgres client for the vds_seva database (wa_events). Connection string set
// via SEVA_DATABASE_URL — when running on the deploy host, this is local
// (127.0.0.1:5432). Without the env var, queries return empty arrays so dev
// builds don't break.

import { Pool } from "pg";

let _pool: Pool | null = null;

function getPool(): Pool | null {
  if (_pool) return _pool;
  const url = process.env.SEVA_DATABASE_URL;
  if (!url) return null;
  _pool = new Pool({ connectionString: url, max: 5 });
  return _pool;
}

export async function sevaQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const p = getPool();
  if (!p) return [];
  try {
    const res = await p.query(sql, params);
    return res.rows as T[];
  } catch (e) {
    console.error("[sevaQuery] error", e);
    return [];
  }
}
