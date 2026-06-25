import * as React from 'react';
import { cn } from '../lib/utils';

export interface CapsuleProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'div' | 'button' | 'a';
  href?: string;
  active?: boolean;
  alwaysShowLabel?: boolean;
  dashed?: boolean;
  focusGlow?: boolean;
  label?: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Capsule = React.forwardRef<HTMLElement, CapsuleProps>(
  (
    {
      as = 'button',
      href,
      active = false,
      alwaysShowLabel = false,
      dashed = false,
      focusGlow = false,
      label,
      icon,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp: React.ElementType = as === 'a' ? 'a' : as;
    const extraProps = as === 'a' && href ? { href } : {};
    return (
      <Comp
        ref={ref as React.Ref<any>}
        className={cn('capsule', dashed && 'capsule--dashed', className)}
        data-active={active || undefined}
        data-always-show-label={alwaysShowLabel || active || undefined}
        data-focus-glow={focusGlow || undefined}
        {...(as === 'button' ? { type: 'button' as const } : {})}
        {...extraProps}
        {...props}
      >
        {icon != null && <span className="capsule__icon">{icon}</span>}
        {label != null && <span className="capsule__label">{label}</span>}
        {children}
      </Comp>
    );
  },
);
Capsule.displayName = 'Capsule';
