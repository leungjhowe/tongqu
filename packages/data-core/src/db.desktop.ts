/**
 * 桌面侧存储：基于 `@tauri-apps/plugin-sql`（底层 rusqlite / sqld）。
 *
 * - 暴露与 `db.web.ts` 一致的接口（`db.select` / `db.execute`），上层无需感知差异；
 * - 实际建表由 Rust 侧 `lib.rs` setup hook 完成（`CREATE TABLE IF NOT EXISTS`），
 *   JS 这边的 `runMigrations` 仅做 lazy connect。
 */

import Database from '@tauri-apps/plugin-sql';

let dbHandle: Database | null = null;
let dbLoading: Promise<Database> | null = null;

async function getDb(): Promise<Database> {
  if (dbHandle) return dbHandle;
  if (!dbLoading) {
    dbLoading = Database.load('sqlite:app.db').then((d) => {
      dbHandle = d;
      return d;
    });
  }
  return dbLoading;
}

export const db = {
  async select<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const d = await getDb();
    const result = await d.select<T>(sql, params);
    return Array.isArray(result) ? result : [result];
  },
  async execute(
    sql: string,
    params: unknown[] = [],
  ): Promise<{ rowsAffected: number; lastInsertId?: number }> {
    const d = await getDb();
    return d.execute(sql, params);
  },
};

/** 桌面端建表由 Rust 侧 setup hook 完成，这里只确保连接成功。 */
export async function runMigrations(): Promise<void> {
  await getDb();
}
