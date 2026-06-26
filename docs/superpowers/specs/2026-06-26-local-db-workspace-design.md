# 本地 DB + Workspace 页面设计

> 日期: 2026-06-26
> 范围: 本地 SQLite DB 搭建、users/projects 表 schema、DB-backed auth（支持游客模式）、`/app/workspace` 页面（项目列表 + 增删改）
> 状态: 已通过 brainstorming 确认

## 1. 目标

把当前 mock-data + mock-auth 的 AppShell 升级为本地持久化：

- 本地 SQLite 数据库，存储用户与项目
- 鉴权支持两种路径：账号密码登录 + 游客模式（用户名即用，无密码）
- `/app/workspace` 页面从 ComingSoon 占位升级为完整的项目列表（搜索、新建、重命名、归档）
- `/app/home` 的 DashboardHome 从 MOCK_PROJECTS 静态数据改为 DB 查询

不在本设计范围：项目详情页 `/app/workspace/:id` 真实实现、用户注册页面、密码重置、项目分类/标签/团队成员、Supabase 同步。

## 2. 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| DB 引擎 | SQLite（本地文件） | 零配置、单文件、desktop 首选 |
| DB 驱动 | `@libsql/client`（纯 JS） | 无需 Rust 端改动，Tauri + Vite 都跑通 |
| ORM | `drizzle-orm` + `drizzle-orm/libsql` 适配器 | 类型安全、迁移生成器、轻量 |
| 迁移工具 | `drizzle-kit` + `drizzle-orm` 的 `migrate()` 启动时跑 | schema 变更可追溯 |
| 密码哈希 | `bcryptjs`（纯 JS） | 无需原生编译，跨平台一致 |
| ID 生成 | `nanoid`（轻量） | 比 UUID 短，比自增安全 |

## 3. Schema

文件位置：`packages/data-core/src/schema.ts`

### `users` 表

```ts
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),  // 游客占位 '!'
  isGuest: integer('is_guest', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
```

- `passwordHash` 非空但游客用户存 `'!'`（占位符）
- `isGuest=true` 的用户用 username 直接登录，不校验 password
- 唯一约束 `username` —— 游客创建时如果 username 已存在但属于已注册用户（`is_guest=false`），拒绝覆盖

### `projects` 表

```ts
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
```

- `ownerId` 关联 users，级联删除
- `status='archived'` 即"软删除"
- 默认缩略 hue `217`（蓝色，跟当前 MOCK_PROJECTS 一致）

## 4. DB 连接与迁移

文件位置：`packages/data-core/src/db.ts`

```ts
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from './schema';

const DB_PATH = 'apps/desktop/.data/app.db';  // 相对项目根

export const client = createClient({ url: `file:${DB_PATH}` });
export const db = drizzle(client, { schema });

export async function runMigrations() {
  await migrate(db, { migrationsFolder: 'apps/desktop/drizzle' });
}
```

- DB 文件 `apps/desktop/.data/app.db`，gitignored
- 迁移文件夹 `apps/desktop/drizzle/`，生成 `0000_*.sql` 之类
- 迁移在应用启动时自动跑（`apps/desktop/src/main.tsx` 加 await runMigrations()）
- drizzle-kit 配置在 `apps/desktop/drizzle.config.ts`，输出到 `apps/desktop/drizzle/`

- DB 文件 `apps/desktop/.data/app.db`，gitignored
- 迁移文件夹 `apps/desktop/drizzle/`，生成 `0000_*.sql` 之类
- 迁移在应用启动时自动跑（`apps/desktop/src/main.tsx` 加 await runMigrations()）
- drizzle-kit 配置在 `apps/desktop/drizzle.config.ts`，输出到 `apps/desktop/drizzle/`

## 5. Auth 改造

### seed（启动时一次性）

- 仅 seed `admin`（password_hash = bcrypt('admin123')，is_guest=false）
- 游客用户**不 seed**，按需创建

### `useAuthStore` 新增

```ts
interface AuthState {
  user: User | null;        // 已有字段
  isAuthenticated: boolean; // 已有字段
  isLoading: boolean;
  error: string | null;

  login(username: string, password: string): Promise<boolean>;
  loginAsGuest(username: string): Promise<boolean>;  // 新增
  logout(): void;
  clearError(): void;
}
```

### login 流程（账号密码）
1. `useAuthStore.login(username, password)`
2. DB 查询 `SELECT * FROM users WHERE username = ? AND is_guest = false`
3. 若存在 → bcrypt.compare(password, user.password_hash)
4. 成功 → set user state + 持久化 localStorage + 返回 true
5. 失败 → set error + 返回 false

### loginAsGuest 流程（游客）
1. `useAuthStore.loginAsGuest(username)`
2. DB 查询 `SELECT * FROM users WHERE username = ? AND is_guest = true`
3. 若存在 → 直接 set user state（不校验密码）+ 持久化 + 返回 true
4. 若不存在 → INSERT 新用户（passwordHash='!', isGuest=true）+ set user state + 持久化 + 返回 true
5. 若 username 已存在但 `is_guest=false`（即已注册账号）→ 拒绝并返回 false，提示"该用户名已注册，请用密码登录"

### 持久化
- `useAuthStore` 现有 `persist` 中间件继续把 `user` + `isAuthenticated` 写到 localStorage
- 启动时如有 persisted user，跳过 login 直接进 dashboard（session 恢复）

## 6. Login 页面 UI

文件：`apps/desktop/src/pages/Login.tsx`

现有 FloatingInput + GSAP 动画保留。在 form 下方加一组按钮：

```
[用户名 FloatingInput]
[密码 FloatingInput]      ← 账号密码模式才显
[   登录   ]               ← 账号密码模式
            ─── 或者 ───
[游客用户名 FloatingInput]  ← 游客模式才显
[   游客进入   ]            ← 游客模式
```

**切换逻辑**：
- 默认显示"账号密码"路径
- 一个 toggle："以游客身份进入 ↔ 用账号密码登录"（链接/小按钮）
- 切换时切换显隐的字段
- 两个 FloatingInput 都用之前的 useId 关联（commit `ed713c6` 的修复）

**GSAP 动画**：
- 模式切换时新出现的字段 fade-in + 上滑
- 提交时整体 form 提交 loading 态

## 7. /app/workspace 页面

文件：`apps/desktop/src/components/shell/WorkspacePage.tsx`（新）

### 页面布局

```
┌────────────────────────────────────────────────────────────┐
│ [搜索项目...]                              [+ 新建项目]    │  ← 顶栏
├────────────────────────────────────────────────────────────┤
│ [缩略色块] 项目A                     [重命名] [归档]       │  ← 列表项
│              最后打开 2 小时前                              │
├────────────────────────────────────────────────────────────┤
│ [缩略色块] 项目B                     [重命名] [归档]       │
├────────────────────────────────────────────────────────────┤
│ ...                                                         │
└────────────────────────────────────────────────────────────┘
                              空状态：暂无项目，去新建一个 →
```

### 列表数据

- DB 查询：`SELECT * FROM projects WHERE owner_id = currentUserId AND status = 'active' ORDER BY opened_at DESC`
- 搜索：`WHERE name LIKE '%query%'`（模糊匹配）
- 空状态：显示引导文案 + "新建项目"按钮

### 新建项目（modal）
- 触发：顶栏"+ 新建项目"按钮 或 列表空状态 CTA
- modal 内容：项目名称 input + 创建 / 取消
- 提交：INSERT projects，返回新 id，跳 /app/workspace/:id（仍占位）
- thumbnailHue 随机生成（200-340 之间）

### 重命名（行内编辑）
- 触发：列表项的"重命名"按钮
- 行变编辑态：名称变 input
- 提交：UPDATE projects SET name = ?, updated_at = NOW() WHERE id = ?
- 取消：恢复显示态

### 归档（软删除）
- 触发：列表项的"归档"按钮
- 确认：弹小确认 dialog
- 提交：UPDATE projects SET status = 'archived', updated_at = NOW() WHERE id = ?
- 列表刷新：该行消失

### 当前路由占位替换

`apps/desktop/src/router/index.tsx`：
- `/app/workspace` → `<WorkspacePage />`（替换之前的 PlaceholderPage）
- `/app/workspace/new` → 删除此路由（不再需要，新建项目统一走 modal）
- `/app/workspace/:id` → 仍占位（本轮不实现详情页）

## 8. DashboardHome 改造

文件：`apps/desktop/src/components/shell/DashboardHome.tsx`

### ProjectRail 数据源切换

- 删除 `import { MOCK_PROJECTS }` 的依赖
- 改用 React state + useEffect 在 mount 时调 DB：
  ```ts
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  useEffect(() => {
    if (!currentUser) return;
    getRecentProjects(currentUser.id, 3).then(setRecentProjects);
  }, [currentUser]);
  ```
- helper 来自 `packages/data-core/src/queries/projects.ts`：`getRecentProjects(ownerId, limit)`
- 加载态：3 个骨架卡片
- 空态：复用 ProjectRail 现有空态

### 项目卡点击副作用

- 在 DashboardHome 的 `handleOpen(id)` 加一步：
  ```ts
  await touchProject(id);  // UPDATE opened_at = NOW()
  setActiveNav("workspace");
  navigate(`/app/workspace/${id}`);
  ```
- helper：`touchProject(id)` 来自 queries/projects.ts

### 新建项目

- DashboardHome 的 `handleNew` 同样改成：
  - 弹 modal（同 /app/workspace 复用 `NewProjectModal` 组件）
  - INSERT 后跳转 `/app/workspace/:newId`
  - 不再 navigate 到 `/app/workspace/new` 占位

### 提取 NewProjectModal 组件

`apps/desktop/src/components/shell/NewProjectModal.tsx`（新）

- 受控：`<NewProjectModal open={...} onClose={...} onCreated={(project) => ...} />`
- 内容：名称 input + 创建/取消
- 触发：dashboard "新建项目"卡 + workspace "新建项目"按钮 + 空状态 CTA

## 9. packages/data-core API

`packages/data-core/src/index.ts` 导出：

```ts
// schema
export * from './schema';

// db connection
export { client, db, runMigrations } from './db';

// auth helpers
export { findUserByUsername, createGuestUser, verifyPassword, hashPassword } from './auth';

// project queries
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

`packages/data-core/package.json` 加依赖：
- `@libsql/client`
- `drizzle-orm`
- `bcryptjs`
- `nanoid`

devDependencies：
- `drizzle-kit`

## 10. 错误 / 边界

| 情况 | 处理 |
|---|---|
| DB 文件首次创建失败 | 启动时 try/catch，错误显示在 Login 页面（红色提示），不要崩 |
| Migration 失败 | 同上 |
| Username 已注册账号，游客模式试图用同名 | loginAsGuest 返回 false + error = "该用户名已注册，请用密码登录" |
| bcrypt 校验失败 | error = "用户名或密码错误" |
| 删除归档后跳路由（如仍在 /app/workspace/:id） | 跳回 /app/workspace |
| 网络/DB 暂时不可用（异常抛出） | try/catch → error message + loading false |
| `prefers-reduced-motion` | Login 页面 GSAP 跳过动画（已有逻辑） |

## 11. 测试

继续手动 + Playwright E2E：

| 新增/调整 | 说明 |
|---|---|
| 新 E2E: `auth.spec.ts` | 游客进入（不填密码）+ 账号登录（admin/admin123）+ 错误密码 |
| 新 E2E: `workspace.spec.ts` | 登录 → 新建项目 → 列表出现 → 重命名 → 归档 → 列表消失 |
| 调整 E2E: `dashboard-home.spec.ts` | dashboard 渲染时改验证 seed 数据生成的项目名（如 "游客项目 1"），不依赖 MOCK_PROJECTS 字面值 |

手动验证：
- 首次启动 → 自动建 admin（bcrypt hash）→ 自动跑 migration
- 游客进入 → 输入新 username → DB 中新增 is_guest=true 用户 → 进 dashboard
- 游客退出再以同名游客进入 → DB 中仍是同一用户
- 游客退出再用该同名 + 密码登录 → 拒绝（用户名已被游客占用）
- /app/workspace CRUD 完整流程

## 12. 实施切片（7 个 task）

1. **packages/data-core 基建**：加 schema.ts + db.ts + drizzle.config.ts + 依赖 + 首个 migration 生成
2. **apps/desktop 启动钩子**：跑 migration + seed admin；main.tsx 改造
3. **packages/data-core auth helpers**：findUserByUsername / createGuestUser / verifyPassword / hashPassword + 单元逻辑
4. **apps/desktop useAuthStore 改造**：login 调 DB 校验 + loginAsGuest 新增 + 错误处理
5. **apps/desktop Login 页面**：游客模式 toggle + 游客用户名 input + 模式切换动画
6. **packages/data-core project queries**：getRecentProjects / createProject / renameProject / archiveProject / touchProject + getActiveProjects / getProjectById
7. **apps/desktop /app/workspace 页面**：WorkspacePage 组件 + NewProjectModal 组件 + 列表/搜索/CRUD + 路由替换 + DashboardHome 改造

每个 task 独立 commit。Task 7 完成时跑完整 E2E 套件验证。

## 13. 非目标（明确不做）

- 项目详情页 `/app/workspace/:id` 真实功能（仍占位）
- 用户注册页面（admin 是 seed 的）
- 密码重置 / 找回
- 项目分类 / 标签 / 团队成员
- Supabase 同步 / 多设备
- 项目编辑历史 / 版本控制
- 文件上传 / 资源关联

## 14. 风险

| 风险 | 缓解 |
|---|---|
| drizzle-kit 第一次跑生成 migration | 在 plan Task 1 阶段先用 `drizzle-kit generate` 生成 0000_init.sql，commit 后再写运行时 migrate() |
| DB 文件路径在 Tauri 打包后的解析 | 短期：本地 dev 用相对路径，tauri:build 后再调 |
| bcryptjs 性能（纯 JS 慢于 native） | desktop 登录是低频操作，不影响 |
| ID 用 nanoid 而非 UUID | nanoid(12) 足够，唯一性 12^64 远大于项目数 |
| React 18 Strict Mode 下 DB 连接 / migration 双跑 | 启动时一次性 await runMigrations()，放在 main.tsx 顶层不放在 React 树里 |
| useAuthStore 持久化在游客模式下保留旧 userId | 现有逻辑：刷新后从 localStorage 恢复 user state；userId 仍指向 DB 中真实记录，OK |