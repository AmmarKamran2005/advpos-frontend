"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/**
 * "New expense" is "today's sheet" now.
 *
 * Expenses are entered a day at a time (see ../page.tsx), so this route does
 * not show a form: it asks the API for today's sheet at the signed-in person's
 * own location -- the one already open, or a fresh draft -- and goes straight
 * to it. Pressing New twice lands on the same sheet, never two for one day.
 * Another date or location is picked from "Open a date" on the list.
 */
export default function NewExpenseSheetPage() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const started = React.useRef(false);

  const open = React.useCallback(async () => {
    setError(null);
    try {
      /* No date and no location: the API fills in Pakistan's today and the
         person's own place, the same answer on every device. */
      const res = await axios.post<{ id: number }>(`${API_BASE_URL}/expense-sheets/open`, {}, { headers: authHeader() });
      router.replace(`/accounting/expenses/sheets/${res.data.id}`);
    } catch (e) {
      setError(
        axios.isAxiosError(e) && e.response
          ? (e.response.data as { message?: string })?.message ?? "Today's sheet could not be opened."
          : "Cannot reach the server."
      );
    }
  }, [router]);

  React.useEffect(() => {
    /* Once, even under React's development double-mount. */
    if (started.current) return;
    started.current = true;
    void open();
  }, [open]);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Expenses", href: "/accounting/expenses" }, { label: "Today" }]}
        title="Today's expenses"
      />
      {error ? (
        <Card className="p-4 border-danger/40 max-w-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{error}</div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" asChild><Link href="/accounting/expenses"><ArrowLeft />Back</Link></Button>
              <Button variant="secondary" size="sm" onClick={() => void open()}>Try again</Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="size-4 animate-spin" />Opening today&apos;s sheet…
        </div>
      )}
    </>
  );
}
