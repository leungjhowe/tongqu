import * as React from "react";
import TextareaAutosize, { type TextareaAutosizeProps } from "react-textarea-autosize";
import { cn } from "../lib/utils";

// Narrow style type from react-textarea-autosize: omits maxHeight/minHeight
// and re-adds an optional numeric height. Derive from the package's own prop
// so we stay in sync if it changes upstream.
type AutoTextareaStyle = NonNullable<TextareaAutosizeProps["style"]>;

export interface AutoTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "rows" | "style"> {
  minRows?: number;
  maxRows?: number;
  style?: AutoTextareaStyle;
}

export const AutoTextarea = React.forwardRef<HTMLTextAreaElement, AutoTextareaProps>(
  ({ className, minRows = 1, maxRows = 6, style, ...props }, ref) => (
    <TextareaAutosize
      ref={ref}
      minRows={minRows}
      maxRows={maxRows}
      className={cn(
        "w-full bg-transparent outline-none resize-none text-foreground placeholder:text-muted-foreground",
        className
      )}
      style={style}
      {...props}
    />
  ),
);
AutoTextarea.displayName = "AutoTextarea";
