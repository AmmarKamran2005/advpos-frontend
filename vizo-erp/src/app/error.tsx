"use client";

import * as React from "react";
import Link from "next/link";
import { AlertOctagon, Home, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Global error caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-navy-950 px-6">
      <div className="text-center max-w-md">
        <div className="size-16 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-5">
          <AlertOctagon className="size-8 text-danger" />
        </div>
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Something went wrong</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          An unexpected error occurred. Our team has been notified. You can try again or return to the dashboard.
        </p>
        {error.digest && (
          <div className="mt-4 inline-block bg-slate-100 dark:bg-navy-800 text-2xs tabular text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded font-mono">
            Error ID: {error.digest}
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          <Button variant="secondary" size="md" asChild>
            <Link href="/dashboard"><Home className="size-4" /> Go to Dashboard</Link>
          </Button>
          <Button variant="accent" size="md" onClick={() => reset()} className="gap-1.5">
            <RotateCcw className="size-4" /> Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
