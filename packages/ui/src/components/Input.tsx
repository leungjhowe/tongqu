import * as React from 'react';
import { cn } from '../lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
  block?: boolean;
};

let idCounter = 0;
const nextId = () => `input-${++idCounter}`;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, block = true, id, ...props }, ref) => {
    const reactId = React.useId();
    const inputId = id ?? reactId ?? nextId();
    const describedBy = error || hint ? `${inputId}-desc` : undefined;

    return (
      <div className={cn('flex flex-col gap-1.5', block && 'w-full')}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium uppercase tracking-wider text-muted-foreground/80 select-none"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            // layout — h-10 (40px) with py-2.5 keeps the field compact and tap-friendly
            'flex w-full rounded-md px-3.5 py-2.5 text-sm min-h-10',
            // base look — transparent so it sits cleanly on any panel
            'bg-transparent border border-border/70 text-foreground',
            'placeholder:text-muted-foreground/50',
            // interactions
            'transition-all duration-150',
            'hover:border-border',
            'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30',
            // disabled
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border/70',
            // file input bits (rarely used but tidy)
            'file:border-0 file:bg-transparent file:text-sm file:font-medium',
            // error state
            error && 'border-destructive/70 focus-visible:border-destructive focus-visible:ring-destructive/30',
            className,
          )}
          {...props}
        />
        {(error || hint) && (
          <span
            id={describedBy}
            className={cn(
              'text-xs',
              error ? 'text-destructive' : 'text-muted-foreground/70',
            )}
          >
            {error || hint}
          </span>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';