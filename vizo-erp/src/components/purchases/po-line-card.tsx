"use client";

import * as React from "react";
import { Trash2, MessageSquareText, Settings2, Scale, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { ProductImage } from "@/components/products/product-image";
import { PriceDecisionDialog, type PriceDecision } from "@/components/purchases/price-decision-dialog";
import { formatMoney } from "@/lib/format";
import { num, saleOf, type PriceParts } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────────────────────
   ONE PURCHASE-ORDER LINE

   The owner's five boxes, in his order — Cost, Duty, Fi Sabilillah, Margin 1,
   Margin 2 — each saved on the line exactly as typed, with the selling price
   they add up to shown beside the quantity. Duty names the logistics company
   it is paid to (dropdown right next to the box, managed in place). Each
   extra box can carry the reason it holds what it holds; the reason is
   printed on that box's journal voucher.

   The PRICE DECISION (from the popup) belongs to the numbers it was made on:
   change the quantity or any box afterwards and it is cleared, so a stale
   average can never be saved.
   ─────────────────────────────────────────────────────────────────────────── */

export type LogisticsOption = { id: number; code: string; name: string };

export type PoLine = {
  key: string;
  productId: number; name: string; sku: string; imageUrl: string | null; currentSale: number;
  qty: string;
  cost: string; duty: string; fs: string; margin1: string; margin2: string;
  dutyAccountId: string;
  dutyNote: string; fsNote: string; margin1Note: string; margin2Note: string;
  decision: PriceDecision | null;
};

export const lineParts = (l: PoLine): PriceParts => ({
  cost: num(l.cost), duty: num(l.duty), fs: num(l.fs), margin1: num(l.margin1), margin2: num(l.margin2),
});

/** What stops this line from being saved, or null. */
export function lineProblem(l: PoLine): string | null {
  const q = num(l.qty);
  if (!(q > 0) || Math.round(q) !== q) return "The quantity must be a whole number above zero.";
  for (const k of ["cost", "duty", "fs", "margin1", "margin2"] as const) {
    const raw = l[k].trim();
    if (raw !== "" && (!Number.isFinite(parseFloat(raw)) || parseFloat(raw) < 0)) return "No price box can be negative.";
  }
  if (num(l.duty) > 0 && !l.dutyAccountId) return "Pick the logistics company the duty is paid to.";
  if (!l.decision) return "Set its new selling price (the Set price button).";
  return null;
}

const PARTS: { key: "cost" | "duty" | "fs" | "margin1" | "margin2"; label: string; note?: "dutyNote" | "fsNote" | "margin1Note" | "margin2Note" }[] = [
  { key: "cost", label: "Cost price" },
  { key: "duty", label: "Duty", note: "dutyNote" },
  { key: "fs", label: "Fi Sabilillah", note: "fsNote" },
  { key: "margin1", label: "Margin 1", note: "margin1Note" },
  { key: "margin2", label: "Margin 2", note: "margin2Note" },
];

export function PoLineCard({
  line, logistics, showErrors, onChange, onRemove, onManageLogistics,
}: {
  line: PoLine;
  logistics: LogisticsOption[];
  showErrors: boolean;
  onChange: (next: PoLine) => void;
  onRemove: () => void;
  onManageLogistics: () => void;
}) {
  const [notesOpen, setNotesOpen] = React.useState(false);
  const [priceOpen, setPriceOpen] = React.useState(false);

  const parts = lineParts(line);
  const unitSale = saleOf(parts);
  const qty = num(line.qty);
  const problem = showErrors ? lineProblem(line) : null;
  const hasNotes = !!(line.dutyNote || line.fsNote || line.margin1Note || line.margin2Note);

  /* Any change to the numbers clears the decision made on the old ones. */
  const setNumber = (k: "qty" | "cost" | "duty" | "fs" | "margin1" | "margin2", v: string) =>
    onChange({ ...line, [k]: v, decision: null });
  const set = (k: keyof PoLine, v: string) => onChange({ ...line, [k]: v });

  return (
    <div className={cn("rounded-xl border p-3 sm:p-4", problem ? "border-danger/60" : "border-slate-200 dark:border-navy-700")}>
      {/* head */}
      <div className="flex items-start gap-3">
        <ProductImage url={line.imageUrl} name={line.name} size="md" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-navy-900 dark:text-white leading-snug">{line.name}</div>
          <div className="text-2xs tabular text-slate-500">{line.sku} · sells now at {formatMoney(line.currentSale)}</div>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" className="text-danger shrink-0" onClick={onRemove} aria-label="Remove item">
          <Trash2 />
        </Button>
      </div>

      {/* the five boxes + qty + selling price */}
      {/* Two rows of four up to very wide screens (qty, cost, duty, paid-to /
          FS, margin 1, margin 2, selling price); one row of eight above that. */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 2xl:grid-cols-8 gap-2.5 items-start">
        <div>
          <Label className="mb-1 block text-xs">Quantity <span className="text-danger">*</span></Label>
          <Input type="number" inputMode="numeric" min={1} step={1} className="text-right tabular font-semibold"
            value={line.qty} onChange={(e) => setNumber("qty", e.target.value)} />
        </div>

        {PARTS.map((p) => (
          <React.Fragment key={p.key}>
            <div>
              <Label className="mb-1 block text-xs">{p.label}{p.key === "cost" && <span className="text-danger"> *</span>}</Label>
              <Input type="number" inputMode="decimal" min={0} step="0.01" className="text-right tabular"
                value={line[p.key]} onChange={(e) => setNumber(p.key, e.target.value)} />
            </div>
            {/* The logistics company sits right next to the duty it is paid to. */}
            {p.key === "duty" && (
              <div className="col-span-2 sm:col-span-1">
                <Label className="mb-1 flex items-center justify-between text-xs">
                  <span>Duty paid to{num(line.duty) > 0 && <span className="text-danger"> *</span>}</span>
                  <button type="button" onClick={onManageLogistics} className="inline-flex items-center gap-0.5 text-2xs text-slate-500 hover:text-navy-900 dark:hover:text-white">
                    <Settings2 className="size-3" /> Manage
                  </button>
                </Label>
                <SelectNative value={line.dutyAccountId} onChange={(e) => set("dutyAccountId", e.target.value)}
                  className={cn(showErrors && num(line.duty) > 0 && !line.dutyAccountId && "border-danger")}>
                  <option value="">{logistics.length ? "Logistics company…" : "Add one via Manage"}</option>
                  {logistics.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </SelectNative>
              </div>
            )}
          </React.Fragment>
        ))}

        <div>
          <Label className="mb-1 block text-xs">Selling price</Label>
          <div className="flex h-10 items-center justify-end rounded-md border border-brand-yellow/60 bg-brand-yellow/10 px-2.5 tabular font-bold text-navy-900 dark:text-white">
            {formatMoney(unitSale)}
          </div>
        </div>
      </div>

      {/* reasons */}
      <div className="mt-2">
        <button type="button" onClick={() => setNotesOpen((o) => !o)}
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-navy-900 dark:text-slate-300 dark:hover:text-white">
          <MessageSquareText className="size-3.5" />
          {notesOpen ? "Hide reasons" : hasNotes ? "Reasons (written)" : "Why these amounts? Add reasons"}
        </button>
        {notesOpen && (
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PARTS.filter((p) => p.note).map((p) => (
              <div key={p.key}>
                <Label className="mb-1 block text-2xs text-slate-500">{p.label} — reason (printed on its voucher)</Label>
                <Input maxLength={300} value={line[p.note!]} onChange={(e) => set(p.note!, e.target.value)}
                  placeholder={p.key === "margin2" ? "e.g. freight went up this season" : ""} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* totals + price decision */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-xs dark:border-navy-700">
        <span className="text-slate-500">Goods <span className="tabular font-semibold text-navy-900 dark:text-white">{formatMoney(qty * parts.cost)}</span></span>
        <span className="text-slate-500">Selling value <span className="tabular font-semibold text-navy-900 dark:text-white">{formatMoney(qty * unitSale)}</span></span>
        <div className="ml-auto flex items-center gap-2">
          {line.decision ? (
            <span className="rounded-md bg-success-light px-2 py-1 text-success-dark dark:bg-success/15 dark:text-success-light">
              {line.decision.keep
                ? <>Keeps {formatMoney(line.decision.preview)}</>
                : <>New price <span className="tabular font-semibold">{formatMoney(line.decision.preview)}</span>
                    {line.decision.batchIds.length > 0 && <> · averaged with {line.decision.batchIds.length}</>}</>}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-warning-dark dark:text-warning-light">
              <AlertTriangle className="size-3.5" /> Selling price not decided
            </span>
          )}
          <Button type="button" size="sm" variant={line.decision ? "secondary" : "accent"} onClick={() => setPriceOpen(true)}
            disabled={!(qty > 0)}>
            <Scale /> {line.decision ? "Change" : "Set price"}
          </Button>
        </div>
      </div>

      {problem && <p className="mt-2 text-xs font-medium text-danger">{problem}</p>}

      {priceOpen && (
        <PriceDecisionDialog open={priceOpen} onOpenChange={setPriceOpen}
          productId={line.productId} qty={qty} parts={parts} current={line.decision}
          onDecide={(d) => onChange({ ...line, decision: d })} />
      )}
    </div>
  );
}
