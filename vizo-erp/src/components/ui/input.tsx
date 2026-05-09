import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-navy-900 placeholder:text-slate-400 transition-all",
      "focus:outline-none focus:border-brand-yellow focus:shadow-glow-yellow",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "dark:bg-navy-800 dark:border-navy-700 dark:text-white dark:placeholder:text-slate-500",
      "dark:focus:border-brand-yellow",
      "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:border-danger aria-[invalid=true]:focus:shadow-[0_0_0_4px_rgba(239,68,68,0.15)]",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
