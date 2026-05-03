"use client";

import Link from "next/link";
import { AlertTriangle, ShieldCheck, X, Eye } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { orders } from "@/data/sales";
import { formatMoney, formatDate } from "@/lib/format";

export default function CreditHoldsPage() {
  const holds = orders.filter((o) => o.status === "CREDIT_HOLD");

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Sales" }, { label: "Credit Holds" }]}
        title="Credit Holds Queue"
        subtitle={`${holds.length} order${holds.length === 1 ? "" : "s"} awaiting credit decision`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 bg-warning/5 border-warning/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-warning-dark dark:text-warning-light">Pending Action</div>
              <div className="text-2xl tabular font-bold text-warning mt-1">{holds.length}</div>
            </div>
            <AlertTriangle className="size-5 text-warning" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Total Value Held</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{formatMoney(holds.reduce((s, h) => s + h.total, 0))}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Affected Customers</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{new Set(holds.map((h) => h.customerId)).size}</div>
        </Card>
      </div>

      <div className="space-y-3">
        {holds.length === 0 ? (
          <Card>
            <CardBody>
              <div className="text-center py-12 text-slate-400">
                <ShieldCheck className="size-12 mx-auto mb-3 text-success" />
                <h3 className="text-base font-semibold text-navy-900 dark:text-white">No credit holds</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">All orders are within credit limits.</p>
              </div>
            </CardBody>
          </Card>
        ) : (
          holds.map((o) => (
            <Card key={o.id} className="border-warning/30 bg-warning/[0.02]">
              <CardBody>
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Avatar initials={o.customerInitials} size="lg" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/sales/orders/${o.id}`} className="text-base font-semibold text-navy-900 dark:text-white hover:text-brand-yellow-700 dark:hover:text-brand-yellow">
                          {o.orderNo}
                        </Link>
                        <Badge variant="warning">CREDIT HOLD</Badge>
                      </div>
                      <div className="text-sm text-slate-700 dark:text-slate-200 mt-0.5">{o.customerName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {o.customerType} · {o.branch} · {o.salesPerson} · {formatDate(o.orderDate)}
                      </div>
                      {o.creditHoldReason && (
                        <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-warning-dark dark:text-warning-light bg-warning/10 px-2.5 py-1 rounded">
                          <AlertTriangle className="size-3" />
                          {o.creditHoldReason}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Order Value</div>
                    <div className="text-xl tabular font-bold text-navy-900 dark:text-white">{formatMoney(o.total)}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="ghost" size="md" asChild>
                      <Link href={`/sales/orders/${o.id}`}>
                        <Eye />Review
                      </Link>
                    </Button>
                    <Button variant="secondary" size="md" className="gap-1.5">
                      <X />Cancel
                    </Button>
                    <Button variant="accent" size="md" className="gap-1.5">
                      <ShieldCheck />Override
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
