import { useEffect, useRef } from 'react';
import { Send, Plus } from 'lucide-react';
import type { NodeChatMessage } from './WorkflowCanvas';

interface ChatPopoverProps {
  /** 当前激活节点的 ID（用于显示在上方） */
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
 * tapNow 风格的 AI 对话浮层 — 固定在画布左下角。
 *
 * 不跟随节点 — 节点本身是静态展示，浮层独立做对话/编辑。
 */
export default function ChatPopover({
  content,
  messages,
  draft,
  pending,
  onContentChange,
  onDraftChange,
  onSend,
}: ChatPopoverProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length, pending]);

  return (
    /* 固定左下角浮层 — z-floating（最高浮动层） */
    <div className="absolute bottom-6 left-6 w-[420px] pointer-events-none">
      <div className="pointer-events-auto rounded-xl bg-card text-card-foreground shadow-elevation-3 overflow-hidden border border-border">
        {/* 顶部：节点内容预览（可编辑） */}
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
          <span>◆ Gemini 3.1 Flash Lite</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="hover:text-foreground transition-colors"
              aria-label="语音"
              title="语音输入"
            >
              🎤
            </button>
            <button
              type="button"
              className="hover:text-foreground transition-colors"
              aria-label="深度"
              title="思考深度"
            >
              1×
            </button>
            <span>⌘1</span>
          </div>
        </div>
      </div>
    </div>
  );
}