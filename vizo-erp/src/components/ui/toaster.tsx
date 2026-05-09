"use client";

import { Toaster as SonnerToaster, toast } from "sonner";
import { useTheme } from "next-themes";
import { CheckCircle2, AlertTriangle, XCircle, Info, Loader2 } from "lucide-react";

/* Re-export toast helper so callers do `import { toast } from "@/components/ui/toaster"` */
export { toast };

export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <SonnerToaster
      position="top-right"
      offset={80}
      richColors={false}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      icons={{
        success: <CheckCircle2 className="size-4 text-success" />,
        error:   <XCircle      className="size-4 text-danger" />,
        warning: <AlertTriangle className="size-4 text-warning" />,
        info:    <Info         className="size-4 text-info" />,
        loading: <Loader2      className="size-4 animate-spin text-brand-yellow" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 shadow-elevated rounded-lg text-sm",
          title:       "text-sm font-semibold text-navy-900 dark:text-white",
          description: "text-xs text-slate-500 dark:text-slate-400",
          actionButton:
            "bg-brand-yellow text-navy-900 hover:bg-brand-yellow-400 rounded-md px-2.5 py-1 text-xs font-medium",
          cancelButton:
            "bg-slate-100 dark:bg-navy-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-navy-600 rounded-md px-2.5 py-1 text-xs font-medium",
        },
      }}
    />
  );
}
