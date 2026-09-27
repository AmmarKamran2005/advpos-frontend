"use client";

import * as React from "react";
import {
  Send, Truck, Store, PackageCheck, Hash, Info, AlertTriangle, X, Calendar, Loader2, Banknote,
} from "lucide-react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter,
} from "@/components/ui/sheet";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { todayISO, addDaysISO } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * BOOKING A COURIER for an order that has already been dispatched.
 *
 * This used to live inside app/(app)/dispatch/page.tsx. It moved here on
 * 27 Sep (round E) because the Delivery screen's "Book Delivery" button only
 * showed a toast -- and the right fix was not a second, drifting copy of this
 * form but the same one, opened from both screens against the same endpoint
 * (POST /dispatch/{id}/dispatch).
 *
 * THE ORDER DESK SEES NO MONEY (the owner, 26 Sep). For the desk the API sends
 * zero totals and `moneyHidden`; the form then shows no total and no COD box,
 * says only whether cash is to be collected at the door, and the API works the
 * COD out itself when the desk books.
 */

/* GET /dispatch -> { waiting, late, moneyHidden, items } */
export type DispatchOrder = {
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
  collectsCash: boolean;
  waitingDays: number;
  isLate: boolean;
};

export type DispatchResponse = { waiting: number; late: number; moneyHidden: boolean; items: DispatchOrder[] };

/* GET /dispatch/lookups -> the DeliveryChannel rows with the couriers each allows. */
export type Carrier = {
  id: number;
  name: string;
  shortName: string;
  bookingCharge: number;
  codFeePercent: number;
  codSettlementDays: number;
};

export type Channel = {
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

export type DispatchLookups = { channels: Channel[] };

/* Icons are presentation, so they stay here keyed by the channel key the
   database uses; an unknown key falls back rather than crashing. */
const CHANNEL_ICON: Record<string, typeof Truck> = {
  local: Store,
  online: Send,
  cargo: Truck,
  logistics: PackageCheck,
};
export const channelIcon = (key: string) => CHANNEL_ICON[key] ?? Truck;

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export function DispatchSheet({
  order, channels, moneyHidden, open, onOpenChange, onDispatched,
}: {
  order: DispatchOrder;
  channels: Channel[];
  moneyHidden: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDispatched: (deliveryId: number | null) => void;
}) {
  /* A Karachi address almost always goes out by hand -- start on the local
     channel when there is one, otherwise cargo, otherwise the first channel. */
  const initial =
    (order.city.startsWith("Karachi") ? channels.find((c) => c.key === "local") : undefined) ??
    channels.find((c) => c.key === "cargo") ??
    channels[0];

  const [channelId, setChannelId] = React.useState<number>(initial?.id ?? 0);
  const channel = channels.find((c) => c.id === channelId) ?? initial;

  const [carrierId, setCarrierId] = React.useState<number | null>(initial?.carriers[0]?.id ?? null);
  const [tracking, setTracking] = React.useState("");
  const [expected, setExpected] = React.useState(() =>
    addDaysISO(todayISO(), Math.max(1, initial?.remindAfterDays ?? 2)));
  const [parcels, setParcels] = React.useState("1");
  const [weightKg, setWeightKg] = React.useState("0");
  /* COD only means anything when the order is not already paid; the API works
     the suggestion out and this form just offers it. */
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
    setExpected(addDaysISO(todayISO(), Math.max(1, next?.remindAfterDays ?? 2)));
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
      const res = await axios.post<{ message: string; deliveryId?: number }>(
        `${API_BASE_URL}/dispatch/${order.id}/dispatch`,
        {
          channelId: channel.id,
          courierId: carrierId,
          trackingNo: tracking.trim() || null,
          bookedDate: todayISO(),
          expectedDate: expected || null,
          parcels: Number(parcels) || 1,
          weightKg: Number(weightKg) || 0,
          /* Ignored by the API for the order desk, which works it out itself. */
          codAmount: moneyHidden ? 0 : Number(cod) || 0,
          /* The courier's own booking charge, so the delivery row carries what
             it actually cost rather than a figure typed from memory. */
          bookingCharge: carrier?.bookingCharge ?? 0,
          notes: notes.trim() || null,
        },
        { headers: authHeader() }
      );
      toast.success("Courier booked", { description: res.data.message });
      onDispatched(res.data.deliveryId ?? null);
    } catch (e) {
      toast.error("Not booked", { description: apiMessage(e, "Please try again.") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" width="md">
        <SheetHeader>
          <SheetTitle>Book delivery · {order.orderNo}</SheetTitle>
          <SheetDescription>
            {order.customerName} · {order.city}
            {!moneyHidden && <> · {formatMoney(order.total)}</>}
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          <Label>How is it going?</Label>
          <div className="grid grid-cols-2 gap-2 mt-1.5 mb-5">
            {channels.map((ch) => {
              const Icon = channelIcon(ch.key);
              const active = channelId === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setChannelId(ch.id)}
                  className={cn(
                    "text-left p-3 rounded-lg border-2 transition-colors min-w-0",
                    active
                      ? "border-brand-yellow bg-brand-yellow/5"
                      : "border-slate-200 dark:border-navy-700 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={cn("size-4 shrink-0", active ? "text-brand-yellow" : "text-slate-400")} />
                    <span className="text-sm font-semibold text-navy-900 dark:text-white truncate">
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
                  {c.name}{!moneyHidden && c.bookingCharge > 0 ? ` · ${formatMoney(c.bookingCharge)} booking` : ""}
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
              <Input id="parcels" type="number" min={1} inputMode="numeric" className="mt-1.5 tabular"
                value={parcels} onChange={(e) => setParcels(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input id="weight" type="number" min={0} step="0.01" inputMode="decimal" className="mt-1.5 tabular"
                value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
            </div>
          </div>

          {moneyHidden ? (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-slate-200 dark:border-navy-700 p-3">
              <Banknote className="size-4 text-slate-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {order.collectsCash
                  ? "Cash is to be collected at the door. The amount goes on the courier's slip from accounts."
                  : "Nothing to collect at the door — this order is on credit or already paid."}
              </p>
            </div>
          ) : (
            <div className="mb-4">
              <Label htmlFor="cod">Cash to collect on delivery</Label>
              <Input id="cod" type="number" min={0} step="0.01" inputMode="decimal" className="mt-1.5 tabular"
                value={cod} onChange={(e) => setCod(e.target.value)} />
              <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1">
                {order.suggestedCod > 0
                  ? `Suggested ${formatMoney(order.suggestedCod)} — the unpaid balance on this order.`
                  : "This order is on credit or already paid, so nothing is due at the door."}
              </p>
            </div>
          )}

          <div className="mb-5">
            <Label htmlFor="expected">Should reach by</Label>
            <div className="relative mt-1.5">
              <Calendar className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <DateInput
                id="expected"
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
                    They mark it delivered on the Delivery screen, with who received it.
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
                Enter the bilty number before booking.
              </p>
            </div>
          )}
        </SheetBody>

        <SheetFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            <X /> Cancel
          </Button>
          <Button type="button" variant="accent" className="gap-1.5" onClick={() => void dispatch()} disabled={saving || !channel}>
            {saving ? <><Loader2 className="size-4 animate-spin" /> Booking…</> : <><Send /> Book courier</>}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
