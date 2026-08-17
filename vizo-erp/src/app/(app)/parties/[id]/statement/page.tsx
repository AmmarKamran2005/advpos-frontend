"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, Printer, MessageCircle, HandCoins, AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RecordCollectionDialog, WhatsAppShareDialog } from "@/components/dialogs";
import { toast } from "@/components/ui/toaster";
import { getParty } from "@/data/parties";
import { orders } from "@/data/sales";
import { collectionsFor } from "@/data/collections";
import { company } from "@/data/settings";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Line = {
  date: string;
  ref: string;
  detail: string;
  debit: number;
  credit: number;
};

/** Age buckets the way a collections round actually works. */
const BUCKETS = [
  { label: "0–30 days", from: 0, to: 30 },
  { label: "31–60 days", from: 31, to: 60 },
  { label: "61–90 days", from: 61, to: 90 },
  { label: "90+ days", from: 91, to: 99999 },
];

const TODAY = new Date("2026-08-15");

function daysOld(iso: string) {
  return Math.round((TODAY.getTime() - new Date(iso).getTime()) / 86400000);
}

export default function CustomerStatementPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "1", 10);
  const party = getParty(id);

  const [collecting, setCollecting] = React.useState(false);
  const [sharing, setSharing] = React.useState(false);

  if (!party) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Customer not found"
        action={<Button asChild><Link href="/parties/customers">Back</Link></Button>}
      />
    );
  }

  /* Invoices out, money in — one running list. */
  const theirOrders = orders.filter(
    (o) => o.customerId === id && o.status !== "DRAFT" && o.status !== "CANCELLED"
  );
  const theirCollections = collectionsFor(id).filter((c) => c.status === "CONFIRMED");

  const opening = 0;

  const lines: Line[] = [
    ...theirOrders.map((o) => ({
      date: o.orderDate,
      ref: o.orderNo,
      detail: `Goods supplied — ${o.itemCount} items`,
      debit: o.total,
      credit: 0,
    })),
    ...theirCollections.map((c) => ({
      date: c.collectedOn,
      ref: c.receiptNo,
      detail: `Payment received — ${c.method.toLowerCase()}${c.reference !== "—" ? ` ${c.reference}` : ""}`,
      debit: 0,
      credit: c.amount,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  /* Running balance, computed without mutating anything mid-render. */
  const withBalance = lines.map((l, i) => ({
    ...l,
    balance: lines
      .slice(0, i + 1)
      .reduce((sum, x) => sum + x.debit - x.credit, opening),
  }));

  const closing = withBalance.length > 0 ? withBalance[withBalance.length - 1].balance : opening;
  const pending = collectionsFor(id).filter((c) => c.status === "AWAITING");

  /* The two dates the shopkeeper is actually asked about on the phone. */
  const lastPayment = theirCollections.length > 0
    ? theirCollections[theirCollections.length - 1].collectedOn
    : null;
  const lastOrder = theirOrders.length > 0
    ? theirOrders[theirOrders.length - 1].orderDate
    : null;
  const sincePayment = lastPayment ? daysOld(lastPayment) : null;

  /* Aging works off unpaid orders, not the running balance. */
  const unpaid = theirOrders.filter((o) => o.total - o.paidAmount > 0);
  const buckets = BUCKETS.map((b) => ({
    ...b,
    amount: unpaid
      .filter((o) => {
        const d = daysOld(o.orderDate);
        return d >= b.from && d <= b.to;
      })
      .reduce((sum, o) => sum + (o.total - o.paidAmount), 0),
  }));

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "People" },
          { label: "Customers", href: "/parties/customers" },
          { label: party.displayName, href: `/parties/${id}` },
          { label: "Statement" },
        ]}
        title="Statement of Account"
        subtitle={`${party.displayName} · ${party.partyCode}`}
        actions={
          <>
            <Button variant="ghost" size="md" className="gap-1.5" asChild>
              <Link href={`/parties/${id}`}><ArrowLeft /> Back</Link>
            </Button>
            <Button variant="ghost" size="md" className="gap-1.5"
              onClick={() => { window.print(); toast.info("Print dialog opened"); }}>
              <Printer /><span className="hidden sm:inline">Print / Save PDF</span>
            </Button>
            <Button variant="secondary" size="md" className="gap-1.5" onClick={() => setSharing(true)}>
              <MessageCircle /><span className="hidden sm:inline">WhatsApp</span>
            </Button>
            {closing > 0 && (
              <Button variant="accent" size="md" className="gap-1.5" onClick={() => setCollecting(true)}>
                <HandCoins /> Record Payment
              </Button>
            )}
          </>
        }
      />

      <Card className="max-w-5xl mx-auto">
        <CardBody className="p-6 sm:p-10">
          {/* Letterhead */}
          <div className="flex items-start justify-between gap-6 pb-5 border-b border-slate-200 dark:border-navy-700">
            <div>
              <div className="text-lg font-bold text-navy-900 dark:text-white">{company.name}</div>
              <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 space-y-0.5">
                <div>{company.addressLine}, {company.city}</div>
                <div className="tabular">{company.phone}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold tracking-tight text-navy-900 dark:text-white">
                STATEMENT
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                as of {formatDate("2026-08-15")}
              </div>
            </div>
          </div>

          {/* Who */}
          <div className="grid sm:grid-cols-2 gap-6 py-5 border-b border-slate-200 dark:border-navy-700">
            <div>
              <div className="text-2xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Account of
              </div>
              <div className="text-base font-semibold text-navy-900 dark:text-white">
                {party.legalName}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                <span className="tabular">{party.partyCode}</span> · {party.city}
              </div>
              <div className="tabular text-xs text-slate-600 dark:text-slate-300">{party.phone}</div>
            </div>
            <div className="sm:text-right">
              <div className="text-2xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Balance due
              </div>
              <div
                className={cn(
                  "tabular text-3xl font-bold",
                  closing > 0 ? "text-danger" : "text-success"
                )}
              >
                {formatMoney(closing)}
              </div>
              {pending.length > 0 && (
                <div className="text-2xs text-warning mt-1">
                  {formatMoney(pending.reduce((s, c) => s + c.amount, 0))} received, awaiting confirmation
                </div>
              )}
              <dl className="mt-3 space-y-0.5 text-2xs text-slate-600 dark:text-slate-300">
                <div className="sm:justify-end flex gap-2">
                  <dt className="text-slate-500 dark:text-slate-400">Last order</dt>
                  <dd className="tabular">{lastOrder ? formatDate(lastOrder) : "—"}</dd>
                </div>
                <div className="sm:justify-end flex gap-2">
                  <dt className="text-slate-500 dark:text-slate-400">Last payment</dt>
                  <dd className="tabular">
                    {lastPayment ? formatDate(lastPayment) : "—"}
                    {sincePayment !== null && sincePayment > 0 && (
                      <span className={cn("ml-1", sincePayment > 45 ? "text-danger" : "text-slate-500")}>
                        ({sincePayment} days ago)
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Running account */}
          <div className="py-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-navy-900 dark:border-brand-yellow">
                  <th className="text-left text-2xs uppercase font-bold tracking-wider text-navy-900 dark:text-white px-2 py-2">Date</th>
                  <th className="text-left text-2xs uppercase font-bold tracking-wider text-navy-900 dark:text-white px-2 py-2">Reference</th>
                  <th className="text-left text-2xs uppercase font-bold tracking-wider text-navy-900 dark:text-white px-2 py-2">Detail</th>
                  <th className="text-right text-2xs uppercase font-bold tracking-wider text-navy-900 dark:text-white px-2 py-2">Charged</th>
                  <th className="text-right text-2xs uppercase font-bold tracking-wider text-navy-900 dark:text-white px-2 py-2">Paid</th>
                  <th className="text-right text-2xs uppercase font-bold tracking-wider text-navy-900 dark:text-white px-2 py-2">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-800">
                <tr>
                  <td className="px-2 py-2 tabular text-xs text-slate-500">—</td>
                  <td className="px-2 py-2 text-xs text-slate-500">—</td>
                  <td className="px-2 py-2 text-xs text-slate-600 dark:text-slate-300 italic">Opening balance</td>
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2 text-right tabular text-xs text-slate-600 dark:text-slate-300">
                    {formatMoney(opening)}
                  </td>
                </tr>
                {withBalance.map((l, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-navy-800/50">
                    <td className="px-2 py-2 tabular text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {formatDate(l.date)}
                    </td>
                    <td className="px-2 py-2 tabular text-xs text-navy-900 dark:text-white whitespace-nowrap">
                      {l.ref}
                    </td>
                    <td className="px-2 py-2 text-xs text-slate-600 dark:text-slate-300">{l.detail}</td>
                    <td className="px-2 py-2 text-right tabular text-xs text-navy-900 dark:text-white">
                      {l.debit > 0 ? formatMoney(l.debit) : "—"}
                    </td>
                    <td className="px-2 py-2 text-right tabular text-xs text-success">
                      {l.credit > 0 ? formatMoney(l.credit) : "—"}
                    </td>
                    <td className="px-2 py-2 text-right tabular text-xs font-semibold text-navy-900 dark:text-white">
                      {formatMoney(l.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-navy-900 dark:border-brand-yellow">
                  <td colSpan={5} className="px-2 py-3 text-right text-sm font-bold text-navy-900 dark:text-white">
                    Closing balance
                  </td>
                  <td className="px-2 py-3 text-right tabular text-base font-bold text-navy-900 dark:text-white">
                    {formatMoney(closing)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* How old the money is */}
          <div className="pt-5 border-t border-slate-200 dark:border-navy-700">
            <div className="text-2xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              How long it has been outstanding
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {buckets.map((b) => (
                <div
                  key={b.label}
                  className={cn(
                    "rounded-lg border p-3",
                    b.from >= 61 && b.amount > 0
                      ? "border-danger/40 bg-danger/5"
                      : "border-slate-200 dark:border-navy-700"
                  )}
                >
                  <div className="text-2xs text-slate-500 dark:text-slate-400">{b.label}</div>
                  <div
                    className={cn(
                      "tabular text-base font-bold mt-0.5",
                      b.from >= 61 && b.amount > 0 ? "text-danger" : "text-navy-900 dark:text-white"
                    )}
                  >
                    {formatMoney(b.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-6 text-2xs text-slate-400 dark:text-slate-500 text-center">
            Please quote the reference number when paying. {company.phone}
          </p>
        </CardBody>
      </Card>

      <RecordCollectionDialog
        open={collecting}
        onOpenChange={setCollecting}
        customerName={party.displayName}
        customerCode={party.partyCode}
        outstanding={closing}
        openOrders={unpaid.map((o) => ({ orderNo: o.orderNo, balance: o.total - o.paidAmount }))}
      />

      <WhatsAppShareDialog
        open={sharing}
        onOpenChange={setSharing}
        docNo={`Statement — ${formatDate("2026-08-15")}`}
        docLabel="Statement"
        customerName={party.displayName}
        customerPhone={party.phone}
        total={closing}
        note={[
          lastOrder ? `Last order: ${formatDate(lastOrder)}` : null,
          lastPayment ? `Last payment: ${formatDate(lastPayment)}` : "No payment received yet",
          "",
          sincePayment !== null && sincePayment > 0 && closing > 0
            ? `Aap ki aakhri adaigi ko ${sincePayment} din ho gaye hain. Baraye meharbani adaigi karwa dein.`
            : closing > 0
              ? "Baraye meharbani adaigi karwa dein."
              : "Shukriya — aap ka hisaab clear hai.",
          buckets[3].amount > 0
            ? `${formatMoney(buckets[3].amount)} 90 din se zyada purana hai.`
            : null,
        ].filter(Boolean).join("\n")}
      />

    </>
  );
}
