import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from './schema';

/** libsql HTTP server URL. Browser bundle only accepts libsql:/wss:/ws:/https:/http: schemes. */
const SERVER_URL = 'http://localhost:8080';

/** libsql client — connects to local libsql server via HTTP. */
export const client = createClient({ url: SERVER_URL });

/** drizzle instance, bound to schema. */
export const db = drizzle(client, { schema });

/** 启动时调用一次：跑迁移。 */
export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: 'apps/desktop/drizzle' });
}

export { schema };