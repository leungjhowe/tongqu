import { type KeyboardEvent } from "react";
import { AutoTextarea, Capsule } from "@tps/ui";
import { Sparkles, ArrowRight } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";

export default function AiPromptCapsule() {
  const value = useUIStore((s) => s.promptValue);
  const setValue = useUIStore((s) => s.setPromptValue);

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    // 本轮占位：仅打印到 console，未来接 @tps/ai-core
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

  return (
    <Capsule
      as="div"
      className="w-full max-w-2xl min-h-14 px-4 py-2 gap-3 items-center"
      icon={<Sparkles className="w-5 h-5 text-primary flex-shrink-0" aria-hidden />}
      focusGlow
    >
      <AutoTextarea
        minRows={1}
        maxRows={6}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="问点什么吧…  Enter 发送 · Shift+Enter 换行"
        aria-label="AI 提示词输入"
        className="flex-1 text-base text-foreground placeholder:text-muted-foreground py-1"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!value.trim()}
        aria-label="发送"
        title="发送 (Enter)"
        className="w-9 h-9 rounded-full flex items-center justify-center bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90 flex-shrink-0"
      >
        <ArrowRight className="w-4 h-4" aria-hidden />
      </button>
    </Capsule>
  );
}
