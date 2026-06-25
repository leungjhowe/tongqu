import { useNavigate } from "react-router-dom";
import { useUIStore } from "@/stores/uiStore";
import HeroHeadline from "./HeroHeadline";
import AiPromptCapsule from "./AiPromptCapsule";
import ProjectRail from "./ProjectRail";

export default function DashboardHome() {
  const setActiveNav = useUIStore((s) => s.setActiveNav);
  const navigate = useNavigate();

  const handleOpen = (id: string) => {
    setActiveNav("workspace");
    navigate(`/app/workspace/${id}`);
  };

  const handleNew = () => {
    setActiveNav("workspace");
    navigate("/app/workspace/new");
  };

  return (
    <main className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center gap-12 px-6 py-12 overflow-y-auto">
      <HeroHeadline />
      <AiPromptCapsule />
      <ProjectRail onOpen={handleOpen} onNew={handleNew} />
    </main>
  );
}
