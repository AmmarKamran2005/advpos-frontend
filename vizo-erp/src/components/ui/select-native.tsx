import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lightweight native <select> wrapper styled to match our Input.
 * For accessibility-first dropdowns. Use <Select> from radix when needed.
 */
const SelectNative = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        "w-full h-9 pl-3 pr-9 rounded-lg border border-slate-200 bg-white text-sm text-navy-900 transition-all appearance-none cursor-pointer",
        "focus:outline-none focus:border-brand-yellow focus:shadow-glow-yellow",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "dark:bg-navy-800 dark:border-navy-700 dark:text-white",
        "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:shadow-[0_0_0_4px_rgba(239,68,68,0.15)]",
        className
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="size-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
  </div>
));
SelectNative.displayName = "SelectNative";

export { SelectNative };
