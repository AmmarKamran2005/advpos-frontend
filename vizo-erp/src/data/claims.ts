/**
 * Claims & warranty — the backbone of this business.
 *
 * A shopkeeper brings back one dead battery. He does not know which invoice it
 * came on and does not care. So a claim is recorded **against the item**, not
 * against an order — the same way a sales return is, but per piece.
 *
 * The piece then sits in Claim Stock (LOC-04, excluded from sellable) until
 * the supplier settles it: replaced, credited, or refused. Refused pieces are
 * written off to the Warranty & Claims account.
 *
 * Nothing here moves on its own. The reminders in reminders.ts are what stop
 * claims quietly ageing on a shelf for months — which is the failure this
 * business is trying to design out.
 */

export type ClaimStage =
  | "RECEIVED"      // in from the customer, sitting in claim stock
  | "SENT"          // batched and sent to the supplier
  | "REPLACED"      // supplier sent a fresh piece back
  | "CREDITED"      // supplier gave credit instead
  | "REJECTED"      // supplier refused — we swallow it
  | "WRITTEN_OFF";  // posted to Warranty & Claims

/** What we gave the customer while the supplier decides. */
export type CustomerOutcome = "REPLACED_NOW" | "CREDIT_NOTE" | "WAITING";

export type Claim = {
  id: number;
  claimNo: string;

  /* Who brought it back */
  customerId: number;
  customerName: string;
  customerInitials: string;
  receivedOn: string;
  receivedBy: string;

  /* What came back — per item, never per order */
  productId: number;
  productName: string;
  sku: string;
  qty: number;
  /** Cost of the piece, for the write-off figure. */
  unitCost: number;
  reason: string;
  reasonLabel: string;
  note: string;

  /** Only if the shopkeeper happens to remember. Never required. */
  originalOrderNo: string | null;

  /* What the customer walked away with */
  customerOutcome: CustomerOutcome;

  /* Where it stands with the supplier */
  stage: ClaimStage;
  supplierId: number | null;
  supplierName: string;
  sentOn: string | null;
  settledOn: string | null;
  supplierNote: string;
  remindersSent: number;
};

export const CLAIM_STAGE_VARIANT: Record<
  ClaimStage,
  "success" | "warning" | "danger" | "info" | "muted"
> = {
  RECEIVED: "warning",
  SENT: "info",
  REPLACED: "success",
  CREDITED: "success",
  REJECTED: "danger",
  WRITTEN_OFF: "muted",
};

export const CLAIM_STAGE_LABEL: Record<ClaimStage, string> = {
  RECEIVED: "In claim stock",
  SENT: "With supplier",
  REPLACED: "Replaced",
  CREDITED: "Credited",
  REJECTED: "Refused",
  WRITTEN_OFF: "Written off",
};

export const OUTCOME_LABEL: Record<CustomerOutcome, string> = {
  REPLACED_NOW: "Replaced on the spot",
  CREDIT_NOTE: "Credit given",
  WAITING: "Customer waiting",
};

const c = (
  id: number,
  claimNo: string,
  customerId: number,
  customerName: string,
  customerInitials: string,
  receivedOn: string,
  receivedBy: string,
  productId: number,
  productName: string,
  sku: string,
  qty: number,
  unitCost: number,
  reason: string,
  reasonLabel: string,
  customerOutcome: CustomerOutcome,
  stage: ClaimStage,
  supplierId: number | null,
  supplierName: string,
  sentOn: string | null,
  settledOn: string | null,
  note = "",
  supplierNote = "",
  originalOrderNo: string | null = null,
  remindersSent = 0
): Claim => ({
  id, claimNo, customerId, customerName, customerInitials, receivedOn,
  receivedBy, productId, productName, sku, qty, unitCost, reason, reasonLabel,
  note, originalOrderNo, customerOutcome, stage, supplierId, supplierName,
  sentOn, settledOn, supplierNote, remindersSent,
});

export const claims: Claim[] = [
  /* Just in — still on the claim shelf */
  c(1,  "CLM-26-0142", 1,  "Hafeez Center Shop #28", "HC", "2026-08-14", "Ahmed Riaz", 11, "VIZO 29DI Itel Battery",           "05050745", 12, 350,  "dead",        "Dead on arrival",    "REPLACED_NOW", "RECEIVED", null, "—",                         null,         null,         "Whole packet dead, same batch"),
  c(2,  "CLM-26-0141", 5,  "Cellular World KHI",     "CW", "2026-08-13", "Ahmed Riaz", 1,  "VIZO Titan T9 Earbuds — Black",    "05050781", 3,  580,  "not-working", "Stopped working",    "REPLACED_NOW", "RECEIVED", null, "—",                         null,         null,         "Right bud silent after a week"),
  c(3,  "CLM-26-0140", 8,  "Mobilink Connect Lahore","ML", "2026-08-12", "Ahmed Riaz", 24, "VIZO VOLT 65W GaN Charger",        "05050901", 2,  1480, "burnt",       "Burnt",              "WAITING",      "RECEIVED", null, "—",                         null,         null,         "Customer says voltage fluctuation", "", null, 1),

  /* Gone to the supplier, waiting */
  c(4,  "CLM-26-0138", 2,  "Mobile Zone Lahore",     "MZ", "2026-08-04", "Ahmed Riaz", 12, "VIZO G530 Samsung Battery",        "05050785", 24, 260,  "weak",        "Weak / low backup",  "REPLACED_NOW", "SENT",     20, "China Mobile Plaza Trading", "2026-08-06", null,         "Backup under an hour", "", null, 2),
  c(5,  "CLM-26-0137", 10, "Star Communications",    "SC", "2026-07-30", "Ahmed Riaz", 28, "VIZO Glasspods VR7070",            "05050895", 4,  1800, "not-working", "Stopped working",    "WAITING",      "SENT",     21, "Shenzhen Electronics Hub",   "2026-08-01", null,         "Bluetooth pairing fails", "Under test at factory", null, 4),
  c(6,  "CLM-26-0135", 6,  "Faisal Mobile Mart",     "FM", "2026-07-28", "Ahmed Riaz", 19, "VIZO Linko VC101 Type-C Cable",    "05050885", 40, 95,   "dead",        "Dead on arrival",    "REPLACED_NOW", "SENT",     20, "China Mobile Plaza Trading", "2026-07-30", null,         "Whole carton not charging", "", null, 3),

  /* Settled */
  c(7,  "CLM-26-0130", 3,  "Saddar Mobile Plaza",    "SM", "2026-07-20", "Ahmed Riaz", 20, "VIZO Maxo VC202 Micro Cable",      "05050886", 30, 65,   "dead",        "Dead on arrival",    "REPLACED_NOW", "REPLACED", 20, "China Mobile Plaza Trading", "2026-07-22", "2026-08-02", "", "Fresh carton sent"),
  c(8,  "CLM-26-0128", 9,  "Mobile Mart Multan",     "MM", "2026-07-15", "Ahmed Riaz", 11, "VIZO 29DI Itel Battery",           "05050745", 18, 350,  "weak",        "Weak / low backup",  "REPLACED_NOW", "REPLACED", 20, "China Mobile Plaza Trading", "2026-07-17", "2026-07-29", "", "Replaced in full"),
  c(9,  "CLM-26-0126", 14, "Universal Mobile Sialkot","UM","2026-07-10", "Ahmed Riaz", 27, "VIZO Clamp V6000 Charger",         "05050906", 6,  230,  "damaged",     "Physically damaged", "WAITING",      "REJECTED", 22, "Karachi Wholesale Cells",    "2026-07-12", "2026-07-25", "Casing cracked", "Physical damage not covered"),
  c(10, "CLM-26-0124", 7,  "Quetta Cellular",        "QC", "2026-07-05", "Ahmed Riaz", 1,  "VIZO Titan T9 Earbuds — Black",    "05050781", 2,  580,  "burnt",       "Burnt",              "REPLACED_NOW", "WRITTEN_OFF", 21, "Shenzhen Electronics Hub", "2026-07-07", "2026-07-20", "", "Refused — posted to Warranty & Claims"),
  c(11, "CLM-26-0122", 1,  "Hafeez Center Shop #28", "HC", "2026-06-28", "Ahmed Riaz", 11, "VIZO 29DI Itel Battery",           "05050745", 20, 350,  "dead",        "Dead on arrival",    "REPLACED_NOW", "CREDITED", 20, "China Mobile Plaza Trading", "2026-06-30", "2026-07-14", "", "Credit note against next purchase"),
  c(12, "CLM-26-0120", 5,  "Cellular World KHI",     "CW", "2026-06-20", "Ahmed Riaz", 12, "VIZO G530 Samsung Battery",        "05050785", 15, 260,  "weak",        "Weak / low backup",  "REPLACED_NOW", "REPLACED", 20, "China Mobile Plaza Trading", "2026-06-22", "2026-07-04", "", "Replaced in full"),
];

export function getClaim(id: number) {
  return claims.find((x) => x.id === id);
}

export const openStages: ClaimStage[] = ["RECEIVED", "SENT"];

export function openClaims(list: Claim[] = claims) {
  return list.filter((x) => openStages.includes(x.stage));
}

/** Value tied up in a set of claims. */
export function claimValue(list: Claim[]) {
  return list.reduce((sum, x) => sum + x.qty * x.unitCost, 0);
}

/**
 * Which supplier settles claims, and how quickly. Worth knowing at the moment
 * you place the next purchase order — a cheap supplier who refuses half your
 * claims is not cheap.
 */
export type SupplierClaimRecord = {
  supplierId: number;
  supplierName: string;
  sent: number;
  settled: number;
  refused: number;
  /** Average days from sending to a decision. */
  avgDays: number;
  /** Percent of settled claims the supplier honoured. */
  honourRate: number;
  valueOpen: number;
};

export function supplierScorecard(): SupplierClaimRecord[] {
  const sent = claims.filter((x) => x.supplierId !== null);
  const byId = new Map<number, Claim[]>();
  for (const x of sent) {
    const list = byId.get(x.supplierId!) ?? [];
    byId.set(x.supplierId!, [...list, x]);
  }

  return Array.from(byId.entries()).map(([supplierId, list]) => {
    const decided = list.filter((x) => x.settledOn !== null);
    const refused = decided.filter(
      (x) => x.stage === "REJECTED" || x.stage === "WRITTEN_OFF"
    );
    const days = decided.map((x) =>
      Math.round(
        (new Date(x.settledOn!).getTime() - new Date(x.sentOn!).getTime()) / 86400000
      )
    );
    return {
      supplierId,
      supplierName: list[0].supplierName,
      sent: list.length,
      settled: decided.length,
      refused: refused.length,
      avgDays: days.length > 0 ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : 0,
      honourRate:
        decided.length > 0
          ? Math.round(((decided.length - refused.length) / decided.length) * 100)
          : 0,
      valueOpen: claimValue(list.filter((x) => openStages.includes(x.stage))),
    };
  });
}

/**
 * Which items come back most. This is the number that should decide what you
 * stop buying — a line that sells well and returns 8% of itself is losing
 * money quietly.
 */
export type ItemClaimRecord = {
  productId: number;
  productName: string;
  sku: string;
  claims: number;
  qty: number;
  value: number;
};

export function worstItems(limit = 5): ItemClaimRecord[] {
  const byId = new Map<number, Claim[]>();
  for (const x of claims) {
    const list = byId.get(x.productId) ?? [];
    byId.set(x.productId, [...list, x]);
  }

  return Array.from(byId.entries())
    .map(([productId, list]) => ({
      productId,
      productName: list[0].productName,
      sku: list[0].sku,
      claims: list.length,
      qty: list.reduce((s, x) => s + x.qty, 0),
      value: claimValue(list),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}
