/**
 * Deliveries — goods handed to a third-party courier.
 *
 * PLACEHOLDER SHAPE. The client has said only that delivery is outsourced to a
 * courier company; the exact process is still to be confirmed. The fields below
 * cover the common Pakistani courier flow (book → track → deliver → settle COD)
 * so the screens can be reviewed and corrected against something concrete.
 *
 * Open questions tracked in plan.md §6.2.
 */

export type DeliveryStatus =
  | "BOOKED"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED"
  | "RETURNED_TO_SENDER";

export type Delivery = {
  id: number;
  deliveryNo: string;
  invoiceNo: string;
  invoiceId: number;
  customerName: string;
  customerInitials: string;
  customerPhone: string;
  destination: string;
  courierId: number;
  trackingNo: string;
  bookedDate: string;
  expectedDate: string;
  deliveredDate: string | null;
  status: DeliveryStatus;
  parcels: number;
  weightKg: number;
  /** Amount the courier must collect from the customer. 0 = already paid. */
  codAmount: number;
  /** Whether that cash has reached us yet. */
  codSettled: boolean;
  bookingCharge: number;
  notes: string;
};

export const DELIVERY_STATUS_VARIANT: Record<
  DeliveryStatus,
  "success" | "warning" | "danger" | "info" | "muted"
> = {
  BOOKED: "muted",
  IN_TRANSIT: "info",
  OUT_FOR_DELIVERY: "warning",
  DELIVERED: "success",
  FAILED: "danger",
  RETURNED_TO_SENDER: "danger",
};

/** The order a consignment moves through, for the progress strip. */
export const DELIVERY_FLOW: DeliveryStatus[] = [
  "BOOKED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

const d = (
  id: number,
  deliveryNo: string,
  invoiceNo: string,
  invoiceId: number,
  customerName: string,
  customerInitials: string,
  customerPhone: string,
  destination: string,
  courierId: number,
  trackingNo: string,
  bookedDate: string,
  expectedDate: string,
  deliveredDate: string | null,
  status: DeliveryStatus,
  parcels: number,
  weightKg: number,
  codAmount: number,
  codSettled: boolean,
  bookingCharge: number,
  notes = ""
): Delivery => ({
  id, deliveryNo, invoiceNo, invoiceId, customerName, customerInitials,
  customerPhone, destination, courierId, trackingNo, bookedDate, expectedDate,
  deliveredDate, status, parcels, weightKg, codAmount, codSettled,
  bookingCharge, notes,
});

export const deliveries: Delivery[] = [
  d(1,  "DLV-26-0217", "INV-26-8867", 1,  "Mansoori Naya Abad",      "MN", "0300 2211887", "Naya Abad, Karachi",    1, "7841203355", "2026-08-11", "2026-08-13", null,         "OUT_FOR_DELIVERY", 2, 3.4,  2100,   false, 220, "Customer asked for evening delivery"),
  d(2,  "DLV-26-0216", "INV-26-8866", 2,  "Hafeez Center #28",       "HC", "0321 4455667", "Hafeez Center, Lahore", 2, "LP9930221844", "2026-08-10", "2026-08-13", null,       "IN_TRANSIT",       6, 14.2, 0,      false, 180, ""),
  d(3,  "DLV-26-0215", "INV-26-8865", 3,  "Saddar Mobile Plaza",     "SM", "0333 9988776", "Saddar, Karachi",       6, "—",          "2026-08-11", "2026-08-11", "2026-08-11", "DELIVERED",        1, 1.1,  0,      true,  0,   "Own rider — same day"),
  d(4,  "DLV-26-0214", "INV-26-8863", 4,  "Blue Area Distributors",  "BA", "0345 1122334", "Blue Area, Islamabad",  3, "MP44120988", "2026-08-09", "2026-08-14", null,         "IN_TRANSIT",       11, 28.6, 218000, false, 200, "Large consignment — 11 cartons"),
  d(5,  "DLV-26-0213", "INV-26-8861", 5,  "Cellular World KHI",      "CW", "0300 7766554", "Tariq Road, Karachi",   1, "7841203301", "2026-08-08", "2026-08-10", "2026-08-10", "DELIVERED",        3, 5.8,  56200,  true,  220, ""),
  d(6,  "DLV-26-0212", "INV-26-8859", 6,  "Faisal Mobile Mart",      "FM", "0311 2233445", "Gulshan, Karachi",      4, "TRX88201144",  "2026-08-08", "2026-08-10", "2026-08-10", "DELIVERED",      1, 0.9,  18400,  false, 165, "COD collected, awaiting settlement"),
  d(7,  "DLV-26-0211", "INV-26-8857", 7,  "Quetta Cellular",         "QC", "0322 5566778", "Jinnah Road, Quetta",   3, "MP44120901", "2026-08-06", "2026-08-12", null,         "FAILED",           2, 4.2,  34500,  false, 200, "Shop closed twice — courier reattempting"),
  d(8,  "DLV-26-0210", "INV-26-8855", 8,  "Mobile Zone Lahore",      "MZ", "0301 3344556", "Hall Road, Lahore",     2, "LP9930221790", "2026-08-05", "2026-08-08", null,       "RETURNED_TO_SENDER", 4, 9.1, 84500, false, 180, "Customer refused — payment dispute"),
  d(9,  "DLV-26-0209", "INV-26-8853", 9,  "Mobile Mart Multan",      "MM", "0334 6677889", "Hussain Agahi, Multan", 1, "7841203288", "2026-08-05", "2026-08-08", "2026-08-07", "DELIVERED",        2, 3.3,  38400,  true,  220, ""),
  d(10, "DLV-26-0208", "INV-26-8851", 10, "Rahim Yar Mobiles",       "RM", "0307 7788990", "RYK, Punjab",           4, "TRX88200987",  "2026-08-04", "2026-08-08", "2026-08-08", "DELIVERED",      1, 1.6,  12800,  true,  165, ""),
  d(11, "DLV-26-0207", "INV-26-8849", 11, "Star Communication",      "SC", "0345 8899001", "Korangi, Karachi",      6, "—",          "2026-08-12", "2026-08-12", null,         "BOOKED",           3, 6.4,  47200,  false, 0,   "Rider leaving at 3pm"),
  d(12, "DLV-26-0206", "INV-26-8847", 12, "Sukkur Mobile House",     "SH", "0300 9900112", "Sukkur, Sindh",         3, "MP44120855", "2026-08-12", "2026-08-16", null,         "BOOKED",           5, 11.8, 92400,  false, 200, ""),
];

export function getDelivery(id: number) {
  return deliveries.find((x) => x.id === id);
}

/** COD money the couriers are still holding. */
export function pendingCodTotal() {
  return deliveries
    .filter((x) => x.codAmount > 0 && !x.codSettled && x.status !== "RETURNED_TO_SENDER")
    .reduce((sum, x) => sum + x.codAmount, 0);
}

export function deliveriesInFlight() {
  return deliveries.filter(
    (x) => x.status === "BOOKED" || x.status === "IN_TRANSIT" || x.status === "OUT_FOR_DELIVERY"
  );
}
