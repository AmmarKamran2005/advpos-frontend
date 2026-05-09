"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <Card className="max-w-2xl mx-auto mt-12">
      <CardBody className="text-center p-12">
        <div className="size-16 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="size-8 text-warning" />
        </div>
        <h2 className="text-xl font-bold text-navy-900 dark:text-white">Couldn&apos;t load this page</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
          Something went wrong while loading this page. Try refreshing — if the problem persists, please contact your administrator.
        </p>
        {error.digest && (
          <div className="mt-4 inline-block bg-slate-100 dark:bg-navy-700 text-2xs tabular text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded font-mono">
            Error ID: {error.digest}
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          <Button variant="secondary" size="md" asChild>
            <Link href="/dashboard"><Home className="size-4" /> Dashboard</Link>
          </Button>
          <Button variant="accent" size="md" onClick={() => reset()} className="gap-1.5">
            <RotateCcw className="size-4" /> Try again
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
