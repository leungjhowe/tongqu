import { useNavigate } from "react-router-dom";
import { Button } from "@tps/ui";
import { useAuthStore } from "@/stores/authStore";
import LeftSidebar from "./app/LeftSidebar";
import CenterCanvas from "./app/CenterCanvas";
import RightChatPanel from "./app/RightChatPanel";

export default function AppShell() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Top header bar */}
      <header className="h-11 flex-shrink-0 w-full flex items-center justify-between px-4 bg-card border-b border-border">
        {/* Left: logo + breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-6 h-6 rounded-sm bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold tracking-wider flex-shrink-0"
            aria-label="TP logo"
            title="TP"
          >
            TP
          </div>
          <div className="text-sm text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
            项目 / <span className="text-foreground">默认项目</span>
          </div>
        </div>

        {/* Center: project title + switch */}
        <div className="flex items-center gap-2">
          <div className="text-base font-semibold text-foreground">默认项目</div>
          <Button size="sm" variant="ghost">
            切换
          </Button>
        </div>

        {/* Right: logout + window controls placeholder */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleLogout}
            aria-label="退出登录"
            title="退出登录"
            className="text-muted-foreground hover:text-destructive"
          >
            退出
          </Button>
          <div
            className="flex items-center gap-1.5"
            aria-hidden="true"
            title="窗口控件（webview 占位）"
          >
            <span className="w-2 h-2 rounded-full bg-muted-foreground opacity-60" />
            <span className="w-2 h-2 rounded-full bg-muted-foreground opacity-60" />
            <span className="w-2 h-2 rounded-full bg-muted-foreground opacity-60" />
          </div>
        </div>
      </header>

      {/* Main 3-panel area */}
      <div className="flex-1 flex flex-row min-h-0">
        <LeftSidebar />
        <CenterCanvas />
        <RightChatPanel />
      </div>
    </div>
  );
}
