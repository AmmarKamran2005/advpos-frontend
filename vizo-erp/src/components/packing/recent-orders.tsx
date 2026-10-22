"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import { CalendarDays, ChevronDown, PackageCheck, PackageOpen, Pencil, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

   READY FOR PACKING, ON TOP (30 September). An order the Super Admin or the
   accountant has moved to AT_ORDER_DEPT ("Processing in Order Dept") is the
   office handing it to the desk -- it is work waiting, not news. Those rows
   come back from the API however old they are (the seven-day window would
   otherwise lose an order handed over on day eight), and here they are lifted
   out of the day groups into their own group at the very top, each with a
   "Ready for packing" label that cannot be missed, and never collapsed away
   behind "Show all".

   EVERY ROW HAS A PACK BUTTON (same day). It does not navigate: it hands the
   order id to the Packing page, which fills its three dropdowns from the
   order's own record, loads the lines and scrolls down to them. The rest of
   the row still opens the read-only page, so the button sits beside the link,
   not inside it (a button inside an <a> is invalid and clicks both).

   ONCE DISPATCHED, PACK BECOMES EDIT (the owner, 2 October). A dispatched
   order has nothing left to pack; what the desk may still need is to correct
   how it went -- a bilty typed wrong, one parcel more. Edit hands the id to the
   page, which reopens the same "How is it going" form filled in from the
   booked delivery and only updates it: no status change, no stock moved.

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

/** The status the Super Admin or accountant sets to hand an order to the desk. */
const HANDED_OVER = "AT_ORDER_DEPT";

const COLLAPSED = 8;

export function RecentOrders({
  onPack,
  onEdit,
  refreshKey = 0,
}: {
  /** Fill the Packing page's dropdowns with this order and open its lines. */
  onPack: (orderId: number) => void;
  /** A dispatched order: reopen its booking form, filled in, to correct the delivery details. */
  onEdit: (orderId: number) => void;
  /** Bumped by the page after a dispatch, so a packed order stops saying "Ready for packing". */
  refreshKey?: number;
}) {
  const [rows, setRows] = React.useState<Recent[] | null>(null);
  const [error, setError] = React.useState(false);
  const [open, setOpen] = React.useState(true);
  const [all, setAll] = React.useState(false);

  React.useEffect(() => {
    axios.get<{ items: Recent[] }>(`${API_BASE_URL}/packing/recent`, { headers: authHeader() })
      .then((r) => { setRows(r.data.items); setError(false); })
      .catch(() => setError(true));
  }, [refreshKey]);

  const ready = React.useMemo(() => (rows ?? []).filter((r) => r.status === HANDED_OVER), [rows]);
  const rest = React.useMemo(() => (rows ?? []).filter((r) => r.status !== HANDED_OVER), [rows]);

  const shown = all ? rest : rest.slice(0, COLLAPSED);
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
        <span className="flex items-center gap-2 min-w-0">
          <CalendarDays className="size-4 text-brand-yellow-600 shrink-0" />
          <span className="text-sm font-semibold text-navy-900 dark:text-white truncate">This week&apos;s orders</span>
          {rows && <span className="text-2xs tabular font-semibold px-1.5 py-0.5 rounded-full bg-navy-900 text-white dark:bg-brand-yellow dark:text-navy-900">{rows.length}</span>}
          {ready.length > 0 && (
            <span className="text-2xs tabular font-semibold px-1.5 py-0.5 rounded-full bg-brand-yellow text-navy-900 whitespace-nowrap">
              {ready.length} ready
            </span>
          )}
        </span>
        <ChevronDown className={cn("size-4 text-slate-400 transition-transform shrink-0", !open && "-rotate-90")} />
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
            {ready.length > 0 && (
              <div>
                <div className="px-4 py-1 bg-brand-yellow/20 text-2xs uppercase tracking-wider font-bold text-navy-900 dark:text-brand-yellow flex items-center gap-1.5">
                  <PackageCheck className="size-3.5" /> Ready for packing
                </div>
                <ul className="divide-y divide-slate-100 dark:divide-navy-700/60">
                  {ready.map((r) => <Row key={r.id} r={r} ready onPack={onPack} onEdit={onEdit} />)}
                </ul>
              </div>
            )}
            {groups.map((g) => (
              <div key={g.day}>
                <div className="px-4 py-1 bg-slate-50 dark:bg-navy-700/40 text-2xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                  {dayLabel(g.day)}
                </div>
                <ul className="divide-y divide-slate-100 dark:divide-navy-700/60">
                  {g.items.map((r) => <Row key={r.id} r={r} ready={false} onPack={onPack} onEdit={onEdit} />)}
                </ul>
              </div>
            ))}
            {rest.length > COLLAPSED && (
              <button type="button" onClick={() => setAll((v) => !v)}
                className="w-full py-2.5 text-xs font-medium text-navy-900 dark:text-brand-yellow border-t border-slate-100 dark:border-navy-700 hover:bg-slate-50 dark:hover:bg-navy-700/40">
                {all ? "Show fewer" : `Show all ${rest.length}`}
              </button>
            )}
          </>
        )
      )}
    </Card>
  );
}

function Row({ r, ready, onPack, onEdit }: {
  r: Recent; ready: boolean; onPack: (orderId: number) => void; onEdit: (orderId: number) => void;
}) {
  return (
    <li className={cn(
      "flex items-center gap-2 pr-3 hover:bg-slate-50 dark:hover:bg-navy-700/40",
      ready && "border-l-4 border-brand-yellow bg-brand-yellow/5"
    )}>
      <Link href={`/packing/orders/${r.id}`}
        className={cn("flex-1 min-w-0 py-2.5 active:bg-slate-100", ready ? "pl-3" : "pl-4")}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-navy-900 dark:text-white truncate">{r.customerName}</span>
          {ready ? (
            /* Spelled out in the desk's own words rather than the status
               name, and in the brand's loudest colour: this is the row the
               desk is looking for. */
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-brand-yellow px-2 py-0.5 text-2xs font-bold text-navy-900 whitespace-nowrap">
              <PackageCheck className="size-3" /> Ready for packing
            </span>
          ) : (
            <StatusPill variant={statusVariant(r.status)} className="shrink-0">{r.statusName}</StatusPill>
          )}
        </div>
        {/* Wraps rather than truncating on a phone: the
            salesperson's name is the point of the line. */}
        <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-1.5">
          <span className="tabular">{r.orderNo}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1"><User className="size-3" />{r.salesPerson ?? "no rep"}</span>
          <span>·</span>
          <span className="tabular">{r.itemCount} item{r.itemCount === 1 ? "" : "s"}</span>
          {ready && <><span>·</span><span>{formatDate(r.createdAt)}</span></>}
        </div>
      </Link>
      {r.status === "DISPATCHED" ? (
        <Button type="button" size="sm" variant="outline" className="shrink-0 gap-1 px-2.5"
          aria-label={`Edit the delivery of ${r.orderNo}`} onClick={() => onEdit(r.id)}>
          <Pencil /> Edit
        </Button>
      ) : (
        <Button type="button" size="sm" variant={ready ? "accent" : "outline"} className="shrink-0 gap-1 px-2.5"
          aria-label={`Pack ${r.orderNo}`} onClick={() => onPack(r.id)}>
          <PackageOpen /> Pack
        </Button>
      )}
    </li>
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
