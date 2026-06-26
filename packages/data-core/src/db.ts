import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from './schema';

const DB_PATH = 'apps/desktop/.data/app.db';

/** libsql client — 单例。 */
export const client = createClient({ url: `file:${DB_PATH}` });

/** drizzle 实例，绑定 schema。 */
export const db = drizzle(client, { schema });

/** 启动时调用一次：跑迁移。 */
export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: 'apps/desktop/drizzle' });
}

export { schema };
