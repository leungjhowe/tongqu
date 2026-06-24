import * as React from 'react';
import { cn } from '../lib/utils';

export interface SplitLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  leftWidth?: number | string;       // px or CSS length
  rightWidth?: number | string;      // px or CSS length
  resizable?: boolean;               // reserved for future drag handle
}

const toCssLength = (v: number | string | undefined): string => {
  if (v === undefined) return '';
  return typeof v === 'number' ? `${v}px` : v;
};

export const SplitLayout = React.forwardRef<HTMLDivElement, SplitLayoutProps>(
  (
    {
      className,
      left,
      center,
      right,
      leftWidth = 220,
      rightWidth = 320,
      resizable = false,
      ...props
    },
    ref
  ) => (
    <div
      ref={ref}
      className={cn('flex h-full w-full min-h-0 overflow-hidden', className)}
      {...props}
    >
      {left !== undefined && (
        <aside
          className="flex shrink-0 flex-col border-r border-border bg-card"
          style={{ width: toCssLength(leftWidth) }}
        >
          {left}
        </aside>
      )}
      <main className="flex flex-1 min-w-0 flex-col bg-background">
        {center}
      </main>
      {right !== undefined && (
        <aside
          className="flex shrink-0 flex-col border-l border-border bg-card"
          style={{ width: toCssLength(rightWidth) }}
        >
          {right}
        </aside>
      )}
    </div>
  )
);
SplitLayout.displayName = 'SplitLayout';