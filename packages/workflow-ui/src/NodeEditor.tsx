import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Type } from 'lucide-react';
import type { NodeEditorData } from './WorkflowCanvas';

interface NodeEditorProps extends NodeEditorData {
  nodeType?: string;
}

/**
 * 文本节点 — 静态展示态。
 *
 * tapNow 风格：active 与非 active 视觉一致，
 * 编辑与 AI 对话都通过外层 ChatPanel 浮层完成。
 *
 * 节点本身：
 *   - 顶部：type label（"Text"）
 *   - 主体：content 文本（白字，多行显示）
 */
function NodeEditorImpl(props: NodeEditorProps) {
  const { title, params } = props;
  const content = (params.content as string | undefined) ?? title ?? '';

  return (
    <div
      className={`relative rounded-xl border bg-card text-card-foreground min-w-[240px] max-w-[320px] overflow-hidden transition-all duration-base ${
        props.active
          ? 'border-primary shadow-glow-primary'
          : 'border-border/60 hover:border-border-strong'
      }`}
    >
      {/* 端口 — 为后续连线预留 */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-muted-foreground !border-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-muted-foreground !border-0"
      />

      {/* 顶部 type 标签 */}
      <div className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        <Type className="w-3 h-3" />
        <span>Text</span>
      </div>

      {/* 主体文本 */}
      <div className="px-4 pb-4 min-h-[120px]">
        {content.trim() ? (
          <p className="text-body text-foreground whitespace-pre-wrap break-words">
            {content}
          </p>
        ) : (
          <p className="text-body text-muted-foreground/50 italic">
            空文本节点
          </p>
        )}
      </div>
    </div>
  );
}

export default memo(NodeEditorImpl);