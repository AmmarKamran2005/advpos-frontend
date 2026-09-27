"use client";

import * as React from "react";
import axios from "axios";
import { Send, Search, PackageOpen } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatDate } from "@/lib/format";
import {
  DispatchSheet, type Channel, type DispatchLookups, type DispatchOrder, type DispatchResponse,
} from "./dispatch-sheet";
import { apiMessage } from "./delivery-types";

/**
 * "Book Delivery" on the Delivery screen (27 Sep, round E). It used to show a
 * toast reading "Pick an invoice, choose a courier, enter the tracking number"
 * -- instructions for a form that did not exist.
 *
 * Booking already existed on /dispatch (POST /dispatch/{id}/dispatch), so this
 * is that, not a second one: pick one of the dispatched orders still waiting
 * for a courier, and the SAME booking form /dispatch uses opens over this
 * screen. Only an order the chain has moved to Dispatched can be booked -- that
 * is where the stock leaves the shelf -- so the list is the dispatch queue, not
 * every invoice.
 */
export function BookDelivery({
  open, onOpenChange, onBooked,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onBooked: (deliveryId: number | null) => void;
}) {
  const [queue, setQueue] = React.useState<DispatchOrder[] | null>(null);
  const [channels, setChannels] = React.useState<Channel[]>([]);
  const [moneyHidden, setMoneyHidden] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [picked, setPicked] = React.useState<DispatchOrder | null>(null);

  const load = React.useCallback(async () => {
    try {
      const [res, lookups] = await Promise.all([
        axios.get<DispatchResponse>(`${API_BASE_URL}/dispatch`, { headers: authHeader() }),
        axios.get<DispatchLookups>(`${API_BASE_URL}/dispatch/lookups`, { headers: authHeader() }),
      ]);
      setQueue(res.data.items);
      setMoneyHidden(Boolean(res.data.moneyHidden));
      setChannels(lookups.data.channels);
    } catch (e) {
      toast.error("Could not load the orders waiting to go", { description: apiMessage(e, "Please try again.") });
      setQueue([]);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the component is the brief for this project; loaded when
       the picker opens, so the Delivery screen pays nothing until then. */
    if (open) void load();
  }, [open, load]);

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return (queue ?? []).filter((o) =>
      !q || o.orderNo.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) ||
      (o.invoiceNo ?? "").toLowerCase().includes(q) || o.city.toLowerCase().includes(q));
  }, [queue, query]);

  return (
    <>
      <Dialog open={open && !picked} onOpenChange={onOpenChange}>
        <DialogContent size="lg" className="w-[calc(100%-1.5rem)]">
          <DialogHeader>
            <DialogTitle>Book a delivery</DialogTitle>
            <DialogDescription>
              Orders marked Dispatched that have no courier booked yet. Pick one to book it.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3 pb-5">
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9"
                placeholder="Order, invoice, customer or city…" />
            </div>
            {queue === null ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : rows.length === 0 ? (
              <EmptyState icon={PackageOpen}
                title={queue.length === 0 ? "Nothing waiting for a courier" : "No order matches"}
                description={queue.length === 0
                  ? "Every dispatched order already has its delivery booked. Mark an order Dispatched on the order screen first."
                  : "Try another search."} />
            ) : (
              <div className="space-y-1.5 max-h-[55vh] overflow-y-auto scrollbar-thin">
                {rows.map((o) => (
                  <button key={o.id} type="button" onClick={() => setPicked(o)}
                    className="w-full text-left flex items-center gap-3 rounded-lg border border-slate-200 dark:border-navy-700 p-2.5 hover:border-brand-yellow/60 hover:bg-brand-yellow/5 transition-colors">
                    <Avatar initials={o.customerInitials} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{o.customerName}</div>
                      <div className="tabular text-2xs text-slate-500 dark:text-slate-400 truncate">
                        {o.orderNo}{o.invoiceNo ? ` · ${o.invoiceNo}` : ""} · {o.city} · {formatDate(o.orderDate)}
                      </div>
                    </div>
                    {o.isLate && <Badge variant="danger">Late</Badge>}
                    <Send className="size-4 text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {picked && (
        <DispatchSheet
          order={picked}
          channels={channels}
          moneyHidden={moneyHidden}
          open
          onOpenChange={(v) => { if (!v) setPicked(null); }}
          onDispatched={(deliveryId) => { setPicked(null); onOpenChange(false); onBooked(deliveryId); }}
        />
      )}
    </>
  );
}
