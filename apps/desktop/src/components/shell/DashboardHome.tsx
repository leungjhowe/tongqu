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

  const handleAllProjects = () => {
    setActiveNav("workspace");
    navigate("/app/workspace");
  };

  return (
    <main className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center gap-10 px-6 py-12 overflow-y-auto">
      <div className="w-full max-w-2xl sm:max-w-3xl lg:max-w-4xl flex flex-col items-center gap-10">
        <HeroHeadline />
        <AiPromptCapsule />
        <ProjectRail onOpen={handleOpen} onNew={handleNew} onAll={handleAllProjects} />
      </div>
    </main>
  );
}