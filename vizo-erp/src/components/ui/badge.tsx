import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        success: "bg-success-light text-success-dark dark:bg-success/15 dark:text-success-light",
        warning: "bg-warning-light text-warning-dark dark:bg-warning/15 dark:text-warning-light",
        danger:  "bg-danger-light  text-danger-dark  dark:bg-danger/15  dark:text-danger-light",
        info:    "bg-info-light    text-info-dark    dark:bg-info/15    dark:text-info-light",
        muted:   "bg-slate-100 text-slate-600 dark:bg-navy-700 dark:text-slate-300",
        accent:  "bg-brand-yellow-50 text-brand-yellow-700 dark:bg-brand-yellow/15 dark:text-brand-yellow-300",
        outline: "bg-transparent border border-slate-200 text-slate-600 dark:border-navy-600 dark:text-slate-300",
      },
    },
    defaultVariants: { variant: "muted" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

/**
 * Status pill — leading colored dot + label
 *   <StatusPill variant="success">Dispatched</StatusPill>
 */
export function StatusPill({
  variant = "muted",
  className,
  children,
  ...props
}: BadgeProps) {
  const dotColor = {
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    info: "bg-info",
    muted: "bg-slate-400",
    accent: "bg-brand-yellow",
    outline: "bg-slate-400",
  }[variant ?? "muted"];

  return (
    <Badge variant={variant} className={className} {...props}>
      <span className={cn("size-1.5 rounded-full", dotColor)} aria-hidden />
      {children}
    </Badge>
  );
}
