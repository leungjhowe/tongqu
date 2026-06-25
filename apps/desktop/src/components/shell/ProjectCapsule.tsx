import { Capsule } from "@tps/ui";
import { FolderOpen } from "lucide-react";
import type { Project } from "@/data/mockProjects";

interface ProjectCapsuleProps {
  project: Project;
  onOpen: (id: string) => void;
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return "刚刚";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} 分钟前`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} 小时前`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)} 天前`;
  if (diffSec < 86400 * 30) return `${Math.floor(diffSec / 86400 / 7)} 周前`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function ProjectCapsule({ project, onOpen }: ProjectCapsuleProps) {
  const bg = `hsl(${project.thumbnailHue} 70% 35%)`;
  return (
    <Capsule
      as="button"
      onClick={() => onOpen(project.id)}
      alwaysShowLabel
      label={
        <span className="flex flex-col items-start leading-tight max-w-[200px]">
          <span className="text-sm text-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
            {project.name}
          </span>
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            {relativeTime(project.openedAt)}
          </span>
        </span>
      }
      icon={
        <span
          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: bg }}
          aria-hidden
        >
          <FolderOpen className="w-3.5 h-3.5 text-white/80" />
        </span>
      }
      title={project.name}
    />
  );
}
