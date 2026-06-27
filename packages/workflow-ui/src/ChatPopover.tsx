import { useEffect, useRef, useState } from 'react';
import { useReactFlow } from 'reactflow';
import { Send, Plus } from 'lucide-react';
import type { NodeChatMessage } from './WorkflowCanvas';

interface ChatPopoverProps {
  nodeId: string;
  content: string;
  messages: NodeChatMessage[];
  draft: string;
  pending: boolean;
  onContentChange: (content: string) => void;
  onDraftChange: (text: string) => void;
  onSend: () => void;
}

/**
 * tapNow 风格的 AI 对话浮层 — 跟随节点下方 12px。
 *
 * 假设父级已经包了 <ReactFlowProvider>，用 useReactFlow 共享 store。
 */
export default function ChatPopover({
  nodeId,
  content,
  messages,
  draft,
  pending,
  onContentChange,
  onDraftChange,
  onSend,
}: ChatPopoverProps) {
  const rf = useReactFlow();
  const [tick, setTick] = useState(0); // 强制 re-render 用
  const listRef = useRef<HTMLDivElement>(null);

  // 订阅 rf store 变化（拖动 / 缩放）
  useEffect(() => {
    const unsubscribe = rf.setViewport; // dummy subscribe check
    void unsubscribe;
    // 实际订阅：用 storeApi
    const api: any = (rf as any).store || rf;
    const store = api.getState ? api : api.store?.getState ? api.store : null;
    if (store && typeof store.subscribe === 'function') {
      const cb = () => setTick((t) => t + 1);
      const off = store.subscribe(cb);
      return () => off();
    }
    return;
  }, [rf]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length, pending]);

  const node = rf.getNode(nodeId);
  if (!node) {
    return (
      <div
        className="absolute pointer-events-none border-2 border-red-500 bg-red-500/30 p-1 text-[10px] text-red-500"
        style={{ left: 0, top: 0 }}
      >
        CP-debug: getNode returned null, nodeId={nodeId}
      </div>
    );
  }

  // getViewport() 返回 { x, y, zoom }
  const vp = rf.getViewport();
  const measured = (node as any).measured ?? { width: 240, height: 160 };
  const width = measured.width ?? 240;
  const height = measured.height ?? 160;
  const screenX = (node.position.x + width / 2) * vp.zoom + vp.x;
  const screenY = (node.position.y + height) * vp.zoom + vp.y + 12;

  return (
    <>
      <div
        className="absolute pointer-events-none border-2 border-yellow-500 bg-yellow-500/20 p-1 text-[10px] text-yellow-300"
        style={{ left: 0, top: 0 }}
      >
        CP @{Math.round(screenX)},{Math.round(screenY)} z={vp.zoom.toFixed(2)} tick={tick}
      </div>
      <div
        className="absolute pointer-events-none"
        style={{
          left: `${screenX}px`,
          top: `${screenY}px`,
          transform: 'translate(-50%, 0)',
          zIndex: 100,
        }}
      >
        <div className="pointer-events-auto w-[360px] rounded-xl bg-card text-card-foreground shadow-elevation-3 overflow-hidden border border-border">
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
              <p className="text-[11px] text-muted-foreground/60 text-center py-3">
                描述内容后按 ↑ 发送，与 AI 对话
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
          <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/40 text-[10px] text-muted-foreground/70">
            <span>◆ Claude Sonnet</span>
            <div className="flex items-center gap-2">
              <span title="语音">🎤</span>
              <span title="深度">1×</span>
              <span>⌘1</span>
            </div>
          </div>
          <div
            className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-card border-l border-t border-border"
            aria-hidden
          />
        </div>
      </div>
    </>
  );
}