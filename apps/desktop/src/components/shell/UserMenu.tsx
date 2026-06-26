import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capsule } from "@tps/ui";
import { User as UserIcon, Settings, LogOut } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export default function UserMenu() {
  const username = useAuthStore((s) => s.user?.username);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="relative" ref={menuRef}>
      <Capsule
        as="button"
        onClick={() => setOpen((v) => !v)}
        icon={
          <span className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
            <UserIcon className="w-3.5 h-3.5" aria-hidden />
          </span>
        }
        label={
          <span className="text-body-lg text-foreground whitespace-nowrap max-w-[120px] overflow-hidden text-ellipsis">
            {username || "访客"}
          </span>
        }
        alwaysShowLabel
        aria-haspopup="menu"
        aria-expanded={open}
      />
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-floating min-w-[160px] py-1 rounded-md border border-border bg-card text-card-foreground shadow-elevation-2"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              // 设置页路由未启用，先静默关闭
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-body text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors duration-fast"
          >
            <Settings className="w-3.5 h-3.5" aria-hidden />
            设置
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-body text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors duration-fast"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden />
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}