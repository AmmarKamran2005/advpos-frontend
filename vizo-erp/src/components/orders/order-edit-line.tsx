import * as React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductImage } from "@/components/products/product-image";
import { formatMoney } from "@/lib/format";
import { round2 } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────────────────────
   ONE LINE OF AN ORDER BEING EDITED

   The owner, 30 September: on the edit screen every line reads, left to right,

     Quantity · Original price · Margin (Rs.) · Margin % · Final price · Total

   and the Tax and Discount boxes are gone. The price is the same story the
   salesperson told when they took the order (orders/new/page.tsx): a fixed
   ORIGINAL price per piece -- the product's selling price -- plus the MARGIN
   the salesperson added on top, which is the FINAL price the shop pays. The
   Super Admin and the accountant can correct any of the three:

     Original typed  -> the margin in rupees is kept; % and final follow.
     Margin typed    -> % and final follow.
     Margin % typed  -> the margin in rupees is that share of the original;
                        final follows.
     Final typed     -> the margin is what is left over the original; % follows.

   Everything is measured from the original price, so the three can never
   disagree. A final price BELOW the original would be a negative margin, which
   the owner does not allow ("margin may be 0, nothing negative"): the line
   says so and the form will not save it -- lower the original instead.

   Only the final price is written to the order row (there are no
   original-price or margin columns on an order line), so when an order is
   opened again the original is read back as the product's selling price and
   the margin as the difference -- see lineFromOrder.
   ─────────────────────────────────────────────────────────────────────────── */

/** The salesperson's cap, the same number as orders/new and SalesController.MaxSalesMarginPercent. */
export const MAX_SALES_MARGIN_PERCENT = 10;

export type EditBox = "qty" | "original" | "margin" | "percent" | "final";

export type EditLine = {
  /** Stable React key -- a product can be removed and added back. */
  key: string;
  productId: number;
  name: string;
  sku: string;
  imageUrl: string | null;
  /** The product's selling price today, for the hint under the line. 0 when unknown. */
  catalogue: number;
  qty: number;
  original: number;
  margin: number;
  percent: number;
  final: number;
  /** What is in each box, as typed -- so "12." and an empty box survive a re-render. */
  text: Record<EditBox, string>;
  /** Set when the last thing typed was over the salesperson's cap and was pulled back to it. */
  capped?: boolean;
};

let seq = 0;
const nextKey = () => `line-${++seq}`;

const pctOf = (margin: number, original: number) => (original > 0 ? round2((margin / original) * 100) : 0);
const show = (n: number) => String(round2(n));

function texts(l: Pick<EditLine, "qty" | "original" | "margin" | "percent" | "final">): Record<EditBox, string> {
  return {
    qty: String(l.qty),
    original: show(l.original),
    margin: show(l.margin),
    percent: show(l.percent),
    final: show(l.final),
  };
}

/**
 * A line as it was saved. The row only holds the final price, so the original
 * is taken to be the product's selling price whenever the final is at or above
 * it, and the margin is the difference. A line sold BELOW today's selling price
 * (the price has gone up since, or it was sold under it) is shown as that price
 * with no margin -- showing a negative margin would be both untrue to how it was
 * sold and unsaveable.
 *
 * Older orders could carry a line discount. The discount is folded into the
 * final price so the line still bills what it billed; tax is not carried (tax
 * is 0% on every edited order -- the page warns before it is dropped).
 */
export function lineFromOrder(
  ln: { productId: number; name: string; sku: string; imageUrl?: string | null; qty: number; rate: number; discountPercent: number; basePrice?: number | null },
  catalogue: number,
): EditLine {
  const final = round2(ln.rate * (1 - (ln.discountPercent || 0) / 100));
  /* The stored original (migration 42) when the line has one -- the price the
     rep's margin was actually added to. Older lines have none, so the
     product's selling price today stands in for it, capped at the final. */
  const stored = ln.basePrice != null && ln.basePrice >= 0 && ln.basePrice <= final + 0.005 ? round2(ln.basePrice) : null;
  const original = stored ?? (catalogue > 0 && final + 0.005 >= catalogue ? catalogue : final);
  const margin = round2(final - original);
  const nums = { qty: ln.qty, original, margin, percent: pctOf(margin, original), final };
  return {
    key: nextKey(),
    productId: ln.productId, name: ln.name, sku: ln.sku, imageUrl: ln.imageUrl ?? null,
    catalogue, ...nums, text: texts(nums),
  };
}

/** A product added on the edit screen: one piece at its selling price, no margin yet. */
export function newLine(p: { id: number; name: string; sku: string; imageUrl?: string | null; salePrice: number }): EditLine {
  const price = round2(p.salePrice || 0);
  const nums = { qty: 1, original: price, margin: 0, percent: 0, final: price };
  return {
    key: nextKey(),
    productId: p.id, name: p.name, sku: p.sku, imageUrl: p.imageUrl ?? null,
    catalogue: price, ...nums, text: texts(nums),
  };
}

/**
 * One box was typed in. `cap` is the salesperson's margin cap in percent, or
 * null for the Super Admin and the accountant, who are not capped.
 */
export function editLine(l: EditLine, box: EditBox, typed: string, cap: number | null): EditLine {
  const v = parseFloat(typed);
  const n = Number.isFinite(v) ? v : 0;
  let { qty, original, margin, percent, final } = l;

  switch (box) {
    case "qty":
      qty = Math.max(0, Math.floor(n));
      break;
    case "original":
      original = Math.max(0, round2(n));
      percent = pctOf(margin, original);
      final = round2(original + margin);
      break;
    case "margin":
      margin = Math.max(0, round2(n));
      percent = pctOf(margin, original);
      final = round2(original + margin);
      break;
    case "percent":
      percent = Math.max(0, n);
      margin = round2((original * percent) / 100);
      final = round2(original + margin);
      break;
    case "final":
      /* Not floored at the original: a final price is typed a digit at a time,
         and "1" on the way to "120" must not snap. A final below the original
         is shown as a negative margin and refused by lineProblem. */
      final = Math.max(0, round2(n));
      margin = round2(final - original);
      percent = pctOf(margin, original);
      break;
  }

  /* Over the salesperson's cap: whichever box was typed in, the answer is the
     most they may add. Only where there is an original to take a share of. */
  let capped = false;
  if (cap !== null && original > 0 && margin > round2((original * cap) / 100) + 0.005) {
    margin = round2((original * cap) / 100);
    percent = cap;
    final = round2(original + margin);
    capped = true;
  }

  const nums = { qty, original, margin, percent, final };
  const text = texts(nums);
  /* The box being typed in keeps exactly what was typed, unless it was pulled
     back to the cap; the others show the result. */
  if (!capped) text[box] = typed;
  return { ...l, ...nums, text, capped };
}

/** What is wrong with a line, in the words the page shows -- or null. */
export function lineProblem(l: EditLine, cap: number | null): string | null {
  if (l.qty <= 0) return "Quantity must be at least 1.";
  if (l.original < 0) return "The original price cannot be negative.";
  if (l.margin < -0.005)
    return "The final price is below the original price. The margin cannot be negative -- lower the original price instead.";
  if (l.final < 0) return "The final price cannot be negative.";
  if (cap !== null && l.original > 0 && l.percent > cap + 0.005)
    return `Margin cannot be more than ${cap}%.`;
  return null;
}

export const lineTotal = (l: EditLine) => round2(l.qty * l.final);

/* ─────────────────────────────── the card ─────────────────────────────── */

export function OrderEditLineCard({
  line, cap, lockOriginal, onEdit, onRemove,
}: {
  line: EditLine;
  /** The salesperson's margin cap in percent, or null when not capped. */
  cap: number | null;
  /** True for anybody but the Super Admin and the accountant: the original is the catalogue's. */
  lockOriginal: boolean;
  onEdit: (key: string, box: EditBox, typed: string) => void;
  onRemove: (key: string) => void;
}) {
  const problem = lineProblem(line, cap);
  const id = (box: EditBox) => `${line.key}-${box}`;
  const moved = line.catalogue > 0 && Math.abs(line.original - line.catalogue) > 0.005;

  const box = (b: EditBox, label: string, extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div className="min-w-0">
      <label htmlFor={id(b)} className="block text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1 truncate">
        {label}
      </label>
      <Input
        id={id(b)}
        type="number"
        inputMode={b === "qty" ? "numeric" : "decimal"}
        min={0}
        step={b === "qty" ? 1 : 0.01}
        className="text-right tabular"
        value={line.text[b]}
        onChange={(e) => onEdit(line.key, b, e.target.value)}
        {...extra}
      />
    </div>
  );

  return (
    <div className={cn(
      "rounded-lg border p-3",
      problem ? "border-danger/40 bg-danger/5" : "border-slate-200 dark:border-navy-700"
    )}>
      <div className="flex items-start gap-3">
        <ProductImage url={line.imageUrl} name={line.name} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-navy-900 dark:text-white line-clamp-2">{line.name}</div>
          <div className="text-2xs tabular text-slate-500 dark:text-slate-400 mt-0.5">
            {line.sku}
            {moved && <> · selling price today {formatMoney(line.catalogue, { decimals: 2 })}</>}
          </div>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${line.name}`}
          onClick={() => onRemove(line.key)}>
          <Trash2 className="size-4 text-danger" />
        </Button>
      </div>

      {/* Two boxes a row on a phone, three on a tablet, all six in one row on a
          wide screen -- always in the owner's order. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 mt-3">
        {box("qty", "Quantity", { min: 1 })}
        {box("original", "Original price", lockOriginal
          ? { readOnly: true, disabled: true, title: "Set by the Super Admin", className: "text-right tabular bg-slate-50 dark:bg-navy-800" }
          : undefined)}
        {box("margin", "Margin (Rs.)")}
        {box("percent", cap !== null && line.original > 0 ? `Margin % (max ${cap})` : "Margin %", {
          disabled: line.original <= 0,
          max: cap !== null && line.original > 0 ? cap : undefined,
          title: line.original <= 0 ? "No original price to take a percentage of" : undefined,
        })}
        {box("final", "Final price")}
        <div className="min-w-0">
          <div className="text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1 truncate">Total</div>
          {/* Quantity x final price -- worked out, not typed. */}
          <output
            htmlFor={`${id("qty")} ${id("final")}`}
            className="flex items-center justify-end w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold tabular text-navy-900 dark:bg-navy-800 dark:border-navy-700 dark:text-white truncate"
          >
            {formatMoney(lineTotal(line), { decimals: 2 })}
          </output>
        </div>
      </div>

      {line.capped && (
        <p role="alert" className="mt-2 text-2xs font-medium text-danger">
          The most a salesperson can add is {cap}%. It has been set to {cap}%.
        </p>
      )}
      {problem && !line.capped && (
        <p role="alert" className="mt-2 text-2xs font-medium text-danger">{problem}</p>
      )}
    </div>
  );
}
