请对当前项目进行工程级重构，目标是升级为 pnpm monorepo 架构，用于一个 Tauri 2 + React + TypeScript 的“交通规划 AI 工作流系统”。

本次任务重点是：重构工程结构 + 保证可运行 + 搭建可扩展骨架，不实现复杂业务逻辑。

---

# 一、目标

构建一个可扩展的 monorepo 框架，支持以下能力模块（仅搭结构，不实现完整功能）：

- GIS模块（OpenLayers封装）
- 工作流系统（ComfyUI风格 Node Graph）
- AI系统（自然语言 → workflow JSON）
- 数据处理（CSV / Excel / DuckDB）
- 导出系统（PPT / PNG / PDF）
- 资产库系统（样式 / 模板 / 配置）

---

# 二、技术栈（必须统一）

- pnpm workspace（必须使用）
- Vite + React + TypeScript
- Tauri 2（桌面端）
- Zustand（状态管理）
- React Router（路由）
- 不使用 Redux
- UI风格：ComfyUI / VSCode dark

---

# 三、monorepo 结构（必须严格按照）

请创建以下目录结构，并确保 workspace 可正常识别：
apps/
desktop/ # Tauri 主应用（唯一运行入口）

packages/
ui/ # UI设计系统（shadcn风格封装）
workflow-core/ # 工作流核心（Node/Graph/Execution）
workflow-ui/ # React Flow 可视化层
gis-core/ # OpenLayers封装（只做能力层）
data-core/ # CSV/Excel/DuckDB数据能力
ai-core/ # AI接口层（LLM统一封装）
asset-core/ # 资产库（模板/样式/配置）
export-core/ # 导出能力（PPT/PNG/PDF）
shared/ # types / utils / constants

tauri/
rust-core/ # Rust能力层（只保留结构）

---

# 四、强制架构规则（非常重要）

## 1. 分层原则

必须遵守：

- packages 之间不能随意互相依赖
- workflow-core 不能依赖 React
- gis-core 不能依赖 UI
- ai-core 不能依赖 UI
- shared 只能被引用，不能依赖任何业务包

---

## 2. 依赖方向必须是：
apps/desktop
↓
packages/*
↓
shared


---

# 五、各 package 职责（只做骨架，不做完整实现）

## 1. ui（设计系统）
- 基于 shadcn/ui + Tailwind
- 提供：
  Button / Panel / SplitLayout / NodeCard / MapPanel / ChatPanel
- 只做组件，不写业务逻辑

---

## 2. workflow-core（核心引擎）
- 定义 Node / Edge / Graph 数据结构
- 提供 workflow 执行器（execute）
- 不依赖 React

---

## 3. workflow-ui
- 使用 React Flow
- 实现 node graph UI
- 负责可视化 workflow-core 数据结构

---

## 4. gis-core
- OpenLayers 封装
- 图层管理接口（add/remove/update layer）
- 专题图能力（heatmap / flow / choropleth）
- 仅能力层，不包含 UI

---

## 5. data-core
- CSV / Excel 解析
- DuckDB 封装（仅接口）
- 数据清洗与转换能力

---

## 6. ai-core
- LLM统一接口（Claude / GPT / DeepSeek / Ollama）
- prompt 管理
- 提供：natural language → workflow JSON（仅接口）

---

## 7. asset-core
- 图层样式管理
- 图表模板
- workflow模板
- 配置中心

---

## 8. export-core
- PPT生成（pptxgenjs）
- PNG导出
- PDF导出

---

# 六、apps/desktop（必须可运行）

## 要求：

- Tauri 2 主应用
- React Router：
/login → 登录页（模拟登录）
/app → 主系统

---

## /app 页面布局（必须实现）

三栏布局（ComfyUI风格）：
[ Sidebar ] [ Workflow Canvas ] [ Chat Panel ]


### Sidebar：
- 项目列表
- 工作流入口
- 数据入口

### Workflow Canvas：
- 占位 UI 或 React Flow

### Chat Panel：
- 模拟 AI 对话 UI

---

# 七、UI风格要求（必须）

整体风格：

- ComfyUI 风格
- VSCode dark theme
- 深色背景（#0f1116 / #111827）
- 面板分割清晰
- 4~8px圆角
- hover高亮
- 科技感 UI

---

# 八、MVP必须实现（重点）

必须保证项目可运行：

1. pnpm workspace 可正常 install
2. desktop 能启动
3. /login 页面存在
4. 登录后进入 /app
5. /app 显示三栏布局：
   - Sidebar
   - Workflow Canvas（占位）
   - Chat Panel

---

# 九、禁止事项（非常重要）

- ❌ 不要实现完整 GIS 功能
- ❌ 不要实现完整 AI 功能
- ❌ 不要写复杂业务逻辑
- ❌ 不要做过度抽象设计
- ❌ 不要引入 Redux
- ❌ 不要拆过度复杂 UI

---

# 十、输出要求

请完成：

1. 初始化 pnpm workspace
2. 创建所有 packages（含基础 index.ts）
3. 配置 tsconfig base + path alias
4. 配置 workspace 依赖关系
5. desktop 可运行
6. 保证 dev 启动成功

---

# 十一、目标

最终产出一个：

> 可运行 + 可扩展 + 分层清晰的 Tauri monorepo 工程骨架

后续可以继续逐步扩展 GIS / AI / Workflow 能力。