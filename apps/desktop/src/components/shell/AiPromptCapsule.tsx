import { useRef, type KeyboardEvent } from "react";
import { Capsule } from "@tps/ui";
import { Sparkles, ArrowRight } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";

export default function AiPromptCapsule() {
  const value = useUIStore((s) => s.promptValue);
  const setValue = useUIStore((s) => s.setPromptValue);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    // 本轮占位：仅打印到 console，未来接 @tps/ai-core
    // eslint-disable-next-line no-console
    console.log("[AiPrompt] submit:", v);
    setValue("");
    inputRef.current?.blur();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <Capsule
      as="div"
      className="w-full max-w-2xl h-12 px-4 gap-3"
      icon={<Sparkles className="w-4 h-4 text-primary" aria-hidden />}
      focusGlow
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="问点什么吧…  Enter 发送"
        aria-label="AI 提示词输入"
        className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!value.trim()}
        aria-label="发送"
        title="发送 (Enter)"
        className="w-7 h-7 rounded-full flex items-center justify-center bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
      >
        <ArrowRight className="w-3.5 h-3.5" aria-hidden />
      </button>
    </Capsule>
  );
}
