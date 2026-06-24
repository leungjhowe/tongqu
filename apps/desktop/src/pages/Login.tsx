import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@tps/ui";
import { useAuthStore } from "@/stores/authStore";
import {
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Command,
  KeyRound,
  UserRound,
} from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const error = useAuthStore((s) => s.error);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const onSubmit = async (e?: FormEvent | KeyboardEvent) => {
    e?.preventDefault?.();
    setLocalError(null);
    if (!username.trim() || !password.trim()) {
      setLocalError("请填写用户名和密码");
      return;
    }
    await login(username, password);
    navigate("/app", { replace: true });
  };

  const displayError = localError ?? error ?? undefined;

  return (
    <div className="relative flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Subtle grid background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />

      {/* Top thin status bar */}
      <header className="relative z-10 h-12 flex-shrink-0 flex items-center justify-between px-6 border-b border-border/60 bg-card/30 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold tracking-wider">
            TP
          </div>
          <div className="text-sm text-foreground/90">交通规划AI工作流系统</div>
          <div className="text-xs text-muted-foreground/60">v0.1.0</div>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground/70">
          <div className="flex items-center gap-1.5">
            <CircleDot className="w-3 h-3 text-emerald-500" />
            <span>系统就绪</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <Command className="w-3 h-3" />
            <span>⌘K 命令面板</span>
          </div>
        </div>
      </header>

      {/* Main split layout */}
      <main className="relative z-10 flex-1 flex min-h-0">
        {/* LEFT: Branding column */}
        <section className="hidden md:flex flex-col justify-between flex-1 max-w-[55%] p-12 lg:p-16 border-r border-border/60">
          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center text-xl font-bold tracking-wider shadow-[0_0_24px_-4px] shadow-primary/40"
                aria-hidden
              >
                TP
              </div>
              <div className="text-xs text-muted-foreground/60 leading-tight">
                <div>Transportation Planning</div>
                <div>AI Workflow System</div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h1 className="text-3xl lg:text-4xl font-semibold text-foreground tracking-tight">
                交通规划AI工作流系统
              </h1>
              <p className="text-sm lg:text-base text-muted-foreground leading-relaxed max-w-md">
                可视化工作流 · 自然语言生成 · GIS 数据分析 · 报告输出 —
                面向交通规划行业的 AI 驱动操作系统。
              </p>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {[
                { label: "工作流", desc: "ComfyUI 风格" },
                { label: "AI 编译器", desc: "NL → Graph" },
                { label: "GIS", desc: "OpenLayers" },
                { label: "数据", desc: "CSV · DuckDB" },
              ].map((chip) => (
                <div
                  key={chip.label}
                  className="flex items-baseline gap-2 px-3 py-1.5 rounded-md border border-border/60 bg-card/40 text-sm"
                >
                  <span className="text-foreground/90">{chip.label}</span>
                  <span className="text-xs text-muted-foreground/60">
                    {chip.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-muted-foreground/60">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/80" />
              <span>本地运行 · 无网络依赖</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/80" />
              <span>数据加密 · 本地存储</span>
            </div>
          </div>
        </section>

        {/* RIGHT: Login form column */}
        <section className="flex-1 flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-sm flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground/60">
                Sign in
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                登录系统
              </h2>
              <p className="text-sm text-muted-foreground">
                输入账号以进入工作区
              </p>
            </div>

            <form
              onSubmit={onSubmit}
              className="flex flex-col gap-4 p-6 rounded-lg border border-border/60 bg-card/60 backdrop-blur"
            >
              <Input
                label="用户名"
                placeholder="请输入用户名"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (localError) setLocalError(null);
                }}
              />
              <Input
                label="密码"
                type="password"
                placeholder="请输入密码"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (localError) setLocalError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSubmit(e);
                }}
                error={displayError}
              />

              <button
                type="submit"
                disabled={isLoading}
                className="group mt-4 flex items-center justify-center gap-2 w-full h-20 rounded-md border border-primary/50 bg-primary/10 hover:bg-primary/20 hover:border-primary text-primary text-base font-medium transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
                    <span>进入中…</span>
                  </>
                ) : (
                  <>
                    <span>进入系统</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center justify-between text-xs text-muted-foreground/60">
              <span>本地模式 · 任意账号即可</span>
              <button
                type="button"
                className="hover:text-foreground transition-colors"
              >
                忘记密码？
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 h-8 flex-shrink-0 flex items-center justify-between px-6 border-t border-border/60 bg-card/30 backdrop-blur text-[11px] text-muted-foreground/50">
        <div className="flex items-center gap-3">
          <UserRound className="w-3 h-3" />
          <span>本地账户</span>
        </div>
        <div className="flex items-center gap-3">
          <KeyRound className="w-3 h-3" />
          <span>会话加密</span>
        </div>
      </footer>
    </div>
  );
}