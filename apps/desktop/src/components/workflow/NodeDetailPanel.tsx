import { useRef, useEffect } from "react";
import { Input, Button } from "@tps/ui";
import type { WorkflowNode } from "@tps/workflow-core";
import { X, ChevronRight, Send } from "lucide-react";

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
}

export interface NodeDetailPanelProps {
  node: WorkflowNode | null;
  messages: ChatMessage[];
  draft: string;
  onDraftChange: (text: string) => void;
  onSend: (nodeId: string, text: string) => void;
  onClose: () => void;
}

/** 节点类型的显示标签与色映射 */
const TYPE_META: Record<
  WorkflowNode["type"],
  { label: string; cls: string }
> = {
  data: { label: "数据", cls: "text-primary border-primary/30 bg-primary/10" },
  transform: {
    label: "变换",
    cls: "text-ring border-ring/30 bg-ring/10",
  },
  output: {
    label: "输出",
    cls: "text-destructive border-destructive/30 bg-destructive/10",
  },
};

function NodeTypeTag({ type }: { type: WorkflowNode["type"] }) {
  const meta = TYPE_META[type];
  return (
    <span
      className={`px-2 py-0.5 rounded text-[11px] font-medium border ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
}

function ParamsTable({ params }: { params: Record<string, unknown> }) {
  const entries = Object.entries(params);
  if (entries.length === 0) {
    return (
      <span className="text-micro text-muted-foreground italic">无参数</span>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center gap-2 text-micro">
          <span className="text-muted-foreground font-mono">{k}</span>
          <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
          <span className="text-foreground font-mono truncate">
            {String(v)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function NodeDetailPanel({
  node,
  messages,
  draft,
  onDraftChange,
  onSend,
  onClose,
}: NodeDetailPanelProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // 新消息时自动滚动到底部
  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text || !node) return;
    onSend(node.id, text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 未选中节点 — 占位提示
  if (!node) {
    return (
      <aside className="flex flex-col h-full border-l border-border bg-card">
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            点击画布上的节点
            <br />
            查看详情并开始对话
          </p>
        </div>
      </aside>
    );
  }

  const meta = TYPE_META[node.type];

  return (
    <aside className="flex flex-col h-full border-l border-border bg-card">
      {/* 标题栏 */}
      <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-border">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <NodeTypeTag type={node.type} />
          </div>
          <h2 className="text-h3 text-foreground truncate">{node.title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭面板"
          className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 参数区 */}
      <div className="px-4 py-3 border-b border-border">
        <div className="text-caption font-medium text-muted-foreground mb-2">
          参数
        </div>
        <ParamsTable params={node.params} />
      </div>

      {/* 聊天区 */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="text-caption font-medium text-muted-foreground px-4 pt-3 pb-1">
          对话
        </div>

        {/* 消息列表 */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-4 pb-2 space-y-3 scroll-smooth"
        >
          {messages.length === 0 ? (
            <p className="text-micro text-muted-foreground/60 text-center pt-6">
              输入消息开始与节点对话
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col gap-1 max-w-[90%] ${
                  m.role === "user" ? "self-end items-end" : "self-start items-start"
                }`}
              >
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
                  {m.role === "user" ? "你" : "AI"}
                </span>
                <div
                  className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-primary/15 text-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 输入区 */}
        <div className="shrink-0 border-t border-border p-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入指令..."
              aria-label="节点对话输入"
              className="flex-1 h-9 px-3 rounded-md bg-secondary text-foreground text-sm placeholder:text-muted-foreground/50 border border-border/70 outline-none focus:border-primary transition-colors duration-base"
            />
            <Button
              type="button"
              variant="default"
              size="icon"
              disabled={!draft.trim()}
              onClick={handleSend}
              aria-label="发送"
              className="shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
