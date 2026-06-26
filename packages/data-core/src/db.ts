import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

/** libsql HTTP server URL. Browser bundle only accepts libsql:/wss:/ws:/https:/http: schemes. */
const SERVER_URL = 'http://localhost:8080';

/** libsql client — connects to local libsql server via HTTP. */
export const client = createClient({ url: SERVER_URL });

/** drizzle instance, bound to schema. */
export const db = drizzle(client, { schema });

/**
 * Vite 在 build/serve 时会把下面两个 glob 展开成 inline 模块。
 * 浏览器 bundle 不会触碰 `node:fs`（`drizzle-orm/libsql/migrator` 顶层 require 它），
 * 所以我们自己跑迁移。
 */
// Vite 的 `import.meta.glob` 路径以调用文件所在目录为基准。
// db.ts 位于 packages/data-core/src/，drizzle 文件位于 apps/desktop/drizzle/。
// 相对路径：上溯 3 级到 tps 仓库根，再下到 apps/desktop/drizzle/。
// `import: 'default'` 让每个值直接是文件内容的 string，省掉 .default。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SQL_FILES = (import.meta as any).glob(
  '../../../apps/desktop/drizzle/*.sql',
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const JOURNAL_FILE = (import.meta as any).glob(
  '../../../apps/desktop/drizzle/meta/_journal.json',
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

interface Journal {
  entries: { tag: string; breakpoints?: boolean }[];
}

/** sqld 返回的 "already exists" 类错误是幂等的，无需终止。 */
function isAlreadyExistsError(e: unknown): boolean {
  const msg = String(
    (typeof e === 'object' && e ? (e as { message?: unknown }).message ?? '' : '') || '',
  );
  return msg.includes('already exists');
}

/** 启动时调用一次：跑迁移。仅浏览器 bundle 路径（drizzle-kit 仍用自家 migrator）。 */
export async function runMigrations(): Promise<void> {
  const journalKey = Object.keys(JOURNAL_FILE).find((k) =>
    k.endsWith('meta/_journal.json'),
  );
  if (!journalKey) {
    throw new Error(
      `[data-core] drizzle journal not found in glob. keys=${Object.keys(JOURNAL_FILE).join(',')}`,
    );
  }
  const journal = JSON.parse(JOURNAL_FILE[journalKey]) as Journal;

  for (const entry of journal.entries) {
    const fileKey = Object.keys(SQL_FILES).find(
      (k) => k.endsWith(`/${entry.tag}.sql`),
    );
    if (!fileKey) {
      throw new Error(`[data-core] migration file not found: ${entry.tag}.sql`);
    }
    const sqlText = SQL_FILES[fileKey];
    const statements = sqlText
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      try {
        await client.execute(stmt);
      } catch (e) {
        // 第二次运行时 CREATE TABLE / CREATE UNIQUE INDEX 会报 "already exists"。
        // 本地开发可忽略，生产环境应改用正规 migration tracker。
        if (isAlreadyExistsError(e)) throw e;
      }
    }
  }
  // eslint-disable-next-line no-console
  console.log('[data-core] migrations applied');
}

export { schema };
