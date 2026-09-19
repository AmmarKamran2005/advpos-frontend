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

/**
 * Format date as `DD-MMM-YYYY` (Pakistani convention).
 *
 * The same answer on every device. A bare `2026-09-17` is a CALENDAR DAY, not
 * an instant, and is printed as that day; anything with a time is printed as
 * the Pakistan date it falls on. This used to format in the device's own zone,
 * which is harmless in Karachi and a day early anywhere west of London --
 * found when a transfer dated the 17th read "16 Sept" on a browser set to US
 * Central time.
 */
export function formatDate(date: Date | string) {
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
    });
  }
  const d = parseApiDate(date);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Karachi",
  });
}

/**
 * Parses a timestamp the API sent.
 *
 * Every timestamp column is `timestamp without time zone`, so what comes back
 * over JSON is `2026-09-17T17:30:10` -- an instant carrying no marker saying
 * which clock it was read off.
 *
 * IT IS PAKISTAN TIME. Since 3 September the API writes every timestamp
 * through Services/BusinessClock.cs, which is Asia/Karachi, UTC+5, no daylight
 * saving. This function used to append "Z" and read the value as UTC -- right
 * for the API as it was before that date, and five hours wrong for everything
 * written since: a stock movement at 17:30 showed as 22:30, and anything done
 * in the last five hours showed as "just now". Checked against the live
 * database before changing it: the newest activity-log row was stamped later
 * than the current UTC time, which only a Pakistan clock can do.
 *
 * ROWS WRITTEN BEFORE 3 SEPTEMBER were UTC and now read five hours early.
 * They were never converted (see convey.txt), and the system's own clock is
 * the one to follow going forward.
 *
 * Date-ONLY strings are left alone. The spec parses those as UTC midnight,
 * which is still the same calendar day in Pakistan.
 */
export const BUSINESS_UTC_OFFSET = "+05:00";

export function parseApiDate(date: Date | string): Date {
  if (typeof date !== "string") return date;
  const hasTime = date.includes("T");
  const hasZone = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(date);
  return new Date(hasTime && !hasZone ? `${date}${BUSINESS_UTC_OFFSET}` : date);
}

/** A timestamp as `17 Sep 2026, 5:30 pm`, in Pakistan time whatever the device. */
export function formatDateTime(date: Date | string) {
  const d = parseApiDate(date);
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
    timeZone: "Asia/Karachi",
  });
}

/** Just the time of day, in Pakistan time — `5:30 pm`. */
export function formatTime(date: Date | string) {
  const d = parseApiDate(date);
  return d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Karachi" });
}

/** Format relative time — `2 min ago`, `3 hours ago` */
export function formatRelative(date: Date | string) {
  const d = parseApiDate(date);
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
