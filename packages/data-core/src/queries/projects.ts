import { nanoid } from 'nanoid';
import { db } from '../db';
import type { Project, NewProject } from '../schema';

function randomHue(): number {
  // 蓝紫范围（200-340），避开暖色让卡片视觉一致
  return Math.floor(200 + Math.random() * 140);
}

export async function getRecentProjects(
  ownerId: string,
  limit = 3,
): Promise<Project[]> {
  return db.select<Project>(
    `SELECT id, name, owner_id, status, thumbnail_hue, created_at, updated_at, opened_at
     FROM projects
     WHERE owner_id = ? AND status = ?
     ORDER BY opened_at DESC
     LIMIT ?`,
    [ownerId, 'active', limit],
  );
}

export async function getActiveProjects(ownerId: string): Promise<Project[]> {
  return db.select<Project>(
    `SELECT id, name, owner_id, status, thumbnail_hue, created_at, updated_at, opened_at
     FROM projects
     WHERE owner_id = ? AND status = ?
     ORDER BY opened_at DESC`,
    [ownerId, 'active'],
  );
}

export async function getProjectById(id: string): Promise<Project | null> {
  const rows = await db.select<Project>(
    `SELECT id, name, owner_id, status, thumbnail_hue, created_at, updated_at, opened_at
     FROM projects WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function createProject(input: {
  ownerId: string;
  name: string;
}): Promise<Project> {
  const values: NewProject = {
    id: nanoid(),
    name: input.name.trim(),
    ownerId: input.ownerId,
    thumbnailHue: randomHue(),
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    openedAt: new Date(),
  };
  await db.execute(
    `INSERT INTO projects (id, name, owner_id, status, thumbnail_hue, created_at, updated_at, opened_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      values.id,
      values.name,
      values.ownerId,
      values.status,
      values.thumbnailHue,
      values.createdAt?.getTime() ?? null,
      values.updatedAt?.getTime() ?? null,
      values.openedAt?.getTime() ?? null,
    ],
  );
  const created = await getProjectById(values.id!);
  if (!created) throw new Error('Failed to create project');
  return created;
}

export async function renameProject(id: string, name: string): Promise<void> {
  await db.execute(
    `UPDATE projects SET name = ?, updated_at = ? WHERE id = ?`,
    [name.trim(), Date.now(), id],
  );
}

export async function archiveProject(id: string): Promise<void> {
  await db.execute(
    `UPDATE projects SET status = 'archived', updated_at = ? WHERE id = ?`,
    [Date.now(), id],
  );
}

export async function touchProject(id: string): Promise<void> {
  await db.execute(
    `UPDATE projects SET opened_at = ? WHERE id = ?`,
    [Date.now(), id],
  );
}