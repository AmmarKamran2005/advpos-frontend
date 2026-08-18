/**
 * Mock purchases data — POs, GRNs, Purchase Invoices, Returns
 */

export type POStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED" | "CLOSED";
export type PO = {
  id: number;
  poNo: string;
  supplierId: number;
  supplierName: string;
  supplierInitials: string;
  location: string;
  poDate: string;
  expectedDate: string;
  status: POStatus;
  itemCount: number;
  total: number;
  receivedPercent: number;
  approvedBy?: string;
  createdBy: string;
};

export const PO_STATUS_VARIANT: Record<POStatus, "success" | "warning" | "danger" | "info" | "muted"> = {
  DRAFT:              "muted",
  PENDING_APPROVAL:   "warning",
  APPROVED:           "info",
  PARTIALLY_RECEIVED: "warning",
  RECEIVED:           "success",
  CANCELLED:          "danger",
  CLOSED:             "muted",
};

export const purchaseOrders: PO[] = [
  { id: 1, poNo: "PO-26-0042", supplierId: 20, supplierName: "China Mobile Plaza Trading", supplierInitials: "CM", location: "LOC-01", poDate: "2026-04-30", expectedDate: "2026-05-15", status: "APPROVED",           itemCount: 12, total: 1850000, receivedPercent: 0,   approvedBy: "Umer Memon", createdBy: "Ahmed Riaz" },
  { id: 2, poNo: "PO-26-0041", supplierId: 21, supplierName: "Shenzhen Electronics Hub",   supplierInitials: "SE", location: "LOC-01", poDate: "2026-04-28", expectedDate: "2026-05-12", status: "PARTIALLY_RECEIVED", itemCount: 8,  total: 1240000, receivedPercent: 65,  approvedBy: "Umer Memon", createdBy: "Ahmed Riaz" },
  { id: 3, poNo: "PO-26-0040", supplierId: 22, supplierName: "Karachi Wholesale Cells",     supplierInitials: "KW", location: "LOC-01", poDate: "2026-04-25", expectedDate: "2026-05-05", status: "RECEIVED",           itemCount: 5,  total: 482000,  receivedPercent: 100, approvedBy: "Umer Memon", createdBy: "Ahmed Riaz" },
  { id: 4, poNo: "PO-26-0018", supplierId: 24, supplierName: "Audio Tech International",    supplierInitials: "AT", location: "LOC-03", poDate: "2026-04-25", expectedDate: "2026-05-10", status: "PENDING_APPROVAL",   itemCount: 4,  total: 950000,  receivedPercent: 0,   createdBy: "Sara Khan" },
  { id: 5, poNo: "PO-26-0039", supplierId: 23, supplierName: "Pak Accessories Imports",     supplierInitials: "PA", location: "LOC-01", poDate: "2026-04-22", expectedDate: "2026-05-02", status: "RECEIVED",           itemCount: 6,  total: 320000,  receivedPercent: 100, approvedBy: "Umer Memon", createdBy: "Ahmed Riaz" },
  { id: 6, poNo: "PO-26-0008", supplierId: 22, supplierName: "Karachi Wholesale Cells",     supplierInitials: "KW", location: "LOC-02", poDate: "2026-04-20", expectedDate: "2026-04-30", status: "CLOSED",             itemCount: 3,  total: 145000,  receivedPercent: 100, approvedBy: "Umer Memon", createdBy: "Bilal Ahmed" },
  { id: 7, poNo: "PO-26-0038", supplierId: 20, supplierName: "China Mobile Plaza Trading",  supplierInitials: "CM", location: "LOC-01", poDate: "2026-04-18", expectedDate: "2026-04-28", status: "DRAFT",              itemCount: 10, total: 1480000, receivedPercent: 0,   createdBy: "Ahmed Riaz" },
];

/* GRNs */
export type GRNStatus = "DRAFT" | "POSTED" | "REJECTED";
export type GRN = {
  id: number;
  grnNo: string;
  poNo: string;
  poId: number;
  supplierName: string;
  supplierInitials: string;
  location: string;
  receiptDate: string;
  deliveryNoteNo: string;
  vehicleNo: string;
  itemCount: number;
  unitsReceived: number;
  unitsAccepted: number;
  unitsDamaged: number;
  totalValue: number;
  status: GRNStatus;
  receivedBy: string;
};

export const grns: GRN[] = [
  { id: 1, grnNo: "GRN-26-0089", poNo: "PO-26-0041", poId: 2, supplierName: "Shenzhen Electronics Hub",  supplierInitials: "SE", location: "LOC-01", receiptDate: "2026-04-29", deliveryNoteNo: "SEH-2026-0419", vehicleNo: "BHN-882",   itemCount: 8, unitsReceived: 240, unitsAccepted: 235, unitsDamaged: 5, totalValue: 482000,  status: "POSTED",  receivedBy: "Bilal Ahmed" },
  { id: 2, grnNo: "GRN-26-0088", poNo: "PO-26-0040", poId: 3, supplierName: "Karachi Wholesale Cells",   supplierInitials: "KW", location: "LOC-01", receiptDate: "2026-04-28", deliveryNoteNo: "KWC-DN-1842",  vehicleNo: "TLM-441",   itemCount: 5, unitsReceived: 180, unitsAccepted: 180, unitsDamaged: 0, totalValue: 482000,  status: "POSTED",  receivedBy: "Bilal Ahmed" },
  { id: 3, grnNo: "GRN-26-0087", poNo: "PO-26-0039", poId: 5, supplierName: "Pak Accessories Imports",   supplierInitials: "PA", location: "LOC-01", receiptDate: "2026-04-26", deliveryNoteNo: "PAI-2026-0421", vehicleNo: "JKL-2289",  itemCount: 6, unitsReceived: 380, unitsAccepted: 376, unitsDamaged: 4, totalValue: 320000,  status: "POSTED",  receivedBy: "Bilal Ahmed" },
  { id: 4, grnNo: "GRN-26-0024", poNo: "PO-26-0017", poId: 0, supplierName: "Audio Tech International",  supplierInitials: "AT", location: "LOC-03", receiptDate: "2026-04-24", deliveryNoteNo: "ATI-DN-0884",  vehicleNo: "—",         itemCount: 3, unitsReceived: 120, unitsAccepted: 120, unitsDamaged: 0, totalValue: 285000,  status: "POSTED",  receivedBy: "Sara Khan" },
  { id: 5, grnNo: "GRN-26-0090", poNo: "PO-26-0041", poId: 2, supplierName: "Shenzhen Electronics Hub",  supplierInitials: "SE", location: "LOC-01", receiptDate: "2026-05-01", deliveryNoteNo: "SEH-2026-0421", vehicleNo: "BHN-882",   itemCount: 4, unitsReceived: 80,  unitsAccepted: 80,  unitsDamaged: 0, totalValue: 320000,  status: "DRAFT",   receivedBy: "Bilal Ahmed" },
];

export const GRN_STATUS_VARIANT: Record<GRNStatus, "success" | "muted" | "danger"> = {
  DRAFT:    "muted",
  POSTED:   "success",
  REJECTED: "danger",
};

/* Purchase Invoices */
export type PIStatus = "DRAFT" | "POSTED" | "PAID" | "PARTIAL" | "OVERDUE" | "VOID";
export type PI = {
  id: number;
  invoiceNo: string;
  supplierInvoiceNo: string;
  supplierName: string;
  supplierInitials: string;
  poNo: string;
  invoiceDate: string;
  dueDate: string;
  total: number;
  paid: number;
  balance: number;
  paymentMethod: "CASH" | "BANK" | "EASYPAISA" | "JAZZCASH" | "CREDIT";
  whtAmount: number;
  status: PIStatus;
};

export const purchaseInvoices: PI[] = [
  { id: 1, invoiceNo: "PI-26-0042", supplierInvoiceNo: "CMP-INV-2026-1842", supplierName: "China Mobile Plaza Trading", supplierInitials: "CM", poNo: "PO-26-0040", invoiceDate: "2026-07-19", dueDate: "2026-08-18", total: 482000, paid: 0,      balance: 482000, paymentMethod: "CREDIT", whtAmount: 21690, status: "POSTED"  },
  { id: 2, invoiceNo: "PI-26-0041", supplierInvoiceNo: "SEH-INV-2026-2241", supplierName: "Shenzhen Electronics Hub",   supplierInitials: "SE", poNo: "PO-26-0041", invoiceDate: "2026-07-21", dueDate: "2026-08-20", total: 720000, paid: 360000, balance: 360000, paymentMethod: "BANK",   whtAmount: 32400, status: "PARTIAL" },
  { id: 3, invoiceNo: "PI-26-0040", supplierInvoiceNo: "PAI-INV-2026-0421", supplierName: "Pak Accessories Imports",    supplierInitials: "PA", poNo: "PO-26-0039", invoiceDate: "2026-07-16", dueDate: "2026-08-15", total: 320000, paid: 320000, balance: 0,      paymentMethod: "BANK",   whtAmount: 14400, status: "PAID"    },
  { id: 4, invoiceNo: "PI-26-0014", supplierInvoiceNo: "ATI-INV-2026-1124", supplierName: "Audio Tech International",   supplierInitials: "AT", poNo: "PO-26-0017", invoiceDate: "2026-07-11", dueDate: "2026-08-10", total: 285000, paid: 0,      balance: 285000, paymentMethod: "CREDIT", whtAmount: 12825, status: "OVERDUE" },
  { id: 5, invoiceNo: "PI-26-0039", supplierInvoiceNo: "KWC-INV-2026-0942", supplierName: "Karachi Wholesale Cells",    supplierInitials: "KW", poNo: "PO-26-0040", invoiceDate: "2026-06-15", dueDate: "2026-07-15", total: 145000, paid: 0,      balance: 145000, paymentMethod: "CREDIT", whtAmount: 6525,  status: "OVERDUE" },
];

export const PI_STATUS_VARIANT: Record<PIStatus, "success" | "warning" | "danger" | "info" | "muted"> = {
  DRAFT:   "muted",
  POSTED:  "info",
  PARTIAL: "warning",
  PAID:    "success",
  OVERDUE: "danger",
  VOID:    "muted",
};

/**
 * Unpaid purchase invoices that are overdue, or due within `withinDays`.
 *
 * Judged purely off the due date, not the `status` field — a status set once
 * and never revisited drifts out of sync with the calendar. This is the same
 * check the reminder for it uses, so the dashboard counter and the reminder
 * never disagree.
 */
export function payablesDueSoon(withinDays = 3, today = "2026-08-15") {
  return purchaseInvoices.filter((pi) => {
    if (pi.balance <= 0) return false;
    const daysPastDue = Math.round(
      (new Date(today).getTime() - new Date(pi.dueDate).getTime()) / 86400000
    );
    return daysPastDue > -withinDays;
  });
}

/* Purchase Returns */
export const purchaseReturns = [
  { id: 1, returnNo: "PR-26-0008", invoiceNo: "PI-26-0040", supplier: "Pak Accessories Imports",    initials: "PA", date: "2026-04-28", reason: "Damaged in transit", itemCount: 2, totalAmount: 18400, status: "POSTED" as const },
  { id: 2, returnNo: "PR-26-0007", invoiceNo: "PI-26-0038", supplier: "Karachi Wholesale Cells",    initials: "KW", date: "2026-04-25", reason: "Wrong specification",itemCount: 1, totalAmount: 12000, status: "APPROVED" as const },
  { id: 3, returnNo: "PR-26-0003", invoiceNo: "PI-26-0013", supplier: "Audio Tech International",   initials: "AT", date: "2026-04-22", reason: "Expired stock",       itemCount: 3, totalAmount: 24500, status: "POSTED" as const },
  { id: 4, returnNo: "PR-26-0009", invoiceNo: "PI-26-0042", supplier: "China Mobile Plaza Trading", initials: "CM", date: "2026-04-30", reason: "Wrong color",         itemCount: 4, totalAmount: 32500, status: "DRAFT"    as const },
];

export const PR_STATUS_VARIANT = {
  DRAFT:    "muted" as const,
  APPROVED: "info" as const,
  POSTED:   "success" as const,
  REJECTED: "danger" as const,
};
