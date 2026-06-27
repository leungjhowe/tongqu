import { useState, useRef, useEffect, memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import {
  Pencil,
  Check,
  X,
  Plus,
  Trash2,
  Send,
  ChevronRight,
} from 'lucide-react';
import type { NodeEditorData } from './WorkflowCanvas';

const TYPE_META: Record<string, { label: string; cls: string }> = {
  data: { label: '数据', cls: 'text-primary border-primary/30 bg-primary/10' },
  transform: {
    label: '变换',
    cls: 'text-ring border-ring/30 bg-ring/10',
  },
  output: {
    label: '输出',
    cls: 'text-destructive border-destructive/30 bg-destructive/10',
  },
};

/**
 * 工作流节点编辑器 — 双击后展开：
 *  - 顶部：type 标签 + title 编辑
 *  - 中部：params 行内编辑
 *  - 底部：AI 对话（消息列表 + 输入框）
 */
function NodeEditorImpl(props: NodeEditorData & { nodeType?: string }) {
  const {
    title,
    params,
    active,
    messages,
    draft,
    pending,
    onTitleChange,
    onParamChange,
    onParamAdd,
    onParamRemove,
    onDraftChange,
    onSend,
  } = props;

  const nodeType = props.nodeType ?? 'data';
  const meta = TYPE_META[nodeType] ?? TYPE_META.data!;

  return (
    <div
      className={`relative rounded-lg border bg-card text-card-foreground transition-all duration-base shadow-elevation-1 min-w-[240px] max-w-[320px] ${
        active
          ? 'border-primary shadow-glow-primary'
          : 'border-border hover:border-border-strong'
      }`}
    >
      {/* 输入输出端口 */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-muted-foreground !border-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-muted-foreground !border-0"
      />

      {/* 标题栏 */}
      <div className="flex items-start justify-between gap-2 px-3 py-2 border-b border-border">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <span
            className={`self-start px-1.5 py-0.5 rounded text-[10px] font-medium border ${meta.cls}`}
          >
            {meta.label}
          </span>
          {active ? (
            <TitleInput
              initialValue={title}
              onCommit={onTitleChange}
            />
          ) : (
            <span className="text-body font-semibold text-foreground truncate">
              {title || '未命名节点'}
            </span>
          )}
        </div>
      </div>

      {/* 参数区 — 仅 active 状态可见 */}
      {active && (
        <div className="px-3 py-2 border-b border-border">
          <ParamsEditor
            params={params}
            onChange={onParamChange}
            onAdd={onParamAdd}
            onRemove={onParamRemove}
          />
        </div>
      )}

      {/* AI 对话区 — 仅 active 状态可见，节点下方 */}
      {active && (
        <ChatPanel
          messages={messages}
          pending={pending}
          draft={draft}
          onDraftChange={onDraftChange}
          onSend={onSend}
        />
      )}
    </div>
  );
}

/* ---------- 标题行内编辑 ---------- */
function TitleInput({
  initialValue,
  onCommit,
}: {
  initialValue: string;
  onCommit: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== initialValue) onCommit(trimmed);
    else setValue(initialValue);
  };

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') {
          setValue(initialValue);
        }
      }}
      className="w-full text-body font-semibold bg-transparent border-b border-primary outline-none py-0"
      placeholder="节点标题"
    />
  );
}

/* ---------- 参数编辑器 ---------- */
function ParamsEditor({
  params,
  onChange,
  onAdd,
  onRemove,
}: {
  params: Record<string, unknown>;
  onChange: (key: string, value: string) => void;
  onAdd: (key: string, value: string) => void;
  onRemove: (key: string) => void;
}) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const entries = Object.entries(params);

  return (
    <div className="flex flex-col gap-1">
      {entries.length === 0 && !adding && (
        <span className="text-[10px] text-muted-foreground italic">
          无参数
        </span>
      )}
      {entries.map(([k, v]) =>
        editingKey === k ? (
          <KeyValueEditor
            key={k}
            initialKey={k}
            initialValue={String(v)}
            onCommit={(newK, newV) => {
              if (newK.trim() !== k) {
                onRemove(k);
                if (newK.trim()) onAdd(newK.trim(), newV);
              } else {
                onChange(k, newV);
              }
              setEditingKey(null);
            }}
            onCancel={() => setEditingKey(null)}
            onDelete={() => {
              onRemove(k);
              setEditingKey(null);
            }}
            placeholder="value"
          />
        ) : (
          <button
            key={k}
            type="button"
            onClick={() => setEditingKey(k)}
            className="flex items-center gap-1.5 text-[11px] text-left w-full hover:bg-secondary/60 rounded px-1 -mx-1 py-0.5 transition-colors"
          >
            <span className="text-muted-foreground font-mono shrink-0">
              {k}
            </span>
            <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/50 shrink-0" />
            <span className="text-foreground font-mono truncate">
              {String(v)}
            </span>
            <Pencil className="w-2.5 h-2.5 text-muted-foreground opacity-0 ml-auto shrink-0" />
          </button>
        )
      )}
      {adding ? (
        <KeyValueEditor
          initialKey=""
          initialValue=""
          onCommit={(k, v) => {
            if (k.trim()) onAdd(k.trim(), v);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
          onDelete={null}
          placeholder="新参数 key = value"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="self-start mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="w-2.5 h-2.5" />
          添加参数
        </button>
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
        className="w-16 px-1 py-0.5 text-[11px] font-mono text-muted-foreground bg-background border border-border rounded outline-none focus:border-primary"
      />
      <span className="text-muted-foreground/50 text-[11px]">=</span>
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={placeholder ?? 'value'}
        aria-label="参数值"
        autoFocus={!initialKey}
        className="flex-1 px-1 py-0.5 text-[11px] font-mono text-foreground bg-background border border-border rounded outline-none focus:border-primary min-w-0"
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCommit(k.trim(), v);
          if (e.key === 'Escape') onCancel();
        }}
      />
      <button
        type="button"
        onClick={() => onCommit(k.trim(), v)}
        className="shrink-0 w-4 h-4 flex items-center justify-center text-success hover:bg-success/10 rounded transition-colors"
        aria-label="保存"
      >
        <Check className="w-2.5 h-2.5" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="shrink-0 w-4 h-4 flex items-center justify-center text-muted-foreground hover:bg-secondary rounded transition-colors"
        aria-label="取消"
      >
        <X className="w-2.5 h-2.5" />
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 w-4 h-4 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded transition-colors"
          aria-label="删除"
        >
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}

/* ---------- 节点内嵌 AI 对话 ---------- */
function ChatPanel({
  messages,
  pending,
  draft,
  onDraftChange,
  onSend,
}: {
  messages: NodeEditorData['messages'];
  pending: boolean;
  draft: string;
  onDraftChange: (text: string) => void;
  onSend: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length, pending]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    onSend();
  };

  return (
    <div className="px-3 py-2 flex flex-col gap-2">
      {/* 消息列表 */}
      <div
        ref={listRef}
        className="max-h-32 min-h-[40px] overflow-y-auto flex flex-col gap-1.5 scroll-smooth"
      >
        {messages.length === 0 && !pending && (
          <p className="text-[10px] text-muted-foreground/60 text-center py-2">
            发送消息与节点对话
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
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="输入指令..."
          aria-label="节点对话输入"
          className="flex-1 h-6 px-2 text-[11px] bg-secondary text-foreground rounded outline-none focus:bg-background border border-border/70 focus:border-primary transition-colors"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!draft.trim() || pending}
          aria-label="发送"
          className="shrink-0 w-6 h-6 flex items-center justify-center bg-primary text-primary-foreground rounded hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
}

export default memo(NodeEditorImpl);