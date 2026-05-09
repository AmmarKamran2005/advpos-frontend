import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800",
      "px-3 py-2 text-sm text-navy-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500",
      "transition-colors",
      "focus:outline-none focus:border-brand-yellow focus:ring-2 focus:ring-brand-yellow/20",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "resize-none scrollbar-thin",
      "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/20",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
