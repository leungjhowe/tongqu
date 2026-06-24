import * as React from 'react';
import { cn } from '../lib/utils';

export interface MapPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  overlay?: React.ReactNode;
}

export const MapPanel = React.forwardRef<HTMLDivElement, MapPanelProps>(
  ({ className, title, overlay, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative flex h-full w-full flex-col overflow-hidden bg-secondary text-secondary-foreground',
        // Faint grid pattern mimicking GIS coordinate plane
        "bg-[linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] bg-[size:32px_32px]",
        className
      )}
      {...props}
    >
      {title && (
        <div className="z-10 flex items-center justify-between border-b border-border bg-card/80 px-4 py-2 backdrop-blur">
          <div className="text-sm font-medium">{title}</div>
          {overlay}
        </div>
      )}
      <div className="flex flex-1 items-center justify-center">
        {children ?? (
          <div className="text-center">
            <div className="text-2xl font-semibold text-muted-foreground">Map / GIS</div>
            <div className="mt-1 text-xs text-muted-foreground">OpenLayers integration pending</div>
          </div>
        )}
      </div>
    </div>
  )
);
MapPanel.displayName = 'MapPanel';