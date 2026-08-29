/**
 * ─────────────────────────────────────────────────────────────────────────────
 * WhatsApp handoff
 * ─────────────────────────────────────────────────────────────────────────────
 * The counter staff already send bills and reminders over WhatsApp. Rather
 * than fight that, the app composes the message and opens the chat with the
 * text already in it — the operator only has to press Send.
 *
 * That last step is deliberate. wa.me hands the message to WhatsApp; it does
 * not send it. Nothing leaves the phone until a person taps Send, which is the
 * right side of the line for anything addressed to a customer.
 *
 * PHONE NUMBERS. Pakistani numbers are written every way imaginable —
 * `0300 4567890`, `+92 300 4567890`, `92-300-4567890`, `03004567890`. wa.me
 * accepts exactly one of those: digits only, country code first, no plus.
 * `normalisePhone` is the single place that conversion happens.
 */

/** Default country code. Pakistan. */
const COUNTRY_CODE = "92";

/**
 * Turns whatever was typed into the digits wa.me wants.
 * Returns null when there is not enough of a number to dial.
 *
 *   "0300 4567890"    -> "923004567890"
 *   "+92 300 4567890" -> "923004567890"
 *   "03123670670"     -> "923123670670"
 *   "0321-1234567"    -> "923211234567"
 */
export function normalisePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  /* 00 92 300 … — the international prefix written the old way. */
  if (digits.startsWith("00")) digits = digits.slice(2);

  /* Local form: a leading 0 stands in for the country code. */
  if (digits.startsWith("0")) digits = COUNTRY_CODE + digits.slice(1);

  /* Bare mobile with no prefix at all: 3004567890. */
  else if (digits.length === 10 && digits.startsWith("3")) digits = COUNTRY_CODE + digits;

  /* A Pakistani mobile is 92 + 10 digits. Anything much shorter is a typo or a
     landline nobody can WhatsApp, and sending to it silently is worse than
     saying so. */
  return digits.length >= 11 ? digits : null;
}

/** How the number will be shown back to the operator: `+92 312 3670670`. */
export function prettyPhone(raw: string | null | undefined): string {
  const d = normalisePhone(raw);
  if (!d) return raw ?? "";
  const rest = d.slice(COUNTRY_CODE.length);
  return `+${COUNTRY_CODE} ${rest.slice(0, 3)} ${rest.slice(3)}`;
}

/** The wa.me URL for a number and a message. */
export function whatsappUrl(phone: string, message: string): string | null {
  const digits = normalisePhone(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/**
 * Opens WhatsApp in a new tab with the message pre-filled.
 * Returns false when the number could not be dialled, so the caller can say so
 * rather than opening a blank tab.
 */
export function openWhatsApp(phone: string, message: string): boolean {
  const url = whatsappUrl(phone, message);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

const money = (n: number) => `Rs ${Math.round(n).toLocaleString("en-PK")}`;

/**
 * The message that goes with a bill.
 *
 * `billLink` is whatever the API said to share — the Cloudinary copy when that
 * account will serve it, otherwise the link the API serves itself. Either way
 * it opens for somebody with no account, which is the only thing that matters
 * on the other end.
 */
export function billMessage(p: {
  customerName: string;
  invoiceNo: string;
  total: number;
  balance?: number;
  billLink?: string | null;
  companyName?: string;
}): string {
  const lines = [
    `Hi ${p.customerName}, your invoice is ready.`,
    "",
    `Invoice: *${p.invoiceNo}*`,
    `Total: *${money(p.total)}*`,
  ];

  if (p.balance !== undefined && p.balance > 0) {
    lines.push(`Balance due: *${money(p.balance)}*`);
  }

  if (p.billLink) {
    lines.push("", p.billLink);
  }

  lines.push("", `Shukriya — ${p.companyName ?? "VIZO"}`);
  return lines.join("\n");
}

/**
 * The message for a payment reminder off the Limit Alerts screen.
 *
 * Written to be read by a shopkeeper, not an accountant: what is owed, which
 * order is stuck behind it, and what happens next. No threat, no jargon.
 */
export function reminderMessage(p: {
  customerName: string;
  outstanding: number;
  creditLimit: number;
  orderNo: string;
  orderTotal: number;
  creditDays?: number;
  companyName?: string;
}): string {
  const lines = [
    `Assalam-o-Alaikum ${p.customerName},`,
    "",
    `This is a reminder from ${p.companyName ?? "VIZO"} about your account.`,
    "",
    `Outstanding balance: *${money(p.outstanding)}*`,
    `Credit limit: ${money(p.creditLimit)}`,
    `New order ${p.orderNo}: ${money(p.orderTotal)}`,
    "",
    `Your order ${p.orderNo} is on hold because it takes the account past its limit.`,
    `Once the outstanding amount is cleared we will release it right away.`,
  ];

  if (p.creditDays) lines.push("", `Agreed terms: ${p.creditDays} days.`);

  lines.push("", `Shukriya.`);
  return lines.join("\n");
}
