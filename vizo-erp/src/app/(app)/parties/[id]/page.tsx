"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Phone,
  Mail,
  MapPin,
  Edit3,
  MoreHorizontal,
  Shield,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Building,
  CreditCard,
  AlertCircle,
  FileText,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";
import { getParty } from "@/data/parties";
import { formatCompact, formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/labels";

/* Mock per-party transactions */
const mockOrders = [
  { id: 1, orderNo: "ORD-26-0142", date: "2026-04-30", amount: 145000, status: "Dispatched",  variant: "success" as const },
  { id: 2, orderNo: "ORD-26-0128", date: "2026-04-22", amount: 88000,  status: "Delivered",   variant: "success" as const },
  { id: 3, orderNo: "ORD-26-0114", date: "2026-04-15", amount: 215500, status: "Delivered",   variant: "success" as const },
  { id: 4, orderNo: "ORD-26-0098", date: "2026-04-08", amount: 64200,  status: "Delivered",   variant: "success" as const },
];

const mockInvoices = [
  { id: 1, invoiceNo: "INV-26-0142", date: "2026-04-30", dueDate: "2026-05-30", amount: 145000, paid: 0,      status: "Unpaid",   variant: "warning" as const },
  { id: 2, invoiceNo: "INV-26-0128", date: "2026-04-22", dueDate: "2026-05-22", amount: 88000,  paid: 88000,  status: "Paid",     variant: "success" as const },
  { id: 3, invoiceNo: "INV-26-0114", date: "2026-04-15", dueDate: "2026-05-15", amount: 215500, paid: 100000, status: "Partial",  variant: "info" as const },
  { id: 4, invoiceNo: "INV-26-0098", date: "2026-04-08", dueDate: "2026-05-08", amount: 64200,  paid: 64200,  status: "Paid",     variant: "success" as const },
];

const mockLedger = [
  { id: 1, date: "2026-04-30", reference: "INV-26-0142", description: "Sales Invoice",      debit: 145000, credit: 0,      balance: 245000 },
  { id: 2, date: "2026-04-25", reference: "VCH-26-0089", description: "Bank Receipt",       debit: 0,      credit: 100000, balance: 100000 },
  { id: 3, date: "2026-04-22", reference: "INV-26-0128", description: "Sales Invoice",      debit: 88000,  credit: 0,      balance: 200000 },
  { id: 4, date: "2026-04-22", reference: "VCH-26-0085", description: "Cash Receipt",       debit: 0,      credit: 88000,  balance: 112000 },
  { id: 5, date: "2026-04-15", reference: "INV-26-0114", description: "Sales Invoice",      debit: 215500, credit: 0,      balance: 200000 },
];

const mockVisits = [
  { id: 1, date: "2026-04-29", time: "11:30 AM", salesPerson: "Sara Khan",  outcome: "Order Placed",   variant: "success" as const, notes: "Discussed bulk discount on PowerX line" },
  { id: 2, date: "2026-04-22", time: "10:15 AM", salesPerson: "Sara Khan",  outcome: "Order Placed",   variant: "success" as const, notes: "Repeat order for Titan T9" },
  { id: 3, date: "2026-04-15", time: "02:00 PM", salesPerson: "Sara Khan",  outcome: "Followup",       variant: "info" as const,    notes: "Will confirm next week" },
];

export default function PartyDetailPage() {
  const params = useParams<{ id: string }>();
  const partyId = parseInt(params.id ?? "1", 10);
  const party = getParty(partyId);

  if (!party) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Party not found"
        description="The party you are looking for does not exist or has been deleted."
        action={
          <Button variant="accent" asChild>
            <Link href="/parties">Back to Parties</Link>
          </Button>
        }
      />
    );
  }

  const overLimit = party.creditLimit > 0 && party.currentBalance > party.creditLimit;
  const utilPct = party.creditLimit > 0 ? (party.currentBalance / party.creditLimit) * 100 : 0;

  const orderColumns: Column<(typeof mockOrders)[number]>[] = [
    { key: "orderNo", header: "Order #", cell: (o) => <span className="tabular text-sm font-medium text-navy-900 dark:text-white">{o.orderNo}</span> },
    { key: "date",    header: "Date",    cell: (o) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(o.date)}</span> },
    { key: "amount",  header: "Amount",  align: "right", cell: (o) => <span className="tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(o.amount)}</span> },
    { key: "status",  header: "Status",  cell: (o) => <StatusPill variant={o.variant}>{statusLabel(o.status)}</StatusPill> },
  ];

  const invoiceColumns: Column<(typeof mockInvoices)[number]>[] = [
    { key: "invoiceNo", header: "Invoice #", cell: (i) => <span className="tabular text-sm font-medium text-navy-900 dark:text-white">{i.invoiceNo}</span> },
    { key: "date",      header: "Date",      cell: (i) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(i.date)}</span> },
    { key: "dueDate",   header: "Due",       cell: (i) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(i.dueDate)}</span> },
    { key: "amount",    header: "Amount",    align: "right", cell: (i) => <span className="tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(i.amount)}</span> },
    { key: "paid",      header: "Paid",      align: "right", cell: (i) => <span className="tabular text-sm text-success">{formatMoney(i.paid)}</span> },
    { key: "balance",   header: "Balance",   align: "right", cell: (i) => <span className="tabular text-sm font-semibold text-warning">{formatMoney(i.amount - i.paid)}</span> },
    { key: "status",    header: "Status",    cell: (i) => <StatusPill variant={i.variant}>{statusLabel(i.status)}</StatusPill> },
  ];

  const ledgerColumns: Column<(typeof mockLedger)[number]>[] = [
    { key: "date",        header: "Date",        cell: (l) => <span className="text-xs text-slate-600 dark:text-slate-300">{formatDate(l.date)}</span> },
    { key: "reference",   header: "Reference",   cell: (l) => <span className="tabular text-xs font-medium text-navy-900 dark:text-white">{l.reference}</span> },
    { key: "description", header: "Description", cell: (l) => <span className="text-sm text-slate-600 dark:text-slate-300">{l.description}</span> },
    { key: "debit",       header: "Debit",       align: "right", cell: (l) => l.debit > 0 ? <span className="tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(l.debit)}</span> : <span className="text-slate-300">—</span> },
    { key: "credit",      header: "Credit",      align: "right", cell: (l) => l.credit > 0 ? <span className="tabular text-sm font-semibold text-success">{formatMoney(l.credit)}</span> : <span className="text-slate-300">—</span> },
    { key: "balance",     header: "Balance",     align: "right", cell: (l) => <span className="tabular text-sm font-bold text-navy-900 dark:text-white">{formatMoney(l.balance)}</span> },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Parties", href: "/parties" },
          { label: party.type === "SUPPLIER" ? "Suppliers" : "Customers", href: party.type === "SUPPLIER" ? "/parties/suppliers" : "/parties/customers" },
          { label: party.legalName },
        ]}
        title={
          <div className="flex items-center gap-3">
            <Avatar initials={party.initials} size="xl" />
            <div className="min-w-0">
              <div>{party.legalName}</div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-slate-500 dark:text-slate-400 tabular">{party.partyCode}</span>
                <Badge variant={party.type === "BOTH" ? "accent" : party.type === "SUPPLIER" ? "warning" : "info"}>
                  {party.type === "BOTH" ? "Customer & Supplier" : party.type === "SUPPLIER" ? "Supplier" : "Customer"}
                </Badge>
                <span className="text-xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">{party.category}</span>
                {party.isActive ? <StatusPill variant="success">Active</StatusPill> : <StatusPill variant="muted">Inactive</StatusPill>}
              </div>
            </div>
          </div>
        }
        actions={
          <>
            <Button variant="ghost" size="md" className="gap-1.5" asChild>
              <Link href={`/parties/${party.id}/statement`}>
                <FileText />
                <span className="hidden sm:inline">Statement</span>
              </Link>
            </Button>
            <Button variant="secondary" size="md" className="gap-1.5" asChild>
              <Link href={`/parties/new?id=${party.id}`}>
                <Edit3 />
                <span className="hidden sm:inline">Edit</span>
              </Link>
            </Button>
            <Button variant="accent" size="md" className="gap-1.5" asChild>
              <Link href={`/sales/orders/new?customerId=${party.id}`}>
                <ArrowRight />
                <span>New Order</span>
              </Link>
            </Button>
            <Button variant="ghost" size="icon">
              <MoreHorizontal />
            </Button>
          </>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            {party.type === "SUPPLIER" ? "Payable Balance" : "Outstanding"}
          </div>
          <div className={cn(
            "text-2xl tabular font-bold mt-1",
            overLimit ? "text-danger" : "text-navy-900 dark:text-white"
          )}>
            {formatCompact(party.type === "SUPPLIER" ? party.payableBalance : party.currentBalance, false)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {party.type === "SUPPLIER" ? "We owe supplier" : "Customer owes us"}
          </div>
        </Card>

        {party.type !== "SUPPLIER" && party.creditLimit > 0 && (
          <Card className="p-4">
            <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
              Credit Utilization
            </div>
            <div className={cn(
              "text-2xl tabular font-bold mt-1",
              overLimit ? "text-danger" : utilPct > 80 ? "text-warning" : "text-success"
            )}>
              {Math.round(utilPct)}%
            </div>
            <div className="mt-1.5 h-1.5 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full",
                  overLimit ? "bg-danger" : utilPct > 80 ? "bg-warning" : "bg-success"
                )}
                style={{ width: `${Math.min(utilPct, 100)}%` }}
              />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              Limit {formatCompact(party.creditLimit, false)} · NET {party.creditDays}
            </div>
          </Card>
        )}

        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            Total Orders (LTM)
          </div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">42</div>
          <div className="text-xs text-success font-semibold mt-1 inline-flex items-center gap-1">
            <TrendingUp className="size-3" /> +18% vs last year
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            Lifetime Revenue
          </div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">
            {formatCompact(8420000)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Since {formatDate(party.createdAt)}</div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full sm:w-auto overflow-x-auto scrollbar-thin flex-nowrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          {party.type !== "SUPPLIER" && <TabsTrigger value="visits">Visits</TabsTrigger>}
          {party.type !== "SUPPLIER" && <TabsTrigger value="credit">Credit</TabsTrigger>}
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Contact Info */}
            <Card className="lg:col-span-2">
              <CardBody>
                <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Contact Information</h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <dt className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Phone</dt>
                    <dd className="text-sm text-navy-900 dark:text-white mt-1 inline-flex items-center gap-2">
                      <Phone className="size-3.5 text-slate-400" />
                      {party.phone}
                    </dd>
                  </div>
                  {party.email && (
                    <div>
                      <dt className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Email</dt>
                      <dd className="text-sm text-navy-900 dark:text-white mt-1 inline-flex items-center gap-2">
                        <Mail className="size-3.5 text-slate-400" />
                        {party.email}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">City</dt>
                    <dd className="text-sm text-navy-900 dark:text-white mt-1 inline-flex items-center gap-2">
                      <MapPin className="size-3.5 text-slate-400" />
                      {party.city}, {party.province}
                    </dd>
                  </div>
                  {party.ntn && (
                    <div>
                      <dt className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">NTN</dt>
                      <dd className="text-sm tabular text-navy-900 dark:text-white mt-1">{party.ntn}</dd>
                    </div>
                  )}
                  {party.salesPerson && (
                    <div>
                      <dt className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Sales Rep</dt>
                      <dd className="text-sm text-navy-900 dark:text-white mt-1">{party.salesPerson}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Customer Since</dt>
                    <dd className="text-sm text-navy-900 dark:text-white mt-1 inline-flex items-center gap-2">
                      <Calendar className="size-3.5 text-slate-400" />
                      {formatDate(party.createdAt)}
                    </dd>
                  </div>
                </dl>
              </CardBody>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardBody>
                <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <Button variant="secondary" size="md" className="w-full justify-start" asChild>
                    <Link href={`/sales/orders/new?customerId=${party.id}`}>
                      <ArrowRight />
                      Create New Order
                    </Link>
                  </Button>
                  <Button variant="secondary" size="md" className="w-full justify-start" onClick={() => toast.info("Opening payment dialog…")}>
                    <CreditCard />
                    Record Payment
                  </Button>
                  <Button variant="secondary" size="md" className="w-full justify-start" onClick={() => toast.info("Generating statement…")}>
                    <Building />
                    Print Statement
                  </Button>
                  <Button variant="secondary" size="md" className="w-full justify-start" asChild>
                    <Link href={`/parties/new?id=${party.id}`}>
                      <Edit3 />
                      Edit Credit Limit
                    </Link>
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </TabsContent>

        {/* LEDGER TAB */}
        <TabsContent value="ledger">
          <Card className="p-0 overflow-hidden">
            <div className="p-5 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-navy-900 dark:text-white">Party Ledger</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">All transactions, latest first</p>
              </div>
              <Button variant="secondary" size="sm">
                <Calendar />
                <span>Last 30 days</span>
              </Button>
            </div>
            <DataTable columns={ledgerColumns} data={mockLedger} pageSize={10} />
          </Card>
        </TabsContent>

        {/* ORDERS TAB */}
        <TabsContent value="orders">
          <Card className="p-0 overflow-hidden">
            <DataTable columns={orderColumns} data={mockOrders} pageSize={10} rowHref={(o) => `/sales/orders/${o.id}`} />
          </Card>
        </TabsContent>

        {/* INVOICES TAB */}
        <TabsContent value="invoices">
          <Card className="p-0 overflow-hidden">
            <DataTable columns={invoiceColumns} data={mockInvoices} pageSize={10} rowHref={(i) => `/sales/invoices/${i.id}`} />
          </Card>
        </TabsContent>

        {/* VISITS TAB */}
        {party.type !== "SUPPLIER" && (
          <TabsContent value="visits">
            <div className="space-y-3">
              {mockVisits.map((v) => (
                <Card key={v.id}>
                  <CardBody>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="size-10 rounded-lg bg-brand-yellow/10 flex items-center justify-center flex-shrink-0">
                          <MapPin className="size-4 text-brand-yellow" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-navy-900 dark:text-white">{v.salesPerson}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">visited on</span>
                            <span className="text-xs text-navy-900 dark:text-white font-medium">{formatDate(v.date)} at {v.time}</span>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{v.notes}</p>
                          <div className="text-2xs text-slate-400 dark:text-slate-500 mt-1.5">GPS: 24.8607° N, 67.0011° E</div>
                        </div>
                      </div>
                      <StatusPill variant={v.variant}>{v.outcome}</StatusPill>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}

        {/* CREDIT TAB */}
        {party.type !== "SUPPLIER" && (
          <TabsContent value="credit">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardBody>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-navy-900 dark:text-white">Credit Settings</h3>
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={`/parties/new?id=${party.id}`}>
                        <Edit3 />
                        Edit
                      </Link>
                    </Button>
                  </div>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <dt className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Credit Limit</dt>
                      <dd className="text-lg tabular font-bold text-navy-900 dark:text-white mt-1">{formatMoney(party.creditLimit)}</dd>
                    </div>
                    <div>
                      <dt className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Payment Terms</dt>
                      <dd className="text-lg tabular font-bold text-navy-900 dark:text-white mt-1">NET {party.creditDays}</dd>
                    </div>
                    <div>
                      <dt className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Hold Policy</dt>
                      <dd className="mt-1">
                        <Badge variant={
                          party.creditHoldPolicy === "BLOCK" ? "danger" : party.creditHoldPolicy === "WARN" ? "warning" : "muted"
                        }>
                          {party.creditHoldPolicy}
                        </Badge>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Credit Rating</dt>
                      <dd className="mt-1">
                        <span className={cn(
                          "inline-flex items-center justify-center size-7 rounded-md text-xs font-bold",
                          party.rating === "A" && "bg-success-light text-success-dark",
                          party.rating === "B" && "bg-info-light text-info-dark",
                          party.rating === "C" && "bg-warning-light text-warning-dark",
                          party.rating === "D" && "bg-danger-light text-danger-dark",
                        )}>{party.rating}</span>
                      </dd>
                    </div>
                  </dl>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Credit Health</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-slate-600 dark:text-slate-300">Utilization</span>
                        <span className={cn("font-semibold tabular",
                          overLimit ? "text-danger" : utilPct > 80 ? "text-warning" : "text-success"
                        )}>{Math.round(utilPct)}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
                        <div className={cn("h-full",
                          overLimit ? "bg-danger" : utilPct > 80 ? "bg-warning" : "bg-success"
                        )} style={{ width: `${Math.min(utilPct, 100)}%` }} />
                      </div>
                    </div>
                    <div className="pt-3 border-t border-slate-100 dark:border-navy-700">
                      <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Days Past Due</div>
                      <div className="text-2xl font-bold tabular text-navy-900 dark:text-white mt-1">0</div>
                    </div>
                    <div className="pt-3 border-t border-slate-100 dark:border-navy-700">
                      <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Last Payment</div>
                      <div className="text-sm font-semibold text-navy-900 dark:text-white mt-1">
                        {party.lastPaymentAt ? formatDate(party.lastPaymentAt) : "Never"}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}
