import type { Config } from 'drizzle-kit';

export default {
  schema: './packages/data-core/src/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  // drizzle-kit 只用于 `drizzle-kit generate` 生成新的 migration SQL，
  // 不在运行时使用。指向一个本地占位文件即可（运行时迁移由 JS 端
  // runMigrations() 走 tauri-plugin-sql 执行）。
  dbCredentials: { url: 'file:./dev.db' },
} satisfies Config;