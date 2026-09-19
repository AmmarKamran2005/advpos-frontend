/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Product pricing: cost + duty + margin = sale
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   cost price  +  duty       =  landed cost
 *   landed cost +  margin     =  sale price
 *   margin %    =  margin / landed cost × 100
 *
 * The margin PERCENTAGE is on the landed cost — cost AND duty — never on the
 * sale price. Enter cost 200, duty 50, margin 20 %: the margin is 50, the sale
 * price 300. That is the rule as it was given, and the API computes the same
 * figure (InventoryController.MarginPercent), so the number on the product
 * list and the number the person typed are always the same number.
 *
 * WHICH FIELD LEADS. The person can type the margin as an amount, as a
 * percentage, or type the sale price outright. Whichever they typed last is
 * held still when cost or duty changes, and the other two follow:
 *
 *   typed the amount      -> cost goes up, the amount stays, % and sale move
 *   typed the percentage  -> cost goes up, the % stays, amount and sale move
 *   typed the sale price  -> cost goes up, the sale stays, the margin shrinks
 *
 * which is what a shopkeeper means by each of the three.
 */

export type PricingLead = "price" | "percent" | "sale";

export type Pricing = {
  cost: number;
  duty: number;
  marginPrice: number;
  marginPercent: number;
  sale: number;
};

/** Money to the paisa, half away from zero — the way the API rounds. */
export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const sign = n < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(n) * 100 + Number.EPSILON)) / 100;
}

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

export function landedCost(cost: unknown, duty: unknown): number {
  return round2(num(cost) + num(duty));
}

/** Margin as a percentage of landed cost; 0 when there is no cost to measure against. */
export function marginPercentOf(cost: unknown, duty: unknown, marginPrice: unknown): number {
  const base = landedCost(cost, duty);
  return base > 0 ? round2((num(marginPrice) / base) * 100) : 0;
}

/**
 * Re-derive the two fields that did NOT lead from the one that did.
 * Everything comes back rounded to the paisa.
 */
export function reprice(
  input: { cost: unknown; duty: unknown; marginPrice: unknown; marginPercent: unknown; sale: unknown },
  lead: PricingLead,
): Pricing {
  const cost = round2(num(input.cost));
  const duty = round2(num(input.duty));
  const base = round2(cost + duty);

  if (lead === "percent") {
    const marginPercent = round2(num(input.marginPercent));
    const marginPrice = round2((base * marginPercent) / 100);
    return { cost, duty, marginPrice, marginPercent, sale: round2(base + marginPrice) };
  }

  if (lead === "sale") {
    const sale = round2(num(input.sale));
    const marginPrice = round2(sale - base);
    return { cost, duty, marginPrice, marginPercent: marginPercentOf(cost, duty, marginPrice), sale };
  }

  const marginPrice = round2(num(input.marginPrice));
  return {
    cost, duty, marginPrice,
    marginPercent: marginPercentOf(cost, duty, marginPrice),
    sale: round2(base + marginPrice),
  };
}
