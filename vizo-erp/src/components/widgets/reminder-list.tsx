"use client";

import * as React from "react";
import Link from "next/link";
import { BellRing, ChevronRight, CheckCircle2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { remindersFor, type Reminder } from "@/data/reminders";
import { useSession } from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";

const DOT: Record<Reminder["severity"], string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  info: "bg-info",
};

const KIND_LABEL: Record<Reminder["kind"], string> = {
  "delivery-unconfirmed": "Delivery",
  "claim-unsent": "Claim",
  "claim-with-supplier": "Claim",
  "order-unpacked": "Order",
};

/**
 * The software chasing the staff. Everything here is derived from dates, so
 * finishing the work makes the row disappear — there is nothing to tick off
 * and nothing to go stale.
 */
export function ReminderList({ limit = 6 }: { limit?: number }) {
  const { role } = useSession();
  const items = React.useMemo(() => remindersFor(role), [role]);

  if (items.length === 0) {
    return (
      <Card>
        <CardBody className="flex items-center gap-3 py-5">
          <CheckCircle2 className="size-5 text-success flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-navy-900 dark:text-white">
              Nothing pending
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              No claims or deliveries are waiting on you.
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  const shown = items.slice(0, limit);

  return (
    <Card className="border-warning/40">
      <CardBody>
        <div className="flex items-center gap-2 mb-1">
          <BellRing className="size-4 text-warning" />
          <h2 className="text-base font-semibold text-navy-900 dark:text-white">
            Needs your attention
          </h2>
          <Badge variant="warning">{items.length}</Badge>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Oldest and most urgent first. These clear themselves once the work is done.
        </p>

        <div className="space-y-1.5">
          {shown.map((r) => (
            <Link
              key={r.id}
              href={r.href}
              className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 dark:border-navy-700 hover:border-brand-yellow/40 transition-colors group"
            >
              <span className={cn("size-2 rounded-full flex-shrink-0", DOT[r.severity])} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-navy-900 dark:text-white truncate">
                  {r.title}
                </div>
                <div className="text-2xs text-slate-500 dark:text-slate-400 truncate">
                  {r.detail}
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-end flex-shrink-0">
                <span className="text-2xs font-medium text-slate-500 dark:text-slate-400">
                  {KIND_LABEL[r.kind]}
                </span>
                <span className="tabular text-2xs text-slate-400">{r.ref}</span>
              </div>
              <ChevronRight className="size-4 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </Link>
          ))}
        </div>

        {items.length > shown.length && (
          <p className="text-2xs text-slate-500 dark:text-slate-400 mt-3 text-center">
            and {items.length - shown.length} more
          </p>
        )}
      </CardBody>
    </Card>
  );
}
