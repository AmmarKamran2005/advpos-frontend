import axios from "axios";

/* ───────────────────────────────────────────────────────────────────────────
   Small helpers the Customer and Staff Ledger screens share. Plain functions,
   no React -- so importing one does not pull a component into a page.
   ─────────────────────────────────────────────────────────────────────────── */

/** Every failure comes back as { message } -- show the wording the API chose. */
export function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

const whole = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 });
const paisa = new Intl.NumberFormat("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * A ledger figure the way the old statements printed it: whole rupees without
 * ".00", paisa only when there are some, a zero as a quiet dash. Money in a
 * running column reads faster without a symbol on every line.
 */
export function ledgerAmount(v: number, zero = "–") {
  if (!v) return zero;
  const abs = Math.abs(v);
  const s = Math.round(abs * 100) % 100 === 0 ? whole.format(abs) : paisa.format(abs);
  return v < 0 ? `-${s}` : s;
}

export function qtyText(v: number) {
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

/** First day of last month, as the old statements were usually run from. */
export function defaultFrom(today: string, monthsBack = 1) {
  const [y, m] = today.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 - monthsBack, 1));
  return d.toISOString().slice(0, 10);
}

export function monthStart(today: string) {
  return `${today.slice(0, 8)}01`;
}

export function yearStart(today: string) {
  return `${today.slice(0, 4)}-01-01`;
}

/**
 * Today in PAKISTAN, as YYYY-MM-DD -- the business date the API posts under
 * (BusinessClock). A statement's "To" must be this, not the device's own
 * date: a laptop still on UTC after 7pm would stop the statement at
 * yesterday and hide everything posted today.
 */
export function pkToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
}
