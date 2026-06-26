import { ArrowRight } from "lucide-react";
import type { Project } from "@tps/data-core";
import NewProjectCapsule from "./NewProjectCapsule";
import ProjectCapsule from "./ProjectCapsule";

interface ProjectRailProps {
  projects: Project[];
  onOpen: (id: string) => void;
  onNew: () => void;
  onAll: () => void;
}

const MAX_RECENT = 3;

export default function ProjectRail({ projects, onOpen, onNew, onAll }: ProjectRailProps) {
  const isEmpty = projects.length === 0;
  const recent = projects.slice(0, MAX_RECENT);

  return (
    <div className="w-full">
      {isEmpty ? (
        <div className="flex items-center justify-center py-8 text-body text-muted-foreground">
          暂无历史项目，去<button onClick={onNew} className="ml-1 text-primary hover:underline">新建一个</button>
        </div>
      ) : (
        <>
          <div className="flex items-stretch gap-3">
            <NewProjectCapsule onClick={onNew} />
            {recent.map((p) => (
              <ProjectCapsule key={p.id} project={p} onOpen={onOpen} />
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onAll}
              className="inline-flex items-center gap-1.5 text-body text-muted-foreground hover:text-foreground transition-colors duration-fast px-2 py-1 rounded-md hover:bg-secondary"
              aria-label="查看所有项目"
            >
              所有项目
              <ArrowRight className="w-3.5 h-3.5" aria-hidden />
            </button>
          </div>
        </>
      )}
    </div>
  );
}