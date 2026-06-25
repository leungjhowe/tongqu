# AppShell 胶囊化 Dashboard 设计

> 日期: 2026-06-26
> 范围: `apps/desktop/src/pages/AppShell.tsx` 全面重写 + 配套组件、token、mock 数据
> 状态: 已通过 brainstorming 确认（方向 A：极简胶囊 + 流光）

## 1. 目标

把当前 AppShell（顶栏 + LeftSidebar + CenterCanvas + RightChatPanel 四段三栏）替换为单页 Dashboard 落地页。设计语言统一为"胶囊 + 宫格背景 + 流光"，参照 ComfyUI / tapnow 的极简美学。

不在本设计范围内：项目详情页、模板/资产库的真实内容、设置页（仅在右上用户菜单入口放占位）。

## 2. 信息架构

```
┌────────────────────────────────────────────────────────────────┐
│  [≡TP logo 胶囊]   [主页][工作空间][资产][模板]   [👤 用户胶囊] │  ← Header 64px
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│                       今天要做什么？                              │  ← Hero 标题
│                                                                  │
│              ┌────────────────────────────────────┐              │
│              │ ✦  问点什么吧…              [↵]   │              │  ← AI 输入胶囊
│              └────────────────────────────────────┘              │
│                                                                  │
│   [ + 新建项目 ]  [ 项目A  • 2h前 ]  [ 项目B  • 昨天 ]  [ ... ] → │  ← 项目胶囊行
│                                                                  │
└────────────────────────────────────────────────────────────────┘
                              ↖ 背景层（可换肤；默认 = GSAP 流光）
```

## 3. 组件拆解

所有新组件位于 `apps/desktop/src/components/shell/`：

| 组件 | 职责 |
|---|---|
| `AppShell.tsx` | 整体布局壳：背景层 + Header + Dashboard 主体（替换原 `pages/AppShell.tsx` 内容） |
| `Backdrop.tsx` | 可换肤背景层；通过 `variant` prop 切换实现；初始 `variant="flow"` |
| `Header.tsx` | 顶栏容器（64px），三段式：左 logo / 中 NavRail / 右 UserMenu |
| `Logo.tsx` | 左胶囊，logo `TP` 标记 + 短产品名（折叠态只显 logo，hover 展开产品名） |
| `NavRail.tsx` | 中间 4 个胶囊导航容器，承载 `useUIStore.activeNavKey` |
| `NavCapsule.tsx` | 单个导航胶囊：icon + 折叠 label，hover 展开 |
| `UserMenu.tsx` | 右侧用户胶囊：头像 + 用户名（折叠态只显头像），下拉含"设置/退出"占位 |
| `DashboardHome.tsx` | 主体内容容器：HeroHeadline + AiPromptCapsule + ProjectRail |
| `HeroHeadline.tsx` | "今天要做什么？"大标题 + 副标题 |
| `AiPromptCapsule.tsx` | AI 对话框胶囊：占位文本 + 发送按钮 |
| `ProjectRail.tsx` | 项目胶囊行容器：水平滚动 + 渐隐遮罩 + 左右翻页按钮 |
| `ProjectCapsule.tsx` | 单个历史项目胶囊：缩略色块 + 名称 + 相对时间 |
| `NewProjectCapsule.tsx` | "新建项目"胶囊：虚线边 + `+` 图标 |

基础原子（位于 `packages/ui/src/components/`）：

| 组件 | 职责 |
|---|---|
| `Capsule.tsx` | 通用胶囊：圆角、padding、可变宽度、可发外光；导出 `CapsuleProps` |

样式新增（`packages/ui/src/styles/_capsule.scss`）：胶囊通用类（`.capsule`、`--capsule-bg` 等 token）。

数据：`apps/desktop/src/data/mockProjects.ts` —— 导出 `MOCK_PROJECTS: Project[]`（写死 4-6 个）。

## 4. 颜色 / 质感 token

复用现有 `_shadcn.scss` 的 HSL 变量。新增 token 写入 `packages/ui/src/styles/_capsule.scss`：

```scss
:root {
  --capsule-bg: 220 30% 12%;
  --capsule-bg-hover: 220 30% 16%;
  --capsule-border: 220 30% 18%;
  --capsule-border-active: 217 91% 60%;
  --capsule-glow: 217 91% 60% / 0.18;
  --capsule-radius: 9999px;
}
```

不修改 `_shadcn.scss`、`_variables.scss` 已有内容；仅新增。

## 5. 交互细节

| 元素 | 状态 | 行为 |
|---|---|---|
| 导航胶囊 | 默认 | 宽度 88px；仅显 icon；底色 `hsl(var(--capsule-bg))`；1px 边 `hsl(var(--capsule-border))` |
| 导航胶囊 | hover | 200ms ease 展开至 132px；label 透明度 0→1；底色 `--capsule-bg-hover` |
| 导航胶囊 | active | 底色 `hsl(var(--primary) / 0.16)`；边 `hsl(var(--capsule-border-active))`；8px 外发光 `hsl(var(--capsule-glow))`；label 始终显 |
| Logo 胶囊 | 同上模式 | hover 展开"交通规划 AI"产品名 |
| 用户胶囊 | hover | 展开用户名 + 下拉箭头；点击展开下拉菜单（设置 / 退出） |
| AI 输入胶囊 | 默认 | 占位文字"问点什么吧…，按 Enter 发送"；右端发送按钮 |
| AI 输入胶囊 | focus | 整胶囊 8px 外发光 `--capsule-glow` |
| AI 输入胶囊 | 提交 | 当前为占位——打印输入到 console；未来接 `@tps/ai-core` |
| 项目胶囊 | hover | 整胶囊外发光 4px；缩略色块轻微提亮 |
| 项目胶囊 | active（按下） | 触发 `navigate('/app/workspace/:id')` |
| 新建项目胶囊 | 默认 | 虚线边 `1px dashed`；`+` 图标 + 文字"新建项目" |
| 新建项目胶囊 | hover | 边变实线 `--capsule-border-active`；外发光 |
| 新建项目胶囊 | 点击 | `navigate('/app/workspace/new')` |
| 项目胶囊行 | 溢出 | 横向滚动；左右两端渐隐遮罩 + 可选箭头按钮（首屏不显示箭头，hover 行末才显） |

所有过渡：`200ms ease`（与现有 `$transition-base` 一致）。

## 6. 数据 & 状态

### `mockProjects.ts` 类型

```ts
export interface Project {
  id: string;
  name: string;
  openedAt: string;       // ISO 字符串
  thumbnailHue: number;   // 0-360，色相；缩略色块用 HSL 生成
  status: 'active' | 'archived';
}

export const MOCK_PROJECTS: Project[] = [
  // 写死 4-6 条；openedAt 倒序
];
```

### Zustand 状态

复用 `useUIStore`，扩展：

```ts
export interface UIState {
  // 已有
  sidebarCollapsed: boolean;
  chatPanelCollapsed: boolean;
  activeNavKey: NavKey;        // 扩展取值：'home' | 'workspace' | 'assets' | 'templates'
  toggleSidebar: () => void;
  toggleChatPanel: () => void;
  setActiveNav: (key: NavKey) => void;
  // 新增（本轮）
  promptValue: string;
  setPromptValue: (v: string) => void;
  // 预留（未来设置页换肤使用，本轮不接入 UI）
  backdropVariant: 'flow' | 'grid' | 'plain';
  setBackdropVariant: (v: 'flow' | 'grid' | 'plain') => void;
}
```

注：原 `sidebarCollapsed` / `chatPanelCollapsed` / `toggleSidebar` / `toggleChatPanel` 保留以避免破坏其他模块（虽然本轮不再使用三栏）；后续可清理。

`@tps/shared` 的 `NAV_ITEMS` 同步更新为新 4 项（仅修改 `packages/shared/src/constants/index.ts` 中的 `NAV_ITEMS` 数组，键改为 `home` / `workspace` / `assets` / `templates`，label 与用户口径一致）。

### 路由

- `/app` → `Navigate` 到 `/app/home`（保持 ProtectedRoute 行为）
- `/app/home` → 渲染 `DashboardHome`
- `/app/workspace` → 占位 `<ComingSoon title="工作空间" />`（不实现）
- `/app/assets` → 占位
- `/app/templates` → 占位
- `/app/workspace/:id` → 占位（项目胶囊跳转）
- `/app/workspace/new` → 占位（新建项目胶囊跳转）
- 其它 → `<Navigate to="/app/home" replace />`

## 7. 错误 / 边界

| 情况 | 处理 |
|---|---|
| `MOCK_PROJECTS` 为空 | `ProjectRail` 显示空状态胶囊："暂无历史项目，去新建一个 →"（仍保留 `NewProjectCapsule`） |
| 路由不存在 | `<Navigate to="/app/home" replace />` |
| `prefers-reduced-motion: reduce` | `Backdrop` 跳过 GSAP 流光，仅渲染静态点阵 |
| 窗口宽度 < 640px | 横向项目胶囊行强制可滚动；Header 中间 4 个胶囊不展开 label（始终 icon-only，hover 无变化） |

## 8. 背景层

`Backdrop.tsx`：

- `variant="flow"`（默认）：复用 `Login.tsx` 的 GSAP 网格流光实现，提取为可复用 hooks 或组件
- `variant="grid"`：静态点阵网格 + 几条淡连接线（参考现有 `CenterCanvas` 的 SVG 节点背景）
- `variant="plain"`：纯 `hsl(var(--background))`，无装饰

实现：先用 `variant="flow"` 单实现；其它变体留 `TODO` 注释（不阻塞本期）。

未来设置页换肤：调用 `useUIStore` 持久化 `backdropVariant`，`Backdrop` 读取并切换。**本期只做占位接入**——不加设置页 UI，仅在 `useUIStore` 上预留 `backdropVariant` 字段。

## 9. 测试 / 验收

项目当前未引入 vitest / jest / playwright（已确认 `apps/desktop/package.json` 与根 `package.json` 无相关依赖）。本期不引入新测试框架，采用手动验收：

| 验收项 | 方式 |
|---|---|
| `NavCapsule` hover 展开 | 启动 `tauri:dev`，肉眼确认宽度变化 + label 渐显 |
| `NavCapsule` 激活态 | 肉眼确认背景色 + 外发光 + 始终显 label |
| 导航跳转 | 点击 4 个胶囊，地址栏 URL 变化到 `/app/home\|workspace\|assets\|templates` |
| 项目胶囊点击 | 跳 `/app/workspace/:id` 占位页 |
| 新建项目点击 | 跳 `/app/workspace/new` 占位页 |
| AI 输入提交 | 在控制台看到输入字符串（不接真后端） |
| 断点行为 | 拖动窗口到 < 640px，导航胶囊不展开 label |
| 降级 | 系统开启"减少动效"后，背景流光停止，仅显点阵 |
| 视觉 | 启动后截图 Header + DashboardHome（1440×900 与 1280×720 两档） |

## 10. 实施切片

按依赖顺序：

1. `packages/ui` 新增 `Capsule` + `_capsule.scss` + token
2. `@tps/shared` 更新 `NAV_ITEMS`
3. `apps/desktop` 新增 `useUIStore` 扩展 + `mockProjects.ts`
4. `apps/desktop/src/components/shell/*` 全部新组件
5. `apps/desktop/src/pages/AppShell.tsx` 内容替换
6. `apps/desktop/src/router/index.tsx` 增加新路由 + 占位页
7. 视觉验收：Playwright 截图

## 11. 非目标（明确不做）

- 模板 / 资产库 / 工作空间 / 设置 / 项目详情页的真实内容
- AI 输入的真实后端接入
- 用户头像真实来源（用一个 `lucide-react` 的 `User` 图标占位）
- 拖拽 / 键盘导航 / 焦点环动画（聚焦于视觉首版）
- 主题切换 UI（仅在 store 预留字段）

## 12. 风险

| 风险 | 缓解 |
|---|---|
| GSAP 性能影响主线程 | 复用 Login 的现有实现，已验证可接受 |
| 路由从 1 个（`/app`）变 7 个 | 集中在 `AppRouter` 单文件调整；其它模块无耦合 |
| 移除三栏后 LeftSidebar/CenterCanvas/RightChatPanel 变孤儿 | 本轮不删除文件，但 `AppShell` 不再 import；下一轮再清理 |
| `useUIStore` 字段扩展影响旧模块 | 仅添加字段，不修改既有 `toggleSidebar` / `toggleChatPanel` 行为 |
