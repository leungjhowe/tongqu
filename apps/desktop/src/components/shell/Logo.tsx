import { Capsule } from "@tongqu/ui";
import { APP_NAME } from "@tongqu/shared";

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
          className="w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-micro font-bold tracking-wider"
        >
          TP
        </span>
      }
      label={<span className="text-body-lg text-foreground whitespace-nowrap">{APP_NAME}</span>}
    />
  );
}