import * as React from 'react';
import { cn } from '../lib/utils';
import { Button } from './Button';

export interface PanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  actions?: React.ReactNode;
}

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  (
    {
      className,
      title,
      collapsible = false,
      defaultCollapsed = false,
      collapsed: controlledCollapsed,
      onCollapsedChange,
      actions,
      children,
      ...props
    },
    ref
  ) => {
    const [internalCollapsed, setInternalCollapsed] = React.useState(defaultCollapsed);
    const isControlled = controlledCollapsed !== undefined;
    const collapsed = isControlled ? controlledCollapsed : internalCollapsed;

    const toggle = () => {
      const next = !collapsed;
      if (!isControlled) setInternalCollapsed(next);
      onCollapsedChange?.(next);
    };

    return (
      <div
        ref={ref}
        className={cn('flex flex-col rounded-lg border border-border bg-card text-card-foreground', className)}
        {...props}
      >
        {(title || collapsible || actions) && (
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <div className="text-h3 text-foreground">{title}</div>
            <div className="flex items-center gap-2">
              {actions}
              {collapsible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggle}
                  aria-label={collapsed ? '展开' : '折叠'}
                  className="h-7 w-7 p-0"
                >
                  <span className={cn('transition-transform', collapsed && '-rotate-90')}>▾</span>
                </Button>
              )}
            </div>
          </div>
        )}
        <div
          className={cn(
            'flex-1 overflow-auto p-4 transition-all duration-base',
            collapsed && 'h-0 overflow-hidden p-0'
          )}
        >
          {!collapsed && children}
        </div>
      </div>
    );
  }
);
Panel.displayName = 'Panel';