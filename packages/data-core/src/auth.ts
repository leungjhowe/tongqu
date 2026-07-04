import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { db } from './db';
import type { User, NewUser } from './schema';

const GUEST_PASSWORD_PLACEHOLDER = '!';
const BCRYPT_COST = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** 按 username 查用户（不限 is_guest）。 */
export async function findUserByUsername(username: string): Promise<User | null> {
  const rows = await db.select<User>(
    `SELECT id, username, password_hash, is_guest, created_at
     FROM users WHERE username = ? LIMIT 1`,
    [username],
  );
  return rows[0] ?? null;
}

/**
 * 创建游客用户。
 * 假设 caller 已确认 username 未被已注册账号占用（is_guest=false）。
 * 如果 username 已被游客占用，本函数也会冲突 — 让 SQL 抛 unique constraint 错误。
 */
export async function createGuestUser(username: string): Promise<User> {
  const id = nanoid();
  await db.execute(
    `INSERT INTO users (id, username, password_hash, is_guest, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, username, GUEST_PASSWORD_PLACEHOLDER, 1, Date.now()],
  );
  const created = await findUserByUsername(username);
  if (!created) throw new Error('Failed to create guest user');
  return created;
}