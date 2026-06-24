import { useUIStore } from "@/stores/uiStore";
import { Button } from "@tps/ui";
import { NAV_ITEMS } from "@tps/shared";
import {
  CodeIcon,
  BarChartIcon,
  LayersIcon,
  ArchiveIcon,
  GearIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@radix-ui/react-icons";

// Map icon component name (from @tps/shared NAV_ITEMS) → radix icon component.
const ICONS = {
  CodeIcon,
  BarChartIcon,
  LayersIcon,
  ArchiveIcon,
  GearIcon,
} as const;

export default function LeftSidebar() {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const activeNavKey = useUIStore((s) => s.activeNavKey);
  const setActiveNav = useUIStore((s) => s.setActiveNav);

  const width = sidebarCollapsed ? 56 : 220;

  return (
    <aside
      style={{ width }}
      className="flex-shrink-0 h-full bg-card border-r border-border flex flex-col transition-[width] duration-150 overflow-hidden"
    >
      {/* Top section: workspace label */}
      <div className="px-3 pt-3 pb-2 mb-3">
        {sidebarCollapsed ? (
          <div className="h-px bg-border mx-2" />
        ) : (
          <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
            工作台
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex flex-col px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = activeNavKey === item.key;
          const Icon = ICONS[item.icon as keyof typeof ICONS] ?? LayersIcon;
          const navClass = [
            "flex items-center gap-3 px-3 py-2 mb-1 rounded text-sm text-left",
            "transition-colors cursor-pointer w-full",
            isActive
              ? "bg-secondary text-primary"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground",
          ].join(" ");
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveNav(item.key)}
              title={sidebarCollapsed ? item.label : undefined}
              aria-current={isActive ? "page" : undefined}
              className={navClass}
              style={isActive ? { boxShadow: "inset 2px 0 0 hsl(var(--primary))" } : undefined}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary" : ""}`}
                aria-hidden
              />
              {!sidebarCollapsed && (
                <span className="whitespace-nowrap overflow-hidden">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom: collapse toggle */}
      <div className="mt-auto p-2">
        <Button
          variant="ghost"
          size="sm"
          block
          onClick={toggleSidebar}
          title={sidebarCollapsed ? "展开侧栏" : "折叠侧栏"}
          aria-label={sidebarCollapsed ? "展开侧栏" : "折叠侧栏"}
        >
          {sidebarCollapsed ? (
            <ChevronRightIcon className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeftIcon className="w-4 h-4" />
              <span className="ml-1">折叠</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}