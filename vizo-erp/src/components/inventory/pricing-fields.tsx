"use client";

import * as React from "react";
import { Lock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format";
import { PART_KEYS, num, saleOf, type PriceParts } from "@/lib/pricing";

/* ───────────────────────────────────────────────────────────────────────────
   OPENING PRICING — COST · DUTY · FI SABILILLAH · MARGIN 1 · MARGIN 2 = SALE

   The five boxes in the order the owner listed them, and the sale price is
   their sum, shown, never typed (26 Sep). The same five parts appear on every
   purchase-order line (components/purchases/po-line-editor.tsx), so a price
   set here is the one a first purchase order opens with.

   Strings, not numbers, all the way through: a number input that is re-set on
   every keystroke eats the decimal point the person is halfway through typing.
   ─────────────────────────────────────────────────────────────────────────── */

export type PricingDraft = Record<keyof PriceParts, string>;

export const EMPTY_PRICING: PricingDraft = { cost: "", duty: "0", fs: "0", margin1: "0", margin2: "0" };

export function pricingDraftFrom(p: {
  costPrice: number | null; dutyPrice: number | null; fsPrice?: number | null;
  marginPrice: number | null; margin2Price?: number | null;
}): PricingDraft {
  const s = (n: number | null | undefined) => String(n ?? 0);
  return { cost: s(p.costPrice), duty: s(p.dutyPrice), fs: s(p.fsPrice), margin1: s(p.marginPrice), margin2: s(p.margin2Price) };
}

/** The body fields the product API takes. */
export function pricingPayload(d: PricingDraft) {
  return {
    costPrice: num(d.cost), dutyPrice: num(d.duty), fsPrice: num(d.fs),
    margin1Price: num(d.margin1), margin2Price: num(d.margin2),
  };
}

/** What is wrong with the boxes, or null. */
export function pricingProblem(d: PricingDraft): string | null {
  const cost = parseFloat(d.cost);
  if (!Number.isFinite(cost) || cost <= 0) return "Enter a cost price above zero.";
  for (const k of PART_KEYS) {
    const raw = d[k].trim();
    if (raw === "") continue;
    const v = parseFloat(raw);
    if (!Number.isFinite(v) || v < 0) return "No price box can be negative.";
  }
  if (saleOf(d) <= 0) return "The sale price must be above zero.";
  return null;
}

const BOXES: { key: keyof PriceParts; label: string; hint: string; placeholder: string }[] = [
  { key: "cost", label: "Cost price", hint: "Supplier's price per unit", placeholder: "1000" },
  { key: "duty", label: "Duty", hint: "Customs & clearing, per unit", placeholder: "100" },
  { key: "fs", label: "Fi Sabilillah", hint: "FS price, per unit", placeholder: "100" },
  { key: "margin1", label: "Margin 1", hint: "The ordinary margin", placeholder: "100" },
  { key: "margin2", label: "Margin 2", hint: "Any further amount", placeholder: "100" },
];

export function PricingFields({
  value,
  onChange,
  error,
  locked,
}: {
  value: PricingDraft;
  onChange: (next: PricingDraft) => void;
  error?: string | null;
  /** True once a purchase order has bought the item: its price is set there now. */
  locked?: boolean;
}) {
  const sale = saleOf(value);

  return (
    <div className="space-y-4">
      {locked && (
        <p className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-navy-700 dark:bg-navy-900 dark:text-slate-300">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          This item has been bought through a purchase order, so its price is set by purchase orders now —
          change it in the price popup of the next one.
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 items-start">
        {BOXES.map((b) => (
          <div key={b.key}>
            <Label className="mb-1.5 flex items-center gap-1.5">
              {b.label}
              {b.key === "cost" && <span className="text-danger">*</span>}
            </Label>
            <Input
              type="number" inputMode="decimal" step="0.01" min={0} placeholder={b.placeholder}
              value={value[b.key]} disabled={locked}
              onChange={(e) => onChange({ ...value, [b.key]: e.target.value })}
            />
            <p className="mt-1 text-2xs text-slate-500 dark:text-slate-400">{b.hint}</p>
          </div>
        ))}

        {/* The sum, never typed. */}
        <div className="col-span-2 sm:col-span-1">
          <Label className="mb-1.5 block">Sale price</Label>
          <div className="flex h-10 items-center rounded-md border border-brand-yellow/60 bg-brand-yellow/10 px-3 tabular font-bold text-navy-900 dark:text-white">
            {formatMoney(sale)}
          </div>
          <p className="mt-1 text-2xs text-slate-500 dark:text-slate-400">All five added up</p>
        </div>
      </div>

      {/* The sum written out, so nobody has to trust the boxes. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs dark:border-navy-700 dark:bg-navy-900">
        {BOXES.map((b, i) => (
          <React.Fragment key={b.key}>
            {i > 0 && <span className="text-slate-400">+</span>}
            <span className="text-slate-500 dark:text-slate-400">{b.label}</span>
            <span className="tabular font-semibold text-navy-900 dark:text-white">{formatMoney(num(value[b.key]))}</span>
          </React.Fragment>
        ))}
        <span className="text-slate-400">=</span>
        <span className="tabular font-bold text-navy-900 dark:text-white">{formatMoney(sale)}</span>
      </div>

      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
