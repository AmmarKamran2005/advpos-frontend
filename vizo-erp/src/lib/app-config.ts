/**
 * Configuration and types that CLIENT COMPONENTS are allowed to import.
 *
 * `@/data/settings.ts` is 767 lines of seed data with a handful of genuine
 * config constants scattered through it. A client component that reaches in
 * for one of those constants ships the whole file to the browser — AGENTS.md
 * rule 5, "keep data modules out of client components once the API exists".
 *
 * The constants below are not business data. They are shape: the four delivery
 * channels this company actually operates, and the role keys the JWT can
 * carry. Both are decided by how the business is organised, not by a row in a
 * table, so they belong in the bundle. Everything else stays behind the API.
 *
 * `@/data/settings` re-exports these rather than declaring its own copies, so
 * there is exactly one definition of each.
 */

/* ─────────────────────────────── Roles ─────────────────────────────── */

/**
 * The staff roles. Mirrors "Role".RoleKey in the database.
 *
 * warehouse-keeper is role id 9, added with the order workflow: the person who
 * picks the stock off the shelf once the owner has confirmed an order and sends
 * it to the order department. See backend/database/15_order_workflow.sql.
 */
export type RoleKey =
  | "super-admin"
  | "accountant"
  | "order-dept"
  | "sales"
  | "warehouse-keeper";

/* ────────────────────────── Delivery channels ────────────────────────── */

export type ChannelKey = "local" | "online" | "cargo" | "logistics";

/** Who is allowed to mark this channel delivered. */
export type ConfirmedBy =
  | "sales-rep"      // the rep who owns the order -- he handed it over himself
  | "order-dept"     // back office
  | "cargo-handler"; // the person in Karachi who chases cargo

export type DeliveryChannel = {
  key: ChannelKey;
  name: string;
  description: string;
  confirmedBy: ConfirmedBy;
  /** Courier/transporter names offered for this channel. */
  carriers: string[];
  /** Wait this long after dispatch before the first reminder. */
  remindAfterDays: number;
  /** Then ask again this often until someone answers. */
  remindEveryHours: number;
  /** Mark delivered from the carrier's own system. Needs a backend. */
  autoConfirm: boolean;
  /** Consignment note number is required (bilty for freight). */
  requiresBilty: boolean;
  isActive: boolean;
};

/**
 * Nobody watches a screen waiting to confirm a delivery, so the system has to
 * come back and ask. `remindAfterDays` is how long to wait before the first
 * nudge — a Karachi hand-delivery is same-day, a truck to Lahore is not — and
 * `remindEveryHours` is how often to ask again until someone answers.
 */
export const deliveryChannels: DeliveryChannel[] = [
  {
    key: "local",
    name: "Karachi — own team",
    description: "Karachi stock handed to the city's own sales rep, delivered by hand.",
    confirmedBy: "sales-rep",
    carriers: ["Own rider", "Sales rep"],
    remindAfterDays: 0,
    remindEveryHours: 6,
    autoConfirm: false,
    requiresBilty: false,
    isActive: true,
  },
  {
    key: "online",
    name: "Online courier",
    description: "Booked with a courier that has its own tracking portal.",
    confirmedBy: "order-dept",
    carriers: ["PostEx", "TCS Courier", "Leopards Courier", "M&P Express", "Trax Logistics"],
    remindAfterDays: 2,
    remindEveryHours: 24,
    /* The courier's portal exists but has never been used. Manual until the
       backend can read it — then this becomes a single switch. */
    autoConfirm: false,
    requiresBilty: false,
    isActive: true,
  },
  {
    key: "cargo",
    name: "Local cargo",
    description: "Goods transport companies. Confirmed by phone with the customer.",
    confirmedBy: "cargo-handler",
    carriers: ["Pak International Cargo", "Rehman Cargo", "Mehran Railway Cargo"],
    remindAfterDays: 2,
    remindEveryHours: 24,
    autoConfirm: false,
    requiresBilty: true,
    isActive: true,
  },
  {
    key: "logistics",
    name: "Heavy — logistics",
    description: "Bulk consignments by freight. The bilty receipt is the proof.",
    confirmedBy: "cargo-handler",
    carriers: ["Pak International Cargo", "NLC", "Daewoo Cargo"],
    /* Deliberately manual: freight has no tracking feed to read, and these are
       the highest-value consignments — a guessed "delivered" is worst here. */
    remindAfterDays: 4,
    remindEveryHours: 24,
    autoConfirm: false,
    requiresBilty: true,
    isActive: true,
  },
];

export function getChannel(key: ChannelKey) {
  return deliveryChannels.find((c) => c.key === key);
}

export const activeChannels = () => deliveryChannels.filter((c) => c.isActive);
