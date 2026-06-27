import { useState, useRef, useEffect, memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeEditorData } from './WorkflowCanvas';

interface ActiveViewProps {
  initialTitle: string;
  initialContent: string;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
}

interface NodeEditorProps extends NodeEditorData {
  nodeType?: string;
}

/**
 * 文本节点 — 纯文本模型。
 *
 * 非 active：只显示节点 content（无 type/params/标签，全是文本）
 * active：
 *   - 标题可编辑
 *   - 内容可编辑（textarea）
 *   - AI 对话框由外层 ChatPopover 渲染在节点下方（独立浮层）
 */
function NodeEditorImpl(props: NodeEditorProps) {
  const { title, params, active, onTitleChange, onContentChange } =
    props as NodeEditorProps & { onContentChange?: (content: string) => void };

  // 文本节点的 content 存在 params.content（向后兼容）或 title
  const initialContent =
    (params.content as string | undefined) ?? title ?? '';

  return (
    <div
      className={`group relative rounded-md border bg-card text-card-foreground transition-all duration-base min-w-[200px] max-w-[280px] ${
        active
          ? 'border-primary shadow-glow-primary'
          : 'border-border hover:border-border-strong'
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

      <div className="px-3 py-2.5">
        {active ? (
          <ActiveView
            initialTitle={title}
            initialContent={initialContent}
            onTitleChange={onTitleChange}
            onContentChange={(v) => onContentChange?.(v)}
          />
        ) : (
          <StaticView content={initialContent} />
        )}
      </div>
    </div>
  );
}

/* ---------- 非 active：静态文本 ---------- */
function StaticView({ content }: { content: string }) {
  if (!content.trim()) {
    return (
      <span className="text-body text-muted-foreground/50 italic">
        空文本节点
      </span>
    );
  }
  return (
    <p className="text-body text-foreground whitespace-pre-wrap break-words line-clamp-4">
      {content}
    </p>
  );
}

/* ---------- active：可编辑 ---------- */
function ActiveView({
  initialTitle,
  initialContent,
  onTitleChange,
  onContentChange,
}: {
  initialTitle: string;
  initialContent: string;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // 自动 focus 内容框（更常用）
    contentRef.current?.focus();
  }, []);

  const commitTitle = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== initialTitle) onTitleChange(trimmed);
    else setTitle(initialTitle);
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={titleRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
          }
          if (e.key === 'Escape') setTitle(initialTitle);
        }}
        placeholder="标题（可选）"
        className="text-caption font-medium text-foreground bg-transparent border-b border-border outline-none focus:border-primary py-0"
      />
      <textarea
        ref={contentRef}
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          onContentChange(e.target.value);
        }}
        placeholder="输入文本..."
        rows={4}
        className="text-body text-foreground bg-transparent outline-none resize-none leading-relaxed min-h-[60px] max-h-[200px]"
      />
    </div>
  );
}

export default memo(NodeEditorImpl);