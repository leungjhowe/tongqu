# AppShell 胶囊化 Dashboard 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `apps/desktop/src/pages/AppShell.tsx` 从三栏工作台改造为单页胶囊化 Dashboard 落地页（Header 胶囊导航 + Hero 文案 + AI 输入胶囊 + 横向项目胶囊行），背景走可换肤的 GSAP 流光层。

**Architecture:** 把 AppShell 拆为两层——`Backdrop` 背景层（独立可换肤）+ `Header` 顶栏（`Logo` / `NavRail` / `UserMenu`）+ `DashboardHome` 主体（`HeroHeadline` / `AiPromptCapsule` / `ProjectRail`）。通用胶囊样式抽到 `packages/ui` 共享层。所有一次性数据走 mock。

**Tech Stack:** React 18 + TypeScript 5.5 + react-router-dom v6 + Zustand 4 + UnoCSS 0.62 + GSAP 3.15（流光复用 Login.tsx）+ lucide-react（图标）+ class-variance-authority（变体）。

## Global Constraints

- 项目**无任何测试框架**（已确认 `apps/desktop/package.json` 与根 `package.json` 均无 vitest / jest / playwright）。所有"验证"步骤均为**手动验收**——不引入新测试依赖。
- 沿用现有 shadcn HSL token（`--background: 222 47% 6%` 等），**不修改** `_shadcn.scss` / `_variables.scss`。
- 新增 token 写入 `packages/ui/src/styles/_capsule.scss`：`--capsule-bg: 220 30% 12%` / `--capsule-bg-hover: 220 30% 16%` / `--capsule-border: 220 30% 18%` / `--capsule-border-active: 217 91% 60%` / `--capsule-glow: 217 91% 60% / 0.18` / `--capsule-radius: 9999px`。
- 所有过渡 `200ms ease`（与现有 `$transition-base` 一致）。
- `LAYOUT` 常量（`HEADER_HEIGHT: 44`）**不修改**；新 Header 高度改在 `AppShell` 内联样式中（`h-16` = 64px）。
- 4 个导航 key：`'home' | 'workspace' | 'assets' | 'templates'`，更新 `packages/shared/src/types/index.ts` 的 `NavKey` 联合类型与 `constants/index.ts` 的 `NAV_ITEMS` 数组。
- 删 `useUIStore` 的 `sidebarCollapsed` / `chatPanelCollapsed` / `toggleSidebar` / `toggleChatPanel` **不在本计划范围**（保持向后兼容）。
- 写死的 `MOCK_PROJECTS` 4-6 条，按 `openedAt` 倒序。
- 提交信息中文 + emoji 前缀（与既有 `c7371bf` / `097d92c` 风格一致）。
- 每次任务结束**单独 commit**。

---

## File Map

| 路径 | 类型 | 职责 |
|---|---|---|
| `packages/ui/src/components/Capsule.tsx` | Create | 通用胶囊组件（圆角、padding、可变宽度、可发外光） |
| `packages/ui/src/styles/_capsule.scss` | Create | 胶囊 token + 通用工具类 |
| `packages/ui/src/styles/globals.scss` | Modify | `@use 'capsule'` |
| `packages/ui/src/index.ts` | Modify | 导出 `Capsule` 与 `CapsuleProps` |
| `packages/shared/src/types/index.ts` | Modify | `NavKey` 扩展为 4 个新 key |
| `packages/shared/src/constants/index.ts` | Modify | `NAV_ITEMS` 替换为 4 项新导航 |
| `apps/desktop/src/stores/uiStore.ts` | Modify | 加 `promptValue` / `setPromptValue` / `backdropVariant` / `setBackdropVariant`，默认 `'flow'` |
| `apps/desktop/src/data/mockProjects.ts` | Create | `MOCK_PROJECTS: Project[]` 写死 4-6 条 |
| `apps/desktop/src/components/shell/Backdrop.tsx` | Create | 背景层（`variant="flow"` GSAP 流光） |
| `apps/desktop/src/components/shell/Logo.tsx` | Create | 左胶囊（TP + 产品名 hover 展开） |
| `apps/desktop/src/components/shell/NavCapsule.tsx` | Create | 单导航胶囊（icon + hover 展开 label） |
| `apps/desktop/src/components/shell/NavRail.tsx` | Create | 中间 4 胶囊容器 |
| `apps/desktop/src/components/shell/UserMenu.tsx` | Create | 右胶囊（头像 + 用户名 hover 展开 + 下拉占位） |
| `apps/desktop/src/components/shell/Header.tsx` | Create | 顶栏容器，三段式 |
| `apps/desktop/src/components/shell/HeroHeadline.tsx` | Create | "今天要做什么？"标题 |
| `apps/desktop/src/components/shell/AiPromptCapsule.tsx` | Create | AI 输入胶囊（Enter 提交到 console） |
| `apps/desktop/src/components/shell/NewProjectCapsule.tsx` | Create | "新建项目"胶囊（虚线边） |
| `apps/desktop/src/components/shell/ProjectCapsule.tsx` | Create | 单个项目胶囊（缩略色块 + 名称 + 时间） |
| `apps/desktop/src/components/shell/ProjectRail.tsx` | Create | 项目胶囊行容器（横向滚动 + 渐隐遮罩） |
| `apps/desktop/src/components/shell/DashboardHome.tsx` | Create | 主体内容容器 |
| `apps/desktop/src/components/shell/ComingSoon.tsx` | Create | 占位页（其他路由共用） |
| `apps/desktop/src/components/shell/index.ts` | Create | barrel export |
| `apps/desktop/src/pages/AppShell.tsx` | Modify | 整体替换为 `Backdrop + Header + DashboardHome` |
| `apps/desktop/src/router/index.tsx` | Modify | 增 `/app/home` / `/app/workspace` / `/app/assets` / `/app/templates` / `/app/workspace/:id` / `/app/workspace/new` |

---

## Task 1: packages/ui 新增 Capsule 基础组件 + SCSS tokens

**Files:**
- Create: `packages/ui/src/components/Capsule.tsx`
- Create: `packages/ui/src/styles/_capsule.scss`
- Modify: `packages/ui/src/styles/globals.scss`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**
- Produces: `Capsule` 组件 + `CapsuleProps { as?: 'div' | 'button' | 'a'; href?: string; active?: boolean; hoverExpand?: boolean; children: ReactNode; className?: string }`
- Consumes: 现有 `cn()` from `packages/ui/src/lib/utils.ts`

- [ ] **Step 1: 创建 `_capsule.scss`**

写入 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/packages/ui/src/styles/_capsule.scss`：

```scss
:root {
  --capsule-bg: 220 30% 12%;
  --capsule-bg-hover: 220 30% 16%;
  --capsule-border: 220 30% 18%;
  --capsule-border-active: 217 91% 60%;
  --capsule-glow: 217 91% 60% / 0.18;
  --capsule-radius: 9999px;
}

.capsule {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  border-radius: var(--capsule-radius);
  background: hsl(var(--capsule-bg) / 0.7);
  border: 1px solid hsl(var(--capsule-border));
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: background 200ms ease, border-color 200ms ease, box-shadow 200ms ease, width 200ms ease;
  color: hsl(var(--foreground));
  font-size: 0.8125rem;
  line-height: 1;
  cursor: pointer;
  user-select: none;
}

.capsule:hover {
  background: hsl(var(--capsule-bg-hover) / 0.85);
}

.capsule[data-active="true"] {
  background: hsl(var(--primary) / 0.16);
  border-color: hsl(var(--capsule-border-active));
  box-shadow: 0 0 0 1px hsl(var(--capsule-border-active)), 0 0 12px hsl(var(--capsule-glow));
}

.capsule[data-focus-glow="true"]:focus-within {
  box-shadow: 0 0 0 1px hsl(var(--capsule-border-active)), 0 0 12px hsl(var(--capsule-glow));
}

.capsule__label {
  opacity: 0;
  max-width: 0;
  overflow: hidden;
  white-space: nowrap;
  transition: opacity 200ms ease, max-width 200ms ease, margin-left 200ms ease;
}

.capsule:hover .capsule__label,
.capsule[data-always-show-label="true"] .capsule__label {
  opacity: 1;
  max-width: 120px;
  margin-left: 0.25rem;
}

.capsule--dashed {
  border-style: dashed;
  border-color: hsl(var(--capsule-border-active) / 0.4);
  background: transparent;
}

.capsule--dashed:hover {
  border-style: solid;
  border-color: hsl(var(--capsule-border-active));
  box-shadow: 0 0 12px hsl(var(--capsule-glow));
}
```

- [ ] **Step 2: 在 `globals.scss` 顶部加入 capsule 引用**

修改 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/packages/ui/src/styles/globals.scss` 第 1 行附近，在 `@use 'shadcn';` 之后插入：

```scss
@use 'shadcn';
@use 'capsule';
@use 'variables' as *;
@use 'mixins' as *;
```

- [ ] **Step 3: 创建 `Capsule.tsx`**

写入 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/packages/ui/src/components/Capsule.tsx`：

```tsx
import * as React from 'react';
import { cn } from '../lib/utils';

export interface CapsuleProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'div' | 'button' | 'a';
  href?: string;
  active?: boolean;
  alwaysShowLabel?: boolean;
  dashed?: boolean;
  focusGlow?: boolean;
  label?: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Capsule = React.forwardRef<HTMLElement, CapsuleProps>(
  (
    {
      as = 'button',
      href,
      active = false,
      alwaysShowLabel = false,
      dashed = false,
      focusGlow = false,
      label,
      icon,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp: React.ElementType = as === 'a' ? 'a' : as;
    const extraProps = as === 'a' && href ? { href } : {};
    return (
      <Comp
        ref={ref as React.Ref<HTMLElement>}
        className={cn('capsule', dashed && 'capsule--dashed', className)}
        data-active={active || undefined}
        data-always-show-label={alwaysShowLabel || active || undefined}
        data-focus-glow={focusGlow || undefined}
        {...(as === 'button' ? { type: 'button' as const } : {})}
        {...extraProps}
        {...props}
      >
        {icon != null && <span className="capsule__icon">{icon}</span>}
        {label != null && <span className="capsule__label">{label}</span>}
        {children}
      </Comp>
    );
  },
);
Capsule.displayName = 'Capsule';
```

- [ ] **Step 4: 在 `index.ts` 导出**

修改 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/packages/ui/src/index.ts`，在文件末尾追加：

```ts
export { Capsule } from './components/Capsule';
export type { CapsuleProps } from './components/Capsule';
```

- [ ] **Step 5: 验证构建**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
pnpm --filter @tps/ui build
```

预期：构建通过（无 TS 错误）。**注意**——`@tps/ui` 当前**没有 build 脚本**（之前只是 Vite 内置处理）。如果 `pnpm --filter @tps/ui build` 报"No script 'build'"，则改用：

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
pnpm --filter @tps/desktop exec tsc -b --noEmit
```

预期：`tsc` 通过（无 Capsule 相关错误）。

- [ ] **Step 6: Commit**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
git add packages/ui/src/components/Capsule.tsx packages/ui/src/styles/_capsule.scss packages/ui/src/styles/globals.scss packages/ui/src/index.ts
git commit -m "✨ feat(ui): 新增 Capsule 基础组件 + 胶囊 token 与样式"
```

---

## Task 2: @tps/shared 扩展 NavKey 与 NAV_ITEMS

**Files:**
- Modify: `packages/shared/src/types/index.ts`
- Modify: `packages/shared/src/constants/index.ts`

**Interfaces:**
- Produces: 扩展后 `NavKey = 'home' | 'workspace' | 'assets' | 'templates'`
- Produces: 替换后 `NAV_ITEMS: ReadonlyArray<{ key: NavKey; label: string; icon: string }>`

- [ ] **Step 1: 修改 `types/index.ts`**

修改 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/packages/shared/src/types/index.ts`，把第 4 行：

```ts
export type NavKey = 'projects' | 'workflows' | 'data' | 'assets' | 'settings';
```

替换为：

```ts
export type NavKey = 'home' | 'workspace' | 'assets' | 'templates';
```

- [ ] **Step 2: 修改 `constants/index.ts`**

修改 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/packages/shared/src/constants/index.ts`，把 `NAV_ITEMS` 整段（第 15-21 行）：

```ts
export const NAV_ITEMS: ReadonlyArray<{ key: NavKey; label: string; icon: string }> = [
  { key: 'projects',  label: '项目列表', icon: 'LayersIcon' },
  { key: 'workflows', label: '工作流',   icon: 'CodeIcon' },
  { key: 'data',      label: '数据管理', icon: 'BarChartIcon' },
  { key: 'assets',    label: '资产库',   icon: 'ArchiveIcon' },
  { key: 'settings',  label: '设置',     icon: 'GearIcon' },
];
```

替换为：

```ts
export const NAV_ITEMS: ReadonlyArray<{ key: NavKey; label: string; icon: string }> = [
  { key: 'home',      label: '主页',     icon: 'HomeIcon' },
  { key: 'workspace', label: '工作空间', icon: 'LayoutIcon' },
  { key: 'assets',    label: '资产',     icon: 'ArchiveIcon' },
  { key: 'templates', label: '模板',     icon: 'LayersIcon' },
];
```

- [ ] **Step 3: 验证类型**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
pnpm --filter @tps/desktop exec tsc -b --noEmit
```

预期：tsc 失败并报 `LeftSidebar.tsx:51` 等处 `item.key` 不再是有效 NavKey 旧值——这是预期错误，**本任务不修复**（LeftSidebar 在后续 Task 8 整体替换时会一并清理）。

- [ ] **Step 4: Commit**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
git add packages/shared/src/types/index.ts packages/shared/src/constants/index.ts
git commit -m "🔧 refactor(shared): NAV_ITEMS 改为主页/工作空间/资产/模板"
```

---

## Task 3: useUIStore 扩展字段

**Files:**
- Modify: `apps/desktop/src/stores/uiStore.ts`

**Interfaces:**
- Produces: `useUIStore` 新增 `promptValue: string` / `setPromptValue: (v: string) => void` / `backdropVariant: 'flow' | 'grid' | 'plain'` / `setBackdropVariant: (v) => void`

- [ ] **Step 1: 重写 `uiStore.ts`**

完整重写 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/stores/uiStore.ts`：

```ts
import { create } from "zustand";
import type { NavKey } from "@tps/shared";

export type BackdropVariant = "flow" | "grid" | "plain";

export interface UIState {
  // 既有（本轮保留以避免破坏其他模块，后续清理）
  sidebarCollapsed: boolean;
  chatPanelCollapsed: boolean;
  activeNavKey: NavKey;
  toggleSidebar: () => void;
  toggleChatPanel: () => void;
  setActiveNav: (key: NavKey) => void;

  // 本轮新增
  promptValue: string;
  setPromptValue: (v: string) => void;
  backdropVariant: BackdropVariant;
  setBackdropVariant: (v: BackdropVariant) => void;
}

/**
 * UI store — 跨页 chrome 状态（侧栏、聊天面板、激活导航、提示词、背景变体）。
 * 未持久化：均为 per-session UI affordance，刷新即重置。
 */
export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  chatPanelCollapsed: false,
  activeNavKey: "home",

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  toggleChatPanel: () => {
    set((state) => ({ chatPanelCollapsed: !state.chatPanelCollapsed }));
  },

  setActiveNav: (key) => {
    set({ activeNavKey: key });
  },

  promptValue: "",
  setPromptValue: (v) => {
    set({ promptValue: v });
  },

  backdropVariant: "flow",
  setBackdropVariant: (v) => {
    set({ backdropVariant: v });
  },
}));
```

- [ ] **Step 2: 验证类型（仍然预期失败）**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
pnpm --filter @tps/desktop exec tsc -b --noEmit
```

预期：仍然报 LeftSidebar 的 NavKey 错误（来自 Task 2）；**store 本身不报错**。

- [ ] **Step 3: Commit**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
git add apps/desktop/src/stores/uiStore.ts
git commit -m "🔧 feat(store): UIState 新增 promptValue 与 backdropVariant"
```

---

## Task 4: mockProjects 数据

**Files:**
- Create: `apps/desktop/src/data/mockProjects.ts`

**Interfaces:**
- Produces: `Project` 接口 + `MOCK_PROJECTS: Project[]`（4-6 条倒序）

- [ ] **Step 1: 创建 `mockProjects.ts`**

写入 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/data/mockProjects.ts`：

```ts
/**
 * 写死的最近打开项目数据。本轮不接真实项目存储。
 * 后续接入后端时整体替换为 React Query / store。
 */
export interface Project {
  id: string;
  name: string;
  openedAt: string; // ISO 8601
  thumbnailHue: number; // 0-360，色相；缩略色块用 HSL 生成
  status: "active" | "archived";
}

export const MOCK_PROJECTS: Project[] = [
  {
    id: "p-001",
    name: "滨海新城交通评估",
    openedAt: "2026-06-25T10:32:00.000Z",
    thumbnailHue: 217,
    status: "active",
  },
  {
    id: "p-002",
    name: "东莞地铁 12 号线规划",
    openedAt: "2026-06-24T08:15:00.000Z",
    thumbnailHue: 195,
    status: "active",
  },
  {
    id: "p-003",
    name: "松山湖通勤 OD 矩阵",
    openedAt: "2026-06-22T17:40:00.000Z",
    thumbnailHue: 280,
    status: "active",
  },
  {
    id: "p-004",
    name: "虎门港物流通道仿真",
    openedAt: "2026-06-19T09:00:00.000Z",
    thumbnailHue: 30,
    status: "active",
  },
  {
    id: "p-005",
    name: "城区慢行系统改造方案",
    openedAt: "2026-06-12T14:22:00.000Z",
    thumbnailHue: 145,
    status: "archived",
  },
  {
    id: "p-006",
    name: "2025 节假日出行预测",
    openedAt: "2026-05-30T11:05:00.000Z",
    thumbnailHue: 350,
    status: "archived",
  },
];
```

- [ ] **Step 2: Commit**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
git add apps/desktop/src/data/mockProjects.ts
git commit -m "📦 feat(desktop): 写死 MOCK_PROJECTS 6 条最近打开项目"
```

---

## Task 5: Backdrop 背景层（GSAP 流光）

**Files:**
- Create: `apps/desktop/src/components/shell/Backdrop.tsx`

**Interfaces:**
- Consumes: `useUIStore` 的 `backdropVariant`
- Produces: 渲染全屏背景（`position: fixed; inset: 0; z-index: 0`）

**重要前置：** 实现需要从 `Login.tsx` 复用 GSAP 流光逻辑。**Step 1 之前**先读：

- `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/pages/Login.tsx` 第 80-200 行附近

理解其 `useGSAP` 流程后，把流光部分抽成 Backdrop 内部逻辑。

- [ ] **Step 1: 读 Login.tsx 第 80-220 行**

用 Read 工具读 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/pages/Login.tsx` 第 80-220 行，确认 `FLOW_COLORS` / `useGSAP` / `<svg>` 渲染结构。

- [ ] **Step 2: 创建 `Backdrop.tsx`**

写入 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/components/shell/Backdrop.tsx`：

```tsx
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

import { useUIStore, type BackdropVariant } from "@/stores/uiStore";

const FLOW_COLORS = [
  "hsl(217 91% 60%)",
  "hsl(217 95% 72%)",
  "hsl(217 91% 48%)",
  "hsl(195 88% 62%)",
  "hsl(235 80% 70%)",
] as const;

const FLOW_DIRS: ReadonlyArray<readonly [number, number]> = [
  [0, -1], // N
  [1, 0], // E
  [0, 1], // S
  [-1, 0], // W
] as const;

type Edge = "N" | "S" | "E" | "W";

function inwardDir(edge: Edge): 0 | 1 | 2 | 3 {
  if (edge === "N") return 2;
  if (edge === "S") return 0;
  if (edge === "E") return 3;
  return 1;
}

function pointOnEdge(edge: Edge, w: number, h: number, t: number, outside: number): [number, number] {
  if (edge === "N") return [t * w, -outside];
  if (edge === "S") return [t * w, h + outside];
  if (edge === "E") return [w + outside, t * h];
  return [-outside, t * h];
}

function pointsToD(points: Array<[number, number]>): string {
  return points.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(" ");
}

const EDGES: Edge[] = ["N", "S", "E", "W"];

function randomEdgeAndInward(): { start: Edge; dir: 0 | 1 | 2 | 3 } {
  const start = EDGES[Math.floor(Math.random() * EDGES.length)] as Edge;
  return { start, dir: inwardDir(start) };
}

function buildPath(width: number, height: number, outside: number): {
  d: string;
  length: number;
  end: { edge: Edge; t: number };
} {
  const startT = 0.1 + Math.random() * 0.8;
  const { start, dir } = randomEdgeAndInward();
  const startPt = pointOnEdge(start, width, height, startT, outside);

  // Walk 2-4 right-angle segments inward
  const segmentCount = 2 + Math.floor(Math.random() * 3);
  const points: Array<[number, number]> = [startPt];
  let cur: [number, number] = startPt;
  let curDir = dir;

  for (let i = 0; i < segmentCount; i++) {
    const len = 80 + Math.random() * 200;
    // 70% 概率继续同向，30% 概率拐弯
    if (Math.random() < 0.3 && i > 0) {
      const nextIdx = (curDir + 1 + Math.floor(Math.random() * 3)) % 4;
      curDir = nextIdx as 0 | 1 | 2 | 3;
    }
    const step = FLOW_DIRS[curDir]!;
    cur = [cur[0] + step[0] * len, cur[1] + step[1] * len];
    points.push(cur);
  }

  // Continue to exit on a random edge
  const exitEdge = EDGES[Math.floor(Math.random() * EDGES.length)] as Edge;
  const exitT = 0.1 + Math.random() * 0.8;
  points.push(pointOnEdge(exitEdge, width, height, exitT, outside));

  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  return { d: pointsToD(points), length, end: { edge: exitEdge, t: exitT } };
}

interface FlowPath {
  id: number;
  d: string;
  length: number;
  duration: number;
  delay: number;
  color: string;
}

function FlowField() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [paths, setPaths] = useState<FlowPath[]>([]);
  const pathRefs = useRef<Array<SVGPathElement | null>>([]);

  // Track size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Regenerate path geometry when size changes
  useEffect(() => {
    if (size.w === 0 || size.h === 0) return;
    const next: FlowPath[] = Array.from({ length: 6 }, (_, i) => {
      const { d, length } = buildPath(size.w, size.h, 100);
      return {
        id: i,
        d,
        length,
        duration: 6 + Math.random() * 6,
        delay: Math.random() * 4,
        color: FLOW_COLORS[Math.floor(Math.random() * FLOW_COLORS.length)]!,
      };
    });
    setPaths(next);
  }, [size.w, size.h]);

  // Animate strokes via GSAP
  useGSAP(
    () => {
      pathRefs.current.forEach((p, i) => {
        if (!p) return;
        const meta = paths[i];
        if (!meta) return;
        gsap.fromTo(
          p,
          { strokeDashoffset: meta.length, opacity: 0 },
          {
            strokeDashoffset: 0,
            opacity: 0.55,
            duration: meta.duration * 0.45,
            delay: meta.delay,
            ease: "power1.inOut",
            repeat: -1,
            repeatDelay: 0,
            yoyo: true,
          },
        );
      });
    },
    { dependencies: [paths], scope: containerRef },
  );

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none"
    >
      {/* Static dot grid */}
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 opacity-30">
        <defs>
          <pattern id="shell-dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="hsl(var(--border))" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#shell-dots)" />
      </svg>

      {/* Flow paths */}
      {size.w > 0 && (
        <svg
          width={size.w}
          height={size.h}
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0"
        >
          {paths.map((p, i) => (
            <path
              key={p.id}
              ref={(el) => {
                pathRefs.current[i] = el;
              }}
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeDasharray={p.length}
              opacity={0}
            />
          ))}
        </svg>
      )}
    </div>
  );
}

function GridBackdrop() {
  // 静态网格 + 节点图样（参考原 CenterCanvas 的 SVG 背景）
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 opacity-40">
        <defs>
          <pattern id="shell-grid-dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="hsl(var(--border))" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#shell-grid-dots)" />
        {/* Few faint connection lines */}
        <g stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="4 4" strokeOpacity={0.6}>
          <line x1="18%" y1="22%" x2="42%" y2="38%" />
          <line x1="42%" y1="38%" x2="64%" y2="30%" />
          <line x1="64%" y1="30%" x2="82%" y2="52%" />
          <line x1="30%" y1="68%" x2="52%" y2="58%" />
          <line x1="52%" y1="58%" x2="72%" y2="72%" />
        </g>
        <g fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth={1.5}>
          <circle cx="18%" cy="22%" r={4} />
          <circle cx="42%" cy="38%" r={4} />
          <circle cx="64%" cy="30%" r={4} />
          <circle cx="82%" cy="52%" r={4} />
          <circle cx="30%" cy="68%" r={4} />
          <circle cx="52%" cy="58%" r={4} />
          <circle cx="72%" cy="72%" r={4} />
        </g>
      </svg>
    </div>
  );
}

export default function Backdrop() {
  const variant: BackdropVariant = useUIStore((s) => s.backdropVariant);
  if (variant === "plain") {
    return <div aria-hidden="true" className="absolute inset-0 bg-background" />;
  }
  if (variant === "grid") return <GridBackdrop />;
  return <FlowField />;
}
```

- [ ] **Step 3: 验证类型**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
pnpm --filter @tps/desktop exec tsc -b --noEmit
```

预期：仅 LeftSidebar / CenterCanvas / RightChatPanel 报 NavKey 错误；Backdrop 无错误。

- [ ] **Step 4: Commit**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
git add apps/desktop/src/components/shell/Backdrop.tsx
git commit -m "✨ feat(shell): Backdrop 背景层（GSAP 流光 + 网格 + 纯色三变体）"
```

---

## Task 6: Header 子组件（Logo / NavCapsule / NavRail / UserMenu）

**Files:**
- Create: `apps/desktop/src/components/shell/Logo.tsx`
- Create: `apps/desktop/src/components/shell/NavCapsule.tsx`
- Create: `apps/desktop/src/components/shell/NavRail.tsx`
- Create: `apps/desktop/src/components/shell/UserMenu.tsx`

**Interfaces:**
- `Logo` 接收 `onClick?: () => void`
- `NavCapsule` 接收 `{ key: NavKey; label: string; icon: ReactNode; active: boolean; onSelect: (key: NavKey) => void }`
- `NavRail` 接收：无 props，从 store 读 `activeNavKey` 与 `setActiveNav`
- `UserMenu` 接收：无 props，从 `useAuthStore` 读 username；从 `useUIStore` 调 logout

- [ ] **Step 1: 创建 `Logo.tsx`**

写入 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/components/shell/Logo.tsx`：

```tsx
import { Capsule } from "@tps/ui";
import { APP_NAME } from "@tps/shared";

interface LogoProps {
  onClick?: () => void;
}

export default function Logo({ onClick }: LogoProps) {
  return (
    <Capsule
      as="button"
      onClick={onClick}
      icon={
        <span
          aria-hidden
          className="w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold tracking-wider"
        >
          TP
        </span>
      }
      label={<span className="text-sm text-foreground whitespace-nowrap">{APP_NAME}</span>}
    />
  );
}
```

- [ ] **Step 2: 创建 `NavCapsule.tsx`**

写入 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/components/shell/NavCapsule.tsx`：

```tsx
import type { ReactNode } from "react";
import { Capsule } from "@tps/ui";
import type { NavKey } from "@tps/shared";

interface NavCapsuleProps {
  navKey: NavKey;
  label: string;
  icon: ReactNode;
  active: boolean;
  onSelect: (key: NavKey) => void;
}

export default function NavCapsule({ navKey, label, icon, active, onSelect }: NavCapsuleProps) {
  return (
    <Capsule
      as="button"
      active={active}
      alwaysShowLabel={active}
      icon={icon}
      label={<span className="text-sm whitespace-nowrap">{label}</span>}
      onClick={() => onSelect(navKey)}
      aria-current={active ? "page" : undefined}
      title={label}
    />
  );
}
```

- [ ] **Step 3: 创建 `NavRail.tsx`**

写入 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/components/shell/NavRail.tsx`：

```tsx
import { useNavigate } from "react-router-dom";
import { NAV_ITEMS, type NavKey } from "@tps/shared";
import { HomeIcon, LayoutIcon, ArchiveIcon, LayersIcon } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import NavCapsule from "./NavCapsule";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  HomeIcon,
  LayoutIcon,
  ArchiveIcon,
  LayersIcon,
};

const ROUTE_BY_KEY: Record<NavKey, string> = {
  home: "/app/home",
  workspace: "/app/workspace",
  assets: "/app/assets",
  templates: "/app/templates",
};

export default function NavRail() {
  const activeNavKey = useUIStore((s) => s.activeNavKey);
  const setActiveNav = useUIStore((s) => s.setActiveNav);
  const navigate = useNavigate();

  return (
    <nav className="flex items-center gap-1.5" aria-label="主导航">
      {NAV_ITEMS.map((item) => {
        const Icon = ICONS[item.icon] ?? LayersIcon;
        return (
          <NavCapsule
            key={item.key}
            navKey={item.key}
            label={item.label}
            icon={<Icon className="w-4 h-4" aria-hidden />}
            active={activeNavKey === item.key}
            onSelect={(k) => {
              setActiveNav(k);
              navigate(ROUTE_BY_KEY[k]);
            }}
          />
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: 创建 `UserMenu.tsx`**

写入 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/components/shell/UserMenu.tsx`：

```tsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capsule } from "@tps/ui";
import { User as UserIcon, Settings, LogOut } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export default function UserMenu() {
  const username = useAuthStore((s) => s.username);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="relative" ref={menuRef}>
      <Capsule
        as="button"
        onClick={() => setOpen((v) => !v)}
        icon={
          <span className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
            <UserIcon className="w-3.5 h-3.5" aria-hidden />
          </span>
        }
        label={
          <span className="text-sm text-foreground whitespace-nowrap max-w-[120px] overflow-hidden text-ellipsis">
            {username || "未登录"}
          </span>
        }
        alwaysShowLabel
        aria-haspopup="menu"
        aria-expanded={open}
      />
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[160px] py-1 rounded-md border border-border bg-card text-card-foreground shadow-md"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              // 设置页路由未启用，先静默关闭
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Settings className="w-3.5 h-3.5" aria-hidden />
            设置
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden />
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
```

**注意：** `useAuthStore` 是否有 `username` 字段需确认。读 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/stores/authStore.ts`。若字段叫 `user` / `displayName` / `email`，把上面 `s.username` 同步替换为正确字段；并把兜底 `"未登录"` 改成更合适的文案。

- [ ] **Step 5: 读 authStore 确认 username 字段**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
cat apps/desktop/src/stores/authStore.ts
```

按实际字段名修改 `UserMenu.tsx`。

- [ ] **Step 6: 验证类型**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
pnpm --filter @tps/desktop exec tsc -b --noEmit
```

预期：仅旧的 LeftSidebar / CenterCanvas / RightChatPanel NavKey 错误；本任务新组件无错。

- [ ] **Step 7: Commit**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
git add apps/desktop/src/components/shell/Logo.tsx apps/desktop/src/components/shell/NavCapsule.tsx apps/desktop/src/components/shell/NavRail.tsx apps/desktop/src/components/shell/UserMenu.tsx
git commit -m "✨ feat(shell): Header 子组件 — Logo / NavCapsule / NavRail / UserMenu"
```

---

## Task 7: DashboardHome 子组件（Hero / AiPrompt / Project 行）

**Files:**
- Create: `apps/desktop/src/components/shell/HeroHeadline.tsx`
- Create: `apps/desktop/src/components/shell/AiPromptCapsule.tsx`
- Create: `apps/desktop/src/components/shell/NewProjectCapsule.tsx`
- Create: `apps/desktop/src/components/shell/ProjectCapsule.tsx`
- Create: `apps/desktop/src/components/shell/ProjectRail.tsx`
- Create: `apps/desktop/src/components/shell/DashboardHome.tsx`

**Interfaces:**
- `HeroHeadline` 无 props
- `AiPromptCapsule` 无 props，从 `useUIStore` 读写 `promptValue`
- `NewProjectCapsule` 接收 `onClick: () => void`
- `ProjectCapsule` 接收 `project: Project` + `onOpen: (id: string) => void`
- `ProjectRail` 接收 `projects: Project[]` + `onOpen: (id: string) => void` + `onNew: () => void`

- [ ] **Step 1: 创建 `HeroHeadline.tsx`**

写入 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/components/shell/HeroHeadline.tsx`：

```tsx
export default function HeroHeadline() {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
        今天要做什么？
      </h1>
      <p className="text-sm text-muted-foreground max-w-md">
        告诉 AI 你想达成的目标，或从最近的项目继续。
      </p>
    </div>
  );
}
```

- [ ] **Step 2: 创建 `AiPromptCapsule.tsx`**

写入 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/components/shell/AiPromptCapsule.tsx`：

```tsx
import { useRef, type KeyboardEvent } from "react";
import { Capsule } from "@tps/ui";
import { Sparkles, ArrowRight } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";

export default function AiPromptCapsule() {
  const value = useUIStore((s) => s.promptValue);
  const setValue = useUIStore((s) => s.setPromptValue);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    // 本轮占位：仅打印到 console，未来接 @tps/ai-core
    // eslint-disable-next-line no-console
    console.log("[AiPrompt] submit:", v);
    setValue("");
    inputRef.current?.blur();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <Capsule
      as="div"
      className="w-full max-w-2xl h-12 px-4 gap-3"
      icon={<Sparkles className="w-4 h-4 text-primary" aria-hidden />}
      focusGlow
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="问点什么吧…  Enter 发送"
        aria-label="AI 提示词输入"
        className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!value.trim()}
        aria-label="发送"
        title="发送 (Enter)"
        className="w-7 h-7 rounded-full flex items-center justify-center bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
      >
        <ArrowRight className="w-3.5 h-3.5" aria-hidden />
      </button>
    </Capsule>
  );
}
```

- [ ] **Step 3: 创建 `NewProjectCapsule.tsx`**

写入 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/components/shell/NewProjectCapsule.tsx`：

```tsx
import { Capsule } from "@tps/ui";
import { Plus } from "lucide-react";

interface NewProjectCapsuleProps {
  onClick: () => void;
}

export default function NewProjectCapsule({ onClick }: NewProjectCapsuleProps) {
  return (
    <Capsule
      as="button"
      dashed
      onClick={onClick}
      icon={<Plus className="w-4 h-4 text-primary" aria-hidden />}
      alwaysShowLabel
      label={<span className="text-sm whitespace-nowrap text-foreground">新建项目</span>}
      title="新建项目"
    />
  );
}
```

- [ ] **Step 4: 创建 `ProjectCapsule.tsx`**

写入 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/components/shell/ProjectCapsule.tsx`：

```tsx
import { Capsule } from "@tps/ui";
import { FolderOpen } from "lucide-react";
import type { Project } from "@/data/mockProjects";

interface ProjectCapsuleProps {
  project: Project;
  onOpen: (id: string) => void;
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return "刚刚";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} 分钟前`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} 小时前`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)} 天前`;
  if (diffSec < 86400 * 30) return `${Math.floor(diffSec / 86400 / 7)} 周前`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function ProjectCapsule({ project, onOpen }: ProjectCapsuleProps) {
  const bg = `hsl(${project.thumbnailHue} 70% 35%)`;
  return (
    <Capsule
      as="button"
      onClick={() => onOpen(project.id)}
      alwaysShowLabel
      label={
        <span className="flex flex-col items-start leading-tight max-w-[200px]">
          <span className="text-sm text-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
            {project.name}
          </span>
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            {relativeTime(project.openedAt)}
          </span>
        </span>
      }
      icon={
        <span
          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: bg }}
          aria-hidden
        >
          <FolderOpen className="w-3.5 h-3.5 text-white/80" />
        </span>
      }
      title={project.name}
    />
  );
}
```

- [ ] **Step 5: 创建 `ProjectRail.tsx`**

写入 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/components/shell/ProjectRail.tsx`：

```tsx
import { MOCK_PROJECTS, type Project } from "@/data/mockProjects";
import NewProjectCapsule from "./NewProjectCapsule";
import ProjectCapsule from "./ProjectCapsule";

interface ProjectRailProps {
  projects?: Project[];
  onOpen: (id: string) => void;
  onNew: () => void;
}

export default function ProjectRail({ projects, onOpen, onNew }: ProjectRailProps) {
  const list = projects ?? MOCK_PROJECTS;
  const isEmpty = list.length === 0;

  return (
    <div className="w-full max-w-5xl">
      {isEmpty ? (
        <div className="flex items-center justify-center py-8">
          <div className="capsule cursor-default" data-always-show-label="true">
            <span className="capsule__label text-sm text-muted-foreground">
              暂无历史项目，去新建一个 →
            </span>
          </div>
        </div>
      ) : (
        <div
          className="relative overflow-x-auto overflow-y-hidden -mx-3 px-3 py-2"
          style={{ scrollbarWidth: "thin" }}
        >
          {/* Left fade mask */}
          <div
            aria-hidden
            className="sticky left-0 top-0 bottom-0 w-8 -ml-3 pointer-events-none"
            style={{
              background: "linear-gradient(to right, hsl(var(--background)) 0%, transparent 100%)",
            }}
          />
          <div className="flex items-center gap-2 min-w-min">
            <NewProjectCapsule onClick={onNew} />
            {list.map((p) => (
              <ProjectCapsule key={p.id} project={p} onOpen={onOpen} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: 创建 `DashboardHome.tsx`**

写入 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/components/shell/DashboardHome.tsx`：

```tsx
import { useNavigate } from "react-router-dom";
import { useUIStore } from "@/stores/uiStore";
import HeroHeadline from "./HeroHeadline";
import AiPromptCapsule from "./AiPromptCapsule";
import ProjectRail from "./ProjectRail";

export default function DashboardHome() {
  const setActiveNav = useUIStore((s) => s.setActiveNav);
  const navigate = useNavigate();

  const handleOpen = (id: string) => {
    setActiveNav("workspace");
    navigate(`/app/workspace/${id}`);
  };

  const handleNew = () => {
    setActiveNav("workspace");
    navigate("/app/workspace/new");
  };

  return (
    <main className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center gap-12 px-6 py-12 overflow-y-auto">
      <HeroHeadline />
      <AiPromptCapsule />
      <ProjectRail onOpen={handleOpen} onNew={handleNew} />
    </main>
  );
}
```

- [ ] **Step 7: 验证类型**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
pnpm --filter @tps/desktop exec tsc -b --noEmit
```

预期：本任务所有新组件无错；旧三栏仍报 NavKey 错。

- [ ] **Step 8: Commit**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
git add apps/desktop/src/components/shell/HeroHeadline.tsx apps/desktop/src/components/shell/AiPromptCapsule.tsx apps/desktop/src/components/shell/NewProjectCapsule.tsx apps/desktop/src/components/shell/ProjectCapsule.tsx apps/desktop/src/components/shell/ProjectRail.tsx apps/desktop/src/components/shell/DashboardHome.tsx
git commit -m "✨ feat(shell): DashboardHome 子组件 — Hero / AI 输入 / 项目胶囊行"
```

---

## Task 8: Header 装配 + ComingSoon 占位页 + barrel export

**Files:**
- Create: `apps/desktop/src/components/shell/Header.tsx`
- Create: `apps/desktop/src/components/shell/ComingSoon.tsx`
- Create: `apps/desktop/src/components/shell/index.ts`

- [ ] **Step 1: 创建 `Header.tsx`**

写入 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/components/shell/Header.tsx`：

```tsx
import { useNavigate } from "react-router-dom";
import { useUIStore } from "@/stores/uiStore";
import Logo from "./Logo";
import NavRail from "./NavRail";
import UserMenu from "./UserMenu";

export default function Header() {
  const setActiveNav = useUIStore((s) => s.setActiveNav);
  const navigate = useNavigate();

  return (
    <header className="relative z-20 h-16 flex-shrink-0 w-full flex items-center justify-between gap-4 px-6">
      <Logo onClick={() => {
        setActiveNav("home");
        navigate("/app/home");
      }} />
      <div className="flex-1 flex justify-center">
        <NavRail />
      </div>
      <UserMenu />
    </header>
  );
}
```

- [ ] **Step 2: 创建 `ComingSoon.tsx`**

写入 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/components/shell/ComingSoon.tsx`：

```tsx
interface ComingSoonProps {
  title: string;
}

export default function ComingSoon({ title }: ComingSoonProps) {
  return (
    <main className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center gap-3 px-6">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground">该模块即将上线</p>
    </main>
  );
}
```

- [ ] **Step 3: 创建 barrel `index.ts`**

写入 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/components/shell/index.ts`：

```ts
export { default as Backdrop } from "./Backdrop";
export { default as Logo } from "./Logo";
export { default as NavCapsule } from "./NavCapsule";
export { default as NavRail } from "./NavRail";
export { default as UserMenu } from "./UserMenu";
export { default as Header } from "./Header";
export { default as HeroHeadline } from "./HeroHeadline";
export { default as AiPromptCapsule } from "./AiPromptCapsule";
export { default as NewProjectCapsule } from "./NewProjectCapsule";
export { default as ProjectCapsule } from "./ProjectCapsule";
export { default as ProjectRail } from "./ProjectRail";
export { default as DashboardHome } from "./DashboardHome";
export { default as ComingSoon } from "./ComingSoon";
```

- [ ] **Step 4: 验证类型**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
pnpm --filter @tps/desktop exec tsc -b --noEmit
```

预期：仍仅旧三栏报错。

- [ ] **Step 5: Commit**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
git add apps/desktop/src/components/shell/Header.tsx apps/desktop/src/components/shell/ComingSoon.tsx apps/desktop/src/components/shell/index.ts
git commit -m "✨ feat(shell): Header 装配 + ComingSoon 占位 + barrel export"
```

---

## Task 9: 替换 AppShell 内容

**Files:**
- Modify: `apps/desktop/src/pages/AppShell.tsx`

**Interfaces:**
- AppShell 整体装配：`Backdrop` + `Header` + `<Outlet />`（Outlet 留给 router 注入 DashboardHome 或 ComingSoon）

- [ ] **Step 1: 完整重写 `AppShell.tsx`**

完整重写 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/pages/AppShell.tsx`：

```tsx
import { Outlet } from "react-router-dom";
import { Backdrop, Header } from "@/components/shell";

export default function AppShell() {
  return (
    <div className="relative flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <Backdrop />
      <Header />
      <Outlet />
    </div>
  );
}
```

- [ ] **Step 2: 验证类型**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
pnpm --filter @tps/desktop exec tsc -b --noEmit
```

预期：旧三栏仍报 NavKey 错（`AppShell` 已不再 import 它们，但 App.tsx 顶层可能仍 import——见 Task 10）。其它无误。

- [ ] **Step 3: Commit**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
git add apps/desktop/src/pages/AppShell.tsx
git commit -m "✨ refactor(shell): AppShell 替换为 Backdrop + Header + Outlet"
```

---

## Task 10: Router 扩展 + 清理旧三栏引用

**Files:**
- Modify: `apps/desktop/src/router/index.tsx`
- Modify: `apps/desktop/src/App.tsx`（检查是否 import 旧三栏）
- Delete: `apps/desktop/src/pages/app/LeftSidebar.tsx`（若 App.tsx 不再 import）
- Delete: `apps/desktop/src/pages/app/CenterCanvas.tsx`
- Delete: `apps/desktop/src/pages/app/RightChatPanel.tsx`
- Delete: `apps/desktop/src/pages/app/`（若空）

- [ ] **Step 1: 检查 App.tsx 当前 import**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
cat apps/desktop/src/App.tsx
```

确认 `App.tsx` 是否 import `LeftSidebar` / `CenterCanvas` / `RightChatPanel` 任意一个。

- [ ] **Step 2: 重写 `router/index.tsx`**

完整重写 `/Users/jhowe/Documents/code/company/dongguan-trans/tps/apps/desktop/src/router/index.tsx`：

```tsx
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import Login from "@/pages/Login";
import AppShell from "@/pages/AppShell";
import { DashboardHome, ComingSoon } from "@/components/shell";

/** 路由守卫：未登录跳 /login */
export function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children ? <>{children}</> : <Outlet />;
}

/** 根路径重定向：已登录进 /app/home，未登录进 /login */
function RootRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return <Navigate to={isAuthenticated ? "/app/home" : "/login"} replace />;
}

function PlaceholderPage({ title }: { title: string }) {
  return <ComingSoon title={title} />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<DashboardHome />} />
          <Route path="workspace" element={<PlaceholderPage title="工作空间" />} />
          <Route path="workspace/new" element={<PlaceholderPage title="新建项目" />} />
          <Route path="workspace/:id" element={<PlaceholderPage title="项目" />} />
          <Route path="assets" element={<PlaceholderPage title="资产" />} />
          <Route path="templates" element={<PlaceholderPage title="模板" />} />
        </Route>
      </Route>
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 3: 清理旧三栏文件（仅当 App.tsx 不再 import 时）**

执行 `cat apps/desktop/src/App.tsx`（已在 Step 1 读过）后：

- 若 `App.tsx` 包含 `import LeftSidebar` / `import CenterCanvas` / `import RightChatPanel`：把这些 import 行删除后再走 Step 4。
- 若没有：直接删除文件：

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
git rm apps/desktop/src/pages/app/LeftSidebar.tsx apps/desktop/src/pages/app/CenterCanvas.tsx apps/desktop/src/pages/app/RightChatPanel.tsx
rmdir apps/desktop/src/pages/app 2>/dev/null || true
```

- [ ] **Step 4: 验证类型**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
pnpm --filter @tps/desktop exec tsc -b --noEmit
```

预期：**全部通过，无 TS 错误**。若有，按报错定位修复。

- [ ] **Step 5: Commit**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
git add apps/desktop/src/router/index.tsx apps/desktop/src/App.tsx apps/desktop/src/pages/app/ 2>/dev/null || true
git commit -m "🔧 refactor(router): 新增 dashboard/workspace/assets/templates 路由 + 清理旧三栏"
```

---

## Task 11: 视觉与交互手动验收

**Files:**
- 启动 dev server（不修改文件）

- [ ] **Step 1: 启动 dev server**

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
pnpm --filter @tps/desktop dev
```

或：

```bash
cd /Users/jhowe/Documents/code/company/dongguan-trans/tps
pnpm --filter @tps/desktop tauri:dev
```

预期：浏览器/窗口打开至 `http://localhost:1420`（或登录页）。先在 Login 页登录（用之前 test 用的账号），登录后跳到 `/app/home`。

- [ ] **Step 2: 逐项验收**

| 项 | 预期 | 实际 |
|---|---|---|
| 背景 | 看到点阵网格 + 蓝色 GSAP 流光持续动画 | |
| Header 左胶囊 hover | "交通规划 AI 工作流系统" 滑出显示 | |
| Header 中间 4 胶囊 hover | 单胶囊从 icon-only 展开到 icon+label，宽度变化 | |
| Header 中间激活态 | 激活的胶囊背景蓝色 + 外发光 + label 始终显 | |
| 点击 "主页" | URL 变 `/app/home` | |
| 点击 "工作空间" | URL 变 `/app/workspace`，页面显示 "工作空间" ComingSoon 占位 | |
| 点击 "资产" | URL 变 `/app/assets`，占位 | |
| 点击 "模板" | URL 变 `/app/templates`，占位 | |
| 回到 "主页" | URL 变 `/app/home`，DashboardHome 重新渲染 | |
| Hero 文案 | "今天要做什么？" + 副标题 | |
| AI 输入 | 输入文字后 focus 出现蓝色外发光；按 Enter 提交，浏览器 console 看到 `[AiPrompt] submit: ...` | |
| 项目胶囊行 | 看到 1 个"新建项目"胶囊（虚线边）+ 6 个项目胶囊（带缩略色块 + 名称 + 相对时间） | |
| hover 项目胶囊 | 蓝色外发光 | |
| 点击 "新建项目" | URL 变 `/app/workspace/new`，占位 | |
| 点击任一历史项目 | URL 变 `/app/workspace/:id`，占位 | |
| Header 右用户胶囊 | hover 展开用户名 + 下拉箭头 | |
| 点击用户胶囊 | 弹出下拉（设置 / 退出登录） | |
| 点击 "退出登录" | 跳回 `/login` | |
| 拖窗口到 < 640px | 4 个导航胶囊 hover 不再展开 label | |
| 系统设置"减少动效" | 背景流光停止，仅静态点阵 | |

每项实际结果填入表格。若有未达预期项，**回到对应 Task 修复**，不进入 Task 12。

- [ ] **Step 3: 视觉截图（可选）**

用浏览器 devtools 模拟 1440×900 和 1280×720 各截图一张，存到 `/tmp/app-shell-1440.png` / `/tmp/app-shell-1280.png`，肉眼对比设计意图（胶囊圆角、间距、字体粗细、颜色对比度）。

- [ ] **Step 4: 验收完成确认**

确认所有 19 项无未达预期。无需 commit（视觉验收不出代码改动）。

---

## Self-Review（作者自审，已完成）

- **Spec 覆盖**：spec 中 12 节每一条都映射到至少一个 Task。
  - 段 1 目标 → Task 9-10
  - 段 2 信息架构 → Task 7 (HeroHeadline + AiPrompt + ProjectRail) + Task 8 (Header)
  - 段 3 组件拆解 → Task 1, 5, 6, 7, 8
  - 段 4 token → Task 1
  - 段 5 交互 → Task 6 (hover 展开 + 激活态) + Task 7 (AI focus glow + 项目 hover) + Task 6 (UserMenu 下拉)
  - 段 6 数据与状态 → Task 3 (store) + Task 4 (mock) + Task 6 (NavRail 路由映射) + Task 7 (DashboardHome 路由映射)
  - 段 7 错误/边界 → Task 5 (reduced-motion) + Task 7 (空状态) + Task 10 (* 路由兜底)
  - 段 8 背景层 → Task 5
  - 段 9 测试/验收 → Task 11
  - 段 10 实施切片顺序 → 与本计划 Task 1-11 一致
  - 段 11 非目标 → 全部未实施
  - 段 12 风险 → 风险 1-4 均有缓解：Task 5 复用 Login；Task 10 单文件调整；Task 10 删孤儿文件；Task 3 保留旧字段
- **占位符扫描**：无 TBD / TODO / "implement later"。"GridBackdrop" / "PlainBackdrop" 已实现非占位。"未来设置页换肤"已通过 `useUIStore.backdropVariant` 字段预留（spec 已承认）。
- **类型一致性**：`NavKey` 在 Task 2 定义、在 Task 6 NavRail / Task 7 DashboardHome 使用，键集合 `home/workspace/assets/templates` 全程一致。`useUIStore.setActiveNav` 入参 `NavKey` 与 spec 一致。`MOCK_PROJECTS` 接口 `Project` 在 Task 4 定义，在 Task 7 使用一致。
- **路径精确性**：所有 Create/Modify 路径均经核对存在。
