---
title: TPS UI Design Token Specification
version: alpha
status: draft
date: 2026-06-27
scope: tokens-only (no component patterns, no full page instances)
audience: developers writing UI pages and components
modes: dark-only
language: zh-CN
---

# TPS UI Design Token Specification

> 交通规划 AI 工作流系统（Tauri 2 + React + UnoCSS）UI 设计令牌清单。
> 视觉风格：ComfyUI / VSCode Dark 调性（slate-blue canvas + 蓝主色 + 工具感），在现有 shadcn 风格变量基础上加深精致度。
> 参考来源：`design.md`（Framer 营销站设计分析） + 项目现状（`_shadcn.scss` / `uno.config.ts` / `@tps/ui` 现有组件）。

## 0. 适用范围与不适用范围

**适用**
- 新页面 / 新组件的颜色、字号、间距、圆角、阴影、动效、层级取值
- 现有组件的 token 化收敛（如 `ProjectCapsule` 的内联色改为 utility 类）
- `_shadcn.scss` 的扩展、`uno.config.ts` 的 `theme` 字段扩展

**不适用**
- 工作流节点色 / 边色（属于 `workflow-ui` 包，单独规范）
- OpenLayers 地图样式（走 ol 自带样式）
- 数据驱动的色块（如项目 thumbnailHue）
- 渐变装饰色（已在 brainstorming 阶段明确不引入）
- 亮色模式（dark-only）

## 1. 色板令牌（Color Tokens）

存储约定：HSL 三元组（无 `hsl()` 包裹），与 `_shadcn.scss` 一致；使用处通过 `hsl(var(--token))` 引用并支持 `hsl(var(--token) / <alpha>)`。

### 1.1 Surface（表面层）

| Token | HSL | 用途 | 来源 / 映射 |
|---|---|---|---|
| `--canvas` | `222 47% 6%` | 页面最底层（body、空状态、hero） | = `--background` |
| `--surface-1` | `220 39% 11%` | 卡片、面板、模态底 | = `--card` / `--popover` |
| `--surface-2` | `220 26% 14%` | 卡片 hover、选中态、激活胶囊 | = `--secondary` / `--accent` |
| `--surface-overlay` | `220 39% 11% / 0.85` | dropdown / tooltip 底（带 backdrop-blur） | 新增 |

### 1.2 Text（文字）

| Token | HSL | 用途 | 来源 / 映射 |
|---|---|---|---|
| `--ink` | `210 20% 92%` | 标题、强调正文 | = `--foreground` |
| `--ink-muted` | `218 11% 65%` | 次要文本、placeholder、meta | = `--muted-foreground` |
| `--ink-disabled` | `218 11% 40%` | 禁用文字 | 新增 |

### 1.3 Border（边框 / hairline）

| Token | HSL | 用途 | 来源 / 映射 |
|---|---|---|---|
| `--border` | `220 26% 17%` | 默认 1px 分隔线 | 保持 |
| `--border-strong` | `220 26% 24%` | 表头底、强调分隔 | 新增 |
| `--border-soft` | `220 26% 13%` | 次级分隔、表格 cell 内分割 | 新增 |

### 1.4 Brand（主品牌色）

| Token | HSL | 用途 | 来源 / 映射 |
|---|---|---|---|
| `--primary` | `217 91% 60%` | 主操作、链接、焦点环 | 保持 |
| `--primary-hover` | `217 91% 67%` | 主操作 hover（+7% 亮度） | 新增 |
| `--primary-press` | `217 91% 54%` | 主操作按下（-6% 亮度） | 新增 |
| `--primary-fg` | `222 47% 6%` | 主操作上的文字 | = `--primary-foreground` |

### 1.5 Semantic（语义色）

| Token | HSL | 用途 | 来源 / 映射 |
|---|---|---|---|
| `--success` | `142 71% 45%` | 成功、完成态 | 新增 |
| `--success-fg` | `222 47% 6%` | success 文字 | 新增 |
| `--warning` | `38 92% 50%` | 警告 | 新增 |
| `--warning-fg` | `222 47% 6%` | warning 文字 | 新增 |
| `--info` | `199 89% 60%` | 信息提示 | 新增 |
| `--info-fg` | `222 47% 6%` | info 文字 | 新增 |
| `--destructive` | `0 84% 60%` | 危险 / 删除 | = 保持 |
| `--destructive-fg` | `210 20% 92%` | destructive 文字 | = `--destructive-foreground` |

### 1.6 Focus / Ring

| Token | HSL | 用途 |
|---|---|---|
| `--ring` | `217 91% 60%` | 焦点环 base |

### 1.7 Capsule（胶囊专用）

胶囊样式走 `.capsule` 类而非 utility class，但 token 仍统一管理：

| Token | 值 | 用途 |
|---|---|---|
| `--capsule-bg` | `220 30% 12% / 0.7` | 默认底 |
| `--capsule-bg-hover` | `220 30% 16% / 0.85` | hover 底 |
| `--capsule-border` | `220 30% 18%` | 默认边框 |
| `--capsule-border-active` | `217 91% 60%` | 激活边框 |
| `--capsule-glow` | `217 91% 60% / 0.18` | 外发光 |
| `--capsule-radius` | `9999px` | 胶囊圆角 |

## 2. 字号与排版（Typography Tokens）

### 2.1 Font Family

| Token | 值 | 用途 |
|---|---|---|
| `--font-sans` | `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif` | 默认 UI |
| `--font-mono` | `'JetBrains Mono', 'Fira Code', Menlo, Consolas, monospace` | 代码、坐标、ID |

### 2.2 Type Scale

| Token | Size / Weight / LH / Tracking | 用途 |
|---|---|---|
| `--text-display-lg` | `40px / 600 / 1.10 / -0.025em` | Dashboard hero |
| `--text-display-md` | `32px / 600 / 1.15 / -0.02em` | 模态标题、空状态标题 |
| `--text-h1` | `24px / 600 / 1.25 / -0.01em` | 页面主标题 |
| `--text-h2` | `20px / 600 / 1.30 / -0.01em` | 区段标题 |
| `--text-h3` | `16px / 600 / 1.40 / -0.005em` | 卡片标题 |
| `--text-body-lg` | `16px / 400 / 1.55 / 0` | 重要正文 |
| `--text-body` | `14px / 400 / 1.55 / 0` | 默认正文 |
| `--text-body-sm` | `13px / 400 / 1.55 / 0` | 次要正文 |
| `--text-caption` | `12px / 500 / 1.40 / 0.005em` | label、tag |
| `--text-micro` | `11px / 500 / 1.30 / 0.01em` | 时间戳、meta |
| `--text-button` | `14px / 500 / 1.00 / 0` | 按钮文字 |
| `--text-link` | `14px / 500 / 1.40 / 0` | 链接（默认 hover 下划线） |

### 2.3 Numeric（数字专用）

| Token | 取值 | 用途 |
|---|---|---|
| `--text-tabular` | inherits font + `font-variant-numeric: tabular-nums` | 表格数字、坐标、时间 |

## 3. 间距（Spacing Tokens）

### 3.1 Base Scale（4px 基数）

| Token | 值 | 用途 |
|---|---|---|
| `--space-0` | `0` | 清零 |
| `--space-hair` | `1px` | hairline 配合 |
| `--space-px` | `2px` | 内联微调 |
| `--space-1` | `4px` | icon-only 内 padding |
| `--space-2` | `8px` | 行内紧贴、tag padding |
| `--space-3` | `12px` | 控件垂直 padding、表单 field gap |
| `--space-4` | `16px` | 卡片内 padding、区段内子项间距 |
| `--space-5` | `24px` | 区段内大间距、panel body padding |
| `--space-6` | `32px` | 区段间距 |
| `--space-7` | `48px` | 页面顶部留白、模态内 padding |
| `--space-8` | `64px` | 大区段分隔 |
| `--space-section` | `96px` | 跨页面 hero 垂直留白（极少用） |

### 3.2 Container（容器宽度）

| Token | 值 | 用途 |
|---|---|---|
| `--container-sm` | `640px` | 紧凑表单 |
| `--container-md` | `768px` | 设置页 |
| `--container-lg` | `1024px` | 工作流编辑器 |
| `--container-xl` | `1280px` | 宽屏 dashboard |

### 3.3 Layout（布局尺寸）

| Token | 值 | 用途 |
|---|---|---|
| `--header-height` | `44px` | 顶栏 |
| `--nav-rail-width` | `56px` | 折叠侧栏 |
| `--nav-rail-width-expanded` | `220px` | 展开侧栏 |
| `--chat-panel-width` | `320px` | AI chat 面板 |

## 4. 圆角（Radius Tokens）

| Token | 值 | 用途 |
|---|---|---|
| `--radius-none` | `0` | 表格单元格、明确无圆角 |
| `--radius-xs` | `2px` | tag / badge |
| `--radius-sm` | `4px` | 小 chip、check 框、缩略图 |
| `--radius-md` | `6px` | 默认 input、button（对齐 UnoCSS `--radius`） |
| `--radius-lg` | `10px` | 卡片、modal、Panel |
| `--radius-xl` | `14px` | 大型 surface |
| `--radius-2xl` | `20px` | 顶层 surface、画布容器（极少用） |
| `--radius-pill` | `9999px` | capsule、pill 按钮、tag |
| `--radius-full` | `9999px` | 头像、圆形 icon button |

## 5. 阴影与层级（Elevation Tokens）

### 5.1 Shadow（阴影阶）

| Token | 值 | 用途 |
|---|---|---|
| `--elevation-0` | `none` | canvas-mounted 内容 |
| `--elevation-1` | `0 1px 2px hsl(220 47% 2% / 0.4)` | 默认卡片 |
| `--elevation-2` | `0 1px 2px hsl(220 47% 2% / 0.4), 0 4px 12px hsl(220 47% 2% / 0.5)` | hover、tooltip、dropdown |
| `--elevation-3` | `0 1px 2px hsl(220 47% 2% / 0.4), 0 8px 24px hsl(220 47% 2% / 0.6)` | modal、drawer |
| `--elevation-focus` | `0 0 0 2px hsl(217 91% 60% / 0.6)` | 焦点环 |
| `--glow-primary` | `0 0 12px hsl(217 91% 60% / 0.25)` | capsule 激活外发光 |
| `--glow-success` | `0 0 12px hsl(142 71% 45% / 0.22)` | success 态发光 |
| `--glow-destructive` | `0 0 12px hsl(0 84% 60% / 0.22)` | destructive 态发光 |

### 5.2 Hairline（边框，与 shadow 解耦）

| Token | 值 | 用途 |
|---|---|---|
| `--hairline` | `1px solid hsl(var(--border))` | 通用 1px |
| `--hairline-strong` | `1px solid hsl(var(--border-strong))` | 表头底、强调 |
| `--hairline-soft` | `1px solid hsl(var(--border-soft))` | 次级、cell 内 |

## 6. 动效（Motion Tokens）

### 6.1 Duration（时长）

| Token | 值 | 用途 |
|---|---|---|
| `--duration-instant` | `60ms` | 颜色 / opacity 微切换（pressed） |
| `--duration-fast` | `120ms` | hover、focus ring、icon 微动 |
| `--duration-base` | `200ms` | 默认过渡、按钮 / 输入框 |
| `--duration-slow` | `280ms` | 模态进出、抽屉、tooltip |
| `--duration-slower` | `400ms` | 大型面板展开 / 折叠 |

### 6.2 Easing（曲线）

| Token | 值 | 用途 |
|---|---|---|
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | 默认（snappy 收尾） |
| `--ease-emphasized` | `cubic-bezier(0.3, 0, 0, 1)` | 模态 / drawer |
| `--ease-decelerate` | `cubic-bezier(0, 0, 0, 1)` | 元素进入 |
| `--ease-accelerate` | `cubic-bezier(0.3, 0, 1, 1)` | 元素离开 |

### 6.3 Reduced Motion 兜底

写入 `globals.scss`：

```scss
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## 7. 层级与遮罩（Z-index & Overlay Tokens）

### 7.1 Z-index

| Token | 值 | 用途 |
|---|---|---|
| `--z-base` | `0` | 默认 |
| `--z-canvas` | `1` | 工作流画布、地图画布 |
| `--z-sticky` | `10` | 顶栏、侧栏 sticky |
| `--z-floating` | `20` | dropdown、popover、tooltip、chat panel |
| `--z-overlay` | `40` | 模态遮罩 backdrop |
| `--z-modal` | `50` | 模态内容 |
| `--z-toast` | `60` | 全局 toast |
| `--z-tooltip` | `70` | tooltip 顶层 |

### 7.2 Backdrop

| Token | 值 | 用途 |
|---|---|---|
| `--backdrop-modal` | `hsl(222 47% 2% / 0.6)` | 模态背后 |
| `--backdrop-drawer` | `hsl(222 47% 2% / 0.4)` | drawer 背后（更淡） |

## 8. 映射表（Mapping Table）

### 8.1 颜色 token → CSS 变量 / UnoCSS utility

| 文档 token | 写入 `_shadcn.scss` | UnoCSS utility |
|---|---|---|
| `--canvas` | `--background: 222 47% 6%` | `bg-canvas` / `text-canvas` |
| `--surface-1` | `--card: 220 39% 11%` / `--popover: 220 39% 11%` | `bg-card` / `bg-popover` |
| `--surface-2` | `--secondary: 220 26% 14%` / `--accent: 220 26% 14%` | `bg-secondary` / `bg-accent` |
| `--surface-overlay` | 新增 `--surface-overlay: 220 39% 11% / 0.85` | `bg-surface-overlay` |
| `--ink` | `--foreground: 210 20% 92%` | `text-foreground` |
| `--ink-muted` | `--muted-foreground: 218 11% 65%` | `text-muted-foreground` |
| `--ink-disabled` | 新增 `--ink-disabled: 218 11% 40%` | `text-ink-disabled` |
| `--border` / `--hairline` | `--border: 220 26% 17%` | `border-border` |
| `--border-strong` | 新增 `--border-strong: 220 26% 24%` | `border-border-strong` |
| `--border-soft` | 新增 `--border-soft: 220 26% 13%` | `border-border-soft` |
| `--primary` | `--primary: 217 91% 60%` | `bg-primary` / `text-primary` |
| `--primary-hover` | 新增 `--primary-hover: 217 91% 67%` | `bg-primary-hover` / `hover:bg-primary-hover` |
| `--primary-press` | 新增 `--primary-press: 217 91% 54%` | `bg-primary-press` / `active:bg-primary-press` |
| `--primary-fg` | `--primary-foreground: 222 47% 6%` | `text-primary-foreground` |
| `--success` | 新增 `--success: 142 71% 45%` | `bg-success` / `text-success` |
| `--success-fg` | 新增 `--success-fg: 222 47% 6%` | `text-success-fg` |
| `--warning` | 新增 `--warning: 38 92% 50%` | `bg-warning` / `text-warning` |
| `--warning-fg` | 新增 `--warning-fg: 222 47% 6%` | `text-warning-fg` |
| `--info` | 新增 `--info: 199 89% 60%` | `bg-info` / `text-info` |
| `--info-fg` | 新增 `--info-fg: 222 47% 6%` | `text-info-fg` |
| `--destructive` | `--destructive: 0 84% 60%` | `bg-destructive` |
| `--destructive-fg` | `--destructive-foreground: 210 20% 92%` | `text-destructive-foreground` |
| `--ring` | `--ring: 217 91% 60%` | `ring-ring` |
| `--capsule-*` | 已有，保留 | 走 `.capsule` 类，不暴露 utility |

### 8.2 字号 token → UnoCSS `theme.fontSize`

| 文档 token | UnoCSS utility | 写法 |
|---|---|---|
| `--text-display-lg` | `text-display-lg` | `40px` / 600 / 1.10 / `-0.025em` |
| `--text-display-md` | `text-display-md` | `32px` / 600 / 1.15 / `-0.02em` |
| `--text-h1` | `text-h1` | `24px` / 600 / 1.25 / `-0.01em` |
| `--text-h2` | `text-h2` | `20px` / 600 / 1.30 / `-0.01em` |
| `--text-h3` | `text-h3` | `16px` / 600 / 1.40 / `-0.005em` |
| `--text-body-lg` | `text-body-lg` | `16px` / 400 / 1.55 / 0 |
| `--text-body` | `text-body` | `14px` / 400 / 1.55 / 0 |
| `--text-body-sm` | `text-body-sm` | `13px` / 400 / 1.55 / 0 |
| `--text-caption` | `text-caption` | `12px` / 500 / 1.40 / `0.005em` |
| `--text-micro` | `text-micro` | `11px` / 500 / 1.30 / `0.01em` |
| `--text-button` | `text-button` | `14px` / 500 / 1.00 / 0 |
| `--text-link` | `text-link` | `14px` / 500 / 1.40 / 0 |

### 8.3 现有组件 prop 对照

| 组件 | prop / className | token 来源 |
|---|---|---|
| `<Button variant="default">` | `bg-primary text-primary-foreground` | `--primary` + `--primary-fg` |
| `<Button variant="secondary">` | `bg-secondary text-secondary-foreground border border-border` | `--surface-2` + `--ink` + `--hairline` |
| `<Button variant="outline">` | `border border-input bg-transparent` | `--hairline` |
| `<Button variant="ghost">` | `hover:bg-accent` | `--surface-2` (hover) |
| `<Button variant="destructive">` | `bg-destructive text-destructive-foreground` | `--destructive` + `--destructive-fg` |
| `<Button size="sm">` | `h-8 px-3 text-xs` | `--space-3` × `--space-2` × `--text-caption` |
| `<Button size="default">` | `h-9 px-4 py-2` | `--space-4` × `--space-2` |
| `<Button size="lg">` | `h-11 rounded px-8 text-base` | `--space-6` × `--text-body-lg` |
| `<Button size="icon">` | `h-9 w-9` | 正方形按钮 |
| `<Panel>` | `rounded-lg border border-border bg-card` | `--radius-lg` + `--hairline` + `--surface-1` |
| `<Card>` | `bg-card text-card-foreground` | `--surface-1` + `--ink` |
| `<Input>` | `bg-input border-input` | `--hairline` |
| `<Capsule>` | `.capsule` | `--capsule-*` 全套 |
| `<ProjectCapsule>` (apps/desktop) | 内联 `bg-[hsl(var(--capsule-bg)/0.7)]` | 应重构为 `bg-capsule-bg` utility（待实施） |

### 8.4 不在范围内的现有实现

| 项 | 原因 |
|---|---|
| `ProjectCapsule` 的 `hsl(${project.thumbnailHue} 70% 35%)` | 数据驱动的色块 |
| React Flow 节点色 / 边色 | 属 workflow-ui，单独规范 |
| OpenLayers 地图样式 | 走 ol 自带 |
| 渐变背景色 | brainstorming 阶段确认不引入 |

## 9. 使用约定（写新页面 / 组件时按此顺序选 token）

1. **背景** → 从 `--canvas / --surface-1 / --surface-2 / --surface-overlay` 选
2. **文字** → 从 `--ink / --ink-muted / --ink-disabled` 选
3. **边框** → 从 `--hairline / --hairline-strong / --hairline-soft` 选
4. **强调 / 链接** → `--primary` / `--primary-hover` / `--primary-press`
5. **状态色** → `--success / --warning / --info / --destructive` 选对应语义
6. **圆角** → tag → `--radius-sm` / chip → `--radius-md` / card → `--radius-lg` / modal → `--radius-xl` / 胶囊 → `--radius-pill`
7. **阴影** → 默认 `--elevation-1`，hover 用 `--elevation-2`，模态用 `--elevation-3`，焦点用 `--elevation-focus`
8. **动效** → 默认 `--duration-base` + `--ease-standard`，模态用 `--duration-slow` + `--ease-emphasized`
9. **层级** → 顶栏 `--z-sticky`，浮层 `--z-floating`，模态 `--z-modal`，toast `--z-toast`

## 10. 后续路线

- **v1（本次）**：仅交付 token 规范，不改代码
- **v2（实施）**：按映射表 8.1 / 8.2 改 `_shadcn.scss` 和 `uno.config.ts`
- **v3（重构）**：`ProjectCapsule` 等内联色组件收敛为 utility
- **v4（可选）**：补组件使用模式（variant 决策树 + 状态机）作为单独 spec