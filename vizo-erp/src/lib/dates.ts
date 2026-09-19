/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Today, and the rule that no document is dated before it
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The owner's rule: throughout the project a person cannot pick a date that
 * has already gone. An order, an invoice, a receipt, a transfer, a voucher —
 * each is dated today or later.
 *
 * WHAT IT COVERS. Every date a person ENTERS on a document. It does NOT cover
 * the From / To filters on lists and reports: those ask "show me what happened
 * between these dates", and a report that could not look backwards would be
 * empty on every screen. Those inputs are left alone on purpose.
 *
 * THE DATE IS THE DEVICE'S LOCAL DATE, not UTC. The screens used to default
 * their date fields with `new Date().toISOString().slice(0, 10)`, which is the
 * UTC date — and Pakistan is UTC+5, so between midnight and 5 am it is still
 * yesterday in UTC. With a "not before today" rule that default would be
 * refused by its own form every night. It is the same bug the API had with
 * DateTime.UtcNow, fixed there with BusinessClock; this is its browser half.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** Today on this device, as YYYY-MM-DD — the format an <input type="date"> speaks. */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** A YYYY-MM-DD string plus a number of days, in local time. */
export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/** True when the value is a real date that is earlier than today. Empty is not "past". */
export function isPastDate(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.slice(0, 10) < todayISO();
}

export const PAST_DATE_MESSAGE = "Dates before today cannot be chosen";

/**
 * For a zod schema: `z.string().min(1).refine(notPast, PAST_DATE_MESSAGE)`.
 *
 * Checked in the schema as well as by the picker's `min`, because `min` only
 * stops the calendar popup — a date typed by hand into the field sails straight
 * past it, and every form here is `noValidate`.
 */
export const notPast = (value: string | null | undefined) => !isPastDate(value);

/**
 * The same rule for an EDIT screen: the date the record already carries is
 * allowed to stay, because it was valid when it was entered and refusing it
 * would make every old record uneditable. Anything else must be today or later.
 */
export const notPastUnless = (original: string | null | undefined) =>
  (value: string | null | undefined) =>
    !isPastDate(value) || (!!original && value?.slice(0, 10) === original.slice(0, 10));
