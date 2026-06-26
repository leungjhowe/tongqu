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
      className="group grid grid-rows-[1fr_auto] items-center justify-items-center gap-2 w-full h-[150px] rounded-lg border-2 border-dashed border-capsule-border-active/50 bg-transparent hover:border-solid hover:border-capsule-border-active hover:bg-capsule-bg/0.4 hover:scale-[1.02] transition-[transform,border-color,background-color] duration-base cursor-pointer"
    >
      <Plus className="w-7 h-7 text-primary group-hover:scale-110 transition-transform" aria-hidden />
      <span className="text-body font-medium text-foreground">新建项目</span>
    </button>
  );
}