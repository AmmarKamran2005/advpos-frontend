"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-navy-900/55 backdrop-blur-sm data-[state=open]:animate-fade-in",
      className
    )}
    {...props}
  />
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

interface SheetContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: "right" | "left" | "top" | "bottom";
  showClose?: boolean;
  width?: "sm" | "md" | "lg" | "xl" | "full";
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, showClose = true, width = "md", ...props }, ref) => {
  const widths = { sm: "sm:max-w-sm", md: "sm:max-w-md", lg: "sm:max-w-lg", xl: "sm:max-w-xl", full: "sm:max-w-full" };
  const sides = {
    right:  cn("fixed inset-y-0 right-0 h-full w-full border-l", widths[width], "data-[state=open]:animate-slide-in-right"),
    left:   cn("fixed inset-y-0 left-0  h-full w-full border-r", widths[width], "data-[state=open]:animate-slide-in-left"),
    top:    "fixed inset-x-0 top-0 w-full border-b data-[state=open]:animate-fade-in",
    bottom: "fixed inset-x-0 bottom-0 w-full border-t data-[state=open]:animate-fade-in",
  };
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "z-50 flex flex-col bg-white dark:bg-navy-800 border-slate-200 dark:border-navy-700 shadow-elevated",
          "outline-none",
          sides[side],
          className
        )}
        {...props}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close
            className="absolute right-4 top-4 size-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-700 hover:text-navy-900 dark:hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-brand-yellow"
            aria-label="Close"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </SheetPortal>
  );
});
SheetContent.displayName = DialogPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("px-6 py-5 border-b border-slate-200 dark:border-navy-700 flex-shrink-0", className)} {...props} />
);

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-base font-semibold text-navy-900 dark:text-white", className)}
    {...props}
  />
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-xs text-slate-500 dark:text-slate-400 mt-1", className)}
    {...props}
  />
));
SheetDescription.displayName = DialogPrimitive.Description.displayName;

const SheetBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex-1 overflow-y-auto scrollbar-thin px-6 py-5", className)} {...props} />
);

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "px-6 py-4 border-t border-slate-200 dark:border-navy-700 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 flex-shrink-0",
      className
    )}
    {...props}
  />
);

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter };
