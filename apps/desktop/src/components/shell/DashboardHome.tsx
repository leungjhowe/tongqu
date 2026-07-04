import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getRecentProjects,
  createProject,
  touchProject,
  type Project,
} from "@tongqu/data-core";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import HeroHeadline from "./HeroHeadline";
import AiPromptCapsule from "./AiPromptCapsule";
import ProjectRail from "./ProjectRail";
import NewProjectModal from "./NewProjectModal";

export default function DashboardHome() {
  const setActiveNav = useUIStore((s) => s.setActiveNav);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const reload = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await getRecentProjects(user.id, 3);
      setProjects(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [user?.id]);

  const handleOpen = async (id: string) => {
    await touchProject(id);
    setActiveNav("workspace");
    navigate(`/app/workspace/${id}`);
  };

  const handleNew = () => setModalOpen(true);

  const handleCreated = async (project: Project) => {
    setModalOpen(false);
    setActiveNav("workspace");
    navigate(`/app/workspace/${project.id}`);
  };

  if (!user) return null;

  return (
    <main className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center gap-10 px-6 py-12 overflow-y-auto">
      <div className="w-full max-w-2xl sm:max-w-3xl lg:max-w-4xl flex flex-col items-center gap-10">
        <HeroHeadline />
        <AiPromptCapsule />
        {loading ? (
          <div className="text-body text-muted-foreground py-8">加载中...</div>
        ) : (
          <ProjectRail projects={projects} onOpen={handleOpen} onNew={handleNew} onAll={() => {
            setActiveNav("workspace");
            navigate("/app/workspace");
          }} />
        )}
      </div>
      <NewProjectModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={handleCreated} />
    </main>
  );
}
