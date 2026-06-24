import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const nodeCardVariants = cva(
  'relative flex flex-col gap-2 rounded border bg-card text-card-foreground shadow-sm transition-all min-w-[140px]',
  {
    variants: {
      type: {
        data: 'border-l-4 border-l-primary',
        transform: 'border-l-4 border-l-ring',
        output: 'border-l-4 border-l-destructive',
      },
      selected: {
        true: 'shadow-[0_0_0_1px_hsl(var(--primary)),0_0_12px_hsl(var(--primary)/0.35)] border-primary',
        false: 'border-border',
      },
    },
    defaultVariants: {
      type: 'transform',
      selected: false,
    },
  }
);

export interface NodeCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof nodeCardVariants> {
  title: string;
  inputs?: number;
  outputs?: number;
  subtitle?: string;
}

const Port = ({ side }: { side: 'left' | 'right' }) => (
  <span
    className={cn(
      'absolute top-2 h-2 w-2 rounded-full bg-muted-foreground',
      side === 'left' ? '-left-1' : '-right-1'
    )}
  />
);

export const NodeCard = React.forwardRef<HTMLDivElement, NodeCardProps>(
  ({ className, title, type, selected, inputs = 0, outputs = 0, subtitle, ...props }, ref) => {
    const inputPorts = Array.from({ length: inputs }, (_, i) => <Port key={`i${i}`} side="left" />);
    const outputPorts = Array.from({ length: outputs }, (_, i) => <Port key={`o${i}`} side="right" />);

    return (
      <div
        ref={ref}
        className={cn(nodeCardVariants({ type, selected, className }), 'p-3')}
        {...props}
      >
        {inputPorts}
        {outputPorts}
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {type}
        </div>
        <div className="text-sm font-medium text-foreground">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
      </div>
    );
  }
);
NodeCard.displayName = 'NodeCard';