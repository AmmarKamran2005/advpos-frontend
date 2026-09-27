"use client";

import * as React from "react";
import axios from "axios";
import { PackageCheck, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { todayISO } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { apiMessage, type Delivery } from "./delivery-types";

/**
 * "Mark delivered" -- POST /delivery/{id}/confirm.
 *
 * The endpoint existed and no screen called it (27 Sep, round E). It asks the
 * two things anybody chasing a missing parcel wants: the day it arrived and
 * who signed for it. The API refuses a future date, a date before the booking,
 * and anybody whose role does not own the delivery's channel; the dialog says
 * the same up front rather than waiting for the refusal. Confirming also moves
 * a Dispatched order to Delivered.
 *
 * DELIBERATELY a plain date input, not DateInput (which refuses past days --
 * HANDOFF D2): a parcel that arrived yesterday is confirmed today all the
 * time. The floor is the booking date.
 */
export function ConfirmDeliveryDialog({
  delivery, open, onOpenChange, onDone,
}: {
  delivery: Delivery;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [date, setDate] = React.useState(todayISO());
  const [receivedBy, setReceivedBy] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const tooEarly = date < delivery.bookedDate.slice(0, 10);
  const inFuture = date > todayISO();
  const ready = receivedBy.trim().length > 0 && !tooEarly && !inFuture && Boolean(date);

  async function save() {
    setSaving(true);
    try {
      const res = await axios.post<{ message: string }>(
        `${API_BASE_URL}/delivery/${delivery.id}/confirm`,
        { deliveredDate: date, receivedBy: receivedBy.trim(), notes: notes.trim() || null },
        { headers: authHeader() }
      );
      toast.success("Marked delivered", { description: res.data.message });
      onDone();
    } catch (e) {
      toast.error("Not confirmed", { description: apiMessage(e, "Please try again.") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="w-[calc(100%-1.5rem)]">
        <DialogHeader>
          <DialogTitle>Mark {delivery.deliveryNo} delivered</DialogTitle>
          <DialogDescription>
            {delivery.customerName} · {delivery.orderNo} · booked {formatDate(delivery.bookedDate)}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <Label htmlFor="dlv-date" required>Delivered on</Label>
            <Input id="dlv-date" type="date" className="mt-1.5" value={date}
              min={delivery.bookedDate.slice(0, 10)} max={todayISO()}
              onChange={(e) => setDate(e.target.value)} />
            {(tooEarly || inFuture) && (
              <p className="text-2xs text-danger mt-1">
                {tooEarly ? "It cannot have arrived before it was booked." : "That day has not come yet."}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="dlv-who" required>Received by</Label>
            <Input id="dlv-who" className="mt-1.5" value={receivedBy} maxLength={100} autoComplete="off"
              placeholder="Name on the signature, e.g. Rashid (shop manager)"
              onChange={(e) => setReceivedBy(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="dlv-notes">Note</Label>
            <Input id="dlv-notes" className="mt-1.5" value={notes} maxLength={500}
              placeholder="Optional — e.g. signed bilty copy kept"
              onChange={(e) => setNotes(e.target.value)} />
          </div>
          {delivery.collectsCash && !delivery.codSettled && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This parcel carries cash on delivery. Once it is marked delivered, accounts settles the
              courier&apos;s payment from this screen.
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button variant="accent" className="gap-1.5" disabled={!ready || saving} onClick={() => void save()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <PackageCheck className="size-4" />}
            Mark delivered
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
