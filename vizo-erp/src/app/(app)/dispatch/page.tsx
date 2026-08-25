"use client";

import * as React from "react";
import Link from "next/link";
import {
  Send, Truck, Store, PackageCheck, Hash, Info, AlertTriangle, X, Calendar, Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter,
} from "@/components/ui/sheet";
import { toast } from "@/components/ui/toaster";
import axios from "axios";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/* GET /dispatch -> { waiting, late, items } -- packed orders with no
   delivery booked yet.

   POST /dispatch/{id}/dispatch books the delivery. The channel chosen here
   decides WHO may confirm arrival later and when the reminder starts, so it
   is validated server-side against DeliveryChannel rather than trusted. */
type DispatchOrder = {
  id: number;
  orderNo: string;
  customerId: number;
  customerName: string;
  customerInitials: string;
  customerPhone: string | null;
  address: string | null;
  city: string;
  province: string;
  locationId: number;
  location: string;
  orderDate: string;
  deliveryDate: string | null;
  total: number;
  paymentMethod: string;
  itemCount: number;
  totalUnits: number;
  invoiceId: number | null;
  invoiceNo: string | null;
  paidAmount: number;
  suggestedCod: number;
  waitingDays: number;
  isLate: boolean;
};

type DispatchResponse = { waiting: number; late: number; items: DispatchOrder[] };

type Order = DispatchOrder;

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /dispatch/lookups -> the DeliveryChannel rows with the couriers each one
   allows. Channel keys and their carrier lists used to be a hard-coded array in
   src/data/settings; a courier added at /admin/couriers never showed up here.
   `confirmedByRole` is a Role key from the database ("sales", "order-dept",
   "accountant"), not the "sales-rep" / "cargo-handler" words the mock used. */
type Carrier = {
  id: number;
  name: string;
  shortName: string;
  bookingCharge: number;
  codFeePercent: number;
  codSettlementDays: number;
};

type Channel = {
  id: number;
  key: string;
  name: string;
  description: string;
  requiresBilty: boolean;
  remindAfterDays: number;
  remindEveryHours: number;
  confirmedByRole: string;
  confirmedByRoleName: string;
  carriers: Carrier[];
};

type DispatchLookups = { channels: Channel[] };

/* Icons are presentation, so they stay in the page keyed by the channel key the
   database uses; an unknown key falls back rather than crashing. */
const CHANNEL_ICON: Record<string, typeof Truck> = {
  local: Store,
  online: Send,
  cargo: Truck,
  logistics: PackageCheck,
};
const iconFor = (key: string) => CHANNEL_ICON[key] ?? Truck;

const todayIso = () => new Date().toISOString().slice(0, 10);

function addDays(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Packed orders leaving the building.
 *
 * The route chosen here decides who will later be asked whether it arrived —
 * the rep for a Karachi hand-delivery, the back office for a courier, the
 * cargo desk for freight. Picking it is the whole point of the screen, so the
 * consequence is spelled out before the button is pressed.
 */
export default function DispatchPage() {
  const [queue, setQueue] = React.useState<DispatchOrder[]>([]);
  const [channels, setChannels] = React.useState<Channel[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const [res, lookups] = await Promise.all([
        axios.get<DispatchResponse>(`${API_BASE_URL}/dispatch`, { headers: authHeader() }),
        axios.get<DispatchLookups>(`${API_BASE_URL}/dispatch/lookups`, { headers: authHeader() }),
      ]);
      setQueue(res.data.items);
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
  const [dispatching, setDispatching] = React.useState<Order | null>(null);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Daily Work" }, { label: "Dispatch" }]}
        title="Dispatch"
        subtitle="Packed orders waiting for a route out."
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

      {/* How each route gets confirmed — the thing people forget */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        {channels.map((ch) => {
          const Icon = iconFor(ch.key);
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
            description="Everything packed has already been dispatched."
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

                <div className="tabular text-sm font-bold text-navy-900 dark:text-white sm:w-28 sm:text-right">
                  {formatMoney(o.total)}
                </div>

                <Button variant="accent" size="sm" className="gap-1.5 flex-shrink-0"
                  onClick={() => setDispatching(o)}>
                  <Send /> Dispatch
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
          open
          onOpenChange={(v) => !v && setDispatching(null)}
          onDispatched={() => { setDispatching(null); void load(); }}
        />
      )}
    </>
  );
}

function DispatchSheet({
  order, channels, open, onOpenChange, onDispatched,
}: {
  order: Order;
  channels: Channel[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDispatched: () => void;
}) {
  /* A Karachi address almost always goes out by hand -- start on the local
     channel when there is one, otherwise the first channel the API returned. */
  const initial =
    (order.city === "Karachi" ? channels.find((c) => c.key === "local") : undefined) ??
    channels.find((c) => c.key === "cargo") ??
    channels[0];

  const [channelId, setChannelId] = React.useState<number>(initial?.id ?? 0);
  const channel = channels.find((c) => c.id === channelId) ?? initial;

  const [carrierId, setCarrierId] = React.useState<number | null>(initial?.carriers[0]?.id ?? null);
  const [tracking, setTracking] = React.useState("");
  const [expected, setExpected] = React.useState(() =>
    addDays(todayIso(), Math.max(1, initial?.remindAfterDays ?? 2)));
  const [parcels, setParcels] = React.useState("1");
  const [weightKg, setWeightKg] = React.useState("0");
  /* COD only means anything when the order is not already paid; the API works
     the suggestion out and this screen just offers it. */
  const [cod, setCod] = React.useState(String(order.suggestedCod ?? 0));
  const [notes, setNotes] = React.useState("");
  const [touchedCarrier, setTouchedCarrier] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  /* Follow the channel unless the user has picked a carrier themselves. */
  const [lastChannel, setLastChannel] = React.useState<number>(channelId);
  if (lastChannel !== channelId) {
    setLastChannel(channelId);
    const next = channels.find((c) => c.id === channelId);
    if (!touchedCarrier) setCarrierId(next?.carriers[0]?.id ?? null);
    setExpected(addDays(todayIso(), Math.max(1, next?.remindAfterDays ?? 2)));
  }

  const carrier = channel?.carriers.find((c) => c.id === carrierId) ?? null;
  const needsRef = channel?.requiresBilty ?? false;
  const missingRef = needsRef && tracking.trim().length === 0;

  async function dispatch() {
    if (!channel) return;
    if (missingRef) {
      toast.error("Bilty number needed", {
        description: "Freight cannot be traced without it — that is the only proof you have.",
      });
      return;
    }
    setSaving(true);
    try {
      const res = await axios.post<{ message: string }>(
        `${API_BASE_URL}/dispatch/${order.id}/dispatch`,
        {
          channelId: channel.id,
          courierId: carrierId,
          trackingNo: tracking.trim() || null,
          bookedDate: todayIso(),
          expectedDate: expected || null,
          parcels: Number(parcels) || 1,
          weightKg: Number(weightKg) || 0,
          codAmount: Number(cod) || 0,
          /* The courier own booking charge, so the delivery row carries what it
             actually cost rather than a figure typed from memory. */
          bookingCharge: carrier?.bookingCharge ?? 0,
          notes: notes.trim() || null,
        },
        { headers: authHeader() }
      );
      toast.success("Dispatched", { description: res.data.message });
      onDispatched();
    } catch (e) {
      toast.error("Not dispatched", { description: apiMessage(e, "Please try again.") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" width="md">
        <SheetHeader>
          <SheetTitle>Dispatch {order.orderNo}</SheetTitle>
          <SheetDescription>
            {order.customerName} · {order.city} · {formatMoney(order.total)}
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          <Label>How is it going?</Label>
          <div className="grid grid-cols-2 gap-2 mt-1.5 mb-5">
            {channels.map((ch) => {
              const Icon = iconFor(ch.key);
              const active = channelId === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setChannelId(ch.id)}
                  className={cn(
                    "text-left p-3 rounded-lg border-2 transition-colors",
                    active
                      ? "border-brand-yellow bg-brand-yellow/5"
                      : "border-slate-200 dark:border-navy-700 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={cn("size-4", active ? "text-brand-yellow" : "text-slate-400")} />
                    <span className="text-sm font-semibold text-navy-900 dark:text-white">
                      {ch.name}
                    </span>
                  </div>
                  <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    {ch.description}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mb-4">
            <Label htmlFor="carrier">Who is carrying it</Label>
            <SelectNative
              id="carrier"
              value={carrierId === null ? "" : String(carrierId)}
              onChange={(e) => {
                setCarrierId(e.target.value ? Number(e.target.value) : null);
                setTouchedCarrier(true);
              }}
              className="mt-1.5"
            >
              <option value="">— None —</option>
              {(channel?.carriers ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.bookingCharge > 0 ? ` · ${formatMoney(c.bookingCharge)} booking` : ""}
                </option>
              ))}
            </SelectNative>
          </div>

          <div className="mb-4">
            <Label htmlFor="tracking" required={needsRef}>
              {needsRef ? "Bilty number" : "Tracking number"}
            </Label>
            <div className="relative mt-1.5">
              <Hash className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                id="tracking"
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder={needsRef ? "BL-2026-4471" : "leave blank if there is none"}
                className={cn("pl-9 tabular", missingRef && "border-danger")}
              />
            </div>
            {needsRef && (
              <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1.5">
                Freight has no tracking feed. The bilty receipt is the only proof, so it is
                required here.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <Label htmlFor="parcels">Parcels</Label>
              <Input id="parcels" type="number" min={1} className="mt-1.5 tabular"
                value={parcels} onChange={(e) => setParcels(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input id="weight" type="number" min={0} step="0.01" className="mt-1.5 tabular"
                value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
            </div>
          </div>

          <div className="mb-4">
            <Label htmlFor="cod">Cash to collect on delivery</Label>
            <Input id="cod" type="number" min={0} step="0.01" className="mt-1.5 tabular"
              value={cod} onChange={(e) => setCod(e.target.value)} />
            <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1">
              {order.suggestedCod > 0
                ? `Suggested ${formatMoney(order.suggestedCod)} — the unpaid balance on this order.`
                : "This order is on credit or already paid, so nothing is due at the door."}
            </p>
          </div>

          <div className="mb-5">
            <Label htmlFor="expected">Should reach by</Label>
            <div className="relative mt-1.5">
              <Calendar className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                id="expected"
                type="date"
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="mb-5">
            <Label htmlFor="notes">Note</Label>
            <Input id="notes" className="mt-1.5" value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything the person delivering should know" />
          </div>

          {/* What happens after this button */}
          {channel && (
            <div className="rounded-lg border border-info/25 bg-info/5 p-3">
              <div className="flex items-start gap-2.5">
                <Info className="size-4 text-info flex-shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                  <p>
                    <span className="font-semibold text-navy-900 dark:text-white">
                      {channel.confirmedByRoleName} confirms this one.
                    </span>{" "}
                    They can mark it delivered, still on the way, or came back.
                  </p>
                  <p>
                    {channel.remindAfterDays === 0
                      ? "Reminders start today"
                      : `Reminders start ${channel.remindAfterDays} days after dispatch`}
                    , then repeat every {channel.remindEveryHours} hours until somebody answers.
                  </p>
                </div>
              </div>
            </div>
          )}

          {missingRef && (
            <div className="flex items-start gap-2.5 mt-3 p-3 rounded-lg bg-danger/5 border border-danger/25">
              <AlertTriangle className="size-4 text-danger flex-shrink-0 mt-0.5" />
              <p className="text-xs text-danger-dark dark:text-danger-light">
                Enter the bilty number before dispatching.
              </p>
            </div>
          )}
        </SheetBody>

        <SheetFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            <X /> Cancel
          </Button>
          <Button type="button" variant="accent" className="gap-1.5" onClick={() => void dispatch()} disabled={saving || !channel}>
            {saving ? <><Loader2 className="size-4 animate-spin" /> Dispatching…</> : <><Send /> Dispatch &amp; invoice</>}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
