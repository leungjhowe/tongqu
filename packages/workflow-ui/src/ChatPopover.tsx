import { useEffect, useRef } from 'react';
import { Panel, useStore } from 'reactflow';
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

/** React Flow store selector — 节点屏幕坐标 */
const selectorNodePos = (nodeId: string) => (s: any) => {
  const node = s.nodeLookup?.get(nodeId);
  const pos = node?.internals?.positionAbsolute;
  const measured = node?.measured;
  const t = s.transform as [number, number, number];
  if (!pos) return null;
  return {
    x: pos.x,
    y: pos.y,
    width: measured?.width ?? 240,
    height: measured?.height ?? 160,
    tx: t[0],
    ty: t[1],
    zoom: t[2],
  };
};

/** 用 React Flow Panel — 这是 React Flow 自带的 overlay 容器 */
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
  const pos = useStore(selectorNodePos(nodeId));
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length, pending]);

  if (!pos) return null;

  // React Flow 内部坐标（不是屏幕坐标）
  // node.x / node.y 是 flow 坐标系
  // 需要按 viewport transform 计算屏幕位置
  const screenX = (pos.x + pos.width / 2) * pos.zoom + pos.tx;
  const screenY = (pos.y + pos.height) * pos.zoom + pos.ty + 12;

  return (
    <Panel position="top-left" className="!m-0 !p-0 pointer-events-none">
      <div
        className="absolute pointer-events-none"
        style={{
          left: `${screenX}px`,
          top: `${screenY}px`,
          transform: 'translate(-50%, 0)',
        }}
      >
        <PopoverBody
          content={content}
          messages={messages}
          draft={draft}
          pending={pending}
          listRef={listRef}
          onContentChange={onContentChange}
          onDraftChange={onDraftChange}
          onSend={onSend}
        />
      </div>
    </Panel>
  );
}

function PopoverBody({
  content,
  messages,
  draft,
  pending,
  listRef,
  onContentChange,
  onDraftChange,
  onSend,
}: {
  content: string;
  messages: NodeChatMessage[];
  draft: string;
  pending: boolean;
  listRef: React.RefObject<HTMLDivElement>;
  onContentChange: (v: string) => void;
  onDraftChange: (v: string) => void;
  onSend: () => void;
}) {
  return (
    <div className="pointer-events-auto w-[360px] rounded-xl bg-card text-card-foreground shadow-elevation-3 overflow-hidden border border-border">
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