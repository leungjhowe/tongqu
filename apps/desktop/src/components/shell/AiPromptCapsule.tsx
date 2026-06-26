import { type KeyboardEvent } from "react";
import { AutoTextarea } from "@tps/ui";
import { Paperclip, Image as ImageIcon, AtSign, Mic, ArrowUp } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";

export default function AiPromptCapsule() {
  const value = useUIStore((s) => s.promptValue);
  const setValue = useUIStore((s) => s.setPromptValue);

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    // eslint-disable-next-line no-console
    console.log("[AiPrompt] submit:", v);
    setValue("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const canSend = value.trim().length > 0;

  return (
    <div className="w-full max-w-2xl sm:max-w-3xl lg:max-w-4xl rounded-2xl border border-border bg-card/70 backdrop-blur-md p-3 transition-[border-color,box-shadow] duration-base focus-within:border-primary focus-within:shadow-glow-primary">
      <AutoTextarea
        minRows={2}
        maxRows={5}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="问点什么吧…  Enter 发送 · Shift+Enter 换行"
        aria-label="AI 提示词输入"
        className="w-full text-base text-foreground placeholder:text-muted-foreground px-1 py-1"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1" role="toolbar" aria-label="附加工具">
          <button type="button" title="附件" aria-label="附件" className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <Paperclip className="w-4 h-4" aria-hidden />
          </button>
          <button type="button" title="图片" aria-label="图片" className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <ImageIcon className="w-4 h-4" aria-hidden />
          </button>
          <button type="button" title="提及项目" aria-label="提及项目" className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <AtSign className="w-4 h-4" aria-hidden />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" title="语音输入" aria-label="语音输入" className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <Mic className="w-4 h-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            title="发送 (Enter)"
            aria-label="发送"
            className="w-8 h-8 rounded-md flex items-center justify-center bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
          >
            <ArrowUp className="w-4 h-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}