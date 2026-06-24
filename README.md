# TPS — 交通规划AI工作流系统

Tauri 2 + React + TypeScript monorepo，用于构建“交通规划 AI 工作流系统”。UI 风格参考 **ComfyUI / VSCode Dark**（深色背景 #0f1116 / #111827，4~8px 圆角，分割清晰，hover 高亮，科技感）。

## 一、仓库结构

```
tps/
├── apps/
│   └── desktop/              # Tauri 2 主应用（唯一运行入口）
│       ├── src/              # React 前端
│       └── src-tauri/        # Rust 桌面壳
├── packages/
│   ├── shared/               # types / utils / constants
│   ├── ui/                   # 设计系统（Button / Panel / SplitLayout / NodeCard / MapPanel / ChatPanel）
│   ├── workflow-core/        # 工作流核心（Node/Edge/Graph + execute，不依赖 React）
│   ├── workflow-ui/          # React Flow 可视化层
│   ├── gis-core/             # OpenLayers 封装（只做能力层，无 UI）
│   ├── data-core/            # CSV / Excel / DuckDB
│   ├── ai-core/              # LLM 统一封装（Claude / GPT / DeepSeek / Ollama）
│   ├── asset-core/           # 模板 / 样式 / 配置中心
│   └── export-core/          # PPT / PNG / PDF 导出
├── tauri/
│   └── rust-core/            # Rust 能力层（占位，未来承载 GIS / DuckDB native 等）
├── pnpm-workspace.yaml
├── tsconfig.base.json        # strict TS + path aliases（@tps/*）
├── package.json              # 根脚本（dev / build / tauri:* / lint / clean）
└── README.md
```

## 二、分层规则（强制）

依赖方向必须自上而下，**禁止反向依赖**：

```
apps/desktop
    ↓
packages/*
    ↓
shared
```

补充约束：

- `workflow-core` **不得**依赖 React
- `gis-core` **不得**依赖 UI
- `ai-core` **不得**依赖 UI
- `shared` 只能被引用，**不得**依赖任何业务包

## 三、开发命令

环境要求：Node ≥ 20、pnpm ≥ 9。

```bash
# 1. 安装依赖（首次或更新后）
pnpm install

# 2. 启动桌面应用（开发模式，含 Vite HMR + Tauri 窗口）
pnpm tauri:dev

# 3. 仅启动前端（不开 Tauri 窗口）
pnpm dev

# 4. 打包桌面应用
pnpm tauri:build

# 5. 清理所有 workspace 包的产物
pnpm clean
```

## 四、目录速查

| 关注点 | 位置 |
| --- | --- |
| 前端入口 | `apps/desktop/src/main.tsx` |
| 路由 | `apps/desktop/src/router/` |
| 全局状态 | `apps/desktop/src/stores/` |
| Tauri 配置 | `apps/desktop/src-tauri/tauri.conf.json` |
| 设计系统组件 | `packages/ui/src/` |
| 工作流核心 | `packages/workflow-core/src/` |
| React Flow 可视化 | `packages/workflow-ui/src/` |
| GIS 能力层 | `packages/gis-core/src/` |
| Rust 能力层 | `tauri/rust-core/src/` |

## 五、后续路线

本仓库当前处于“骨架阶段”：monorepo 结构、依赖分层、tsconfig 别名、占位包已就绪。后续将按 wave 逐步落地：

- wave 2：实现各 `packages/*` 的真实能力（保持无 React/无 UI 边界）
- wave 3：把 `apps/desktop` 中已有的 UI 拆入 `@tps/ui`，并接入 workspace 依赖

参考规范：`.claude/my/monorepo.md`。
