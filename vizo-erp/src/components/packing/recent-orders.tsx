"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import { CalendarDays, ChevronDown, ChevronRight, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill, type BadgeProps } from "@/components/ui/badge";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────────────────────
   "THIS WEEK" -- the top of the Packing page.

   Every order created in the last seven days (today and the six before, in
   Pakistan time), newest first, whatever its status -- GET /packing/recent.
   Order no, date, salesperson, customer, status, item count, and NO money:
   the order desk sees none (the owner, 26 September). A row opens the
   order's read-only page with its items.

   Fast on a phone: one request, one short list, grouped by day, collapsed to
   the first eight rows until asked for more.
   ─────────────────────────────────────────────────────────────────────────── */

type Recent = {
  id: number; orderNo: string; orderDate: string; createdAt: string; customerName: string; city: string;
  salesPerson: string | null; status: string; statusName: string; itemCount: number; units: number;
};

export function statusVariant(status: string): NonNullable<BadgeProps["variant"]> {
  switch (status) {
    case "DELIVERED": return "success";
    case "DISPATCHED": return "info";
    case "INVOICED": case "AT_ORDER_DEPT": return "warning";
    case "CANCELLED": case "DECLINED": case "CREDIT_HOLD": return "danger";
    case "CONFIRMED": return "accent";
    default: return "muted";
  }
}

const COLLAPSED = 8;

export function RecentOrders() {
  const [rows, setRows] = React.useState<Recent[] | null>(null);
  const [error, setError] = React.useState(false);
  const [open, setOpen] = React.useState(true);
  const [all, setAll] = React.useState(false);

  React.useEffect(() => {
    axios.get<{ items: Recent[] }>(`${API_BASE_URL}/packing/recent`, { headers: authHeader() })
      .then((r) => setRows(r.data.items))
      .catch(() => setError(true));
  }, []);

  const shown = rows ? (all ? rows : rows.slice(0, COLLAPSED)) : [];
  /* Grouped by the day the order was created -- "today", "yesterday", then dates. */
  const groups: { day: string; items: Recent[] }[] = [];
  for (const r of shown) {
    const last = groups[groups.length - 1];
    if (last && last.day === r.createdAt) last.items.push(r);
    else groups.push({ day: r.createdAt, items: [r] });
  }

  return (
    <Card className="p-0 overflow-hidden mb-4">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left">
        <span className="flex items-center gap-2">
          <CalendarDays className="size-4 text-brand-yellow-600" />
          <span className="text-sm font-semibold text-navy-900 dark:text-white">This week&apos;s orders</span>
          {rows && <span className="text-2xs tabular font-semibold px-1.5 py-0.5 rounded-full bg-navy-900 text-white dark:bg-brand-yellow dark:text-navy-900">{rows.length}</span>}
        </span>
        <ChevronDown className={cn("size-4 text-slate-400 transition-transform", !open && "-rotate-90")} />
      </button>

      {open && (
        error ? (
          <p className="px-4 pb-4 text-xs text-danger">Could not load this week&apos;s orders.</p>
        ) : !rows ? (
          <div className="px-4 pb-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : rows.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-slate-500 dark:text-slate-400">No orders in the last seven days.</p>
        ) : (
          <>
            {groups.map((g) => (
              <div key={g.day}>
                <div className="px-4 py-1 bg-slate-50 dark:bg-navy-700/40 text-2xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                  {dayLabel(g.day)}
                </div>
                <ul className="divide-y divide-slate-100 dark:divide-navy-700/60">
                  {g.items.map((r) => (
                    <li key={r.id}>
                      <Link href={`/packing/orders/${r.id}`}
                        className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-navy-700/40 active:bg-slate-100">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-navy-900 dark:text-white truncate">{r.customerName}</span>
                            <StatusPill variant={statusVariant(r.status)} className="shrink-0">{r.statusName}</StatusPill>
                          </div>
                          {/* Wraps rather than truncating on a phone: the
                              salesperson's name is the point of the line. */}
                          <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-1.5">
                            <span className="tabular">{r.orderNo}</span>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1"><User className="size-3" />{r.salesPerson ?? "no rep"}</span>
                            <span>·</span>
                            <span className="tabular">{r.itemCount} item{r.itemCount === 1 ? "" : "s"}</span>
                          </div>
                        </div>
                        <ChevronRight className="size-4 text-slate-300 shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {rows.length > COLLAPSED && (
              <button type="button" onClick={() => setAll((v) => !v)}
                className="w-full py-2.5 text-xs font-medium text-navy-900 dark:text-brand-yellow border-t border-slate-100 dark:border-navy-700 hover:bg-slate-50 dark:hover:bg-navy-700/40">
                {all ? "Show fewer" : `Show all ${rows.length}`}
              </button>
            )}
          </>
        )
      )}
    </Card>
  );
}

function dayLabel(iso: string) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
  if (iso === today) return "Today";
  const y = new Date(`${today}T00:00:00Z`);
  y.setUTCDate(y.getUTCDate() - 1);
  if (iso === y.toISOString().slice(0, 10)) return "Yesterday";
  return formatDate(iso);
}
