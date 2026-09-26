/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Product pricing: five boxes, added up
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   Cost  +  Duty  +  Fi Sabilillah  +  Margin 1  +  Margin 2  =  Sale price
 *
 * The owner's rule (26 Sep 2026): "yeh tamam ke tamam prices ... plus honge aur
 * ek Sale Price nikal ke aayegi". No percentage anywhere -- the Margin % box
 * was removed on the same day. Every part is an amount in PKR per unit, never
 * negative, and the sale price is only ever their sum: the API works it out
 * again on save (InventoryController, PurchasesController) and does not take
 * one from the browser.
 *
 * The same five parts live on every purchase-order line and on every stock lot,
 * which is what lets a new purchase be averaged against what is left of the old
 * ones -- see weightedAverage() below and PurchasesController.CreatePurchaseOrder,
 * which does the identical arithmetic when the order is saved.
 */

export type PriceParts = {
  cost: number;
  duty: number;
  fs: number;
  margin1: number;
  margin2: number;
};

export const PART_LABELS: Record<keyof PriceParts, string> = {
  cost: "Cost price",
  duty: "Duty",
  fs: "Fi Sabilillah",
  margin1: "Margin 1",
  margin2: "Margin 2",
};

export const PART_KEYS: (keyof PriceParts)[] = ["cost", "duty", "fs", "margin1", "margin2"];

/** Money to the paisa, half away from zero — the way the API rounds. */
export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const sign = n < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(n) * 100 + Number.EPSILON)) / 100;
}

export const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

/** Cost plus duty: what one unit really costs to have on the shelf. */
export function landedCost(cost: unknown, duty: unknown): number {
  return round2(num(cost) + num(duty));
}

/** The sale price a set of parts adds up to. */
export function saleOf(p: Partial<Record<keyof PriceParts, unknown>>): number {
  return round2(PART_KEYS.reduce((s, k) => s + num(p[k]), 0));
}

/**
 * The quantity-weighted average of several lots, part by part. The owner's
 * example: 10 left at 1,400 and 50 new at 2,000 average to 1,900 —
 * (10 × 1,400 + 50 × 2,000) / 60. A lot with nothing left weighs nothing.
 */
export function weightedAverage(lots: { qty: number; parts: PriceParts }[]): PriceParts & { units: number; sale: number } {
  const counted = lots.filter((l) => l.qty > 0);
  const units = counted.reduce((s, l) => s + l.qty, 0);
  const avg = (k: keyof PriceParts) =>
    units > 0 ? round2(counted.reduce((s, l) => s + l.qty * l.parts[k], 0) / units) : 0;
  const parts = { cost: avg("cost"), duty: avg("duty"), fs: avg("fs"), margin1: avg("margin1"), margin2: avg("margin2") };
  /* The average SALE is taken whole (1,900), not as the sum of the rounded
     parts (1,899.99); Margin 1 absorbs the paisa, exactly as the API does. */
  const sale = units > 0 ? round2(counted.reduce((s, l) => s + l.qty * saleOf(l.parts), 0) / units) : 0;
  return { ...parts, margin1: round2(parts.margin1 + sale - saleOf(parts)), units, sale };
}
