# 交通规划AI工作流系统 (TPS)

> Transportation Planning AI Workflow System
> 基于 Tauri 2 + React + TypeScript + Vite 的桌面应用

## 技术栈

- **桌面外壳**: Tauri 2 (Rust)
- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **状态管理**: Zustand
- **路由**: React Router v6
- **包管理**: bun

## 开发命令

```bash
# 安装依赖
bun install

# 启动桌面开发模式（Tauri + Vite 热更新）
bun run tauri:dev

# 仅启动 Vite 前端（不开 Tauri 窗口）
bun run dev

# 类型检查 + 生产构建
bun run build

# 打包桌面应用（生成安装包）
bun run tauri:build
```

## 目录结构

```
tps/
├── src/                          # 前端源码
│   ├── components/ui/            # 通用 UI 组件（Button / Input / Card）
│   ├── pages/                    # 页面
│   │   ├── Login.tsx             # /login
│   │   ├── AppShell.tsx          # /app 容器
│   │   └── app/                  # AppShell 三栏
│   │       ├── LeftSidebar.tsx
│   │       ├── CenterCanvas.tsx
│   │       └── RightChatPanel.tsx
│   ├── router/                   # 路由配置
│   ├── stores/                   # Zustand stores（auth / ui）
│   ├── styles/                   # 全局与主题样式
│   ├── App.tsx                   # 根组件（挂载 BrowserRouter）
│   └── main.tsx                  # 入口
├── src-tauri/                    # Rust 桌面端
│   ├── src/main.rs               # Tauri 入口
│   ├── src/lib.rs                # Tauri Builder / run()
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── capabilities/default.json # 权限声明
├── index.html
├── vite.config.ts
└── package.json
```

## 页面结构

| 路径 | 组件 | 说明 |
| --- | --- | --- |
| `/login` | `Login.tsx` | 登录页（深色卡片式表单） |
| `/app` | `AppShell.tsx` | 应用主壳，内部三栏布局 |
| `/app` 左栏 | `LeftSidebar.tsx` | 工作流 / 项目列表 |
| `/app` 中栏 | `CenterCanvas.tsx` | 画布 / 节点编辑器 |
| `/app` 右栏 | `RightChatPanel.tsx` | AI 对话面板 |

## 设计风格

参考 ComfyUI / VSCode Dark / Figma Dark 的暗色调：

- 主背景：`#0f1116`
- 次背景：`#111827`
- 边框：`rgba(255, 255, 255, 0.08)` + 微发光
- 圆角：`4–8px`
- 字体：Inter / system-ui

具体的色板与 token 由 theme agent 写入 `src/styles/theme.css`。
