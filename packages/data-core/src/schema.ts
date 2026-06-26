import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { nanoid } from 'nanoid';

/**
 * 用户表。所有用户（含游客）都进同一张表。
 * 游客用 `passwordHash = '!'` 占位，`isGuest = true`。
 * 唯一约束 username 保证不会重复创建。
 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  isGuest: integer('is_guest', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

/**
 * 项目表。每个项目属于一个 owner。
 * `status = 'archived'` 表示软删除（不在列表展示，可恢复）。
 */
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  name: text('name').notNull(),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['active', 'archived'] }).notNull().default('active'),
  thumbnailHue: integer('thumbnail_hue').notNull().default(217),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  openedAt: integer('opened_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
