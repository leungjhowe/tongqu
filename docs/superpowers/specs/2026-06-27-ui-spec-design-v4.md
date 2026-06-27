---
title: TPS UI Component Variant Specification (v4)
version: alpha
date: 2026-06-27
extends: 2026-06-27-ui-spec-design.md
audience: developers choosing component variants at build time
---

# TPS UI Component Variant Specification (v4)

> 在 v1-v3 设计令牌基础上，补充组件级别的 **variant 决策树**、**状态机** 和 **组合规则**。
> 每个核心组件回答三个问题：**什么时候用哪个 variant**、**状态怎么走**、**跟别的组件怎么搭**。

---

## 1. Button

### 1.1 Variant 决策树

```
你需要一个按钮？
│
├─ 主要操作（提交、保存、创建、发送）
│  └─ variant="default" / "primary"  (两者等价)
│     └─ 示例：「+ 新建项目」「发送」「登录」
│
├─ 次要操作（取消、返回、查看全部）
│  └─ variant="secondary"
│     └─ 示例：「取消」「所有项目」「浏览」
│
├─ 在面板/卡片标题栏内的操作
│  └─ variant="ghost"
│     └─ 示例：ChatPanel 的折叠按钮、Panel 的 action 图标按钮
│
├─ 边框按钮，在深色背景上强调边界
│  └─ variant="outline"
│     └─ 示例：设置面板里的次级操作
│
└─ 危险操作（删除、归档、退出）
   └─ variant="destructive" / "danger" (两者等价)
      └─ 示例：WorkspacePage 的归档按钮、UserMenu 的退出登录
```

### 1.2 尺寸决策树

```
按钮的上下文？
│
├─ 页面级主要 CTA（+ 新建项目、提交表单）
│  └─ size="lg" (h-11, px-8)
│
├─ 标准表单 / 卡片操作
│  └─ size="default" / "md" (h-9, px-4)
│
├─ 紧凑、工具栏、内联
│  └─ size="sm" (h-8, px-3)
│
└─ 仅图标（无文字标签）
   └─ size="icon" (h-9, w-9)
      └─ 示例：NodeDetailPanel 发送按钮
```

### 1.3 状态机

```
         ┌──────────┐
         │  default  │  bg-primary text-primary-foreground (default variant)
         └────┬─────┘
              │ hover
         ┌────▼─────┐
         │   hover  │  bg-primary-hover  (+7% lightness, 217 91% 67%)
         └────┬─────┘
              │ active/pressed
         ┌────▼─────┐
         │ pressed  │  bg-primary-press  (-6% lightness, 217 91% 54%)
         └────┬─────┘
              │ release
         ┌────▼─────┐
         │  default  │
         └──────────┘

disabled:  ──→  pointer-events-none + opacity-50
focus-visible: ──→  ring-2 ring-ring
```

**注意**：不同 variant 的状态颜色不同：
- `secondary`: default=`bg-secondary` → hover=`hover:bg-secondary/80`
- `ghost`: default=transparent → hover=`hover:bg-accent`
- `destructive`: default=`bg-destructive` → hover=`hover:bg-destructive/90`

### 1.4 组合规则

| 场景 | 推荐 | 不推荐 |
|---|---|---|
| Panel 标题栏内的操作按钮 | `variant="ghost" size="sm"` | `variant="default"`（太抢眼） |
| 表单旁边的取消按钮 | `variant="secondary"` | `variant="ghost"`（边界不清晰） |
| ChatPanel 发送按钮 | `variant="default" size="icon"` | `variant="default" size="default"`（太宽） |
| 危险确认对话框 | `variant="destructive"` | `variant="default"`（语义错误） |

---

## 2. Input

### 2.1 Variant 决策树

Input 只有一个基础 variant（无 variant prop），通过 props 控制状态：

```
你需要一个输入框？
│
├─ 带标签
│  └─ → label="用户名"
│     └─ 使用: 表单字段
│
├─ 带错误提示
│  └─ → error="用户名不能为空"
│     └─ 自动显示红色边框 + 错误文字
│
├─ 带帮助文字
│  └─ → hint="最多 20 个字符"
│     └─ 显示在输入框下方灰色小字
│
├─ 块级（填满容器宽度）
│  └─ → block=true (默认)
│     └─ 大多数表单场景
│
└─ 内联（不填满）
   └─ → block={false}
      └─ 搜索栏、短输入
```

### 2.2 状态机

```
         ┌──────────┐
         │  default  │  border-border/70 text-foreground
         └────┬─────┘
              │ focus
         ┌────▼──────┐
         │  focused  │  border-primary ring-2 ring-primary/60
         └────┬──────┘
              │ blur (no content)
         ┌────▼──────┐
         │  default   │
         └───────────┘

         ┌──────────┐
         │   error  │  border-destructive/70
         └────┬─────┘
              │ focus
         ┌────▼──────────┐
         │ error+focused │  border-destructive ring-destructive/30
         └───────────────┘

disabled: → opacity-50 cursor-not-allowed
filled: → (no visual change, label stays afloat if using FloatingInput pattern)
```

### 2.3 组合规则

| 场景 | 推荐 | 不推荐 |
|---|---|---|
| ChatPanel 底部输入 | `block` ➕ fontSize inherit | `block={false}`（宽度不够） |
| 表单字段 | `label="..."` ➕ `block` | 裸输入框没有 label |
| 搜索框 | `block={false}` ➕ `variant="outline"` | — |
| 密码/敏感字段 | `type="password"` | — |

---

## 3. Panel

### 3.1 Variant 决策树

Panel 只有一个基础 variant，通过 props 控制行为：

```
你需要一个面板？
│
├─ 需要可折叠内容
│  └─ → collapsible=true
│     └─ 面板标题栏显示 ▾ 折叠按钮
│
├─ 需要自定义操作按钮
│  └─ → actions={<Button ... />}
│     └─ 操作按钮显示在标题栏右侧
│
├─ 受控折叠状态
│  └─ → collapsed + onCollapsedChange
│     └─ 父组件控制面板展开/折叠
│
└─ 简单面板（纯内容容器）
   └─ 仅 children
      └─ 无标题栏，纯卡片容器
```

### 3.2 状态机

```
         ┌──────────┐
         │ expanded │  body flex-1 overflow-auto p-4
         └────┬─────┘
              │ click collapse button (or controlled)
         ┌────▼──────┐
         │ collapsed │  body h-0 overflow-hidden p-0
         └────┬──────┘
              │ click expand button (or controlled)
         ┌────▼──────┐
         │ expanded  │
         └───────────┘
```

过渡：`transition-all duration-base`（200ms）

### 3.3 组合规则

| 场景 | 推荐 | 不推荐 |
|---|---|---|
| SplitLayout 左侧面板 | `collapsible` ➕ 适当 `title` | 不可折叠（占用空间） |
| 节点详情区 | `collapsible=false` ➕ `title` | — |
| 只做容器 | `collapsible=false` + 无 title | — |

### 3.4 与 SplitLayout 配合

```
┌────────┬──────────────────┬──────────┐
│  left  │     center       │   right  │
│ Panel  │  WorkflowCanvas  │  Panel   │
│ 220px  │    flex-1        │  Chat    │
└────────┴──────────────────┴──────────┘
```

- `leftWidth` / `rightWidth` 控制侧栏宽度，默认 220 / 320
- 侧栏面板使用 `shrink-0`，不参与 flex 伸缩
- 可搭配 `collapsible` prop 手动收起

---

## 4. Card

### 4.1 Variant 决策树

```
你需要一个卡片？
│
├─ 需要 hover 高亮（可交互）
│  └─ → interactive=true
│     └─ 加 cursor-pointer + hover:border-ring
│
├─ 需要发光效果（选中态）
│  └─ → glow=true
│     └─ 加 shadow-glow-primary (0 0 12px primary/0.25)
│
├─ 调整内间距
│  └─ padding: 'none' | 'sm'(12) | 'md'(16) | 'lg'(24)
│
└─ 默认卡片
   └─ 仅 children，shadow-elevation-1
```

### 4.2 状态机

```
interactive=true 时：

         ┌──────────┐
         │  default │  border-border shadow-elevation-1
         └────┬─────┘
              │ hover
         ┌────▼─────┐
         │   hover  │  border-ring
         └──────────┘

glow=true 时：

         ┌──────────┐
         │  default │  shadow-glow-primary + hairline
         └──────────┘
```

---

## 5. NodeCard

### 5.1 Variant 决策树

```
工作流节点卡片 — type 决定左边框颜色：
│
├─ type="data"      →  border-l-primary    (蓝色)
├─ type="transform" →  border-l-ring       (紫蓝色)
└─ type="output"    →  border-l-destructive (红色)

selected 决定发光态：
├─ selected=true  →  shadow-glow-primary + border-primary
└─ selected=false →  border-border + shadow-elevation-1
```

### 5.2 状态机

```
         ┌──────────┐
         │unselected│  border-border
         └────┬─────┘
              │ click on node
         ┌────▼─────┐
         │ selected │  shadow-glow-primary + border-primary
         └────┬─────┘
              │ click elsewhere or close detail
         ┌────▼─────┐
         │unselected│
         └──────────┘
```

---

## 6. Capsule

### 6.1 Variant 决策树

Capsule 通过 props + CSS class 控制：

```
├─ 默认胶囊
│  └─ → <Capsule as="button" icon={...} label="..." />
│
├─ 激活态（当前选中的导航）
│  └─ → active={true}
│     └─ 加 bg-primary/16 border-primary shadow-glow-primary
│
├─ 虚线胶囊（"添加"操作）
│  └─ → dashed={true}
│     └─ 加 border-dashed + 透明背景
│
└─ 标签始终显示
   └─ → alwaysShowLabel={true}
      └─ 导航胶囊（NavRail）使用
```

### 6.2 状态机

```
         ┌──────────┐
         │  default │  bg-capsule-bg/0.7 border-capsule-border
         └────┬─────┘
              │ hover
         ┌────▼─────┐
         │   hover  │  bg-capsule-bg-hover/0.85 shadow-glow-primary
         └────┬─────┘
              │ active=true
         ┌────▼──────┐
         │  active  │  bg-primary/16 border-capsule-border-active
         │          │  shadow-glow-primary
         └──────────┘
```

---

## 7. ChatPanel

### 7.1 使用场景

ChatPanel 是设计好的全局聊天面板，适合 AI 对话场景。

```
需要 AI 对话界面？
│
├─ 全局聊天（工作流助手）
│  └─ → <ChatPanel title="Chat AI" subtitle="工作流编译器"
│  │       messages={...} onSend={...} />
│
└─ 内联节点聊天 → 使用 NodeDetailPanel（节点内对话）
   └─ 不是 ChatPanel 的用法
```

**规则**：一个页面最多一个 ChatPanel。节点级别的对话用 NodeDetailPanel，不要再用 ChatPanel。

### 7.2 消息类型

```typescript
ChatPanelMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  rich?: ReactNode;   // AI 消息可附带富内容预览
}
```

---

## 8. SplitLayout 使用模式

```
┌─────┬──────────┬──────┐
│ left│  center  │ right│
│aside│   main   │ aside│
│shrink│ flex-1  │shrink│
│  -0  │          │  -0  │
└─────┴──────────┴──────┘
```

| 页面 | left | center | right |
|---|---|---|---|
| `/app/workspace/:id` | 无（胶囊浮层） | WorkflowCanvas | NodeDetailPanel (360px) |
| 一般设置页 | Panel (220px) | 表单内容 | 无 |
| 数据视图 | 无 | 表格 | Panel (320px) |

---

## 9. 组件 props 速查表

| 组件 | 必填 props | 可选 props | 关键 variant |
|---|---|---|---|
| Button | — | variant, size, block, asChild | default/secondary/ghost/outline/destructive |
| Input | — | label, error, hint, block | (单 variant) |
| Panel | — | title, collapsible, collapsed, actions | (单 variant) |
| Card | — | padding, glow, interactive | (单 variant) |
| NodeCard | title, type | subtitle, inputs, outputs, selected | type: data/transform/output |
| Capsule | — | icon, label, active, dashed, alwaysShowLabel | (单 variant) |
| ChatPanel | — | title, subtitle, messages, onSend | (单 variant) |
| SplitLayout | — | left, center, right, leftWidth, rightWidth | — |

---

## 10. 完整状态机概览

```
Button:     default → hover → pressed → default
Input:      default → focus → (blur) → default
            error → error+focused → error
Panel:      expanded → collapsed → expanded
Card:       default → (hover → border-ring)  [interactive]
NodeCard:   unselected → selected → unselected
Capsule:    default → hover → active
