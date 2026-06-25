import { MOCK_PROJECTS, type Project } from "@/data/mockProjects";
import NewProjectCapsule from "./NewProjectCapsule";
import ProjectCapsule from "./ProjectCapsule";

interface ProjectRailProps {
  projects?: Project[];
  onOpen: (id: string) => void;
  onNew: () => void;
}

export default function ProjectRail({ projects, onOpen, onNew }: ProjectRailProps) {
  const list = projects ?? MOCK_PROJECTS;
  const isEmpty = list.length === 0;

  return (
    <div className="w-full max-w-2xl">
      {isEmpty ? (
        <div className="flex items-center justify-center py-8">
          <div className="capsule cursor-default" data-always-show-label="true">
            <span className="capsule__label text-sm text-muted-foreground">
              暂无历史项目，去新建一个 →
            </span>
          </div>
        </div>
      ) : (
        <div
          aria-label="最近项目横向列表"
          className="scroll-area w-full overflow-x-auto overflow-y-hidden px-1 py-2"
        >
          <div className="flex items-stretch gap-3 min-w-min">
            <NewProjectCapsule onClick={onNew} />
            {list.map((p) => (
              <ProjectCapsule key={p.id} project={p} onOpen={onOpen} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
