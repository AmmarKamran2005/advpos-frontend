"use client";

import * as React from "react";
import axios from "axios";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { exportError } from "@/lib/export";
import { cn } from "@/lib/utils";
import { todayISO } from "@/lib/dates";

const PRESETS = [10, 20, 30, 40];

/**
 * "Plan Clearance" on Dead Stock -- POST /reports/dead-stock/clearance.
 *
 * It used to be a toast. It now downloads a clearance SHEET: every dead line
 * with a suggested clearance price at the discount chosen, what the stock is
 * worth now and at that price, and a column to write the buyer in. For the
 * Super Admin only, the cost and a "below cost" flag, with the option to hold
 * any price at cost. The Super Admin is notified that a plan was drawn up.
 * Prices in the catalogue do not change -- that stays his decision.
 *
 * A POST that answers with a file, so it is fetched as a blob with the auth
 * header (the same reason lib/export.ts fetches rather than navigates).
 */
export function ClearanceDialog({
  open, onOpenChange, days, count, seesCost,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  days: number;
  count: number;
  seesCost: boolean;
}) {
  const [discount, setDiscount] = React.useState("20");
  const [floorAtCost, setFloorAtCost] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const pct = Number(discount);
  const valid = Number.isFinite(pct) && pct > 0 && pct < 100;

  async function download() {
    setBusy(true);
    try {
      const res = await axios.post<Blob>(`${API_BASE_URL}/reports/dead-stock/clearance`,
        { days, discountPercent: pct, floorAtCost: seesCost && floorAtCost },
        { headers: authHeader(), responseType: "blob" });
      const disposition = String(res.headers["content-disposition"] ?? "");
      const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = match ? decodeURIComponent(match[1]) : `clearance-plan-${days}d-${pct}pct-${todayISO()}.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast.success("Clearance sheet downloaded", {
        description: seesCost ? "Check the Against Cost column before quoting anybody." : "The Super Admin has been told a plan was drawn up.",
      });
      onOpenChange(false);
    } catch (e) {
      toast.error("No clearance sheet", { description: await exportError(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="w-[calc(100%-1.5rem)]">
        <DialogHeader>
          <DialogTitle>Plan clearance</DialogTitle>
          <DialogDescription>
            {count} item{count === 1 ? "" : "s"} with stock and nothing sold in {days} days. Download a sheet with a
            clearance price for each, to mark up and hand to buyers.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <Label htmlFor="clr-pct" required>Discount off the sale price</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {PRESETS.map((p) => (
                <button key={p} type="button" onClick={() => setDiscount(String(p))}
                  className={cn("px-3 h-9 rounded-md border text-sm tabular transition-colors",
                    Number(discount) === p
                      ? "border-brand-yellow bg-brand-yellow/10 font-semibold text-navy-900 dark:text-white"
                      : "border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300 hover:border-slate-300")}>
                  {p}%
                </button>
              ))}
              <div className="relative w-24">
                <Input id="clr-pct" type="number" min={1} max={99} step="0.5" inputMode="decimal"
                  className="tabular pr-6" value={discount} onChange={(e) => setDiscount(e.target.value)} />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
              </div>
            </div>
            {!valid && <p className="text-2xs text-danger mt-1">Between 0% and 100%.</p>}
          </div>
          {seesCost && (
            <label className="flex items-start gap-2.5 cursor-pointer">
              <Checkbox checked={floorAtCost} onCheckedChange={(v) => setFloorAtCost(v === true)} className="mt-0.5" />
              <span className="text-sm text-slate-700 dark:text-slate-200">
                Never below cost
                <span className="block text-2xs text-slate-500 dark:text-slate-400">
                  A line whose clearance price would fall under its cost is held at cost and marked.
                </span>
              </span>
            </label>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button variant="accent" className="gap-1.5" disabled={!valid || busy || count === 0} onClick={() => void download()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
            Download sheet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
