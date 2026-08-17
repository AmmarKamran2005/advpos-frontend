"use client";

import * as React from "react";
import { HandCoins, Clock } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/badge";
import { RecordCollectionDialog } from "@/components/dialogs";
import { collectionsFor, COLLECTION_STATUS_VARIANT, COLLECTION_METHOD_LABEL } from "@/data/collections";
import type { Order } from "@/data/sales";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** What has been paid on this order, and a way to log more. */
export function OrderPaymentCard({ order }: { order: Order }) {
  const [collecting, setCollecting] = React.useState(false);

  const balance = order.total - order.paidAmount;
  const pct = order.total > 0 ? Math.min(100, Math.round((order.paidAmount / order.total) * 100)) : 0;

  const related = collectionsFor(order.customerId).filter((c) =>
    c.against.includes(order.orderNo)
  );

  return (
    <>
      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Payment</h3>
            <StatusPill
              variant={balance === 0 ? "success" : order.paidAmount > 0 ? "warning" : "muted"}
            >
              {balance === 0 ? "Paid" : order.paidAmount > 0 ? "Part paid" : "Unpaid"}
            </StatusPill>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                Received
              </div>
              <div className="tabular text-base font-bold text-success mt-0.5">
                {formatMoney(order.paidAmount)}
              </div>
            </div>
            <div>
              <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                Still due
              </div>
              <div
                className={cn(
                  "tabular text-base font-bold mt-0.5",
                  balance === 0 ? "text-success" : "text-navy-900 dark:text-white"
                )}
              >
                {formatMoney(balance)}
              </div>
            </div>
          </div>

          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-navy-800 overflow-hidden">
            <div
              className={cn("h-full rounded-full", balance === 0 ? "bg-success" : "bg-brand-yellow")}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-2xs text-slate-500 dark:text-slate-400 mt-1.5 tabular">
            {pct}% of {formatMoney(order.total)}
          </div>

          {related.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-navy-800 space-y-2">
              <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                Receipts
              </div>
              {related.map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="text-navy-900 dark:text-white">
                      {COLLECTION_METHOD_LABEL[c.method]}
                      {c.reference !== "—" && <span className="tabular text-slate-500"> · {c.reference}</span>}
                    </div>
                    <div className="text-2xs text-slate-500 dark:text-slate-400">
                      {formatDate(c.collectedOn)} · {c.collectedBy}
                    </div>
                  </div>
                  <span className="tabular font-semibold text-navy-900 dark:text-white">
                    {formatMoney(c.amount)}
                  </span>
                  <StatusPill variant={COLLECTION_STATUS_VARIANT[c.status]}>
                    {c.status === "AWAITING" ? "pending" : c.status === "CONFIRMED" ? "cleared" : "bounced"}
                  </StatusPill>
                </div>
              ))}
              {related.some((c) => c.status === "AWAITING") && (
                <p className="flex items-start gap-1.5 text-2xs text-slate-500 dark:text-slate-400">
                  <Clock className="size-3 flex-shrink-0 mt-0.5" />
                  Pending receipts do not change the balance until Accounts confirms them.
                </p>
              )}
            </div>
          )}

          {balance > 0 && order.status !== "CANCELLED" && (
            <Button
              variant="accent"
              size="md"
              className="w-full justify-center gap-1.5 mt-4"
              onClick={() => setCollecting(true)}
            >
              <HandCoins /> Record Payment
            </Button>
          )}
        </CardBody>
      </Card>

      <RecordCollectionDialog
        open={collecting}
        onOpenChange={setCollecting}
        customerName={order.customerName}
        outstanding={balance}
        openOrders={[{ orderNo: order.orderNo, balance }]}
        defaultOrderNo={order.orderNo}
      />
    </>
  );
}
