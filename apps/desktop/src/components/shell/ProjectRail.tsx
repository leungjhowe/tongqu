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
    <div className="w-full max-w-5xl">
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
          className="relative overflow-x-auto overflow-y-hidden -mx-3 px-3 py-2"
          style={{ scrollbarWidth: "thin" }}
        >
          {/* Left fade mask */}
          <div
            aria-hidden
            className="sticky left-0 top-0 bottom-0 w-8 -ml-3 pointer-events-none"
            style={{
              background: "linear-gradient(to right, hsl(var(--background)) 0%, transparent 100%)",
            }}
          />
          <div className="flex items-center gap-2 min-w-min">
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
