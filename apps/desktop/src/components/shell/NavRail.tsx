import { useNavigate } from "react-router-dom";
import { NAV_ITEMS, type NavKey } from "@tps/shared";
import { HomeIcon, LayoutIcon, ArchiveIcon, LayersIcon } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import NavCapsule from "./NavCapsule";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  HomeIcon,
  LayoutIcon,
  ArchiveIcon,
  LayersIcon,
};

const ROUTE_BY_KEY: Record<NavKey, string> = {
  home: "/app/home",
  workspace: "/app/workspace",
  assets: "/app/assets",
  templates: "/app/templates",
};

export default function NavRail() {
  const activeNavKey = useUIStore((s) => s.activeNavKey);
  const setActiveNav = useUIStore((s) => s.setActiveNav);
  const navigate = useNavigate();

  return (
    <nav className="flex items-center gap-1.5" aria-label="主导航">
      {NAV_ITEMS.map((item) => {
        const Icon = ICONS[item.icon] ?? LayersIcon;
        return (
          <NavCapsule
            key={item.key}
            navKey={item.key}
            label={item.label}
            icon={<Icon className="w-4 h-4" aria-hidden />}
            active={activeNavKey === item.key}
            onSelect={(k) => {
              setActiveNav(k);
              navigate(ROUTE_BY_KEY[k]);
            }}
          />
        );
      })}
    </nav>
  );
}