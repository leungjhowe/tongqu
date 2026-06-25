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
    <button
      type="button"
      onClick={() => onOpen(project.id)}
      title={project.name}
      className="group flex flex-col w-[200px] h-[150px] rounded-lg overflow-hidden border border-[hsl(var(--capsule-border))] bg-[hsl(var(--capsule-bg)/0.7)] hover:border-[hsl(var(--capsule-border-active))] hover:scale-[1.02] transition-[transform,border-color] duration-200 cursor-pointer text-left"
    >
      <span
        className="relative flex-1 flex items-center justify-center group-hover:brightness-110 transition-[filter] duration-200"
        style={{ background: bg }}
        aria-hidden
      >
        <FolderOpen className="w-8 h-8 text-white/85" />
      </span>
      <span className="flex flex-col gap-0.5 px-3 py-2 min-h-[60px]">
        <span className="text-sm font-medium text-foreground truncate">
          {project.name}
        </span>
        <span className="text-[11px] text-muted-foreground truncate">
          {relativeTime(project.openedAt)}
        </span>
      </span>
    </button>
  );
}
