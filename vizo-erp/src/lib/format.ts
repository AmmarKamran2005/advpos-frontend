/**
 * VIZO ERP — Number & Money Formatting Utilities
 * --------------------------------------------------------------------------
 * All money in PKR (single currency for v1). Uses en-PK locale conventions.
 */

const pkrFormatter = new Intl.NumberFormat("en-PK", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const pkrFormatterDecimal = new Intl.NumberFormat("en-PK", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("en-PK");

/** Format money with PKR symbol — `PKR 8,42,500` */
export function formatMoney(
  amount: number,
  options: { withSymbol?: boolean; decimals?: 0 | 2 } = {}
) {
  const { withSymbol = true, decimals = 0 } = options;
  const formatter = decimals === 2 ? pkrFormatterDecimal : pkrFormatter;
  const sign = amount < 0 ? "-" : "";
  const value = formatter.format(Math.abs(amount));
  return withSymbol ? `${sign}PKR ${value}` : `${sign}${value}`;
}

/** Format compact (lakhs/crores) — `1.84 Cr`, `8.42 L`, `42K` */
export function formatCompact(amount: number, withSymbol = true): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  let formatted: string;

  if (abs >= 10_000_000) {
    formatted = `${(abs / 10_000_000).toFixed(2)} Cr`;
  } else if (abs >= 100_000) {
    formatted = `${(abs / 100_000).toFixed(2)} L`;
  } else if (abs >= 1_000) {
    formatted = `${(abs / 1_000).toFixed(1)}K`;
  } else {
    formatted = `${abs}`;
  }

  return withSymbol ? `${sign}PKR ${formatted}` : `${sign}${formatted}`;
}

/** Plain number with PK locale grouping — `1,247` */
export function formatNumber(n: number) {
  return numberFormatter.format(n);
}

/** Percent with 1 decimal — `12.4%` */
export function formatPercent(n: number, decimals = 1) {
  return `${n.toFixed(decimals)}%`;
}

/** Format date as `DD-MMM-YYYY` (Pakistani convention) */
export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Format relative time — `2 min ago`, `3 hours ago` */
export function formatRelative(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) === 1 ? "" : "s"} ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) === 1 ? "" : "s"} ago`;
  return formatDate(d);
}

/** Initials from a full name — `Umer Memon` → `UM` */
export function initials(name: string, max = 2) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, max)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
