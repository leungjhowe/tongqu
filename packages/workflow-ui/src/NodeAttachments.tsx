import { useEffect, useRef, useState } from 'react';
import { useStoreApi, Panel } from 'reactflow';
import { Send, Plus } from 'lucide-react';
import type { NodeChatMessage } from './WorkflowCanvas';
import AIInputBox, { type AIInputPayload, type MentionSuggestion } from './AIInputBox';

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
    // 订阅 viewport 变化（pan / zoom），实时重算位置
    if (!activeNodeId) {
      setPos(null);
      return;
    }

    let raf = 0;
    const compute = () => {
      raf = 0;
      const s: any = storeApi.getState();
      const allNodes: any[] = s.getNodes?.() ?? [];
      const node = allNodes.find((n: any) => n.id === activeNodeId);
      if (!node) return;
      const p = node.position ?? { x: 0, y: 0 };
      const measured = node.measured ?? {};
      const w = measured.width ?? 180;
      const h = measured.height ?? 180;
      const [tx, ty, zoom] = s.transform as [number, number, number];
      setPos({
        x: (p.x + w / 2) * zoom + tx,
        y: (p.y + h) * zoom + ty + 12,
      });
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };

    compute(); // 首次
    const unsub = storeApi.subscribe(schedule);
    return () => {
      cancelAnimationFrame(raf);
      unsub();
    };
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
    <div className="w-[480px] rounded-xl bg-card text-card-foreground shadow-elevation-3 overflow-hidden border border-border">
      <div className="flex items-start gap-2 px-4 py-3 border-b border-border bg-secondary/40">
        <Plus className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
        <textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="描述任何你想要生成的内容"
          rows={2}
          className="flex-1 text-body text-foreground bg-transparent outline-none resize-none placeholder:text-muted-foreground/60 leading-relaxed max-h-24"
        />
      </div>
      <div
        ref={listRef}
        className="max-h-64 overflow-y-auto px-4 py-3 flex flex-col gap-3 scroll-smooth"
      >
        {messages.length === 0 && !pending && (
          <p className="text-body text-muted-foreground/60 text-center py-4">描述内容后按 Enter 发送，与 AI 对话</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col gap-1 text-body ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <span className="text-micro uppercase tracking-wider text-muted-foreground/50">{m.role === 'user' ? '你' : 'AI'}</span>
            <div className={`rounded-lg px-3 py-2 max-w-[95%] whitespace-pre-wrap leading-relaxed ${m.role === 'user' ? 'bg-primary/15 text-foreground' : 'bg-secondary text-secondary-foreground'}`}>{m.content}</div>
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

/* ===== AIChatPanel（AIInputBox 版） ===== */

export interface AIChatPanelProps {
  content: string;
  messages: NodeChatMessage[];
  /** 受控 draft 文本（与 ChatPanel 保持兼容，可选） */
  draft?: string;
  pending: boolean;
  onContentChange: (content: string) => void;
  onDraftChange?: (text: string) => void;
  /** 文本提交回调 — 不带 payload 的最简形式 */
  onSend: (text: string) => void;
  /** 结构化提交回调（带 mentions + attachments）。若提供则优先使用 */
  onPayloadSend?: (payload: AIInputPayload) => void;
  /** 覆盖默认的 @mention 候选 */
  mentionSuggestions?: MentionSuggestion[];
  /** 自定义 placeholder */
  placeholder?: string;
}

/**
 * AIChatPanel — 在 ChatPanel 基础上把底部输入区替换为 AIInputBox。
 *
 * 保留行为：
 *  - 节点下方锚定逻辑（由 NodeAttachments 负责）
 *  - 顶部 content textarea（节点正文预览/编辑）
 *  - 中部消息历史滚动列表
 *  - 新增 AI 输入能力：@mention / 文件上传 / 语音 / Markdown 预览
 *
 * AIInputBox 是非受控的（自带内部 text/attachments 状态）。
 * 提交后清空自身；如需保留受控草稿，父组件可监听 onPayloadSend。
 */
export function AIChatPanel({
  content,
  messages,
  pending,
  onContentChange,
  onSend,
  onPayloadSend,
  onDraftChange,
  mentionSuggestions,
  placeholder,
}: AIChatPanelProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length, pending]);

  /** AIInputBox 提交时：先把结构化 payload 抛给父组件，再退回到文本 send */
  const handlePayloadSubmit = async (payload: AIInputPayload) => {
    if (onPayloadSend) {
      await onPayloadSend(payload);
      return;
    }
    // 兜底：把纯文本透传给老的 onSend，让现有链路不破坏
    onSend(payload.text);
    onDraftChange?.('');
  };

  return (
    <div className="w-[480px] rounded-xl bg-card text-card-foreground shadow-elevation-3 overflow-hidden border border-border">
      {/* 节点正文预览/编辑 — 与 ChatPanel 顶部保持一致 */}
      <div className="flex items-start gap-2 px-4 py-3 border-b border-border bg-secondary/40">
        <Plus className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
        <textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="描述任何你想要生成的内容"
          rows={2}
          className="flex-1 text-body text-foreground bg-transparent outline-none resize-none placeholder:text-muted-foreground/60 leading-relaxed max-h-24"
        />
      </div>

      {/* 历史消息列表 */}
      <div
        ref={listRef}
        className="max-h-64 overflow-y-auto px-4 py-3 flex flex-col gap-3 scroll-smooth"
      >
        {messages.length === 0 && !pending && (
          <p className="text-body text-muted-foreground/60 text-center py-4">
            描述内容后按 Enter 发送，支持 @智能体 / @工具 / 拖入文件 / 语音输入
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col gap-1 text-body ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <span className="text-micro uppercase tracking-wider text-muted-foreground/50">
              {m.role === 'user' ? '你' : 'AI'}
            </span>
            <div
              className={`rounded-lg px-3 py-2 max-w-[95%] whitespace-pre-wrap leading-relaxed ${
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

      {/* AIInputBox — 替代 ChatPanel 的简易 input */}
      <div className="border-t border-border">
        <AIInputBox
          pending={pending}
          placeholder={placeholder ?? '向 AI 提问 · 输入 / 上传 / @ / 语音'}
          mentionSuggestions={mentionSuggestions}
          onSubmit={handlePayloadSubmit}
        />
      </div>

      {/* 状态栏 — 与 ChatPanel 保持视觉一致 */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/40 text-[10px] text-muted-foreground/70">
        <span>◆ Claude Sonnet</span>
        <div className="flex items-center gap-2">
          <span title="语音">🎤</span>
          <span title="深度">1×</span>
          <span>⌘1</span>
        </div>
      </div>

      {/* 顶部小三角 — 与 ChatPanel 对齐 */}
      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-card border-l border-t border-border" aria-hidden />
    </div>
  );
}