"use client";

import * as React from "react";
import axios from "axios";
import { Banknote, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { todayISO } from "@/lib/dates";
import { formatMoney, formatDate } from "@/lib/format";
import { apiMessage, type Delivery } from "./delivery-types";

type Method = { id: number; key: string; name: string; account: string; needsReference: boolean };

/**
 * "Settle COD" -- POST /delivery/{id}/settle-cod. Super Admin and accountant.
 *
 * It used to flip a flag and nothing else. It now posts through the books: a
 * confirmed collection and receipt voucher for the FULL COD (Dr the account
 * the money landed in / Cr the customer), and the courier's fee, if it kept
 * one, as an expense (Dr 5114 Delivery & Courier / Cr the same account). The
 * dialog shows both legs before the button is pressed, so the accountant sees
 * what the bank will show: COD minus the fee.
 */
export function SettleCodDialog({
  delivery, open, onOpenChange, onDone,
}: {
  delivery: Delivery;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [methods, setMethods] = React.useState<Method[] | null>(null);
  const [feeAccount, setFeeAccount] = React.useState<string | null>(null);
  const [methodId, setMethodId] = React.useState<number | null>(null);
  const [date, setDate] = React.useState(todayISO());
  const [reference, setReference] = React.useState("");
  const [fee, setFee] = React.useState("0");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<{ methods: Method[]; feeAccount: string | null }>(
        `${API_BASE_URL}/delivery/settle-methods`, { headers: authHeader() });
      setMethods(res.data.methods);
      setFeeAccount(res.data.feeAccount);
      /* A courier pays into the bank; start there when there is one. */
      setMethodId((res.data.methods.find((m) => m.key === "BANK") ?? res.data.methods[0])?.id ?? null);
    } catch (e) {
      toast.error("Could not load the accounts", { description: apiMessage(e, "Please try again.") });
      setMethods([]);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the component is the brief for this project. */
    if (open && methods === null) void load();
  }, [open, methods, load]);

  const method = methods?.find((m) => m.id === methodId) ?? null;
  const feeNum = Math.max(0, Number(fee) || 0);
  const net = delivery.codAmount - feeNum;
  const deliveredOn = delivery.deliveredDate?.slice(0, 10) ?? "";
  const dateBad = date > todayISO() || (deliveredOn !== "" && date < deliveredOn);
  const ready = Boolean(method) && !dateBad && feeNum < delivery.codAmount &&
    (!method?.needsReference || reference.trim().length > 0);

  async function save() {
    if (!method) return;
    setSaving(true);
    try {
      const res = await axios.post<{ message: string }>(
        `${API_BASE_URL}/delivery/${delivery.id}/settle-cod`,
        {
          methodId: method.id, settledOn: date, referenceNo: reference.trim() || null,
          courierFee: feeNum, note: note.trim() || null,
        },
        { headers: authHeader() }
      );
      toast.success("COD settled", { description: res.data.message });
      onDone();
    } catch (e) {
      toast.error("Not settled", { description: apiMessage(e, "Please try again.") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="w-[calc(100%-1.5rem)]">
        <DialogHeader>
          <DialogTitle>Settle COD · {delivery.deliveryNo}</DialogTitle>
          <DialogDescription>
            {delivery.customerName} · {delivery.orderNo}
            {delivery.courierName ? ` · ${delivery.courierName}` : ""}
            {delivery.deliveredDate ? ` · delivered ${formatDate(delivery.deliveredDate)}` : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="rounded-lg bg-slate-50 dark:bg-navy-900/40 p-3 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">Collected at the door</span>
            <span className="tabular text-lg font-bold text-navy-900 dark:text-white">{formatMoney(delivery.codAmount)}</span>
          </div>

          {methods === null ? (
            <Skeleton className="h-10" />
          ) : (
            <div>
              <Label htmlFor="cod-method" required>Where the money landed</Label>
              <SelectNative id="cod-method" className="mt-1.5" value={methodId === null ? "" : String(methodId)}
                onChange={(e) => setMethodId(e.target.value ? Number(e.target.value) : null)}>
                {methods.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} — {m.account}</option>
                ))}
              </SelectNative>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cod-date" required>Received on</Label>
              {/* A plain date input: courier money is recorded after it lands. */}
              <Input id="cod-date" type="date" className="mt-1.5" value={date}
                min={deliveredOn || undefined} max={todayISO()}
                onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cod-ref" required={Boolean(method?.needsReference)}>Reference</Label>
              <Input id="cod-ref" className="mt-1.5" value={reference} maxLength={50}
                placeholder={method?.needsReference ? "Courier payment / transfer no." : "Optional"}
                onChange={(e) => setReference(e.target.value)} />
            </div>
          </div>

          <div>
            <Label htmlFor="cod-fee">Courier&apos;s fee kept</Label>
            <Input id="cod-fee" type="number" min={0} step="0.01" inputMode="decimal" className="mt-1.5 tabular"
              value={fee} onChange={(e) => setFee(e.target.value)} />
            {feeNum >= delivery.codAmount && (
              <p className="text-2xs text-danger mt-1">The fee must be less than the COD.</p>
            )}
          </div>

          <div>
            <Label htmlFor="cod-note">Note</Label>
            <Input id="cod-note" className="mt-1.5" value={note} maxLength={200}
              placeholder="Optional — e.g. weekly TCS settlement"
              onChange={(e) => setNote(e.target.value)} />
          </div>

          {/* What will post -- the two entries, before the button is pressed. */}
          <div className="rounded-lg border border-slate-200 dark:border-navy-700 text-xs divide-y divide-slate-100 dark:divide-navy-700">
            <div className="px-3 py-2 font-semibold text-navy-900 dark:text-white">What this posts</div>
            <div className="px-3 py-2 flex justify-between gap-3">
              <span className="text-slate-600 dark:text-slate-300 min-w-0">Dr {method?.account ?? "—"} · Cr the customer</span>
              <span className="tabular font-medium shrink-0">{formatMoney(delivery.codAmount)}</span>
            </div>
            {feeNum > 0 && (
              <div className="px-3 py-2 flex justify-between gap-3">
                <span className="text-slate-600 dark:text-slate-300 min-w-0">Dr {feeAccount ?? "5114"} · Cr {method?.account ?? "—"}</span>
                <span className="tabular font-medium shrink-0">{formatMoney(feeNum)}</span>
              </div>
            )}
            <div className="px-3 py-2 flex justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">The account ends up holding</span>
              <span className="tabular font-bold text-success shrink-0">{formatMoney(Math.max(0, net))}</span>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button variant="accent" className="gap-1.5" disabled={!ready || saving} onClick={() => void save()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Banknote className="size-4" />}
            Settle {formatMoney(delivery.codAmount)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
