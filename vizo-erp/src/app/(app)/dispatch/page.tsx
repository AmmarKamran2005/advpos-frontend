"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Send, Truck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import axios from "axios";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import {
  DispatchSheet, channelIcon,
  type Channel, type DispatchLookups, type DispatchOrder, type DispatchResponse,
} from "@/components/delivery/dispatch-sheet";
import { formatMoney } from "@/lib/format";

/* GET /dispatch -> { waiting, late, moneyHidden, items } -- dispatched orders
   with no delivery booked yet.

   POST /dispatch/{id}/dispatch books the delivery. The channel chosen decides
   WHO may confirm arrival later and when the reminder starts, so it is
   validated server-side against DeliveryChannel rather than trusted. The form
   itself lives in components/delivery/dispatch-sheet.tsx since 27 Sep, shared
   with the Delivery screen's "Book Delivery" button. */

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

/**
 * useSearchParams() bails out of prerendering unless it is under a Suspense
 * boundary -- the same reason the Delivery page wraps itself.
 */
export default function DispatchPage() {
  return (
    <React.Suspense fallback={<div className="p-6"><Skeleton className="h-64" /></div>}>
      <DispatchScreen />
    </React.Suspense>
  );
}

/**
 * Booking the courier for orders that have already left.
 *
 * The route chosen here decides who will later be asked whether it arrived —
 * the rep for a Karachi hand-delivery, the back office for a courier, the
 * cargo desk for freight. Picking it is the whole point of the screen, so the
 * consequence is spelled out before the button is pressed.
 *
 * `?order=<id>` opens that order's booking form straight away -- the link
 * other screens use to send somebody here with the right order in hand.
 */
function DispatchScreen() {
  const searchParams = useSearchParams();
  const [queue, setQueue] = React.useState<DispatchOrder[]>([]);
  const [channels, setChannels] = React.useState<Channel[]>([]);
  const [moneyHidden, setMoneyHidden] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dispatching, setDispatching] = React.useState<DispatchOrder | null>(null);
  const wanted = Number(searchParams.get("order")) || null;
  const [openedWanted, setOpenedWanted] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const [res, lookups] = await Promise.all([
        axios.get<DispatchResponse>(`${API_BASE_URL}/dispatch`, { headers: authHeader() }),
        axios.get<DispatchLookups>(`${API_BASE_URL}/dispatch/lookups`, { headers: authHeader() }),
      ]);
      setQueue(res.data.items);
      setMoneyHidden(Boolean(res.data.moneyHidden));
      setChannels(lookups.data.channels);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the dispatch queue."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. Disabled here rather
       than globally so the rule still catches the cases worth fixing. */
    void load();
  }, [load]);

  /* Open the order the link asked for, once, as soon as the queue is in. */
  if (!openedWanted && wanted && !loading) {
    setOpenedWanted(true);
    const hit = queue.find((o) => o.id === wanted);
    if (hit) setDispatching(hit);
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Daily Work" }, { label: "Dispatch" }]}
        title="Dispatch"
        subtitle="Dispatched orders waiting for a courier to be booked."
        actions={
          <>
            <Button variant="ghost" size="md" className="gap-1.5" asChild>
              <Link href="/packing">Back to Packing</Link>
            </Button>
            <Button variant="ghost" size="md" className="gap-1.5" asChild>
              <Link href="/delivery"><Truck /> Track deliveries</Link>
            </Button>
          </>
        }
      />

      {error && (
        <Card className="p-4 mb-6 border-danger/40">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{error}</div>
            <Button variant="secondary" size="sm" onClick={() => void load()}>Try again</Button>
          </div>
        </Card>
      )}

      {/* How each route gets confirmed — the thing people forget */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        {channels.map((ch) => {
          const Icon = channelIcon(ch.key);
          return (
            <Card key={ch.id}>
              <CardBody className="py-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="size-4 text-brand-yellow" />
                  <span className="text-sm font-semibold text-navy-900 dark:text-white">
                    {ch.name}
                  </span>
                </div>
                <p className="text-2xs text-slate-500 dark:text-slate-400">
                  Confirmed by{" "}
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {ch.confirmedByRoleName}
                  </span>
                  {ch.remindAfterDays === 0
                    ? ", chased same day"
                    : `, chased after ${ch.remindAfterDays} days`}
                </p>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : queue.length === 0 ? (
        <Card>
          <EmptyState
            icon={Send}
            title="Nothing waiting to go out"
            description="Every dispatched order already has a courier booked."
            action={<Button variant="accent" asChild><Link href="/packing">Go to packing</Link></Button>}
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {queue.map((o) => (
            <Card key={o.id} className="hover:border-brand-yellow/40 transition-colors">
              <CardBody className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <Link href={`/sales/orders/${o.id}`} className="flex items-center gap-3 flex-1 min-w-0 group">
                  <Avatar initials={o.customerInitials} size="md" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-navy-900 dark:text-white truncate group-hover:text-brand-yellow transition-colors">
                      {o.customerName}
                    </div>
                    <div className="tabular text-2xs text-slate-500 dark:text-slate-400">
                      {o.orderNo} · {o.itemCount} lines · {o.city}
                    </div>
                  </div>
                </Link>

                <Badge variant="muted">{o.city}</Badge>

                {moneyHidden ? (
                  <Badge variant={o.collectsCash ? "warning" : "muted"}>
                    {o.collectsCash ? "Collect cash" : "Nothing to collect"}
                  </Badge>
                ) : (
                  <div className="tabular text-sm font-bold text-navy-900 dark:text-white sm:w-28 sm:text-right">
                    {formatMoney(o.total)}
                  </div>
                )}

                <Button variant="accent" size="sm" className="gap-1.5 flex-shrink-0"
                  onClick={() => setDispatching(o)}>
                  <Send /> Book courier
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {dispatching && (
        <DispatchSheet
          order={dispatching}
          channels={channels}
          moneyHidden={moneyHidden}
          open
          onOpenChange={(v) => !v && setDispatching(null)}
          onDispatched={() => { setDispatching(null); void load(); }}
        />
      )}
    </>
  );
}
