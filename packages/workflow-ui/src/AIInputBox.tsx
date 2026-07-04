import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { Mention, MentionsInput } from 'react-mentions';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Streamdown } from 'streamdown';
import remarkGfm from 'remark-gfm';
import {
  AlertCircle,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Loader2,
  Mic,
  MicOff,
  Paperclip,
  Send,
  Sparkles,
  Square,
  X,
} from 'lucide-react';

/* ===================== 类型定义 ===================== */

/**
 * @提及候选（可以是用户 / 智能体 / 工具 / 工作流节点）
 */
export interface MentionSuggestion {
  id: string;
  /** 显示名（不含 @），用于候选列表与已选 token */
  display: string;
}

/**
 * 已上传的附件
 */
export interface AIInputAttachment {
  id: string;
  file: File;
  /** 图片类型会有预览 URL（objectURL），其它类型没有 */
  previewUrl?: string;
  type: 'image' | 'file';
}

/**
 * 提交时的载荷
 */
export interface AIInputPayload {
  /** 纯文本（@mention 会被解析为 [display](id) 形式，按需自行解析） */
  text: string;
  /** 解析出的所有 @mention */
  mentions: { id: string; display: string }[];
  /** 附件列表 */
  attachments: AIInputAttachment[];
}

export interface AIInputBoxProps {
  /** 提交回调（异步可，返回 Promise 时按钮会显示加载态） */
  onSubmit?: (payload: AIInputPayload) => Promise<void> | void;
  /** @提及候选，默认给一些示例 */
  mentionSuggestions?: MentionSuggestion[];
  /** 输入框占位符 */
  placeholder?: string;
  /** 受控值 */
  value?: string;
  /** 受控值变化 */
  onChange?: (text: string) => void;
  /** 最大附件数，默认 8 */
  maxFiles?: number;
  /** 单文件最大字节，默认 10MB */
  maxSizeBytes?: number;
  /** 接受的 mime 映射，默认接收图片+常见文档 */
  accept?: Record<string, string[]>;
  /** 外部控制提交中状态（与 onSubmit 的 Promise 互不覆盖） */
  pending?: boolean;
  /** 顶部自定义内容（提示/快捷指令） */
  headerExtra?: React.ReactNode;
  /** 自定义类 */
  className?: string;
  /** 是否禁用整体输入 */
  disabled?: boolean;
}

/* ===================== 默认数据 ===================== */

/** 默认 @候选：智能体 + 工具 + 工作流节点 */
const DEFAULT_MENTIONS: MentionSuggestion[] = [
  { id: 'agent:researcher', display: '研究员' },
  { id: 'agent:writer', display: '文案助手' },
  { id: 'agent:coder', display: '代码助手' },
  { id: 'tool:search', display: '联网搜索' },
  { id: 'tool:image', display: '画图' },
  { id: 'tool:python', display: '运行 Python' },
  { id: 'node:root', display: '工作流根节点' },
];

const DEFAULT_ACCEPT: Record<string, string[]> = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'text/csv': ['.csv'],
  'application/json': ['.json'],
};

/* ===================== 工具方法 ===================== */

/** 生成短 id（不依赖 nanoid 以减小包体） */
function uid(prefix = 'a'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

/** 字节数转可读字符串 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/** 从 react-mentions 的 rawMarkup 中解析所有 mention */
function parseMentions(raw: string): { id: string; display: string }[] {
  const out: { id: string; display: string }[] = [];
  const re = /@\[([^\]]+)\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    out.push({ display: m[1], id: m[2] });
  }
  return out;
}

/** react-mentions 的纯文本形式（去掉 @[display](id) → @display） */
function toPlainText(raw: string): string {
  return raw.replace(/@\[([^\]]+)\]\(([^)]+)\)/g, '@$1');
}

/* ===================== react-mentions 样式 ===================== */

const mentionsStyle: any = {
  control: {
    backgroundColor: 'transparent',
    fontSize: 13,
    fontWeight: 400,
    lineHeight: 1.55,
  },
  input: {
    margin: 0,
    padding: '10px 12px',
    outline: 'none',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--foreground, #e5e7eb)',
    minHeight: 56,
  },
  highlighter: {
    margin: 0,
    padding: '10px 12px',
    border: 'none',
    color: 'var(--foreground, #e5e7eb)',
    overflow: 'hidden',
  },
  suggestions: {
    list: {
      backgroundColor: 'var(--card, #1f2937)',
      border: '1px solid var(--border, rgba(255,255,255,0.1))',
      borderRadius: 8,
      fontSize: 12,
      padding: 4,
      marginTop: 6,
      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      maxHeight: 220,
      overflowY: 'auto',
      zIndex: 9999,
    },
    item: {
      padding: '6px 10px',
      borderRadius: 6,
      color: 'var(--foreground, #e5e7eb)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    },
    itemFocused: {
      backgroundColor: 'var(--primary, #6366f1)',
      color: '#fff',
    },
  },
};

/* ===================== 主组件 ===================== */

/**
 * AIInputBox — 工作流编辑器的统一 AI 输入框
 *
 * 能力：
 *  1. react-dropzone        拖拽 / 点击 / 粘贴上传附件（图片缩略图 + 文件名）
 *  2. react-mentions        @智能体 / @工具 / @节点 提及 + 候选列表
 *  3. react-speech-recognition 麦克风语音输入（中文/英文均可）
 *  4. streamdown + remark-gfm  实时 Markdown 预览（GFM：表格 / 任务列表 / 删除线等）
 *
 * 提交时回调拿到结构化 payload：纯文本 + mentions + 附件
 */
export default function AIInputBox({
  onSubmit,
  mentionSuggestions = DEFAULT_MENTIONS,
  placeholder = '输入指令，@ 智能体 / 工具，或拖入文件…',
  value,
  onChange,
  maxFiles = 8,
  maxSizeBytes = 10 * 1024 * 1024,
  accept = DEFAULT_ACCEPT,
  pending: externalPending,
  headerExtra,
  className = '',
  disabled = false,
}: AIInputBoxProps) {
  /* -------- 内部状态 -------- */
  const isControlled = value !== undefined;
  const [innerText, setInnerText] = useState('');
  const text = isControlled ? (value as string) : innerText;

  const [attachments, setAttachments] = useState<AIInputAttachment[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [internalPending, setInternalPending] = useState(false);
  const submitting = externalPending ?? internalPending;

  const [micError, setMicError] = useState<string | null>(null);

  const inputWrapperRef = useRef<HTMLDivElement | null>(null);
  // 用于把语音识别追加到当前文本末尾
  const transcriptRef = useRef('');

  /* -------- 语音识别 -------- */
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition();

  // 当 transcript 变化时，把新内容追加到输入框（用 ref 避免闭包旧值）
  useEffect(() => {
    if (!listening) return;
    const delta = transcript.slice(transcriptRef.current.length);
    if (delta) {
      setInnerText((prev) => {
        const base = isControlled ? '' : prev;
        return base + delta;
      });
      transcriptRef.current = transcript;
    }
  }, [transcript, listening, isControlled]);

  // 启动 / 停止
  const toggleMic = useCallback(async () => {
    setMicError(null);
    if (!browserSupportsSpeechRecognition) {
      setMicError('当前浏览器不支持语音识别');
      return;
    }
    if (!isMicrophoneAvailable) {
      // 某些浏览器需要先请求权限
      try {
        await navigator.mediaDevices?.getUserMedia?.({ audio: true });
      } catch (err: any) {
        setMicError('未授权麦克风权限');
        return;
      }
    }
    if (listening) {
      SpeechRecognition.stopListening();
      // 把 transcriptRef 校准到当前 transcript，方便下次继续追加
      transcriptRef.current = transcript;
    } else {
      resetTranscript();
      transcriptRef.current = '';
      SpeechRecognition.startListening({
        continuous: true,
        interimResults: true,
        language: 'zh-CN',
      });
    }
  }, [browserSupportsSpeechRecognition, isMicrophoneAvailable, listening, transcript]);

  /* -------- 拖拽上传 -------- */
  const onDrop = useCallback(
    (accepted: File[], fileRejections: FileRejection[]) => {
      // 拒绝原因
      if (fileRejections.length) {
        const msgs = fileRejections.map((r) => {
          const reason = r.errors[0]?.message ?? '未知错误';
          return `${r.file.name}: ${reason}`;
        });
        setRejected((prev) => [...prev, ...msgs].slice(-3));
        window.setTimeout(() => setRejected([]), 4000);
      }
      if (!accepted.length) return;

      setAttachments((prev) => {
        const room = Math.max(0, maxFiles - prev.length);
        const next = accepted.slice(0, room).map<AIInputAttachment>((f) => ({
          id: uid('att'),
          file: f,
          type: f.type.startsWith('image/') ? 'image' : 'file',
          previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
        }));
        return [...prev, ...next];
      });
    },
    [maxFiles],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept,
    maxSize: maxSizeBytes,
    maxFiles,
    noClick: true, // 整体由工具栏按钮触发，避免与 mention 列表冲突
    noKeyboard: true,
  });

  // 组件卸载时清理 objectURL
  useEffect(() => {
    return () => {
      attachments.forEach((a) => {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      });
    };
    // 只在卸载时清理
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 移除单个附件
  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  /* -------- 输入回调 -------- */
  const setText = useCallback(
    (next: string) => {
      if (!isControlled) setInnerText(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  /* -------- 提交 -------- */
  const handleSubmit = useCallback(async () => {
    if (submitting || disabled) return;
    const plain = toPlainText(text).trim();
    if (!plain && attachments.length === 0) return;

    // 如果还在听，先停
    if (listening) SpeechRecognition.stopListening();

    const payload: AIInputPayload = {
      text: plain,
      mentions: parseMentions(text),
      attachments,
    };

    try {
      const maybe = onSubmit?.(payload);
      if (maybe && typeof (maybe as Promise<void>).then === 'function') {
        setInternalPending(true);
        await maybe;
      }
    } finally {
      setInternalPending(false);
      // 清空（受控模式由父组件决定）
      if (!isControlled) setInnerText('');
      setAttachments([]);
      resetTranscript();
      transcriptRef.current = '';
    }
  }, [submitting, disabled, text, attachments, onSubmit, listening, isControlled, resetTranscript]);

  /* -------- 键盘：Enter 提交 / Shift+Enter 换行 -------- */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement> | KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        void handleSubmit();
      }
    },
    [handleSubmit],
  );

  /* -------- 候选数据（包装一层以满足 react-mentions 的类型） -------- */
  const mentionData = useMemo(
    () => mentionSuggestions.map((m) => ({ id: m.id, display: m.display })),
    [mentionSuggestions],
  );

  /* -------- 渲染 -------- */
  const canSubmit =
    !submitting && !disabled && (toPlainText(text).trim().length > 0 || attachments.length > 0);

  return (
    <div
      className={`relative w-full rounded-xl bg-card text-card-foreground border border-border shadow-elevation-3 overflow-hidden transition-colors ${className}`}
    >
      {/* 拖拽时的全屏高亮提示 */}
      {isDragActive && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-xl">
          <div className="flex items-center gap-2 text-primary text-body font-medium">
            <Paperclip className="w-4 h-4" />
            松开鼠标上传文件
          </div>
        </div>
      )}

      {/* 顶部提示栏（可选） */}
      {headerExtra && (
        <div className="px-3 pt-2 text-micro text-muted-foreground">{headerExtra}</div>
      )}

      {/* 附件预览 chips */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pt-3">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="group relative flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg bg-secondary/70 border border-border hover:border-primary/40 transition-colors"
            >
              {a.type === 'image' && a.previewUrl ? (
                <img
                  src={a.previewUrl}
                  alt={a.file.name}
                  className="w-7 h-7 rounded object-cover border border-border"
                />
              ) : (
                <span className="w-7 h-7 rounded bg-background border border-border flex items-center justify-center">
                  {a.type === 'image' ? (
                    <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </span>
              )}
              <div className="flex flex-col leading-tight max-w-[140px]">
                <span className="text-[11px] text-foreground truncate">{a.file.name}</span>
                <span className="text-[9px] text-muted-foreground">{formatSize(a.file.size)}</span>
              </div>
              <button
                type="button"
                aria-label="移除附件"
                onClick={() => removeAttachment(a.id)}
                className="ml-1 p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 输入区 / 预览区 */}
      <div ref={inputWrapperRef} className="px-3 pt-3">
        {showPreview ? (
          // ===== 预览视图（streamdown + remark-gfm） =====
          <div className="min-h-[56px] max-h-64 overflow-y-auto rounded-md bg-background/40 border border-border px-3 py-2">
            {toPlainText(text).trim() ? (
              <div className="prose prose-invert prose-xs max-w-none [&_a]:text-primary [&_code]:text-primary [&_table]:text-[11px]">
                <Streamdown remarkPlugins={[remarkGfm]}>{toPlainText(text)}</Streamdown>
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground/60 italic">暂无内容预览</p>
            )}
            {attachments.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border text-[10px] text-muted-foreground">
                附带 {attachments.length} 个文件（提交时随 payload 一起发送）
              </div>
            )}
          </div>
        ) : (
          // ===== 编辑视图（react-mentions） =====
          <div
            {...getRootProps({
              className:
                'rounded-md bg-background/40 border border-border focus-within:border-primary/60 transition-colors',
            })}
          >
            <input {...getInputProps()} />
            <MentionsInput
              value={text}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>, newValue: string) => setText(newValue)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || submitting}
              style={mentionsStyle}
              forceSuggestionsAboveCursor
              a11ySuggestionsListLabel="建议列表"
              className="w-full"
            >
              <Mention
                trigger="@"
                data={mentionData}
                markup="@[__display__](__id__)"
                displayTransform={(id: string, display: string) => `@${display}`}
                appendSpaceOnAdd
                className="bg-primary/20 text-primary rounded px-0.5"
              />
            </MentionsInput>
          </div>
        )}
      </div>

      {/* 工具栏 */}
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 mt-1">
        <div className="flex items-center gap-0.5">
          {/* 上传 */}
          <button
            type="button"
            onClick={open}
            disabled={disabled || attachments.length >= maxFiles}
            title={`上传文件（最多 ${maxFiles} 个）`}
            aria-label="上传文件"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <Paperclip className="w-3.5 h-3.5" />
          </button>

          {/* 麦克风 */}
          <button
            type="button"
            onClick={toggleMic}
            disabled={disabled || !browserSupportsSpeechRecognition}
            title={
              listening
                ? '停止语音输入'
                : browserSupportsSpeechRecognition
                ? '开始语音输入'
                : '当前浏览器不支持语音识别'
            }
            aria-label={listening ? '停止语音输入' : '开始语音输入'}
            className={`p-1.5 rounded-md transition-colors ${
              listening
                ? 'text-primary bg-primary/15 hover:bg-primary/25'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            } disabled:opacity-40 disabled:hover:bg-transparent`}
          >
            {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>

          {/* 预览切换 */}
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            disabled={disabled}
            title={showPreview ? '回到编辑' : '预览 Markdown'}
            aria-label={showPreview ? '回到编辑' : '预览 Markdown'}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>

          {/* 语音/错误提示 */}
          {(listening || micError) && (
            <span className="ml-1 flex items-center gap-1 text-[10px] text-muted-foreground">
              {listening && (
                <>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  正在聆听…
                </>
              )}
              {micError && (
                <span className="flex items-center gap-1 text-amber-500">
                  <AlertCircle className="w-3 h-3" />
                  {micError}
                </span>
              )}
            </span>
          )}
        </div>

        {/* 右侧：长度 + 提交 */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/70 tabular-nums">
            {toPlainText(text).length}
            {attachments.length > 0 && (
              <span className="ml-1">· {attachments.length} 个附件</span>
            )}
          </span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            title={canSubmit ? '发送（Enter）' : '输入内容或附加文件'}
            aria-label="发送"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              canSubmit
                ? 'bg-primary text-primary-foreground hover:opacity-90'
                : 'bg-secondary text-muted-foreground cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                发送中
              </>
            ) : (
              <>
                <Send className="w-3 h-3" />
                发送
              </>
            )}
          </button>
        </div>
      </div>

      {/* 拒绝原因（短时间内自动消失） */}
      {rejected.length > 0 && (
        <div className="px-3 pb-2 -mt-1 text-[10px] text-amber-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {rejected[rejected.length - 1]}
        </div>
      )}

      {/* 语音识别激活时的底部高亮条（仅装饰） */}
      {listening && (
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
      )}
    </div>
  );
}

/* ===================== 命名导出（方便按需引用） ===================== */

export { AIInputBox };

/* ===================== 占位（避免 tree-shaking 警告） ===================== */

/** 提示：Sparkles / Square 仅用于未来扩展（如快捷指令面板 / 中止按钮），保留以备使用。 */
export const __reservedIcons = { Sparkles, Square };