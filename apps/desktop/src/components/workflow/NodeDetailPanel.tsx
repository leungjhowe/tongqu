import { useRef, useEffect, useState } from "react";
import { Button } from "@tongqu/ui";
import type { WorkflowNode } from "@tongqu/workflow-core";
import {
  X,
  ChevronRight,
  Send,
  Pencil,
  Check,
  Plus,
  Trash2,
} from "lucide-react";

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
  /** 更新节点局部字段（title/type/params），由父组件写回 graph state */
  onUpdateNode: (nodeId: string, patch: Partial<WorkflowNode>) => void;
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

const TYPE_ORDER: WorkflowNode["type"][] = ["data", "transform", "output"];

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

/* ---------- 可编辑标题 ---------- */
function EditableTitle({
  node,
  onUpdate,
}: {
  node: WorkflowNode;
  onUpdate: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(node.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  // 外部 title 变化时同步本地 value
  useEffect(() => {
    if (!editing) setValue(node.title);
  }, [node.title, editing]);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== node.title) {
      onUpdate(trimmed);
    } else {
      setValue(node.title);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setValue(node.title);
            setEditing(false);
          }
        }}
        className="w-full text-h3 text-foreground bg-transparent border-b border-primary outline-none py-0"
        aria-label="节点标题"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group flex items-center gap-1.5 text-left min-w-0"
      aria-label="编辑标题"
    >
      <h2 className="text-h3 text-foreground truncate">{node.title}</h2>
      <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  );
}

/* ---------- 可循环切换类型标签 ---------- */
function TypeSelector({
  type,
  onChange,
}: {
  type: WorkflowNode["type"];
  onChange: (next: WorkflowNode["type"]) => void;
}) {
  const next = TYPE_ORDER[(TYPE_ORDER.indexOf(type) + 1) % TYPE_ORDER.length]!;
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      title={`点击切换为「${TYPE_META[next].label}」`}
      className="inline-flex"
    >
      <NodeTypeTag type={type} />
    </button>
  );
}

/* ---------- 可编辑参数表 ---------- */
function EditableParams({
  params,
  onChange,
}: {
  params: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const entries = Object.entries(params);

  const updateValue = (k: string, v: string) => {
    onChange({ ...params, [k]: v });
  };

  const renameKey = (oldK: string, newK: string) => {
    if (oldK === newK || !newK.trim()) return;
    const next: Record<string, unknown> = {};
    for (const [key, val] of entries) {
      next[key === oldK ? newK.trim() : key] = val;
    }
    onChange(next);
  };

  const remove = (k: string) => {
    const next = { ...params };
    delete next[k];
    onChange(next);
  };

  const addRow = () => {
    const k = newKey.trim();
    if (!k || k in params) {
      setNewKey("");
      setNewValue("");
      setAdding(false);
      return;
    }
    onChange({ ...params, [k]: newValue });
    setNewKey("");
    setNewValue("");
    setAdding(false);
  };

  return (
    <div className="flex flex-col gap-1">
      {entries.length === 0 && !adding && (
        <span className="text-micro text-muted-foreground italic">无参数</span>
      )}
      {entries.map(([k, v]) =>
        editingKey === k ? (
          <KeyValueEditor
            key={k}
            initialKey={k}
            initialValue={String(v)}
            onCommit={(newK, newV) => {
              renameKey(k, newK);
              if (newK.trim() === k) updateValue(k, newV);
              setEditingKey(null);
            }}
            onCancel={() => setEditingKey(null)}
            onDelete={() => {
              remove(k);
              setEditingKey(null);
            }}
          />
        ) : (
          <button
            key={k}
            type="button"
            onClick={() => setEditingKey(k)}
            className="flex items-center gap-2 text-micro text-left w-full hover:bg-secondary/50 rounded px-1 -mx-1 py-0.5 transition-colors"
          >
            <span className="text-muted-foreground font-mono shrink-0">{k}</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
            <span className="text-foreground font-mono truncate">
              {String(v)}
            </span>
            <Pencil className="w-3 h-3 text-muted-foreground opacity-0 hover:opacity-100 ml-auto shrink-0" />
          </button>
        )
      )}

      {adding ? (
        <KeyValueEditor
          initialKey={newKey}
          initialValue={newValue}
          onCommit={(k, v) => {
            setNewKey(k);
            setNewValue(v);
            addRow();
          }}
          onCancel={() => {
            setNewKey("");
            setNewValue("");
            setAdding(false);
          }}
          onDelete={null}
          placeholder="新参数"
        />
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setAdding(true)}
          className="self-start mt-1"
        >
          <Plus className="w-3 h-3 mr-1" />
          添加参数
        </Button>
      )}
    </div>
  );
}

function KeyValueEditor({
  initialKey,
  initialValue,
  onCommit,
  onCancel,
  onDelete,
  placeholder,
}: {
  initialKey: string;
  initialValue: string;
  onCommit: (k: string, v: string) => void;
  onCancel: () => void;
  onDelete: (() => void) | null;
  placeholder?: string;
}) {
  const [k, setK] = useState(initialKey);
  const [v, setV] = useState(initialValue);

  return (
    <div className="flex items-center gap-1 px-1 -mx-1">
      <input
        value={k}
        onChange={(e) => setK(e.target.value)}
        placeholder="key"
        aria-label="参数名"
        className="w-20 px-1 py-0.5 text-micro font-mono text-muted-foreground bg-background border border-border rounded outline-none focus:border-primary"
      />
      <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={placeholder ?? "value"}
        aria-label="参数值"
        className="flex-1 px-1 py-0.5 text-micro font-mono text-foreground bg-background border border-border rounded outline-none focus:border-primary min-w-0"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommit(k.trim(), v);
          if (e.key === "Escape") onCancel();
        }}
      />
      <button
        type="button"
        onClick={() => onCommit(k.trim(), v)}
        className="shrink-0 w-5 h-5 flex items-center justify-center text-success hover:bg-success/10 rounded transition-colors"
        aria-label="保存"
      >
        <Check className="w-3 h-3" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="shrink-0 w-5 h-5 flex items-center justify-center text-muted-foreground hover:bg-secondary rounded transition-colors"
        aria-label="取消"
      >
        <X className="w-3 h-3" />
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 w-5 h-5 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded transition-colors"
          aria-label="删除"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
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
  onUpdateNode,
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

  return (
    <aside className="flex flex-col h-full border-l border-border bg-card">
      {/* 标题栏 */}
      <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-border">
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          <TypeSelector
            type={node.type}
            onChange={(next) => onUpdateNode(node.id, { type: next })}
          />
          <EditableTitle
            node={node}
            onUpdate={(title) => onUpdateNode(node.id, { title })}
          />
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
        <EditableParams
          params={node.params}
          onChange={(next) => onUpdateNode(node.id, { params: next })}
        />
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