"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { purchaseReturns, PR_STATUS_VARIANT } from "@/data/purchases";
import { formatMoney, formatDate } from "@/lib/format";

type Row = (typeof purchaseReturns)[number];

export default function PurchaseReturnsPage() {
  const columns: Column<Row>[] = [
    { key: "returnNo", header: "Return #", cell: (r) => <span className="tabular text-sm font-medium text-navy-900 dark:text-white">{r.returnNo}</span> },
    { key: "invoiceNo", header: "PI Ref",   cell: (r) => <span className="tabular text-xs text-slate-500 dark:text-slate-400">{r.invoiceNo}</span> },
    { key: "supplier", header: "Supplier",  cell: (r) => (
        <div className="flex items-center gap-2.5">
          <Avatar initials={r.initials} size="sm" />
          <span className="text-sm font-medium text-navy-900 dark:text-white">{r.supplier}</span>
        </div>
      )
    },
    { key: "date", header: "Date", cell: (r) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(r.date)}</span> },
    { key: "reason", header: "Reason", cell: (r) => <span className="text-sm text-slate-600 dark:text-slate-300">{r.reason}</span> },
    { key: "itemCount", header: "Items", align: "right", cell: (r) => <span className="tabular text-sm text-slate-600 dark:text-slate-300">{r.itemCount}</span> },
    { key: "totalAmount", header: "Amount", align: "right", cell: (r) => <span className="tabular text-sm font-semibold text-warning">{formatMoney(r.totalAmount)}</span> },
    { key: "status", header: "Status", cell: (r) => <StatusPill variant={PR_STATUS_VARIANT[r.status]}>{r.status}</StatusPill> },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Purchases" }, { label: "Purchase Returns" }]}
        title="Purchase Returns"
        subtitle="Debit notes to suppliers"
        actions={
          <Button variant="accent" size="md" className="gap-1.5" asChild>
            <Link href="/purchases/returns/new"><Plus /><span>New Return</span></Link>
          </Button>
        }
      />

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={purchaseReturns} rowHref={(r) => `/purchases/returns/${r.id}`} />
      </Card>
    </>
  );
}
