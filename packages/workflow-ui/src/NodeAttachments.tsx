import { useEffect, useRef } from 'react';
import { useReactFlow, Panel } from 'reactflow';
import { Send, Plus } from 'lucide-react';
import type { NodeChatMessage } from './WorkflowCanvas';

/**
 * 节点吸附系统：
 *  - NodeAttachments 容器：渲染所有激活节点的吸附（ChatPanel 等）
 *  - 跟随节点位置 — 使用 React Flow getViewport + getNode，订阅 store 实时刷新
 *  - 拖动时吸附跟随（不再因 store 暂时无节点而消失）
 *  - 切换节点：CSS transition fade in/out
 *
 * 用法：
 *   <NodeAttachments activeNodeId={id}>
 *     <ChatPanel ... />
 *   </NodeAttachments>
 *
 * 关键：使用 React Flow 的 <Panel position="bottom-center"> 作为宿主，
 * Panel 是 React Flow 自带 overlay，会被 React Flow 渲染到 viewport 内、
 * 应用相同的 viewport transform，并且正确处理事件路由 — 不影响节点拖拽。
 */

export interface NodeAttachmentProps {
  nodeId: string;
}

export interface NodeAttachmentsProps {
  activeNodeId: string | null;
  children?: React.ReactNode;
  className?: string;
}

export default function NodeAttachments({
  activeNodeId,
  children,
  className = '',
}: NodeAttachmentsProps) {
  const rf = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const [, force] = useStateReducer();

  // 订阅 store：节点拖动 / 缩放时坐标实时刷新
  useEffect(() => {
    const api: any = (rf as any).store ?? rf;
    const store = api.getState ? api : null;
    if (!store || typeof store.subscribe !== 'function') return;
    const cb = () => force();
    const off = store.subscribe(cb);
    return () => off();
  }, [rf]);

  if (!activeNodeId) return null;

  // 计算节点屏幕坐标（React Flow viewport transform）
  const node = rf.getNode(activeNodeId);
  if (!node) return null;

  const vp = rf.getViewport();
  const measured = (node as any).measured ?? { width: 240, height: 160 };
  const width = measured.width ?? 240;
  const height = measured.height ?? 160;
  const cx = (node.position.x + width / 2) * vp.zoom + vp.x;
  const top = (node.position.y + height) * vp.zoom + vp.y + 12;

  return (
    <Panel position="top-left" className="!m-0 !p-0 pointer-events-none">
      <div
        ref={containerRef}
        className={className}
        style={{
          position: 'absolute',
          left: `${cx}px`,
          top: `${top}px`,
          transform: 'translate(-50%, 0)',
          zIndex: 100,
          pointerEvents: 'none',
        }}
      >
        {/* 单一容器 — CSS transition 实现 in/out 双向动画 */}
        <div
          className={`node-attachment-anim pointer-events-auto ${
            children ? 'node-attachment-visible' : ''
          }`}
        >
          {children}
        </div>
      </div>
    </Panel>
  );
}

// useReducer 让 setState 在每次 store 变化时强制重新计算
function useStateReducer(): [number, () => void] {
  const ref = useRef(0);
  const setRef = () => {
    ref.current++;
  };
  return [ref.current, setRef];
}

/* ===== 内置 ChatPanel ===== */

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
  );
}