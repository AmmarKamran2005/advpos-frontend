import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:shadow-glow-yellow disabled:pointer-events-none disabled:opacity-50 select-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-navy-900 text-white hover:bg-navy-700 active:bg-navy-800 dark:bg-brand-yellow dark:text-navy-900 dark:hover:bg-brand-yellow-400",
        accent:
          "bg-brand-yellow text-navy-900 hover:bg-brand-yellow-400 active:bg-brand-yellow-600 hover:shadow-glow-yellow",
        secondary:
          "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:text-navy-900 dark:bg-navy-800 dark:text-slate-200 dark:border-navy-700 dark:hover:bg-navy-700 dark:hover:border-navy-500 dark:hover:text-white",
        ghost:
          "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-navy-900 dark:text-slate-400 dark:hover:bg-navy-800 dark:hover:text-white",
        danger:
          "bg-danger text-white hover:bg-danger-dark",
        outline:
          "bg-transparent text-navy-900 border border-navy-200 hover:bg-navy-50 hover:border-navy-300 dark:text-white dark:border-navy-700 dark:hover:bg-navy-800",
      },
      size: {
        sm: "h-8 px-3 text-xs [&_svg]:size-3.5",
        md: "h-9 px-4 text-sm [&_svg]:size-4",
        lg: "h-11 px-5 text-sm [&_svg]:size-4",
        icon: "size-9 [&_svg]:size-4",
        "icon-sm": "size-8 [&_svg]:size-3.5",
        "icon-lg": "size-11 [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
