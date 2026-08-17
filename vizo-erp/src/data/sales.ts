/**
 * Mock sales data — orders, invoices, returns
 */

import type { ChannelKey } from "./settings";

export type OrderStatus =
  | "DRAFT" | "SUBMITTED" | "CREDIT_HOLD" | "CONFIRMED"
  | "PROCESSING" | "PACKED" | "DISPATCHED" | "INVOICED"
  | "DELIVERED" | "CANCELLED" | "RETURNED";

/**
 * Where a dispatched consignment has got to. Separate from the order status
 * because "we sent it" and "it arrived" are answered by different people, and
 * the gap between them is exactly what the business could not see before.
 */
export type DeliveryState =
  | "NOT_DISPATCHED"
  | "AWAITING"      // sent, nobody has confirmed yet
  | "ON_THE_WAY"    // someone checked: still in transit
  | "DELIVERED"
  | "RETURNED";

export type Order = {
  id: number;
  orderNo: string;
  customerId: number;
  customerName: string;
  customerInitials: string;
  customerType: string;
  city: string;
  location: string;
  locationCode: string;
  salesPerson: string;
  orderDate: string;
  deliveryDate: string;
  status: OrderStatus;
  itemCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: "CASH" | "BANK" | "EASYPAISA" | "JAZZCASH" | "CREDIT";
  paymentStatus: "UNPAID" | "PARTIAL" | "PAID";
  /** How much of the total has actually been received. */
  paidAmount: number;

  /* ── Delivery ───────────────────────────────────────────── */
  channel: ChannelKey;
  carrier: string;
  /** Courier tracking number, or the bilty number for freight. */
  trackingNo: string;
  dispatchedOn: string | null;
  /** When it should have arrived — drives the reminder. */
  dueOn: string | null;
  deliveryState: DeliveryState;
  deliveredOn: string | null;
  /** Set when a consignment comes back, or when someone reports a delay. */
  deliveryNote: string;
  /** How many times someone has been asked and not answered. */
  remindersSent: number;

  creditHoldReason?: string;
};

export const DELIVERY_STATE_VARIANT: Record<
  DeliveryState,
  "success" | "warning" | "danger" | "info" | "muted"
> = {
  NOT_DISPATCHED: "muted",
  AWAITING:       "warning",
  ON_THE_WAY:     "info",
  DELIVERED:      "success",
  RETURNED:       "danger",
};

const STATUS_VARIANT: Record<OrderStatus, "success" | "warning" | "danger" | "info" | "muted"> = {
  DRAFT:       "muted",
  SUBMITTED:   "info",
  CREDIT_HOLD: "warning",
  CONFIRMED:   "info",
  PROCESSING:  "muted",
  PACKED:      "muted",
  DISPATCHED:  "success",
  INVOICED:    "success",
  DELIVERED:   "success",
  CANCELLED:   "danger",
  RETURNED:    "danger",
};

export function getStatusVariant(s: OrderStatus) {
  return STATUS_VARIANT[s];
}

const o = (
  id: number,
  orderNo: string,
  customerId: number,
  customerName: string,
  customerInitials: string,
  customerType: string,
  city: string,
  location: string,
  locationCode: string,
  salesPerson: string,
  date: string,
  status: OrderStatus,
  total: number,
  paymentMethod: Order["paymentMethod"],
  paymentStatus: Order["paymentStatus"],
  channel: ChannelKey,
  carrier: string,
  trackingNo: string,
  dispatchedOn: string | null,
  dueOn: string | null,
  deliveryState: DeliveryState,
  deliveredOn: string | null,
  deliveryNote = "",
  remindersSent = 0,
  creditHoldReason?: string
): Order => ({
  id,
  orderNo,
  customerId,
  customerName,
  customerInitials,
  customerType,
  city,
  location,
  locationCode,
  salesPerson,
  orderDate: date,
  deliveryDate: dueOn ?? date,
  status,
  itemCount: ((id * 7) % 8) + 2,
  subtotal: Math.round(total / 1.18),
  discount: 0,
  tax: Math.round(total - total / 1.18),
  total,
  paymentMethod,
  paymentStatus,
  paidAmount:
    paymentStatus === "PAID" ? total : paymentStatus === "PARTIAL" ? Math.round(total * 0.4) : 0,
  channel,
  carrier,
  trackingNo,
  dispatchedOn,
  dueOn,
  deliveryState,
  deliveredOn,
  deliveryNote,
  remindersSent,
  creditHoldReason,
});

export const orders: Order[] = [
  /* Karachi — the rep hands these over himself and confirms them */
  o(1,  "ORD-26-0142", 1,  "Hafeez Center Shop #28",   "HC", "Wholesaler",  "Karachi",   "Order Department", "LOC-02", "Zara Malik",  "2026-08-13", "DISPATCHED",  145000, "CREDIT",    "UNPAID",  "local", "Sales rep",              "—",           "2026-08-13", "2026-08-13", "AWAITING",   null,         "", 1),
  o(3,  "ORD-26-0141", 3,  "Saddar Mobile Plaza",      "SM", "Retailer",    "Karachi",   "Order Department", "LOC-02", "Zara Malik",  "2026-08-13", "CONFIRMED",   32750,  "CREDIT",    "UNPAID",  "local", "Sales rep",              "—",           null,         null,         "NOT_DISPATCHED", null,     ""),
  o(5,  "ORD-26-0140", 5,  "Cellular World KHI",       "CW", "Wholesaler",  "Karachi",   "Order Department", "LOC-02", "Zara Malik",  "2026-08-12", "PACKED",      56200,  "CREDIT",    "UNPAID",  "local", "Own rider",              "—",           null,         null,         "NOT_DISPATCHED", null,     ""),
  o(6,  "ORD-26-0088", 6,  "Faisal Mobile Mart",       "FM", "Retailer",    "Karachi",   "Shop 2",           "LOC-03", "Zara Malik",  "2026-08-11", "DELIVERED",   18400,  "CASH",      "PAID",    "local", "Sales rep",              "—",           "2026-08-11", "2026-08-11", "DELIVERED",  "2026-08-11", ""),
  o(11, "ORD-26-0137", 7,  "Quetta Cellular",          "QC", "Retailer",    "Quetta",    "Order Department", "LOC-02", "Zara Malik",  "2026-08-06", "DISPATCHED",  12400,  "JAZZCASH",  "PAID",    "cargo", "Pak International Cargo","PIC-88213",   "2026-08-06", "2026-08-10", "ON_THE_WAY", null,         "Customer says shop was closed, cargo re-attempting", 3),

  /* Online — courier booked, back office confirms */
  o(7,  "ORD-26-0139", 8,  "Mobilink Connect Lahore",  "ML", "Wholesaler",  "Lahore",    "Order Department", "LOC-02", "Zara Malik",  "2026-08-12", "DISPATCHED",  98500,  "BANK",      "PARTIAL", "online","PostEx",                 "PX7741203355","2026-08-12", "2026-08-15", "AWAITING",   null,         "", 0),
  o(9,  "ORD-26-0138", 10, "Star Communications",      "SC", "Distributor", "Karachi",   "Order Department", "LOC-02", "Zara Malik",  "2026-08-10", "DELIVERED",   485000, "BANK",      "PAID",    "online","TCS Courier",            "TCS7841203301","2026-08-10","2026-08-12", "DELIVERED",  "2026-08-12", ""),

  /* Cargo — the Karachi cargo handler chases these */
  o(2,  "ORD-26-0089", 2,  "Mobile Zone Lahore",       "MZ", "Retailer",    "Lahore",    "Shop 2",           "LOC-03", "Imran Iqbal", "2026-08-11", "DISPATCHED",  84500,  "CREDIT",    "UNPAID",  "cargo", "Rehman Cargo",           "RC-99302218", "2026-08-11", "2026-08-14", "AWAITING",   null,         "", 2),
  o(8,  "ORD-26-0087", 9,  "Mobile Mart Multan",       "MM", "Retailer",    "Multan",    "Shop 2",           "LOC-03", "Imran Iqbal", "2026-08-09", "DELIVERED",   24600,  "EASYPAISA", "PAID",    "cargo", "Mehran Railway Cargo",   "MRC-44120901","2026-08-09", "2026-08-12", "DELIVERED",  "2026-08-12", ""),
  o(13, "ORD-26-0085", 9,  "Mobile Mart Multan",       "MM", "Retailer",    "Multan",    "Shop 2",           "LOC-03", "Imran Iqbal", "2026-08-05", "RETURNED",    38400,  "CREDIT",    "UNPAID",  "cargo", "Rehman Cargo",           "RC-99302190", "2026-08-05", "2026-08-08", "RETURNED",   null,         "Customer refused — said rate was agreed lower", 0),
  o(12, "ORD-26-0086", 14, "Universal Mobile Sialkot", "UM", "Wholesaler",  "Sialkot",   "Shop 2",           "LOC-03", "Zara Malik",  "2026-08-13", "DRAFT",       45200,  "CREDIT",    "UNPAID",  "cargo", "Pak International Cargo","—",           null,         null,         "NOT_DISPATCHED", null,     ""),

  /* Heavy freight — bilty is the proof, longest patience before nudging */
  o(4,  "ORD-26-0034", 4,  "Blue Area Distributors",   "BA", "Distributor", "Islamabad", "Warehouse",        "LOC-01", "Asad Ali",    "2026-08-09", "DISPATCHED",  218000, "BANK",      "PARTIAL", "logistics","NLC",                 "BL-2026-4471","2026-08-09", "2026-08-14", "AWAITING",   null,         "", 1),
  o(10, "ORD-26-0033", 12, "Margalla Distributors",    "MD", "Distributor", "Islamabad", "Warehouse",        "LOC-01", "Asad Ali",    "2026-08-04", "DELIVERED",   320000, "BANK",      "PAID",    "logistics","Daewoo Cargo",        "BL-2026-4388","2026-08-04", "2026-08-09", "DELIVERED",  "2026-08-08", ""),

  o(14, "ORD-26-0136", 1,  "Hafeez Center Shop #28",   "HC", "Wholesaler",  "Karachi",   "Order Department", "LOC-02", "Zara Malik",  "2026-08-07", "CANCELLED",   88000,  "CREDIT",    "UNPAID",  "local", "Sales rep",              "—",           null,         null,         "NOT_DISPATCHED", null,     "Customer cancelled before packing"),
  o(15, "ORD-26-0135", 5,  "Cellular World KHI",       "CW", "Wholesaler",  "Karachi",   "Order Department", "LOC-02", "Zara Malik",  "2026-08-03", "DELIVERED",   142000, "BANK",      "PAID",    "local", "Sales rep",              "—",           "2026-08-03", "2026-08-03", "DELIVERED",  "2026-08-03", ""),
];

/** Orders this rep is responsible for. */
export function ordersForRep(name: string) {
  return orders.filter((x) => x.salesPerson === name);
}

/**
 * Consignments that have gone out and nobody has confirmed — the list the
 * reminder works from.
 */
export function awaitingConfirmation(orders_: Order[] = orders) {
  return orders_.filter(
    (x) => x.deliveryState === "AWAITING" || x.deliveryState === "ON_THE_WAY"
  );
}

export function getOrder(id: number) {
  return orders.find((o) => o.id === id);
}

/* INVOICES */
export type InvoiceStatus = "DRAFT" | "ISSUED" | "PARTIAL" | "PAID" | "OVERDUE" | "VOID";

export type Invoice = {
  id: number;
  invoiceNo: string;
  orderNo: string;
  orderId: number;
  customerId: number;
  customerName: string;
  customerInitials: string;
  location: string;
  invoiceDate: string;
  dueDate: string;
  total: number;
  paid: number;
  balance: number;
  status: InvoiceStatus;
  paymentMethod: Order["paymentMethod"];
};

export const invoices: Invoice[] = orders
  .filter((o) => ["DISPATCHED", "INVOICED", "DELIVERED"].includes(o.status))
  .map((o, i) => {
    const paid = o.paidAmount;
    const status: InvoiceStatus =
      paid === o.total ? "PAID" : paid > 0 ? "PARTIAL" : new Date(o.orderDate) < new Date("2026-04-01") ? "OVERDUE" : "ISSUED";
    return {
      id: i + 1,
      invoiceNo: o.orderNo.replace("ORD", "INV"),
      orderNo: o.orderNo,
      orderId: o.id,
      customerId: o.customerId,
      customerName: o.customerName,
      customerInitials: o.customerInitials,
      location: o.location,
      invoiceDate: o.orderDate,
      dueDate: new Date(new Date(o.orderDate).getTime() + 30 * 86400000).toISOString().slice(0, 10),
      total: o.total,
      paid,
      balance: o.total - paid,
      status,
      paymentMethod: o.paymentMethod,
    };
  });

export const INVOICE_STATUS_VARIANT: Record<InvoiceStatus, "success" | "warning" | "danger" | "info" | "muted"> = {
  DRAFT:   "muted",
  ISSUED:  "info",
  PARTIAL: "warning",
  PAID:    "success",
  OVERDUE: "danger",
  VOID:    "muted",
};

export function getInvoice(id: number) {
  return invoices.find((i) => i.id === id);
}

/* SALES RETURNS */
export type ReturnStatus = "DRAFT" | "APPROVED" | "POSTED" | "REJECTED";
export type Return = {
  id: number;
  returnNo: string;
  invoiceNo: string;
  customerName: string;
  customerInitials: string;
  location: string;
  returnDate: string;
  reason: string;
  itemCount: number;
  totalAmount: number;
  resalableQty: number;
  damagedQty: number;
  refundMethod: "CASH" | "BANK" | "EASYPAISA" | "JAZZCASH" | "CREDIT_NOTE";
  status: ReturnStatus;
};

export const salesReturns: Return[] = [
  { id: 1, returnNo: "RET-KHI-26-0008", invoiceNo: "INV-26-0128", customerName: "Hafeez Center Shop #28", customerInitials: "HC", location: "Order Department",  returnDate: "2026-04-27", reason: "Defective items",       itemCount: 2, totalAmount: 8400,  resalableQty: 0, damagedQty: 4, refundMethod: "CREDIT_NOTE", status: "POSTED" },
  { id: 2, returnNo: "RET-LHR-26-0004", invoiceNo: "INV-26-0085", customerName: "Mobile Mart Multan",     customerInitials: "MM", location: "Shop 2",   returnDate: "2026-04-26", reason: "Wrong item shipped",     itemCount: 1, totalAmount: 1980,  resalableQty: 3, damagedQty: 0, refundMethod: "BANK",       status: "POSTED" },
  { id: 3, returnNo: "RET-KHI-26-0007", invoiceNo: "INV-26-0114", customerName: "Saddar Mobile Plaza",    customerInitials: "SM", location: "Order Department",  returnDate: "2026-04-25", reason: "Customer dissatisfaction", itemCount: 1, totalAmount: 980, resalableQty: 1, damagedQty: 0, refundMethod: "CASH",       status: "APPROVED" },
  { id: 4, returnNo: "RET-ISB-26-0003", invoiceNo: "INV-26-0028", customerName: "Margalla Distributors",  customerInitials: "MD", location: "Warehouse",returnDate: "2026-04-24", reason: "Expired stock",           itemCount: 3, totalAmount: 14200, resalableQty: 0, damagedQty: 12, refundMethod: "BANK",      status: "POSTED" },
  { id: 5, returnNo: "RET-KHI-26-0006", invoiceNo: "INV-26-0098", customerName: "Cellular World KHI",     customerInitials: "CW", location: "Order Department",  returnDate: "2026-04-23", reason: "Over-supplied",           itemCount: 1, totalAmount: 4200,  resalableQty: 6, damagedQty: 0, refundMethod: "CREDIT_NOTE",status: "DRAFT" },
];

export const RETURN_STATUS_VARIANT: Record<ReturnStatus, "success" | "warning" | "danger" | "info" | "muted"> = {
  DRAFT:    "muted",
  APPROVED: "info",
  POSTED:   "success",
  REJECTED: "danger",
};
