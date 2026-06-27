import { useEffect, useRef, useState } from 'react';
import { useStore } from 'reactflow';
import { Send, X, Sparkles } from 'lucide-react';
import type { NodeChatMessage } from './WorkflowCanvas';

interface ChatPopoverProps {
  nodeId: string;
  content: string;
  messages: NodeChatMessage[];
  draft: string;
  pending: boolean;
  onDraftChange: (text: string) => void;
  onSend: () => void;
  onClose?: () => void;
}

/**
 * React Flow 内部 store selector — 跟踪节点屏幕位置
 */
const selectorNode = (nodeId: string) => (s: any) => {
  const node = s.nodeLookup?.get(nodeId);
  const pos = node?.internals?.positionAbsolute;
  const measured = node?.measured;
  return pos
    ? {
        x: pos.x,
        y: pos.y,
        width: measured?.width ?? 200,
        height: measured?.height ?? 60,
        transform: s.transform as [number, number, number],
      }
    : null;
};

export default function ChatPopover({
  nodeId,
  content,
  messages,
  draft,
  pending,
  onDraftChange,
  onSend,
}: ChatPopoverProps) {
  const nodeRect = useStore(selectorNode(nodeId));
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length, pending]);

  if (!nodeRect) return null;

  // 计算屏幕坐标 — 节点底部 + 8px 间距，水平居中于节点
  const [tx, ty, zoom] = nodeRect.transform;
  const screenX = (nodeRect.x + nodeRect.width / 2) * zoom + tx;
  const screenY = (nodeRect.y + nodeRect.height) * zoom + ty + 8;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: 0,
        top: 0,
        transform: `translate(${screenX}px, ${screenY}px)`,
        // 容器自身不接收事件，事件穿透到画布
      }}
    >
      <div
        className="pointer-events-auto absolute -translate-x-1/2 w-[320px] rounded-lg border border-border bg-card text-card-foreground shadow-elevation-3 overflow-hidden"
        style={{ left: 0, top: 0 }}
      >
        {/* 顶部：节点内容预览 + sparkles 标识 */}
        <div className="flex items-start gap-2 px-3 py-2 border-b border-border bg-secondary/50">
          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">
              AI 对话 · 节点内容
            </div>
            <div className="text-[11px] text-foreground/80 line-clamp-2 italic">
              {content.trim() ? `"${content}"` : '(空)'}
            </div>
          </div>
        </div>

        {/* 消息列表 */}
        <div
          ref={listRef}
          className="max-h-48 overflow-y-auto px-3 py-2 flex flex-col gap-2 scroll-smooth"
        >
          {messages.length === 0 && !pending && (
            <p className="text-[11px] text-muted-foreground/60 text-center py-3">
              对节点内容提问或下达指令
            </p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col gap-0.5 text-[11px] ${
                m.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground/50">
                {m.role === 'user' ? '你' : 'AI'}
              </span>
              <div
                className={`rounded px-2 py-1 max-w-[95%] whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-primary/15 text-foreground'
                    : 'bg-secondary text-secondary-foreground'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {pending && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground animate-pulse" />
              <span>AI 思考中...</span>
            </div>
          )}
        </div>

        {/* 输入区 */}
        <div className="flex items-center gap-1.5 px-2 py-2 border-t border-border">
          <input
            type="text"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="向 AI 提问..."
            aria-label="节点对话输入"
            className="flex-1 h-7 px-2 text-[11px] bg-background text-foreground rounded outline-none border border-border/70 focus:border-primary transition-colors"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={!draft.trim() || pending}
            aria-label="发送"
            className="shrink-0 w-7 h-7 flex items-center justify-center bg-primary text-primary-foreground rounded hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>

        {/* 三角箭头 — 指向节点 */}
        <div
          className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-card border-l border-t border-border"
          aria-hidden
        />
      </div>
    </div>
  );
}