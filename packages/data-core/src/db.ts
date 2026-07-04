import Database from '@tauri-apps/plugin-sql';
import * as schema from './schema';

/**
 * 直接用 @tauri-apps/plugin-sql 的 JS wrapper，跳过 drizzle proxy。
 * 理由：drizzle-orm/sqlite-proxy 期望 row 数组按列索引取值（row[0], row[1]...），
 * 但 tauri-plugin-sql 返回的是 IndexMap<String, JsonValue>（对象形式），
 * 强行转 drizzle proxy 容易踩坑。手写查询层更可控。
 *
 * 暴露给上层的 API 与之前一致（`db` 仍是 drizzle 实例），但底层用原生 SQL。
 * 这里保留 drizzle 的 `schema` 类型导出，以便上层继续用 `User`/`Project` 类型。
 */

/** 单例 Database 句柄（lazy init） */
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

/**
 * 把 plugin 返回的 IndexMap 对象行转成 Position 的数组行（drizzle 期望的格式）。
 * 对于浏览器直接使用的场景，我们直接返回对象数组（更易用）。
 */
function rowsAsObjects<T = Record<string, unknown>>(
  rows: readonly Record<string, unknown>[],
): T[] {
  return rows as T[];
}

/** drizzle 占位 export，保持 schema 导出可用。实际查询走 raw plugin。 */
export const db = {
  select: <T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> =>
    getDb().then((d) => d.select<T>(sql, params).then(rowsAsObjects<T>)),
  execute: (sql: string, params: unknown[] = []): Promise<{ rowsAffected: number; lastInsertId?: number }> =>
    getDb().then((d) => d.execute(sql, params)),
  /** 内部用 — 给 queries/projects.ts 提供 select helper */
};

export { schema };

/**
 * 启动时调用一次：跑迁移。
 * 注意：实际的 CREATE TABLE 已在 Rust 端 `lib.rs` 的 setup hook 通过 rusqlite
 * 完成了。这里的 impl 保留是因为 db-bootstrap.ts 还在 await 它 —— 给个 no-op
 * Promise.resolve() 让上层 await 立即完成，避免重复跑迁移冲突。
 */
export async function runMigrations(): Promise<void> {
  // no-op: Rust 端 setup() 已经跑过 CREATE TABLE IF NOT EXISTS。
  // 这里什么都不做也不会因为重复调用而出错。
  await Promise.resolve();
}