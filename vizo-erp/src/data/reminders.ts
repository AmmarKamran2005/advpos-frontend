/**
 * Reminders — the software chasing the staff, not the other way round.
 *
 * The owner's words: pending work and problems should sit on notifications and
 * reminders so the staff get nudged into finishing them. Nobody opens a screen
 * hoping to find a two-week-old claim.
 *
 * Reminders are DERIVED, never stored. A claim that has sat too long produces
 * a reminder because of its dates; settle it and the reminder disappears on
 * its own. Nothing to tick off, nothing to go stale.
 */

import { orders, type Order } from "./sales";
import { claims, type Claim } from "./claims";
import { getChannel, claimPolicy, type RoleKey } from "./settings";

export type ReminderKind =
  | "delivery-unconfirmed"
  | "claim-unsent"
  | "claim-with-supplier"
  | "order-unpacked";

export type Reminder = {
  id: string;
  kind: ReminderKind;
  /** How loud this should be. */
  severity: "info" | "warning" | "danger";
  title: string;
  detail: string;
  href: string;
  /** Days since the clock started. */
  ageDays: number;
  /** Roles that can actually do something about it. */
  owners: RoleKey[];
  /** Reference shown on the row. */
  ref: string;
};

/** The system's "today". A real build reads the clock; a mock must not. */
export const TODAY = "2026-08-15";

function daysSince(iso: string | null): number {
  if (!iso) return 0;
  return Math.round(
    (new Date(TODAY).getTime() - new Date(iso).getTime()) / 86400000
  );
}

/* ─────────────────── delivery not confirmed ─────────────────── */

function deliveryReminders(): Reminder[] {
  return orders
    .filter((o) => o.deliveryState === "AWAITING" || o.deliveryState === "ON_THE_WAY")
    .flatMap((o: Order) => {
      const channel = getChannel(o.channel);
      if (!channel || !o.dispatchedOn) return [];

      const age = daysSince(o.dispatchedOn);
      if (age < channel.remindAfterDays) return [];

      const owners: RoleKey[] =
        channel.confirmedBy === "sales-rep"
          ? ["sales", "super-admin"]
          : ["order-dept", "super-admin"];

      const overdue = o.dueOn ? daysSince(o.dueOn) : 0;

      return [{
        id: `dlv-${o.id}`,
        kind: "delivery-unconfirmed" as const,
        severity: overdue > 2 ? ("danger" as const) : ("warning" as const),
        title: `${o.customerName} — did it arrive?`,
        detail:
          overdue > 0
            ? `${channel.name} · ${overdue} ${overdue === 1 ? "day" : "days"} past the expected date`
            : `${channel.name} · sent ${age} ${age === 1 ? "day" : "days"} ago`,
        href: `/sales/orders/${o.id}`,
        ageDays: age,
        owners,
        ref: o.orderNo,
      }];
    });
}

/* ─────────────────── claims sitting on the shelf ─────────────────── */

function claimUnsentReminders(): Reminder[] {
  return claims
    .filter((c) => c.stage === "RECEIVED")
    .flatMap((c: Claim) => {
      const age = daysSince(c.receivedOn);
      if (age < claimPolicy.remindUnsentAfterDays) return [];

      return [{
        id: `clm-in-${c.id}`,
        kind: "claim-unsent" as const,
        severity: age > 7 ? ("danger" as const) : ("warning" as const),
        title: `${c.qty} × ${c.productName} still on the claim shelf`,
        detail: `From ${c.customerName} · ${age} days in claim stock, not sent to the supplier yet`,
        href: `/claims/${c.id}`,
        ageDays: age,
        owners: ["order-dept", "super-admin"],
        ref: c.claimNo,
      }];
    });
}

function claimWithSupplierReminders(): Reminder[] {
  return claims
    .filter((c) => c.stage === "SENT")
    .flatMap((c: Claim) => {
      const age = daysSince(c.sentOn);
      if (age < claimPolicy.remindSupplierAfterDays) return [];

      return [{
        id: `clm-out-${c.id}`,
        kind: "claim-with-supplier" as const,
        severity: age > 30 ? ("danger" as const) : ("warning" as const),
        title: `${c.supplierName} has not settled this claim`,
        detail: `${c.qty} × ${c.productName} · sent ${age} days ago · asked ${c.remindersSent} times`,
        href: `/claims/${c.id}`,
        ageDays: age,
        owners: ["order-dept", "super-admin"],
        ref: c.claimNo,
      }];
    });
}

/* ─────────────────── orders waiting to be packed ─────────────────── */

function unpackedOrderReminders(): Reminder[] {
  return orders
    .filter((o) => ["SUBMITTED", "CONFIRMED"].includes(o.status))
    .flatMap((o) => {
      const age = daysSince(o.orderDate);
      if (age < 1) return [];

      return [{
        id: `ord-${o.id}`,
        kind: "order-unpacked" as const,
        severity: age > 2 ? ("danger" as const) : ("info" as const),
        title: `${o.customerName}'s order is still not packed`,
        detail: `Taken ${age} ${age === 1 ? "day" : "days"} ago by ${o.salesPerson}`,
        href: `/sales/orders/${o.id}`,
        ageDays: age,
        owners: ["order-dept", "super-admin"],
        ref: o.orderNo,
      }];
    });
}

/* ─────────────────── the whole list ─────────────────── */

const SEVERITY_ORDER = { danger: 0, warning: 1, info: 2 } as const;

export function allReminders(): Reminder[] {
  return [
    ...deliveryReminders(),
    ...claimUnsentReminders(),
    ...claimWithSupplierReminders(),
    ...unpackedOrderReminders(),
  ].sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      b.ageDays - a.ageDays
  );
}

/** What this role is expected to act on. */
export function remindersFor(role: RoleKey): Reminder[] {
  return allReminders().filter((r) => r.owners.includes(role));
}

export function countBySeverity(list: Reminder[]) {
  return {
    danger: list.filter((r) => r.severity === "danger").length,
    warning: list.filter((r) => r.severity === "warning").length,
    info: list.filter((r) => r.severity === "info").length,
  };
}
