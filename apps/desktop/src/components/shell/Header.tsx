import { useNavigate } from "react-router-dom";
import { useUIStore } from "@/stores/uiStore";
import Logo from "./Logo";
import NavRail from "./NavRail";
import UserMenu from "./UserMenu";

export default function Header() {
  const setActiveNav = useUIStore((s) => s.setActiveNav);
  const navigate = useNavigate();

  return (
    <header className="relative z-20 h-20 flex-shrink-0 w-full flex items-center justify-between gap-4 px-6">
      <Logo onClick={() => {
        setActiveNav("home");
        navigate("/app/home");
      }} />
      <div className="flex-1 flex justify-center">
        <NavRail />
      </div>
      <UserMenu />
    </header>
  );
}
