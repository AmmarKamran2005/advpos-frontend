"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import {
  Boxes, AlertCircle, RefreshCw, Truck, ChevronDown, Loader2, PackageCheck, TriangleAlert,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────────────────────
   THE WAREHOUSE KEEPER'S WHOLE SCREEN

   One job, one page: here are the orders the owner has confirmed, here is what
   is on each of them, here is whether the shelf can actually cover it, and
   here is the button that sends it to the order department.

   No prices anywhere. The keeper is picking stock, not selling it, and a
   picking list cluttered with rates and margins is a picking list somebody
   misreads. The API does not send them either -- see GetWarehouseQueue.
   ─────────────────────────────────────────────────────────────────────────── */

type QueueLine = {
  productId: number;
  name: string;
  sku: string;
  packing: number;
  qty: number;
  onHand: number;
};

type QueueOrder = {
  id: number;
  orderNo: string;
  customerName: string;
  city: string | null;
  locationId: number;
  location: string;
  orderDate: string;
  deliveryDate: string | null;
  status: string;
  statusName: string;
  salesPerson: string | null;
  invoiceNo: string | null;
  lines: QueueLine[];
};

type Queue = { count: number; units: number; short_: number; items: QueueOrder[] };

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export function WarehouseQueue() {
  const [queue, setQueue] = React.useState<Queue | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState<number | null>(null);
  const [sending, setSending] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<Queue>(`${API_BASE_URL}/sales/warehouse/queue`, {
        headers: authHeader(),
      });
      setQueue(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the queue."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the component driven by
       useState/useEffect. */
    void load();
  }, [load]);

  async function send(o: QueueOrder) {
    setSending(o.id);
    try {
      const res = await axios.patch<{ message: string }>(
        `${API_BASE_URL}/sales/orders/${o.id}/status`,
        { statusKey: "TO_ORDER_DEPT", reason: null },
        { headers: authHeader() }
      );
      toast.success("On its way", { description: res.data.message });
      await load();
    } catch (e) {
      toast.error("Could not send it", { description: apiMessage(e, "Please try again.") });
    } finally {
      setSending(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Could not load the queue"
        description={error}
        action={
          <Button variant="accent" onClick={() => { setLoading(true); void load(); }}>
            <RefreshCw />
            Try again
          </Button>
        }
      />
    );
  }

  const items = queue?.items ?? [];

  if (items.length === 0) {
    return (
      <EmptyState
        icon={PackageCheck}
        title="Nothing waiting"
        description="Every confirmed order has been sent to the order department. You will see the next one here the moment the owner confirms it."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Three numbers, and only three. What is waiting, how much of it, and
          how many of them the shelf cannot cover. */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-2xs uppercase tracking-wider font-semibold text-slate-500">
            To prepare
          </div>
          <div className="text-2xl font-bold tabular text-navy-900 dark:text-white mt-1">
            {queue?.count ?? 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase tracking-wider font-semibold text-slate-500">
            Units to pick
          </div>
          <div className="text-2xl font-bold tabular text-navy-900 dark:text-white mt-1">
            {formatNumber(queue?.units ?? 0)}
          </div>
        </Card>
        <Card className={cn("p-4", (queue?.short_ ?? 0) > 0 && "border-warning/50")}>
          <div className="text-2xs uppercase tracking-wider font-semibold text-slate-500">
            Short on stock
          </div>
          <div
            className={cn(
              "text-2xl font-bold tabular mt-1",
              (queue?.short_ ?? 0) > 0 ? "text-warning" : "text-navy-900 dark:text-white"
            )}
          >
            {queue?.short_ ?? 0}
          </div>
        </Card>
      </div>

      {items.map((o) => {
        const short = o.lines.filter((l) => l.onHand < l.qty);
        const expanded = open === o.id;

        return (
          <Card key={o.id} className={cn(short.length > 0 && "border-warning/40")}>
            <CardBody>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : o.id)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  aria-expanded={expanded}
                >
                  <div className="size-10 rounded-lg bg-brand-yellow/15 text-brand-yellow-700 dark:text-brand-yellow flex items-center justify-center flex-shrink-0">
                    <Boxes className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-navy-900 dark:text-white">
                        {o.orderNo}
                      </span>
                      <StatusPill variant={o.status === "INVOICED" ? "success" : "info"}>
                        {o.statusName}
                      </StatusPill>
                      {short.length > 0 && (
                        <Badge variant="warning">
                          <TriangleAlert className="size-3" />
                          {short.length} short
                        </Badge>
                      )}
                    </div>
                    <div className="text-2xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {o.customerName}
                      {o.city ? ` · ${o.city}` : ""} · {o.location} ·{" "}
                      {o.lines.length} {o.lines.length === 1 ? "item" : "items"} ·{" "}
                      {formatDate(o.orderDate)}
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-4 text-slate-400 flex-shrink-0 transition-transform ml-auto",
                      expanded && "rotate-180"
                    )}
                  />
                </button>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/sales/orders/${o.id}`}>Open</Link>
                  </Button>
                  <Button
                    variant="accent"
                    size="sm"
                    className="gap-1.5"
                    disabled={sending !== null}
                    onClick={() => void send(o)}
                  >
                    {sending === o.id ? <Loader2 className="size-4 animate-spin" /> : <Truck />}
                    Send to Order Dept
                  </Button>
                </div>
              </div>

              {expanded && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[520px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-navy-700/50 text-left">
                        <th className="text-2xs uppercase font-semibold text-slate-500 px-3 py-2">
                          Product
                        </th>
                        <th className="text-2xs uppercase font-semibold text-slate-500 px-3 py-2 text-right">
                          Packing
                        </th>
                        <th className="text-2xs uppercase font-semibold text-slate-500 px-3 py-2 text-right">
                          Pick
                        </th>
                        <th className="text-2xs uppercase font-semibold text-slate-500 px-3 py-2 text-right">
                          On shelf
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                      {o.lines.map((l) => (
                        <tr key={l.productId}>
                          <td className="px-3 py-2.5">
                            <div className="text-sm font-medium text-navy-900 dark:text-white">
                              {l.name}
                            </div>
                            <div className="text-2xs tabular text-slate-500">{l.sku}</div>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular text-xs text-slate-500">
                            {l.packing > 1 ? l.packing : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular text-sm font-bold text-navy-900 dark:text-white">
                            {formatNumber(l.qty)}
                          </td>
                          <td
                            className={cn(
                              "px-3 py-2.5 text-right tabular text-sm",
                              l.onHand < l.qty
                                ? "text-warning font-semibold"
                                : "text-slate-600 dark:text-slate-300"
                            )}
                          >
                            {formatNumber(l.onHand)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {short.length > 0 && (
                    <p className="text-xs text-warning-dark dark:text-warning mt-3">
                      The shelf at {o.location} cannot cover{" "}
                      {short.length === 1 ? "one line" : `${short.length} lines`}. Move stock
                      in before sending it, or send what you have and tell the order
                      department.
                    </p>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
