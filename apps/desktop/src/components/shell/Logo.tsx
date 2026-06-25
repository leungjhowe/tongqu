import { Capsule } from "@tps/ui";
import { APP_NAME } from "@tps/shared";

interface LogoProps {
  onClick?: () => void;
}

export default function Logo({ onClick }: LogoProps) {
  return (
    <Capsule
      as="button"
      onClick={onClick}
      icon={
        <span
          aria-hidden
          className="w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold tracking-wider"
        >
          TP
        </span>
      }
      label={<span className="text-base text-foreground whitespace-nowrap">{APP_NAME}</span>}
    />
  );
}