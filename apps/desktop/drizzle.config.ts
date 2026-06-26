import type { Config } from 'drizzle-kit';

export default {
  schema: './packages/data-core/src/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: { url: 'http://localhost:8080' },
} satisfies Config;