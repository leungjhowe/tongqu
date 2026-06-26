import type { Config } from 'drizzle-kit';

export default {
  schema: './packages/data-core/src/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: { url: 'file:./.data/app.db' },
} satisfies Config;
