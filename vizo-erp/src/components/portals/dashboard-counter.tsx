"use client";

import * as React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * The counter card every role dashboard is built from.
 *
 * It lived three times over — once in each portal, identical apart from the
 * import path. Three copies of a card is three cards that drift, and they had
 * already started to: one of them had lost its hover state.
 */

const TONE_BG: Record<string, string> = {
  yellow: "bg-brand-yellow/10 text-brand-yellow",
  info: "bg-info/10 text-info",
  danger: "bg-danger/10 text-danger",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  muted: "bg-slate-100 text-slate-500 dark:bg-navy-700 dark:text-slate-300",
};

export type CounterTone = keyof typeof TONE_BG;

export function Counter({
  label,
  value,
  icon: Icon,
  tone = "info",
  hint,
  href,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: CounterTone;
  hint?: string;
  href?: string;
}) {
  const card = (
    <Card className={cn("p-5 h-full", href && "hover:border-brand-yellow/40 transition-colors")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </div>
          <div className="tabular text-3xl font-bold text-navy-900 dark:text-white mt-1.5">
            {value}
          </div>
          {hint && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</div>}
        </div>
        <div className={cn("size-10 rounded-lg flex items-center justify-center shrink-0", TONE_BG[tone])}>
          <Icon className="size-5" />
        </div>
      </div>
    </Card>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}

/** The skeleton these cards show while the dashboard's one request is in flight. */
export function CounterSkeletons({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-5">
          <div className="animate-pulse">
            <div className="h-3 w-24 rounded bg-slate-200 dark:bg-navy-700" />
            <div className="h-7 w-32 rounded bg-slate-200 dark:bg-navy-700 mt-3" />
            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-navy-700 mt-2" />
          </div>
        </Card>
      ))}
    </>
  );
}
