import { useEffect, useRef, useState } from 'react';
import { useStoreApi, Panel } from 'reactflow';
import { Send, Plus } from 'lucide-react';
import type { NodeChatMessage } from './WorkflowCanvas';

export interface NodeAttachmentProps {
  nodeId: string;
}

export interface NodeAttachmentsProps {
  activeNodeId: string | null;
  dragging?: boolean;
  children?: React.ReactNode;
  className?: string;
}

/**
 * 节点吸附系统 — 只计算一次位置，不跟踪拖动。
 * 拖动时由父组件控制 dragging 位 → 隐藏。
 */
export default function NodeAttachments({
  activeNodeId,
  dragging,
  children,
  className = '',
}: NodeAttachmentsProps) {
  const storeApi = useStoreApi();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    // dragging 从 true→false 时强制重新算位置（组件卸载→挂载后位置是旧的）
    if (!activeNodeId) {
      setPos(null);
      return;
    }
    const s: any = storeApi.getState();
    const allNodes: any[] = s.getNodes?.() ?? [];
    const node = allNodes.find((n: any) => n.id === activeNodeId);
    if (!node) return;

    const p = node.position ?? { x: 0, y: 0 };
    const measured = node.measured ?? {};
    const w = measured.width ?? 240;
    const h = measured.height ?? 160;
    const [tx, ty, zoom] = s.transform as [number, number, number];

    setPos({
      x: (p.x + w / 2) * zoom + tx,
      y: (p.y + h) * zoom + ty + 12,
    });
  }, [activeNodeId, dragging, storeApi]);

  if (!activeNodeId || !pos || dragging) return null;

  return (
    <Panel position="top-left" className="!m-0 !p-0 pointer-events-none">
      <div
        className={className}
        style={{
          position: 'absolute',
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          transform: 'translate(-50%, 0)',
          zIndex: 100,
          pointerEvents: 'none',
        }}
      >
        <div key={activeNodeId} className="node-attachment-anim node-attachment-visible pointer-events-auto">
          {children}
        </div>
      </div>
    </Panel>
  );
}

/* ===== ChatPanel ===== */

interface ChatPanelProps {
  content: string;
  messages: NodeChatMessage[];
  draft: string;
  pending: boolean;
  onContentChange: (content: string) => void;
  onDraftChange: (text: string) => void;
  onSend: () => void;
}

export function ChatPanel({
  content,
  messages,
  draft,
  pending,
  onContentChange,
  onDraftChange,
  onSend,
}: ChatPanelProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length, pending]);

  return (
    <div className="w-[360px] rounded-xl bg-card text-card-foreground shadow-elevation-3 overflow-hidden border border-border">
      <div className="flex items-start gap-2 px-3 py-2 border-b border-border bg-secondary/40">
        <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="描述任何你想要生成的内容"
          rows={1}
          className="flex-1 text-[11px] text-foreground bg-transparent outline-none resize-none placeholder:text-muted-foreground/60 leading-relaxed max-h-20"
        />
      </div>
      <div
        ref={listRef}
        className="max-h-48 overflow-y-auto px-3 py-2 flex flex-col gap-2 scroll-smooth"
      >
        {messages.length === 0 && !pending && (
          <p className="text-[11px] text-muted-foreground/60 text-center py-3">描述内容后按 Enter 发送，与 AI 对话</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col gap-0.5 text-[11px] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground/50">{m.role === 'user' ? '你' : 'AI'}</span>
            <div className={`rounded px-2 py-1 max-w-[95%] whitespace-pre-wrap ${m.role === 'user' ? 'bg-primary/15 text-foreground' : 'bg-secondary text-secondary-foreground'}`}>{m.content}</div>
          </div>
        ))}
        {pending && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground animate-pulse" />
            <span>AI 思考中...</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 px-2 py-2 border-t border-border">
        <input
          type="text"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          placeholder="向 AI 提问..."
          className="flex-1 h-7 px-2 text-[11px] bg-background text-foreground rounded outline-none border border-border/70 focus:border-primary transition-colors"
        />
        <button type="button" onClick={onSend} disabled={!draft.trim() || pending} className="shrink-0 w-7 h-7 flex items-center justify-center bg-primary text-primary-foreground rounded hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <Send className="w-3 h-3" />
        </button>
      </div>
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/40 text-[10px] text-muted-foreground/70">
        <span>◆ Claude Sonnet</span>
        <div className="flex items-center gap-2"><span title="语音">🎤</span><span title="深度">1×</span><span>⌘1</span></div>
      </div>
      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-card border-l border-t border-border" aria-hidden />
    </div>
  );
}