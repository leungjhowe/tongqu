import { db, runMigrations, users, schema } from '@tps/data-core';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

/** 启动时一次性：迁移 + seed 默认 admin。 */
export const dbReady: Promise<void> = (async () => {
  await runMigrations();
  await seedAdmin();
})();

async function seedAdmin(): Promise<void> {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.username, ADMIN_USERNAME))
    .limit(1);
  if (existing.length > 0) return;

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await db.insert(users).values({
    username: ADMIN_USERNAME,
    passwordHash,
    isGuest: false,
  });
  // eslint-disable-next-line no-console
  console.log('[db-bootstrap] seeded admin user');
}