import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Type, Plus } from 'lucide-react';
import type { NodeEditorData } from './WorkflowCanvas';

interface NodeEditorProps extends NodeEditorData {
  nodeType?: string;
}

/**
 * 文本节点 — tapNow 风格。
 * 静态展示态：active 与非 active 视觉一致。
 *
 * 结构：
 *   - 方形卡片（aspect-square），垂直居中显示文本
 *   - 左右两侧各一个 "+" 圆圈（端口）+ 拖线吸附
 */
function NodeEditorImpl(props: NodeEditorProps) {
  const { title, params } = props;
  const content = (params.content as string | undefined) ?? title ?? '';

  return (
    <div
      className={`relative aspect-square w-[180px] bg-card text-card-foreground rounded-xl border transition-all duration-base ${
        props.active
          ? 'border-primary shadow-glow-primary'
          : 'border-border/60 hover:border-border-strong'
      }`}
    >
      {/* 端口 — 左右两侧 + 圆圈（拉出线的吸附区） */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-10 !h-10 !bg-transparent !border-0 !rounded-full !-left-5 !flex !items-center !justify-center"
      >
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-card border border-border text-muted-foreground shadow-elevation-1 hover:text-primary hover:border-primary transition-colors duration-base pointer-events-none">
          <Plus className="w-3 h-3" />
        </span>
      </Handle>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-10 !h-10 !bg-transparent !border-0 !rounded-full !-right-5 !flex !items-center !justify-center"
      >
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-card border border-border text-muted-foreground shadow-elevation-1 hover:text-primary hover:border-primary transition-colors duration-base pointer-events-none">
          <Plus className="w-3 h-3" />
        </span>
      </Handle>

      {/* 主体文本 — 居中 */}
      <div className="flex items-center justify-center h-full px-4">
        {content.trim() ? (
          <p className="text-body text-foreground text-center whitespace-pre-wrap break-words line-clamp-6">
            {content}
          </p>
        ) : (
          <p className="text-micro text-muted-foreground/50 italic">空</p>
        )}
      </div>
    </div>
  );
}

export default memo(NodeEditorImpl);