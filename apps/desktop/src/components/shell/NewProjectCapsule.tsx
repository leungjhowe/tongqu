import { Plus } from "lucide-react";

interface NewProjectCapsuleProps {
  onClick: () => void;
}

export default function NewProjectCapsule({ onClick }: NewProjectCapsuleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="新建项目"
      className="group flex flex-col items-center justify-center gap-2 w-[200px] h-[150px] rounded-lg border-2 border-dashed border-[hsl(var(--capsule-border-active)/0.5)] bg-transparent hover:border-solid hover:border-[hsl(var(--capsule-border-active))] hover:bg-[hsl(var(--capsule-bg)/0.4)] hover:scale-[1.02] transition-[transform,border-color,background-color] duration-200 cursor-pointer"
    >
      <Plus className="w-7 h-7 text-primary group-hover:scale-110 transition-transform" aria-hidden />
      <span className="text-sm font-medium text-foreground">新建项目</span>
    </button>
  );
}