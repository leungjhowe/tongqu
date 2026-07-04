/** packages/data-core/src/db.ts */

import { db as webDB, runMigrations as webMigrations } from './db.web';

async function detectImpl() {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    const mod = await import('./db.desktop');
    return mod;
  }
  return { db: webDB, runMigrations: webMigrations };
}

let _cached: Awaited<ReturnType<typeof detectImpl>> | null = null;
async function impl() {
  if (!_cached) _cached = await detectImpl();
  return _cached;
}

export const db = {
  select: async <T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> =>
    (await impl()).db.select<T>(sql, params),
  execute: async (sql: string, params?: unknown[]): Promise<{ rowsAffected: number }> =>
    (await impl()).db.execute(sql, params),
};

export async function runMigrations(): Promise<void> {
  await (await impl()).runMigrations();
}

export { eq, and, desc } from 'drizzle-orm';
