"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
 * The small pieces the four report pages added on 27 Sep (round E) share:
 * Sales by Salesperson, Sales by Product, Purchase Summary, Supplier Ledger.
 * The older report pages each carry their own copy of Stat; these did not add
 * four more.
 */

export function apiMessage(e: unknown, fallback: string): string {
  const err = e as { isAxiosError?: boolean; response?: { data?: { message?: string } } };
  if (err?.isAxiosError && err.response) return err.response.data?.message ?? fallback;
  return "Cannot reach the server.";
}

export function ReportStat({
  label, value, sub, loading, tone,
}: { label: string; value: string; sub?: string; loading: boolean; tone?: string }) {
  return (
    <Card className="p-4 min-w-0">
      <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400 truncate">{label}</div>
      {loading ? <Skeleton className="h-8 w-24 mt-1" /> : (
        <>
          <div className={cn("text-xl sm:text-2xl tabular font-bold mt-1 truncate", tone ?? "text-navy-900 dark:text-white")}>{value}</div>
          {sub && <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{sub}</div>}
        </>
      )}
    </Card>
  );
}

export function ReportError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="p-4 mb-6 border-danger/40">
      <div className="flex items-center gap-3">
        <AlertCircle className="size-5 text-danger shrink-0" />
        <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{message}</div>
        <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>
      </div>
    </Card>
  );
}

/** A right-aligned money (or count) cell; zero reads as a dash. */
export function NumCell({ v, bold, count, className }: { v: number; bold?: boolean; count?: boolean; className?: string }) {
  return (
    <td className={cn("px-3 py-2.5 text-right tabular text-sm whitespace-nowrap", bold && "font-semibold",
      v === 0 ? "text-slate-300 dark:text-slate-600" : className ?? (bold ? "text-navy-900 dark:text-white" : "text-slate-700 dark:text-slate-200"))}>
      {v === 0 ? "—" : count ? v.toLocaleString() : formatMoney(v)}
    </td>
  );
}

export function HeadCell({ children, left }: { children: React.ReactNode; left?: boolean }) {
  return (
    <th className={cn("text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2.5 whitespace-nowrap",
      left ? "text-left" : "text-right")}>
      {children}
    </th>
  );
}

/** One labelled figure in a phone card. */
export function Mini({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <div className="uppercase tracking-wider text-2xs text-slate-400 truncate">{label}</div>
      <div className={cn("tabular text-xs font-semibold truncate", tone ?? "text-navy-900 dark:text-white")}>{value}</div>
    </div>
  );
}
