import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const cardVariants = cva(
  'rounded-lg border border-border bg-card text-card-foreground transition-shadow duration-base',
  {
    variants: {
      padding: {
        none: 'p-0',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
      },
      glow: {
        true: 'shadow-glow-primary',
        false: 'shadow-elevation-1',
      },
      interactive: {
        true: 'cursor-pointer hover:border-ring',
        false: '',
      },
    },
    defaultVariants: {
      padding: 'md',
      glow: false,
      interactive: false,
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding, glow, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ padding, glow, interactive, className }))}
      {...props}
    />
  )
);
Card.displayName = 'Card';