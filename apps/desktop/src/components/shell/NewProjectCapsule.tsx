import { Capsule } from "@tps/ui";
import { Plus } from "lucide-react";

interface NewProjectCapsuleProps {
  onClick: () => void;
}

export default function NewProjectCapsule({ onClick }: NewProjectCapsuleProps) {
  return (
    <Capsule
      as="button"
      dashed
      onClick={onClick}
      icon={<Plus className="w-4 h-4 text-primary" aria-hidden />}
      alwaysShowLabel
      label={<span className="text-sm whitespace-nowrap text-foreground">新建项目</span>}
      title="新建项目"
    />
  );
}
