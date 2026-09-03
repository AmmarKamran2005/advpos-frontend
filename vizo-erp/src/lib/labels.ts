/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Plain-language labels
 * ─────────────────────────────────────────────────────────────────────────────
 * The old system spoke accountant. The staff who use this one all day —
 * sales and the order department — do not. Status codes and domain terms get
 * translated here, in one place, so the wording can never drift between two
 * screens showing the same thing.
 *
 * Statement names the accountant genuinely works by (Trial Balance, Balance
 * Sheet, Ledger) are deliberately left alone.
 */

/* ═══════════════════════ Document statuses ═══════════════════════ */

const STATUS_LABELS: Record<string, string> = {
  /* Shared */
  DRAFT: "Draft",
  POSTED: "Confirmed",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
  REVERSED: "Undone",

  /* The client asked for this one by name: "void" reads as nothing to them. */
  VOID: "Deleted",

  /* Customer orders. SUBMITTED used to read "Sent to Order Dept", which was
     true when that was the next thing that happened to an order. It is not any
     more: a submitted order is waiting on the owner, and the order department
     does not see it until the warehouse has picked it. There is now a step
     called TO_ORDER_DEPT that means what the old label claimed. */
  SUBMITTED: "Waiting to be confirmed",
  CREDIT_HOLD: "Limit Cross",
  DECLINED: "Declined",
  PROCESSING: "Being Prepared",
  PACKED: "Packed",
  TO_ORDER_DEPT: "On way to Order Dept",
  AT_ORDER_DEPT: "Received at Order Dept",
  PACKAGING: "Packaging",
  DISPATCHED: "Dispatched",
  INVOICED: "Invoiced",
  DELIVERED: "Delivered",
  RETURNED: "Returned",

  /* Purchases */
  PENDING_APPROVAL: "Waiting Approval",
  APPROVED: "Approved",
  PARTIALLY_RECEIVED: "Part Received",
  RECEIVED: "Received",
  CLOSED: "Closed",

  /* Invoices & payment */
  ISSUED: "Issued",
  PAID: "Paid",
  PARTIAL: "Part Paid",
  UNPAID: "Unpaid",
  OVERDUE: "Overdue",

  /* Delivery — "we sent it" and "it arrived" are different questions */
  NOT_DISPATCHED: "Not sent yet",
  AWAITING: "Not confirmed",
  ON_THE_WAY: "On the way",
  BOOKED: "Booked",
  IN_TRANSIT: "On the Way",
  OUT_FOR_DELIVERY: "Out for Delivery",
  FAILED: "Delivery Failed",
  RETURNED_TO_SENDER: "Returned to Us",
};

/** Turn a status code into something a shopkeeper would recognise. */
export function statusLabel(status: string | undefined | null): string {
  if (!status) return "";
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

/* ═══════════════════════ Payment methods ═══════════════════════ */

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK: "Bank",
  EASYPAISA: "Easypaisa",
  JAZZCASH: "JazzCash",
  CHEQUE: "Cheque",
  CREDIT: "Credit (Udhaar)",
};

export function paymentLabel(method: string | undefined | null): string {
  if (!method) return "";
  return PAYMENT_LABELS[method] ?? method.replace(/_/g, " ");
}

/* ═══════════════════════ Term glossary ═══════════════════════ */
/**
 * Where a term has to stay technical — because it is what the accountant asks
 * for by name, or what prints on a statement — pair it with a one-line
 * explanation and show it behind an ⓘ. See <TermHint> in components/ui.
 */
export const glossary: Record<string, string> = {
  "Trial Balance":
    "Every account with its closing balance, debits on one side and credits on the other. They must match.",
  "Balance Sheet":
    "What the business owns and what it owes, on one date.",
  "Income Statement":
    "Sales minus costs and expenses over a period — the profit or loss.",
  Ledger:
    "The full running history of one account, entry by entry.",
  "Account List":
    "Every account money can be recorded against — customers, suppliers, expenses, banks.",
  "Manual Entry":
    "A direct debit-and-credit entry, for anything the normal screens don't cover.",
  "Recovery Report":
    "Who owes money and how long it has been outstanding.",
  "Year End":
    "Closing the books for the financial year so balances carry forward.",
  "Opening Balance":
    "What the account stood at on the day it was brought into the system.",
  "Stock Correction":
    "Adjusting recorded stock to match what was actually counted.",
  "Limit Cross":
    "The customer has gone past their credit limit — the order needs approval.",
  "Per-Invoice Limit":
    "The most a single invoice may be worth for this customer.",
  "Ledger Limit":
    "The most this customer may owe in total at any time.",
  Packing:
    "How many pieces come in one packet or carton.",
  COD:
    "Cash on delivery — the courier collects payment and settles with us later.",
};

/** Look up a glossary line, if there is one. */
export function glossaryFor(term: string): string | undefined {
  return glossary[term];
}
