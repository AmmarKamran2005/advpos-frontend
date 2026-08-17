/**
 * Money the sales team has collected in the field.
 *
 * A rep visiting a shop takes cash or a cheque there and then — that is how
 * this trade works and there is no point pretending otherwise. But the entry
 * he makes does NOT move the customer's ledger. It waits for Accounts to
 * confirm the money actually arrived.
 *
 * Without that gap a rep could sit on cash for days and the books would still
 * look settled. With it, the rep gets credit for the collection immediately
 * while the ledger stays honest.
 */

export type CollectionStatus = "AWAITING" | "CONFIRMED" | "BOUNCED";

export type CollectionMethod = "CASH" | "CHEQUE" | "BANK" | "JAZZCASH" | "EASYPAISA";

export type Collection = {
  id: number;
  receiptNo: string;
  customerId: number;
  customerName: string;
  customerInitials: string;
  collectedBy: string;
  collectedOn: string;
  amount: number;
  method: CollectionMethod;
  /** Cheque number, transaction id, or slip number. */
  reference: string;
  /** Bank the cheque is drawn on. */
  bank: string;
  /** Cheque date — may be post-dated. */
  chequeDate: string | null;
  /** Order numbers this was collected against. Empty means on account. */
  against: string[];
  status: CollectionStatus;
  confirmedOn: string | null;
  note: string;
};

export const COLLECTION_STATUS_VARIANT: Record<
  CollectionStatus,
  "success" | "warning" | "danger"
> = {
  AWAITING: "warning",
  CONFIRMED: "success",
  BOUNCED: "danger",
};

export const COLLECTION_METHOD_LABEL: Record<CollectionMethod, string> = {
  CASH: "Cash",
  CHEQUE: "Cheque",
  BANK: "Bank transfer",
  JAZZCASH: "JazzCash",
  EASYPAISA: "Easypaisa",
};

const c = (
  id: number,
  receiptNo: string,
  customerId: number,
  customerName: string,
  customerInitials: string,
  collectedBy: string,
  collectedOn: string,
  amount: number,
  method: CollectionMethod,
  reference: string,
  bank: string,
  chequeDate: string | null,
  against: string[],
  status: CollectionStatus,
  confirmedOn: string | null,
  note = ""
): Collection => ({
  id, receiptNo, customerId, customerName, customerInitials, collectedBy,
  collectedOn, amount, method, reference, bank, chequeDate, against, status,
  confirmedOn, note,
});

export const collections: Collection[] = [
  c(1, "COL-26-0088", 1,  "Hafeez Center Shop #28",   "HC", "Zara Malik",  "2026-08-13", 60000,  "CASH",      "—",            "—",          null,         ["ORD-26-0142"], "AWAITING",  null,         "Collected on the evening round"),
  c(2, "COL-26-0087", 5,  "Cellular World KHI",       "CW", "Zara Malik",  "2026-08-13", 140000, "CHEQUE",    "0012457",      "Meezan Bank","2026-08-20", ["ORD-26-0135"], "AWAITING",  null,         "Post-dated to the 20th"),
  c(3, "COL-26-0086", 8,  "Mobilink Connect Lahore",  "ML", "Zara Malik",  "2026-08-12", 40000,  "BANK",      "TXN-77483921", "HBL",        null,         ["ORD-26-0139"], "CONFIRMED", "2026-08-12", ""),
  c(4, "COL-26-0085", 6,  "Faisal Mobile Mart",       "FM", "Zara Malik",  "2026-08-11", 18400,  "CASH",      "—",            "—",          null,         ["ORD-26-0088"], "CONFIRMED", "2026-08-11", ""),
  c(5, "COL-26-0084", 7,  "Quetta Cellular",          "QC", "Zara Malik",  "2026-08-10", 12400,  "JAZZCASH",  "JC-998877665", "—",          null,         ["ORD-26-0137"], "CONFIRMED", "2026-08-10", ""),
  c(6, "COL-26-0083", 10, "Star Communications",      "SC", "Zara Malik",  "2026-08-09", 485000, "BANK",      "TXN-77410882", "Meezan Bank",null,         ["ORD-26-0138"], "CONFIRMED", "2026-08-09", ""),
  c(7, "COL-26-0082", 2,  "Mobile Zone Lahore",       "MZ", "Imran Iqbal", "2026-08-08", 25000,  "CHEQUE",    "0044120",      "UBL",        "2026-08-08", [],              "BOUNCED",   null,         "Cheque returned — insufficient funds"),
  c(8, "COL-26-0081", 9,  "Mobile Mart Multan",       "MM", "Imran Iqbal", "2026-08-07", 24600,  "EASYPAISA", "EP-554433221", "—",          null,         ["ORD-26-0087"], "CONFIRMED", "2026-08-07", ""),
];

export function collectionsBy(name: string) {
  return collections.filter((x) => x.collectedBy === name);
}

export function collectionsFor(customerId: number) {
  return collections.filter((x) => x.customerId === customerId);
}

/** Money the rep has taken but Accounts has not signed off yet. */
export function awaitingConfirmation(list: Collection[] = collections) {
  return list.filter((x) => x.status === "AWAITING");
}

export function totalOf(list: Collection[]) {
  return list.reduce((sum, x) => sum + x.amount, 0);
}
