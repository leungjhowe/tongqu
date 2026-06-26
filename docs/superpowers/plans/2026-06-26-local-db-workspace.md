# 本地 DB + Workspace 页面实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 AppShell 从 mock data + mock auth 升级到本地 SQLite 持久化（users + projects 表 + DB-backed auth 含游客模式 + 完整 /app/workspace 页面 CRUD）。

**Architecture:** Drizzle ORM + libsql（纯 JS 驱动）+ 本地 SQLite 文件。schema 放 `packages/data-core/src/schema.ts`，helpers 同包导出。auth 与 project CRUD 全部走 DB。游客模式按需创建 is_guest 用户。

**Tech Stack:** `@libsql/client` ^0.14 · `drizzle-orm` ^0.36 · `drizzle-kit` ^0.28 · `bcryptjs` ^2.4 · `nanoid` ^5 · React 18 + zustand 4（已有）+ Playwright 1.61（已有）。

## Global Constraints

- 项目**无单元测试框架**（无 vitest/jest）。所有验证用 `pnpm --filter @tps/desktop exec tsc -b` + 现有 6 个 Playwright E2E。
- DB 文件 `apps/desktop/.data/app.db` 必须加进 `.gitignore`，**禁止**入库。
- 迁移生成产物 `apps/desktop/drizzle/` 目录必须入库（是源代码），但 `.data/` 不入库。
- users 表 `password_hash` 非空约束，游客用户存 `'!'` 占位。
- 游客模式按需创建：`username` 唯一约束冲突且对应用户是已注册账号（`is_guest=false`）时，**拒绝**并提示"该用户名已注册，请用密码登录"。
- `useAuthStore` 持久化到 localStorage（已有逻辑保留）：启动时如 persisted user 有效，直接跳过 login 进 dashboard。
- 提交信息中文 + emoji 前缀（与既有 `045ecf4` / `ed713c6` 一致）。
- 路径一律相对项目根 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/`。
- 7 个 task，每个单独 commit。Task 完成后跑 `pnpm --filter @tps/desktop exec tsc -b` 确认无 TS 错误；改动 UI 的 task 还要跑 `pnpm --filter @tps/desktop e2e` 确认现有 6 个 E2E 不破。

---

## File Map

| 路径 | 类型 | 职责 |
|---|---|---|
| `packages/data-core/package.json` | Modify | 加 @libsql/client / drizzle-orm / drizzle-kit / bcryptjs / nanoid |
| `packages/data-core/tsconfig.json` | Modify | 加 `outDir` 等（如 drizzle 需要） |
| `packages/data-core/src/schema.ts` | Create | drizzle schema 定义 (users + projects) |
| `packages/data-core/src/db.ts` | Create | libsql client + drizzle 实例 + runMigrations() |
| `packages/data-core/src/auth.ts` | Create | hashPassword / comparePassword / findUserByUsername / createGuestUser |
| `packages/data-core/src/queries/projects.ts` | Create | 7 个项目查询 helper |
| `packages/data-core/src/index.ts` | Modify | 导出新模块 |
| `apps/desktop/package.json` | Modify | 不需新增包（drizzle-kit 用 dev 调用） |
| `apps/desktop/drizzle.config.ts` | Create | drizzle-kit 配置（输出到 apps/desktop/drizzle） |
| `apps/desktop/drizzle/0000_*.sql` | Create | drizzle-kit 生成的初始迁移（手写 SQL 也行） |
| `apps/desktop/.data/` | Create (gitignored) | SQLite 文件所在 |
| `apps/desktop/.gitignore` | Modify | 加 `.data/` |
| `apps/desktop/src/db-bootstrap.ts` | Create | 启动时跑迁移 + seed admin；导出 `ready` promise |
| `apps/desktop/src/main.tsx` | Modify | 等 `db-bootstrap.ready` 再 render |
| `apps/desktop/src/stores/authStore.ts` | Modify | login 调 DB + 新增 loginAsGuest |
| `apps/desktop/src/pages/Login.tsx` | Modify | 加游客模式 toggle + 游客用户名 input |
| `apps/desktop/src/components/shell/WorkspacePage.tsx` | Create | /app/workspace 完整 CRUD 页面 |
| `apps/desktop/src/components/shell/NewProjectModal.tsx` | Create | 名称输入 + 创建 modal（dashboard 和 workspace 共用） |
| `apps/desktop/src/components/shell/DashboardHome.tsx` | Modify | ProjectRail 接 DB + handleNew 弹 modal + handleOpen touch openedAt |
| `apps/desktop/src/components/shell/ProjectRail.tsx` | Modify | 接受 `projects: Project[]` 作为外部数据（不再读 MOCK_PROJECTS） |
| `apps/desktop/src/data/mockProjects.ts` | Delete | 不再需要 |
| `apps/desktop/src/router/index.tsx` | Modify | `/app/workspace` → `<WorkspacePage />`；删 `workspace/new` |
| `apps/desktop/e2e/dashboard-home.spec.ts` | Modify | login helper 改 admin/admin123；项目名校准 |
| `apps/desktop/e2e/auth.spec.ts` | Create | 游客 / 账号登录 / 错误密码 |
| `apps/desktop/e2e/workspace.spec.ts` | Create | 新建 / 重命名 / 归档 |

---

## Task 1: packages/data-core 基建（schema + db + drizzle.config）

**Files:**
- Modify: `packages/data-core/package.json`
- Create: `packages/data-core/src/schema.ts`
- Create: `packages/data-core/src/db.ts`
- Create: `apps/desktop/drizzle.config.ts`
- Create: `apps/desktop/drizzle/0000_init.sql`（手写或 generate）
- Modify: `apps/desktop/.gitignore`
- Create: `apps/desktop/.data/` 目录（空目录 + .gitkeep）

**Interfaces:**
- Produces: 
  - `db` (drizzle 导出) from `@tps/data-core`
  - `runMigrations()` from `@tps/data-core`
  - `users`, `projects` table objects from `@tps/data-core`
  - `User`, `Project` type aliases

- [ ] **Step 1: 安装依赖到 packages/data-core**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
pnpm --filter @tps/data-core add @libsql/client drizzle-orm bcryptjs nanoid
pnpm --filter @tps/data-core add -D drizzle-kit
```

Verify `packages/data-core/package.json` 现在包含 5 个新依赖 + drizzle-kit 在 devDependencies。

- [ ] **Step 2: 创建 schema.ts**

写入 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/packages/data-core/src/schema.ts`：

```ts
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
```

- [ ] **Step 3: 创建 db.ts**

写入 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/packages/data-core/src/db.ts`：

```ts
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from './schema';

const DB_PATH = 'apps/desktop/.data/app.db';

/** libsql client — 单例。 */
export const client = createClient({ url: `file:${DB_PATH}` });

/** drizzle 实例，绑定 schema。 */
export const db = drizzle(client, { schema });

/** 启动时调用一次：跑迁移。 */
export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: 'apps/desktop/drizzle' });
}

export { schema };
```

- [ ] **Step 4: 创建 drizzle.config.ts**

写入 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/drizzle.config.ts`：

```ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './packages/data-core/src/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: { url: 'file:./.data/app.db' },
} satisfies Config;
```

- [ ] **Step 5: 生成首个 migration**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
pnpm exec drizzle-kit generate --config apps/desktop/drizzle.config.ts --name init
```

预期：在 `apps/desktop/drizzle/` 下生成 `0000_*.sql` 和 `meta/_journal.json` 等。读生成的 SQL 确认包含 users 和 projects 两张表的 CREATE TABLE。

- [ ] **Step 6: 创建 .data/ 目录 + .gitignore**

```bash
mkdir -p /Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/.data
touch /Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/.data/.gitkeep
```

修改 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/.gitignore`，在末尾追加：

```
.data/
```

(如果 `.gitignore` 不存在则创建。已有的内容保留。)

- [ ] **Step 7: 更新 packages/data-core/src/index.ts 导出**

完整重写 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/packages/data-core/src/index.ts`：

```ts
export * from './types';
export * from './schema';
export { client, db, runMigrations, schema } from './db';
```

注意：`export * from './schema'` 覆盖了之前的 `./types` 重导出（`User` 和 `Project` 类型来自 schema）。`./types` 中的 Dataset / DataSource 等抽象保留原样导出。

- [ ] **Step 8: 验证 tsc**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
pnpm --filter @tps/desktop exec tsc -b
```

预期：exit 0。Schema / db / index 编译通过。

- [ ] **Step 9: Commit**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
git add packages/data-core/package.json pnpm-lock.yaml \
        packages/data-core/src/schema.ts packages/data-core/src/db.ts \
        packages/data-core/src/index.ts \
        apps/desktop/drizzle.config.ts apps/desktop/drizzle/ \
        apps/desktop/.gitignore apps/desktop/.data/.gitkeep
git commit -m "🗄️ feat(data-core): drizzle schema + libsql client + 初始 migration 生成"
```

---

## Task 2: apps/desktop 启动钩子（runMigrations + seed admin）

**Files:**
- Create: `apps/desktop/src/db-bootstrap.ts`
- Modify: `apps/desktop/src/main.tsx`

**Interfaces:**
- Consumes: `runMigrations` + `db` + `users` from `@tps/data-core`
- Produces: `dbReady` (Promise<void>) from `@/db-bootstrap`
- Produces: `seedAdmin()` (idempotent)

- [ ] **Step 1: 创建 db-bootstrap.ts**

写入 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/db-bootstrap.ts`：

```ts
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
```

- [ ] **Step 2: 修改 main.tsx 等 dbReady**

完整重写 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/main.tsx`：

```tsx
import "virtual:uno.css";
import "@tps/ui/styles";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { dbReady } from "./db-bootstrap";

void dbReady.then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
```

注释：把 render 放在 `.then` 里，确保 DB 准备好再挂 React 树。如果迁移失败，render 不发生（错误会从 `dbReady` reject 出来 — Vite 默认会在 console 显示）。

- [ ] **Step 3: 验证 tsc**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
pnpm --filter @tps/desktop exec tsc -b
```

预期：exit 0。

- [ ] **Step 4: 手动验证启动**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
pnpm dev
```

打开 `http://localhost:1420`，按 F12 看 console：
- 首次启动应该看到 `[db-bootstrap] seeded admin user`
- 后续启动应不再出现（因为 admin 已存在）
- DB 文件 `apps/desktop/.data/app.db` 应该被创建

然后杀掉 dev server。

- [ ] **Step 5: 跑现有 E2E 验证不破**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
pnpm --filter @tps/desktop e2e
```

预期：当前 6 个 E2E 仍跑通（虽然 admin 用户 seed 后 login 走的是 mock 还没接 DB，但至少 Login 流程不破）。Login 当前还是 mock auth，e2e login helper 用的 `admin` / `admin123`（之前 commit `045ecf4` 用的是 "tester" / "any"，本轮不会破因为 mock 接受任意账号）。**注**：Task 4 才会替换 login 为 DB-backed。

- [ ] **Step 6: Commit**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
git add apps/desktop/src/db-bootstrap.ts apps/desktop/src/main.tsx
git commit -m "🗄️ feat(desktop): 启动钩子 — 跑 migration + seed admin 用户"
```

---

## Task 3: packages/data-core auth helpers

**Files:**
- Create: `packages/data-core/src/auth.ts`
- Modify: `packages/data-core/src/index.ts`

**Interfaces:**
- Produces: 
  - `hashPassword(plain: string): Promise<string>` 
  - `comparePassword(plain: string, hash: string): Promise<boolean>`
  - `findUserByUsername(username: string): Promise<User | null>`
  - `createGuestUser(username: string): Promise<User>`

- [ ] **Step 1: 创建 auth.ts**

写入 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/packages/data-core/src/auth.ts`：

```ts
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { users, type User } from './schema';

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
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * 创建游客用户。
 * 假设 caller 已确认 username 未被已注册账号占用（is_guest=false）。
 * 如果 username 已被游客占用，本函数也会冲突 — 让 drizzle 抛 unique constraint 错误。
 */
export async function createGuestUser(username: string): Promise<User> {
  const rows = await db
    .insert(users)
    .values({
      username,
      passwordHash: GUEST_PASSWORD_PLACEHOLDER,
      isGuest: true,
    })
    .returning();
  const created = rows[0];
  if (!created) throw new Error('Failed to create guest user');
  return created;
}
```

- [ ] **Step 2: 更新 packages/data-core/src/index.ts**

```ts
export * from './types';
export * from './schema';
export { client, db, runMigrations, schema } from './db';
export { hashPassword, comparePassword, findUserByUsername, createGuestUser } from './auth';
```

- [ ] **Step 3: 验证 tsc**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
pnpm --filter @tps/desktop exec tsc -b
```

预期：exit 0。

- [ ] **Step 4: Commit**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
git add packages/data-core/src/auth.ts packages/data-core/src/index.ts
git commit -m "🔐 feat(data-core): auth helpers — bcrypt + 用户查询 + 游客创建"
```

---

## Task 4: apps/desktop useAuthStore 改造（login 调 DB + loginAsGuest）

**Files:**
- Modify: `apps/desktop/src/stores/authStore.ts`

**Interfaces:**
- Consumes: `findUserByUsername`, `comparePassword`, `createGuestUser` from `@tps/data-core`
- Produces: 
  - `login(username, password): Promise<boolean>` 改：成功返回 true，失败返回 false
  - `loginAsGuest(username): Promise<boolean>` 新增：成功返回 true，冲突返回 false

- [ ] **Step 1: 重写 authStore.ts**

完整重写 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/stores/authStore.ts`：

```ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  findUserByUsername,
  comparePassword,
  createGuestUser,
  type User as DbUser,
} from "@tps/data-core";

/** UI 层用的精简 User（去掉 passwordHash 等）。 */
export interface User {
  id: string;
  username: string;
  isGuest: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  loginAsGuest: (username: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

function toUIUser(u: DbUser): User {
  return { id: u.id, username: u.username, isGuest: u.isGuest };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username, password) => {
        if (!username.trim() || !password.trim()) {
          set({ error: "用户名和密码不能为空" });
          return false;
        }
        set({ isLoading: true, error: null });

        const dbUser = await findUserByUsername(username.trim());
        if (!dbUser || dbUser.isGuest) {
          set({ error: "用户名或密码错误", isLoading: false });
          return false;
        }
        const ok = await comparePassword(password, dbUser.passwordHash);
        if (!ok) {
          set({ error: "用户名或密码错误", isLoading: false });
          return false;
        }
        set({
          user: toUIUser(dbUser),
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      },

      loginAsGuest: async (username) => {
        const trimmed = username.trim();
        if (!trimmed) {
          set({ error: "请输入游客用户名" });
          return false;
        }
        set({ isLoading: true, error: null });

        const existing = await findUserByUsername(trimmed);
        if (existing) {
          if (!existing.isGuest) {
            // 已注册账号拒绝游客模式
            set({
              error: "该用户名已注册，请用密码登录",
              isLoading: false,
            });
            return false;
          }
          // 已有同名游客 → 直接登录
          set({
            user: toUIUser(existing),
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return true;
        }

        try {
          const created = await createGuestUser(trimmed);
          set({
            user: toUIUser(created),
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return true;
        } catch {
          set({ error: "创建游客失败，请重试", isLoading: false });
          return false;
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false, error: null });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "tps-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
```

- [ ] **Step 2: 验证 tsc**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
pnpm --filter @tps/desktop exec tsc -b
```

预期：exit 0。如果 tsc 报 `login` 的返回类型从 `Promise<void>` 改成 `Promise<boolean>` 破坏了 Login.tsx 的现有调用，需要在 Login.tsx 里加 await + if 跳转（这正是 Task 5 要做的）。**这里先确认 tsc 通过**——如果 Login.tsx 不再调用 `login()` 而是 `loginAsGuest()`，那 Task 4 + 5 必须同步改。

注：现有 Login.tsx 调用 `await login(username, password)` 然后无脑 `navigate("/app")`。Task 5 会改成 `const ok = await login(...); if (ok) navigate(...)`。

- [ ] **Step 3: 跑现有 E2E（预期会破，但跑一下看影响面）**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
pnpm --filter @tps/desktop e2e
```

预期：现有 E2E login helper 用 `tester` / `any`，**现在 login 拒绝**（DB 找不到这个用户）→ 6 个 E2E 会全挂。这没关系 — Task 5 会修 Login.tsx，Task 7 会改 E2E helper 用 `admin` / `admin123`。

- [ ] **Step 4: Commit**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
git add apps/desktop/src/stores/authStore.ts
git commit -m "🔐 feat(store): useAuthStore 改为 DB-backed + 新增 loginAsGuest"
```

---

## Task 5: apps/desktop Login 页面游客模式 toggle

**Files:**
- Modify: `apps/desktop/src/pages/Login.tsx`

**Interfaces:**
- Consumes: `useAuthStore.login` (returns boolean) + `useAuthStore.loginAsGuest` (returns boolean)
- Produces: Login 页面支持两种模式切换

**前提**：必须先读 Login.tsx（现有 ~1400 行 GSAP-rich 页面），找准 FloatingInput 调用点、submit 按钮、GSAP 钩子位置。修改要保守。

- [ ] **Step 1: 读 Login.tsx 关键区段**

读 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/pages/Login.tsx` 第 358-430 行（state + onSubmit）和第 1380-1430 行（form JSX）。

- [ ] **Step 2: 修改 Login 状态区**

在 Login.tsx 找到 `const [username, setUsername] = useState("");` 和 `const [password, setPassword] = useState("");` 附近，添加：

```tsx
const [mode, setMode] = useState<"password" | "guest">("password");
const [guestName, setGuestName] = useState("");
```

找到 `const onSubmit = async (e?: FormEvent | KeyboardEvent) => { ... await login(username, password); navigate("/app", { replace: true }); }`，**完整重写**为：

```tsx
const onSubmit = async (e?: FormEvent | KeyboardEvent) => {
  e?.preventDefault?.();
  if (mode === "password") {
    const ok = await login(username, password);
    if (ok) navigate("/app/home", { replace: true });
  } else {
    const ok = await loginAsGuest(guestName);
    if (ok) navigate("/app/home", { replace: true });
  }
};
```

（具体改法：保留 `onSubmit` 函数名 + 签名，把内部实现替换。保留 GSAP mouse 效果钩子 `onSubmitMove` / `onSubmitLeave` / `onSubmitDown` / `onSubmitUp` 不动。）

- [ ] **Step 3: 修改 form JSX**

在 Login.tsx 找到现有 `<FloatingInput label="用户名" ... />` 和 `<FloatingInput label="密码" ... />` 区段（大约 1380-1410 行）。

**当前结构**：
```tsx
<FloatingInput label="用户名" ... value={username} onChange={setUsername} ... />
<FloatingInput label="密码" type="password" ... value={password} onChange={setPassword} ... />
```

**改成**（保留 FloatingInput 现有 useId 关联 — 来自 commit `ed713c6`）：

```tsx
{mode === "password" ? (
  <>
    <FloatingInput
      label="用户名"
      autoComplete="username"
      value={username}
      onChange={setUsername}
    />
    <FloatingInput
      label="密码"
      type="password"
      autoComplete="current-password"
      value={password}
      onChange={setPassword}
    />
  </>
) : (
  <FloatingInput
    label="游客用户名"
    autoComplete="off"
    value={guestName}
    onChange={setGuestName}
  />
)}
```

在 form 内，**submit 按钮下方**加一个模式切换链接：

```tsx
<button
  type="button"
  onClick={() => setMode((m) => (m === "password" ? "guest" : "password"))}
  className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
>
  {mode === "password" ? "以游客身份进入 →" : "← 用账号密码登录"}
</button>
```

submit 按钮的 label 也按模式切换：

```tsx
{mode === "password" ? "登录" : "游客进入"}
```

（保留 GSAP mouse 钩子 `onMouseMove` / `onMouseDown` 等不动。）

- [ ] **Step 4: 验证 tsc**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
pnpm --filter @tps/desktop exec tsc -b
```

预期：exit 0。

- [ ] **Step 5: 手动验证（启动 dev + 浏览器）**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
pnpm dev
```

打开 `http://localhost:1420`，测试：
1. 默认显示账号密码模式
2. 输入 admin / admin123 → 登录成功 → 跳 /app/home
3. 退出登录（右上用户胶囊 → 退出登录）→ 回到 /login
4. 切到游客模式 → 输入 `游客A` → 进 dashboard
5. 退出登录 → 切到账号密码模式 → 输入 `游客A` + 任意密码 → 提示"用户名或密码错误"
6. 退出 → 切游客模式 → 输入 `游客A` → 之前的项目还在

杀掉 dev server。

- [ ] **Step 6: 跑现有 E2E（预期会破）**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
pnpm --filter @tps/desktop e2e
```

预期：6 个 E2E 全挂（login helper 用 tester/any 不存在于 DB）。**没关系**——Task 7 改 E2E。

- [ ] **Step 7: Commit**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
git add apps/desktop/src/pages/Login.tsx
git commit -m "🔐 feat(login): 游客模式 toggle + 按需创建游客用户"
```

---

## Task 6: packages/data-core project queries

**Files:**
- Create: `packages/data-core/src/queries/projects.ts`
- Modify: `packages/data-core/src/index.ts`

**Interfaces:**
- Produces: 7 个函数，全部接 `db` + `schema.projects`：
  - `getRecentProjects(ownerId: string, limit?: number): Promise<Project[]>` — 按 openedAt desc，取 active
  - `getActiveProjects(ownerId: string): Promise<Project[]>` — 所有 active
  - `getProjectById(id: string): Promise<Project | null>`
  - `createProject(input: { ownerId: string; name: string }): Promise<Project>` — 自动随机 thumbnailHue 200-340
  - `renameProject(id: string, name: string): Promise<void>`
  - `archiveProject(id: string): Promise<void>` — status='archived'
  - `touchProject(id: string): Promise<void>` — openedAt = NOW()

- [ ] **Step 1: 创建 queries/projects.ts**

写入 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/packages/data-core/src/queries/projects.ts`：

```ts
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
```

- [ ] **Step 2: 更新 packages/data-core/src/index.ts**

```ts
export * from './types';
export * from './schema';
export { client, db, runMigrations, schema } from './db';
export { hashPassword, comparePassword, findUserByUsername, createGuestUser } from './auth';
export {
  getRecentProjects,
  getActiveProjects,
  getProjectById,
  createProject,
  renameProject,
  archiveProject,
  touchProject,
} from './queries/projects';
```

- [ ] **Step 3: 验证 tsc**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
pnpm --filter @tps/desktop exec tsc -b
```

预期：exit 0。

- [ ] **Step 4: Commit**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
git add packages/data-core/src/queries/projects.ts packages/data-core/src/index.ts
git commit -m "🗄️ feat(data-core): 7 个 project queries — CRUD + recent/active/touch"
```

---

## Task 7: /app/workspace 页面 + NewProjectModal + DashboardHome 集成 + E2E 更新

**Files:**
- Create: `apps/desktop/src/components/shell/NewProjectModal.tsx`
- Create: `apps/desktop/src/components/shell/WorkspacePage.tsx`
- Modify: `apps/desktop/src/components/shell/ProjectRail.tsx` (接收 projects prop，删除 MOCK_PROJECTS)
- Modify: `apps/desktop/src/components/shell/DashboardHome.tsx` (接 DB + handleNew 弹 modal + handleOpen touch)
- Modify: `apps/desktop/src/router/index.tsx` (`/app/workspace` → `<WorkspacePage />`，删 `workspace/new`)
- Delete: `apps/desktop/src/data/mockProjects.ts`
- Modify: `apps/desktop/e2e/dashboard-home.spec.ts` (login helper 改 admin/admin123)
- Create: `apps/desktop/e2e/workspace.spec.ts`

**Interfaces:**
- Consumes (from `@tps/data-core`):
  - `getRecentProjects`, `getActiveProjects`, `createProject`, `renameProject`, `archiveProject`, `touchProject`
  - `Project` type
- Consumes (from `@/stores/authStore`):
  - `useAuthStore.user`

- [ ] **Step 1: 创建 NewProjectModal.tsx**

写入 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/components/shell/NewProjectModal.tsx`：

```tsx
import { useEffect, useRef, useState } from "react";
import { createProject, type Project } from "@tps/data-core";
import { useAuthStore } from "@/stores/authStore";

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
}

export default function NewProjectModal({ open, onClose, onCreated }: NewProjectModalProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (open) {
      setName("");
      setSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || !user || submitting) return;
    setSubmitting(true);
    try {
      const project = await createProject({ ownerId: user.id, name: trimmed });
      onCreated(project);
    } finally {
      setSubmitting(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void submit();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="新建项目"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-lg">
        <h2 className="text-base font-semibold text-foreground mb-3">新建项目</h2>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="项目名称"
          aria-label="项目名称"
          className="w-full h-10 px-3 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
          disabled={submitting}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 h-9 rounded-md text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!name.trim() || submitting}
            className="px-4 h-9 rounded-md text-sm bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
          >
            创建
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建 WorkspacePage.tsx**

写入 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/components/shell/WorkspacePage.tsx`：

```tsx
import { useEffect, useState } from "react";
import {
  getActiveProjects,
  createProject,
  renameProject,
  archiveProject,
  type Project,
} from "@tps/data-core";
import { useAuthStore } from "@/stores/authStore";
import { Archive, Pencil } from "lucide-react";
import NewProjectModal from "./NewProjectModal";

function relativeTime(iso: Date | number | string): string {
  const ms = new Date(iso).getTime();
  const diff = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400 / 7)} 周前`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function WorkspacePage() {
  const user = useAuthStore((s) => s.user);
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await getActiveProjects(user.id);
      setProjects(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [user?.id]);

  const handleArchive = async (id: string) => {
    if (!confirm("归档该项目？")) return;
    await archiveProject(id);
    await reload();
  };

  const handleRename = async (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    await renameProject(id, trimmed);
    setEditingId(null);
    setEditingName("");
    await reload();
  };

  const handleCreated = async (project: Project) => {
    setModalOpen(false);
    await reload();
    // 占位路由
    window.location.href = `/app/workspace/${project.id}`;
  };

  const filtered = query.trim()
    ? projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : projects;

  if (!user) return null;

  return (
    <main className="relative z-10 flex-1 min-h-0 flex flex-col gap-6 px-6 py-8 overflow-y-auto">
      {/* 顶栏 */}
      <div className="flex items-center justify-between gap-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索项目..."
          aria-label="搜索项目"
          className="flex-1 max-w-md h-10 px-4 rounded-full bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + 新建项目
        </button>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          暂无项目，去
          <button onClick={() => setModalOpen(true)} className="ml-1 text-primary hover:underline">
            新建一个
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((p) => {
            const bg = `hsl(${p.thumbnailHue} 70% 35%)`;
            const isEditing = editingId === p.id;
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors"
              >
                <span
                  className="w-10 h-10 rounded-md flex-shrink-0"
                  style={{ background: bg }}
                  aria-hidden
                />
                {isEditing ? (
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleRename(p.id);
                      else if (e.key === "Escape") setEditingId(null);
                    }}
                    onBlur={() => void handleRename(p.id)}
                    aria-label="项目名称"
                    className="flex-1 h-8 px-2 rounded-md border border-primary bg-background text-sm outline-none"
                  />
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground truncate">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      最后打开 {relativeTime(p.openedAt)}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(p.id);
                      setEditingName(p.name);
                    }}
                    title="重命名"
                    aria-label="重命名"
                    className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleArchive(p.id)}
                    title="归档"
                    aria-label="归档"
                    className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Archive className="w-3.5 h-3.5" aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <NewProjectModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={handleCreated} />
    </main>
  );
}
```

- [ ] **Step 3: 修改 ProjectRail 接受 projects prop**

修改 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/components/shell/ProjectRail.tsx`：
- 删除 `import { MOCK_PROJECTS, type Project } from "@/data/mockProjects";`
- 删除 `const all = projects ?? MOCK_PROJECTS;`（projects 现在必传，不需要 fallback）
- 把 `projects: Project[]` 类型从 optional 改为 required

```tsx
import { ArrowRight } from "lucide-react";
import type { Project } from "@tps/data-core";
import NewProjectCapsule from "./NewProjectCapsule";
import ProjectCapsule from "./ProjectCapsule";

interface ProjectRailProps {
  projects: Project[];
  onOpen: (id: string) => void;
  onNew: () => void;
  onAll: () => void;
}

const MAX_RECENT = 3;

export default function ProjectRail({ projects, onOpen, onNew, onAll }: ProjectRailProps) {
  const isEmpty = projects.length === 0;
  const recent = projects.slice(0, MAX_RECENT);

  return (
    <div className="w-full">
      {isEmpty ? (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          暂无历史项目，去<button onClick={onNew} className="ml-1 text-primary hover:underline">新建一个</button>
        </div>
      ) : (
        <>
          <div className="flex items-stretch gap-3">
            <NewProjectCapsule onClick={onNew} />
            {recent.map((p) => (
              <ProjectCapsule key={p.id} project={p} onOpen={onOpen} />
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onAll}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary"
              aria-label="查看所有项目"
            >
              所有项目
              <ArrowRight className="w-3.5 h-3.5" aria-hidden />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

注意：`ProjectCapsule.tsx` 当前用的是 `apps/desktop/src/data/mockProjects.ts` 的 `Project` 类型。要更新它用 `@tps/data-core` 的 `Project`。读 ProjectCapsule.tsx 确认是否需要 import 调整。

- [ ] **Step 4: 修 ProjectCapsule.tsx import**

读 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/components/shell/ProjectCapsule.tsx`。如果它的 `Project` type 来自 `@/data/mockProjects`，改成：

```tsx
import type { Project } from "@tps/data-core";
```

(其他代码不动，因为两个 Project type 字段兼容：id, name, openedAt, thumbnailHue, status)

- [ ] **Step 5: 修改 DashboardHome 接 DB**

完整重写 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/components/shell/DashboardHome.tsx`：

```tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getRecentProjects,
  createProject,
  touchProject,
  type Project,
} from "@tps/data-core";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import HeroHeadline from "./HeroHeadline";
import AiPromptCapsule from "./AiPromptCapsule";
import ProjectRail from "./ProjectRail";
import NewProjectModal from "./NewProjectModal";

export default function DashboardHome() {
  const setActiveNav = useUIStore((s) => s.setActiveNav);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const reload = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await getRecentProjects(user.id, 3);
      setProjects(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [user?.id]);

  const handleOpen = async (id: string) => {
    await touchProject(id);
    setActiveNav("workspace");
    navigate(`/app/workspace/${id}`);
  };

  const handleNew = () => setModalOpen(true);

  const handleCreated = async (project: Project) => {
    setModalOpen(false);
    setActiveNav("workspace");
    navigate(`/app/workspace/${project.id}`);
  };

  if (!user) return null;

  return (
    <main className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center gap-10 px-6 py-12 overflow-y-auto">
      <div className="w-full max-w-2xl sm:max-w-3xl lg:max-w-4xl flex flex-col items-center gap-10">
        <HeroHeadline />
        <AiPromptCapsule />
        {loading ? (
          <div className="text-sm text-muted-foreground py-8">加载中...</div>
        ) : (
          <ProjectRail projects={projects} onOpen={handleOpen} onNew={handleNew} onAll={() => {
            setActiveNav("workspace");
            navigate("/app/workspace");
          }} />
        )}
      </div>
      <NewProjectModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={handleCreated} />
    </main>
  );
}
```

- [ ] **Step 6: 修改 Router**

修改 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/router/index.tsx`：
- 删除 `import { ComingSoon } from "@/components/shell";`（如果不再用 — 检查 WorkspacePage 是否需要；如果不再用则改 import）
- 加 `import { WorkspacePage } from "@/components/shell";`（如有 barrel）或单独 import
- 把 `/app/workspace` 改成 `<WorkspacePage />`
- 删除 `/app/workspace/new` 路由

修改后的 Routes 段：

```tsx
<Route path="home" element={<DashboardHome />} />
<Route path="workspace" element={<WorkspacePage />} />
<Route path="workspace/:id" element={<PlaceholderPage title="项目" />} />
<Route path="assets" element={<PlaceholderPage title="资产" />} />
<Route path="templates" element={<PlaceholderPage title="模板" />} />
```

- [ ] **Step 7: 删除 mockProjects.ts**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
git rm apps/desktop/src/data/mockProjects.ts
rmdir apps/desktop/src/data 2>/dev/null || true
```

- [ ] **Step 8: 验证 tsc**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
pnpm --filter @tps/desktop exec tsc -b
```

预期：exit 0。如果 tsc 报错，最常见的是 Project type 不兼容 — 读 ProjectCapsule.tsx 确认 import 已更新到 `@tps/data-core`。

- [ ] **Step 9: 修改 dashboard-home.spec.ts 的 login helper**

修改 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/e2e/dashboard-home.spec.ts`：

```typescript
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("用户名").fill("admin");
  await page.getByLabel("密码").fill("admin123");
  await page.getByRole("button", { name: /登.*录/ }).click();
  await page.waitForURL(/\/app/);
}
```

`admin` 用户已经在 Task 2 seed。`admin123` 是 seed 时 hardcode 的密码。

dashboard-home.spec.ts 的"登录后核心 UI 元素可见"测试里检查的项目名（如 "滨海新城交通评估"）现在不会出现在 DB 里 — 因为 dashboard 显示的是该用户最近 3 个项目，admin seed 时没有项目。

修改该项目名校准逻辑。两条路：
- (A) 在测试 setup 里用 SQL 直接 INSERT 几条项目（项目名固定）
- (B) 修改测试为"检查 ProjectRail 容器渲染 4 张卡（1 新建 + 最多 3 项目），不依赖具体名称"

选 (B) 更简单。修改这一段：

```typescript
// 旧：
await expect(page.getByText("滨海新城交通评估")).toBeVisible();
await expect(page.getByText("东莞地铁 12 号线规划")).toBeVisible();
await expect(page.getByText("松山湖通勤 OD 矩阵")).toBeVisible();
await expect(page.getByText("虎门港物流通道仿真")).not.toBeVisible();

// 新：
const projectCards = page.locator('button[title]').filter({ has: page.locator('span:has-text("打开"), span:has-text("小时"), span:has-text("分钟")') });
await expect(page.getByRole("button", { name: /新建项目/ })).toBeVisible();
// admin 没有项目，所以应该看到空态
await expect(page.getByText(/暂无历史项目/)).toBeVisible();
```

- [ ] **Step 10: 创建 workspace.spec.ts**

创建 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/e2e/workspace.spec.ts`：

```typescript
import { test, expect, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("用户名").fill("admin");
  await page.getByLabel("密码").fill("admin123");
  await page.getByRole("button", { name: /登.*录/ }).click();
  await page.waitForURL(/\/app/);
}

test.describe("/app/workspace CRUD", () => {
  test("创建项目 → 列表出现 → 重命名 → 归档 → 列表消失", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: /所有项目/ }).click();
    await expect(page).toHaveURL(/\/app\/workspace/);

    // 新建
    await page.getByRole("button", { name: /\+ 新建项目/ }).click();
    const dialog = page.getByRole("dialog", { name: /新建项目/ });
    await expect(dialog).toBeVisible();
    const nameInput = page.getByLabel("项目名称");
    const testName = `测试项目 ${Date.now()}`;
    await nameInput.fill(testName);
    await page.getByRole("button", { name: "创建" }).click();

    // 跳到详情占位页（/workspace/:id）
    await expect(page).toHaveURL(/\/app\/workspace\/[\w-]+/);

    // 回 workspace
    await page.goto("/app/workspace");
    await expect(page.getByText(testName)).toBeVisible();

    // 重命名
    const newName = `已重命名 ${Date.now()}`;
    await page.getByRole("button", { name: /重命名/ }).first().click();
    const renameInput = page.getByLabel("项目名称");
    await renameInput.fill(newName);
    await renameInput.press("Enter");
    await expect(page.getByText(newName)).toBeVisible();
    await expect(page.getByText(testName)).not.toBeVisible();

    // 归档（confirm 弹窗接受）
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: /归档/ }).first().click();
    await expect(page.getByText(newName)).not.toBeVisible();
  });
});
```

- [ ] **Step 11: 创建 auth.spec.ts**

创建 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/e2e/auth.spec.ts`：

```typescript
import { test, expect, type Page } from "@playwright/test";

test.describe("login flow", () => {
  test("账号密码登录 (admin/admin123)", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("用户名").fill("admin");
    await page.getByLabel("密码").fill("admin123");
    await page.getByRole("button", { name: /登.*录/ }).click();
    await page.waitForURL(/\/app\/home/);
    await expect(page.getByText("交通规划AI工作流系统")).toBeVisible();
  });

  test("错误密码 → 提示错误", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("用户名").fill("admin");
    await page.getByLabel("密码").fill("wrong");
    await page.getByRole("button", { name: /登.*录/ }).click();
    await expect(page.getByText(/用户名或密码错误/)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("游客模式：填用户名直接进", async ({ page }) => {
    await page.goto("/login");
    // 切到游客模式
    await page.getByRole("button", { name: /以游客身份进入/ }).click();
    const guestName = `e2e-guest-${Date.now()}`;
    await page.getByLabel("游客用户名").fill(guestName);
    await page.getByRole("button", { name: /游客进入/ }).click();
    await page.waitForURL(/\/app\/home/);
  });
});
```

- [ ] **Step 12: 跑全套 E2E**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
pnpm --filter @tps/desktop e2e
```

预期：所有 E2E 通过（dashboard-home 的 5 个调整后 + workspace 的 1 个 + auth 的 3 个 = 9 个）。

如果失败：
- Login 页面 toggle 选择器可能不准：读 Login.tsx 当前 DOM，按实际 aria/name 调整
- 数据库残留状态：在 playwright setup 里加 `beforeEach` 清 DB（暂不强求）

- [ ] **Step 13: 手动视觉验收**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
pnpm dev
```

打开 `http://localhost:1420`，逐项验证：
- 账号 admin/admin123 登录 → dashboard 看到 "暂无历史项目"
- 点击"新建项目"卡 → 弹 modal → 输入名称 → 创建 → 跳到 /app/workspace/:id 占位
- 返回 /app/workspace → 看到刚建的项目
- 重命名 → 名字更新
- 归档 → 项目从列表消失
- 退出登录 → /login → 切到游客模式 → 输入新名字 → 进 dashboard
- 在游客账号下新建项目 → 退出 → admin 进 → 看不到游客的项目（隔离）

- [ ] **Step 14: Commit**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
git add apps/desktop/src/components/shell/NewProjectModal.tsx \
        apps/desktop/src/components/shell/WorkspacePage.tsx \
        apps/desktop/src/components/shell/ProjectRail.tsx \
        apps/desktop/src/components/shell/ProjectCapsule.tsx \
        apps/desktop/src/components/shell/DashboardHome.tsx \
        apps/desktop/src/router/index.tsx \
        apps/desktop/e2e/dashboard-home.spec.ts \
        apps/desktop/e2e/auth.spec.ts \
        apps/desktop/e2e/workspace.spec.ts
git rm apps/desktop/src/data/mockProjects.ts
git commit -m "🗄️ feat(workspace): /app/workspace CRUD + NewProjectModal + DashboardHome 接 DB + 9 个 E2E"
```

注意：项目里 barrel export `components/shell/index.ts` 也需要更新（加 `WorkspacePage` 和 `NewProjectModal`）。**确认 barrel 完整** — 读 `apps/desktop/src/components/shell/index.ts`，如果还没包含这两个 export，**手动加进去**（commit 里包含）。

---

## Self-Review

**1. Spec 覆盖**：
- §1 目标：7 个 task 覆盖 ✓
- §2 技术栈：Task 1 + 3 装依赖 ✓
- §3 schema：Task 1 ✓
- §4 DB 连接：Task 1 ✓
- §5 Auth：Task 3 (helpers) + Task 4 (store) + Task 5 (Login UI) ✓
- §6 Login UI：Task 5 ✓
- §7 /app/workspace：Task 7 ✓
- §8 DashboardHome：Task 7 ✓
- §9 packages/data-core API：Task 1 + 3 + 6 ✓
- §10 错误/边界：Task 5 (Login 显示 error) + Task 7 (ProjectRail 空态) ✓
- §11 测试：Task 7 (auth.spec + workspace.spec + 改 dashboard-home) ✓
- §12 实施切片：7 个 task 一致 ✓
- §13 非目标：明确未做 ✓
- §14 风险：
  - drizzle-kit 第一次生成：Task 1 Step 5 ✓
  - DB 路径：Task 1 用相对路径 ✓
  - Strict Mode 双跑：Task 2 main.tsx await dbReady ✓

**2. 占位符扫描**：无 TBD/TODO。"复用 dashboard home 同样的"已替换为 NewProjectModal 组件。"Modal 样式" 在 Task 7 Step 1 给了完整代码。

**3. 类型一致性**：
- `User` / `Project` 都来自 `@tps/data-core` schema，跨 Task 一致 ✓
- `useAuthStore.user.isGuest` 在 Task 4 加，Task 5/7 没用但持久化 OK ✓
- `createProject` / `renameProject` / `archiveProject` 签名在 Task 6 定义，Task 7 使用 — 一致 ✓
- `getRecentProjects(ownerId, limit)` Task 6 定义 `(limit = 3)` 默认，Task 7 用 `getRecentProjects(user.id, 3)` 显式 — OK ✓

**4. barrel 检查**：Task 7 Step 14 提醒了"手动加进 barrel"。这是真实风险 — implementer 必须确认 barrel 包含 `WorkspacePage` 和 `NewProjectModal`，否则 router 和 DashboardHome 找不到。

**5. ProjectCapsule 跨包类型**：Task 7 Step 3-4 显式要求读 + 改 import。这避免了"两个 Project type 不兼容"的潜在问题。

**潜在风险**：
- Task 7 Step 9 (dashboard-home.spec.ts 项目名) 是 spec 没明确要求的判断。Self-review 选了方案 B (空态验证)。Implementer 如果觉得应该 seed 几条 demo 数据可调整。
- Playwright 测试 setup 没要求清 DB。如果 DB 残留之前 seed 的 admin + 项目数据，测试可能 flaky。Task 7 Step 12 注释"暂不强求"，但 implementer 如想严格可在 `playwright.config.ts` 加 `globalSetup` 删 .data/app.db。

**确认**：plan 完整覆盖 spec，无明显占位符，类型一致。开始执行。