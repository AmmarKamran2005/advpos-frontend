/* GET /delivery -> { inFlight, overdue, pendingCodTotal, deliveredThisMonth,
   periodLabel, needAttention, awaitingSettlement, moneyHidden, mayHandleCod,
   mayBook, items }.

   These are the real "DeliveryStatus".StatusKey values. The database carries
   eight: NOT_DISPATCHED (nothing booked yet) and AWAITING (sent, nobody has
   confirmed) as well as the six a courier flow usually has. */
export type DeliveryStatus =
  | "NOT_DISPATCHED" | "BOOKED" | "AWAITING" | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY" | "DELIVERED" | "FAILED" | "RETURNED_TO_SENDER";

export type Delivery = {
  id: number;
  deliveryNo: string;
  orderId: number;
  orderNo: string;
  invoiceId: number | null;
  invoiceNo: string | null;
  customerId: number;
  customerName: string;
  customerInitials: string;
  customerPhone: string | null;
  destination: string;
  channelId: number;
  channel: string;
  channelName: string;
  confirmedByRoleId: number;
  confirmedByRole: string;
  remindAfterDays: number;
  requiresBilty: boolean;
  courierId: number | null;
  courierName: string | null;
  trackingNo: string | null;
  trackingUrlTemplate: string | null;
  bookedDate: string;
  expectedDate: string | null;
  deliveredDate: string | null;
  status: DeliveryStatus;
  statusName: string;
  isOpen: boolean;
  parcels: number;
  weightKg: number;
  /** Zero for the order desk, which sees no money -- read `collectsCash` instead. */
  codAmount: number;
  collectsCash: boolean;
  codSettled: boolean;
  bookingCharge: number;
  codFee: number;
  codSettledOn: string | null;
  codReceiptNo: string | null;
  codVoucherNo: string | null;
  remindersSent: number;
  confirmedBy: string | null;
  receivedBy: string | null;
  confirmedAt: string | null;
  salesPerson: string | null;
  notes: string | null;
  daysInFlight: number;
  isOverdue: boolean;
  needsReminder: boolean;
  /** The caller owns this delivery's channel (or is the Super Admin), and it is not delivered yet. */
  canConfirm: boolean;
  /** Super Admin / accountant, delivered, COD not yet settled. */
  canSettleCod: boolean;
};

export type DeliveryResponse = {
  inFlight: number;
  overdue: number;
  pendingCodTotal: number;
  deliveredThisMonth: number;
  periodLabel: string;
  needAttention: number;
  awaitingSettlement: number;
  moneyHidden: boolean;
  mayHandleCod: boolean;
  mayBook: boolean;
  items: Delivery[];
};

/** Every failure comes back as { message } -- show the wording the API chose. */
export function apiMessage(e: unknown, fallback: string): string {
  /* Imported lazily by type only: axios is already in every page bundle. */
  const err = e as { isAxiosError?: boolean; response?: { data?: { message?: string } } };
  if (err?.isAxiosError && err.response) return err.response.data?.message ?? fallback;
  return "Cannot reach the server.";
}
