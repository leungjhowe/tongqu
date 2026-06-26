import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { projects, type Project, type NewProject } from '../schema';

function randomHue(): number {
  // 蓝紫范围（200-340），避开暖色让卡片视觉一致
  return Math.floor(200 + Math.random() * 140);
}

export async function getRecentProjects(
  ownerId: string,
  limit = 3,
): Promise<Project[]> {
  return db
    .select()
    .from(projects)
    .where(and(eq(projects.ownerId, ownerId), eq(projects.status, 'active')))
    .orderBy(desc(projects.openedAt))
    .limit(limit);
}

export async function getActiveProjects(ownerId: string): Promise<Project[]> {
  return db
    .select()
    .from(projects)
    .where(and(eq(projects.ownerId, ownerId), eq(projects.status, 'active')))
    .orderBy(desc(projects.openedAt));
}

export async function getProjectById(id: string): Promise<Project | null> {
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createProject(input: {
  ownerId: string;
  name: string;
}): Promise<Project> {
  const values: NewProject = {
    name: input.name.trim(),
    ownerId: input.ownerId,
    thumbnailHue: randomHue(),
    status: 'active',
  };
  const rows = await db.insert(projects).values(values).returning();
  const created = rows[0];
  if (!created) throw new Error('Failed to create project');
  return created;
}

export async function renameProject(id: string, name: string): Promise<void> {
  await db
    .update(projects)
    .set({ name: name.trim(), updatedAt: new Date() })
    .where(eq(projects.id, id));
}

export async function archiveProject(id: string): Promise<void> {
  await db
    .update(projects)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(eq(projects.id, id));
}

export async function touchProject(id: string): Promise<void> {
  await db
    .update(projects)
    .set({ openedAt: new Date() })
    .where(eq(projects.id, id));
}
