import { useEffect, useRef, useState } from 'react';
import { useReactFlow } from 'reactflow';
import { Send, Plus } from 'lucide-react';
import type { NodeChatMessage } from './WorkflowCanvas';

/**
 * 节点吸附系统：
 *  - NodeAttachments 容器：渲染所有激活节点的吸附（ChatPanel 等）
 *  - 跟随节点位置 — 使用 React Flow getViewport + getNode，订阅 store 实时刷新
 *  - 拖动时吸附跟随（不再因 store 暂时无节点而消失）
 *  - 切换节点：旧吸附 fade-out 后消失，新吸附 fade-in
 *
 * 用法：
 *   <NodeAttachments activeNodeId={id} attachments={[<ChatPanel ... />]} />
 */

export interface NodeAttachmentProps {
  nodeId: string;
}

export interface NodeAttachmentsProps {
  activeNodeId: string | null;
  /** 当前激活节点上要显示的所有吸附（通常是 [ChatPanel]） */
  children?: React.ReactNode;
  /** 容器宽度 — 让 absolute 定位的吸附相对此容器 */
  className?: string;
}

export default function NodeAttachments({
  activeNodeId,
  children,
  className = '',
}: NodeAttachmentsProps) {
  const rf = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);

  // 订阅 store：节点拖动 / 缩放时坐标实时刷新
  useEffect(() => {
    const api: any = (rf as any).store ?? rf;
    const store = api.getState ? api : null;
    if (!store || typeof store.subscribe !== 'function') return;
    const cb = () => setTick((t) => t + 1);
    const off = store.subscribe(cb);
    return () => off();
  }, [rf]);

  if (!activeNodeId) return null;

  // 计算节点屏幕坐标
  const node = rf.getNode(activeNodeId);
  if (!node) {
    return (
      <div
        className="absolute pointer-events-none border-2 border-red-500 bg-red-500/30 p-1 text-[10px] text-red-500"
        style={{ left: 0, top: 0 }}
      >
        AT-debug: getNode null, nodeId={activeNodeId}
      </div>
    );
  }
  const vp = rf.getViewport();
  const measured = (node as any).measured ?? { width: 240, height: 160 };
  const width = measured.width ?? 240;
  const height = measured.height ?? 160;
  const cx = (node.position.x + width / 2) * vp.zoom + vp.x;
  const top = (node.position.y + height) * vp.zoom + vp.y + 12;

  return (
    // 用一个紧凑的容器覆盖节点下方的区域（不覆盖整个画布），
    // 不影响 React Flow 节点的拖拽 / 选中事件
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'absolute',
        left: `${cx - 200}px`,
        top: `${top}px`,
        width: '400px',
        height: '400px',
        pointerEvents: 'none',
        zIndex: 100,
      }}
    >
      {/* 单一容器：让 React 只挂载一份，避免切换节点的多次 unmount */}
      <div
        key={activeNodeId}
        className="absolute"
        style={{
          left: '50%',
          top: 0,
          transform: 'translate(-50%, 0)',
        }}
      >
        {/* 切节点时旧组件立刻卸载，新组件挂载 + 动画 */}
        <div className="node-attachment-anim pointer-events-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ===== 内置 ChatPanel ===== */

interface ChatPanelProps extends NodeAttachmentProps {
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
      {/* 顶部：节点内容编辑（写回 node） */}
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

      {/* 消息列表 */}
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

      {/* 底部 model 标识 */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/40 text-[10px] text-muted-foreground/70">
        <span>◆ Claude Sonnet</span>
        <div className="flex items-center gap-2">
          <span title="语音">🎤</span>
          <span title="深度">1×</span>
          <span>⌘1</span>
        </div>
      </div>

      {/* 三角箭头 */}
      <div
        className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-card border-l border-t border-border"
        aria-hidden
      />
    </div>
  );
}