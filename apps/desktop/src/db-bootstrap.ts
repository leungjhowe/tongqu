import { db, runMigrations } from '@tongqu/data-core';
import bcrypt from 'bcryptjs';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

/** 启动时一次性：迁移 + seed 默认 admin。 */
export const dbReady: Promise<void> = (async () => {
  await runMigrations();
  await seedAdmin();
})();

async function seedAdmin(): Promise<void> {
  const existing = await db.select(
    `SELECT id, username, password_hash, is_guest, created_at
     FROM users WHERE username = ? LIMIT 1`,
    [ADMIN_USERNAME],
  );
  if (existing.length > 0) return;

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await db.execute(
    `INSERT INTO users (id, username, password_hash, is_guest, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), ADMIN_USERNAME, passwordHash, 0, Date.now()],
  );
  // eslint-disable-next-line no-console
  console.log('[db-bootstrap] seeded admin user');
}