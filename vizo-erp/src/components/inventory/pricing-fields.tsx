"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { reprice, landedCost, type PricingLead } from "@/lib/pricing";

/* ───────────────────────────────────────────────────────────────────────────
   COST · DUTY · MARGIN · MARGIN % · SALE

   Five boxes in the order a price is built. The person types whichever margin
   they think in — an amount or a percentage — and the other one, and the sale
   price, follow. They can also type the sale price itself (to round it to
   1,999, say) and the margin follows that instead. See lib/pricing.ts for the
   arithmetic and for which field is held still when cost or duty changes.

   Strings, not numbers, all the way through: a number input that is re-set on
   every keystroke eats the decimal point the person is halfway through typing.
   Only the fields the person is NOT typing in are rewritten.
   ─────────────────────────────────────────────────────────────────────────── */

export type PricingDraft = {
  cost: string;
  duty: string;
  marginPrice: string;
  marginPercent: string;
  sale: string;
  lead: PricingLead;
};

export function pricingDraftFrom(p: { costPrice: number; dutyPrice: number; marginPrice: number; salePrice: number }): PricingDraft {
  const r = reprice({ cost: p.costPrice, duty: p.dutyPrice, marginPrice: p.salePrice - p.costPrice - p.dutyPrice, marginPercent: 0, sale: p.salePrice }, "sale");
  return {
    cost: String(r.cost), duty: String(r.duty),
    marginPrice: String(r.marginPrice), marginPercent: String(r.marginPercent),
    sale: String(r.sale), lead: "price",
  };
}

export const EMPTY_PRICING: PricingDraft = {
  cost: "", duty: "0", marginPrice: "", marginPercent: "", sale: "", lead: "percent",
};

/** The numbers to send to the API, or a message saying what is wrong. */
export function pricingProblem(d: PricingDraft): string | null {
  const cost = parseFloat(d.cost);
  const duty = parseFloat(d.duty || "0");
  const sale = parseFloat(d.sale);
  if (!Number.isFinite(cost) || cost <= 0) return "Enter a cost price above zero.";
  if (!Number.isFinite(duty) || duty < 0) return "Duty cannot be negative.";
  if (!Number.isFinite(sale) || sale <= 0) return "Enter a margin or a sale price.";
  return null;
}

const show = (n: number) => (Number.isFinite(n) ? String(n) : "");

export function PricingFields({
  value,
  onChange,
  error,
}: {
  value: PricingDraft;
  onChange: (next: PricingDraft) => void;
  error?: string | null;
}) {
  function set(field: keyof Omit<PricingDraft, "lead">, raw: string) {
    const lead: PricingLead =
      field === "marginPrice" ? "price" :
      field === "marginPercent" ? "percent" :
      field === "sale" ? "sale" : value.lead;

    const next = { ...value, [field]: raw, lead };
    const r = reprice(
      { cost: next.cost, duty: next.duty, marginPrice: next.marginPrice, marginPercent: next.marginPercent, sale: next.sale },
      lead,
    );

    onChange({
      ...next,
      /* Everything the person is not typing in is rewritten from the result. */
      marginPrice: field === "marginPrice" ? raw : show(r.marginPrice),
      marginPercent: field === "marginPercent" ? raw : show(r.marginPercent),
      sale: field === "sale" ? raw : show(r.sale),
    });
  }

  const landed = landedCost(value.cost, value.duty);
  const margin = parseFloat(value.marginPrice) || 0;
  const pct = parseFloat(value.marginPercent) || 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 items-start">
        <Box label="Cost price" required hint="Supplier's price per unit">
          <Input type="number" inputMode="decimal" step="0.01" min={0} placeholder="200"
            value={value.cost} onChange={(e) => set("cost", e.target.value)} />
        </Box>
        <Box label="Duty price" hint="Customs, clearing, per unit">
          <Input type="number" inputMode="decimal" step="0.01" min={0} placeholder="50"
            value={value.duty} onChange={(e) => set("duty", e.target.value)} />
        </Box>
        <Box label="Margin price" hint="Added to cost + duty" active={value.lead === "price"}>
          <Input type="number" inputMode="decimal" step="0.01" placeholder="50"
            value={value.marginPrice} onChange={(e) => set("marginPrice", e.target.value)} />
        </Box>
        <Box label="Margin %" hint="Of cost + duty" active={value.lead === "percent"}>
          <div className="relative">
            <Input type="number" inputMode="decimal" step="0.01" placeholder="20" className="pr-7"
              value={value.marginPercent} onChange={(e) => set("marginPercent", e.target.value)} />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
          </div>
        </Box>
        <Box label="Sale price" required hint="What the customer pays, before tax" active={value.lead === "sale"}
          className="col-span-2 lg:col-span-1">
          <Input type="number" inputMode="decimal" step="0.01" min={0} placeholder="300"
            className="font-semibold"
            value={value.sale} onChange={(e) => set("sale", e.target.value)} />
        </Box>
      </div>

      {/* The sum written out, so nobody has to trust the boxes. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs dark:border-navy-700 dark:bg-navy-900">
        <span className="text-slate-500 dark:text-slate-400">Landed cost</span>
        <span className="tabular font-semibold text-navy-900 dark:text-white">{formatMoney(landed)}</span>
        <span className="text-slate-400">+</span>
        <span className="text-slate-500 dark:text-slate-400">margin</span>
        <span className={cn("tabular font-semibold", margin < 0 ? "text-danger" : "text-navy-900 dark:text-white")}>
          {formatMoney(margin)}
        </span>
        <span className={cn("tabular font-semibold",
          pct <= 0 ? "text-danger" : pct < 15 ? "text-warning" : "text-success")}>
          ({pct.toFixed(1)}%)
        </span>
        <span className="text-slate-400">=</span>
        <span className="text-slate-500 dark:text-slate-400">sale</span>
        <span className="tabular font-bold text-navy-900 dark:text-white">{formatMoney(parseFloat(value.sale) || 0)}</span>
        {margin < 0 && (
          <span className="w-full text-danger">This sells below cost. It is allowed — make sure it is meant.</span>
        )}
      </div>

      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

function Box({
  label, hint, required, active, className, children,
}: {
  label: string; hint: string; required?: boolean; active?: boolean; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 flex items-center gap-1.5">
        {label}
        {required && <span className="text-danger">*</span>}
        {active && (
          <span className="rounded bg-brand-yellow/20 px-1 text-2xs font-semibold text-navy-900 dark:text-brand-yellow"
            title="You typed this one; the others follow it">
            set
          </span>
        )}
      </Label>
      {children}
      <p className="mt-1 text-2xs text-slate-500 dark:text-slate-400">{hint}</p>
    </div>
  );
}
