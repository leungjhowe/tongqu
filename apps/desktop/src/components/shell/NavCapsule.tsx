import type { ReactNode } from "react";
import { Capsule } from "@tps/ui";
import type { NavKey } from "@tps/shared";

interface NavCapsuleProps {
  navKey: NavKey;
  label: string;
  icon: ReactNode;
  active: boolean;
  onSelect: (key: NavKey) => void;
}

export default function NavCapsule({ navKey, label, icon, active, onSelect }: NavCapsuleProps) {
  return (
    <Capsule
      as="button"
      active={active}
      alwaysShowLabel={active}
      icon={icon}
      label={<span className="text-sm whitespace-nowrap">{label}</span>}
      onClick={() => onSelect(navKey)}
      aria-current={active ? "page" : undefined}
      title={label}
    />
  );
}