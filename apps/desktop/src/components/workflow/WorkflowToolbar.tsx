import { useState, useRef, useEffect } from "react";
import { Plus, Search, Archive, Layout, History, Type } from "lucide-react";
import type { WorkflowNode } from "@tongqu/workflow-core";

/** 可添加的节点类型定义 */
interface NodeTypeDef {
  type: WorkflowNode["type"];
  title: string;
  icon: typeof Type;
  description: string;
}

const NODE_TYPES: NodeTypeDef[] = [
  { type: "data", title: "文本节点", icon: Type, description: "纯文本数据" },
];

interface WorkflowToolbarProps {
  onAddNode: (type: WorkflowNode["type"]) => void;
}

/** 左侧胶囊工具栏单项 — 用 onMouseEnter/Leave + close delay，
 *  避免鼠标从按钮移到 flyout 时 flyout 闪烁消失 */
function ToolItem({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Plus;
  label: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);

  // 关闭时给 150ms 缓冲，让鼠标有时间从按钮滑到 flyout
  const onEnter = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  };
  const onLeave = () => {
    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
      closeTimer.current = null;
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, []);

  return (
    <div
      className="relative flex items-center justify-center"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <button
        type="button"
        title={label}
        className="flex items-center justify-center w-7 h-7 rounded-[var(--capsule-radius)] bg-[hsl(var(--capsule-bg)/0.7)] border border-[hsl(var(--capsule-border))] text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--capsule-bg-hover)/0.85)] hover:shadow-[0_0_8px_hsl(var(--capsule-glow))] transition-all duration-base"
      >
        <Icon className="w-3.5 h-3.5" />
      </button>

      {/* 标签 — 悬停时在右侧显示 */}
      {open && !children && (
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 pointer-events-none z-tooltip">
          <span className="whitespace-nowrap px-2 py-1 rounded text-caption bg-popover text-popover-foreground border border-border shadow-elevation-2">
            {label}
          </span>
        </div>
      )}

      {/* 子元素（flyout）— 有 children 时在右侧展开 */}
      {children && open && (
        <div
          className="absolute left-full ml-2 top-0 z-floating"
          // 让 flyout 自身也参与 enter/leave（否则移上去会关闭）
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/** 新增节点 flyout 中的类型列表 */
function NodeTypeList({
  types,
  onSelect,
}: {
  types: NodeTypeDef[];
  onSelect: (type: WorkflowNode["type"]) => void;
}) {
  return (
    <div className="min-w-[160px] py-1 rounded-md border border-border bg-card text-card-foreground shadow-elevation-2">
      <div className="px-3 py-1.5 text-caption font-medium text-muted-foreground uppercase tracking-wider">
        节点类型
      </div>
      {types.map((t) => (
        <button
          key={t.type}
          type="button"
          onClick={() => onSelect(t.type)}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-body text-foreground hover:bg-secondary hover:text-foreground transition-colors duration-base"
        >
          <t.icon className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex flex-col items-start">
            <span>{t.title}</span>
            <span className="text-micro text-muted-foreground">
              {t.description}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function WorkflowToolbar({ onAddNode }: WorkflowToolbarProps) {
  return (
    /* 胶囊工具栏 — 浮在画布上方，圆角高矩形 */
    <div className="flex flex-col items-center gap-2.5 py-4 px-2 rounded-2xl bg-card/80 backdrop-blur-md border border-border shadow-elevation-2">
      {/* 新增节点 — hover 显示节点类型列表 */}
      <ToolItem key="add" icon={Plus} label="新增节点">
        <NodeTypeList
          types={NODE_TYPES}
          onSelect={(type) => {
            onAddNode(type);
          }}
        />
      </ToolItem>

      {/* 分隔线 */}
      <div className="w-5 h-px bg-border my-0.5" />

      {/* 其他菜单项（占位 — 先只加菜单壳） */}
      <ToolItem key="search" icon={Search} label="节点搜索" />
      <ToolItem key="assets" icon={Archive} label="资产" />
      <ToolItem key="templates" icon={Layout} label="模板" />
      <ToolItem key="history" icon={History} label="历史" />
    </div>
  );
}