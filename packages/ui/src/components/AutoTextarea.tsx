import * as React from "react";
import TextareaAutosize from "react-textarea-autosize";
import { cn } from "../lib/utils";

export interface AutoTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "rows"> {
  minRows?: number;
  maxRows?: number;
}

export const AutoTextarea = React.forwardRef<HTMLTextAreaElement, AutoTextareaProps>(
  ({ className, minRows = 1, maxRows = 6, ...props }, ref) => (
    <TextareaAutosize
      ref={ref}
      minRows={minRows}
      maxRows={maxRows}
      className={cn(
        "w-full bg-transparent outline-none resize-none text-foreground placeholder:text-muted-foreground",
        className
      )}
      {...(props as Omit<typeof props, "style">)}
    />
  ),
);
AutoTextarea.displayName = "AutoTextarea";
