"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import {
  AlertCircle, Phone, Mail, MapPin, Building2, FileText, Receipt,
  RefreshCw, Loader2, Power, CreditCard, Star, User,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/ui/data-table";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /parties/{id}. The whole page ran off getParty() in src/data/parties
   before, so a customer created on /parties/new opened a "not found" screen. */
type Party = {
  id: number; partyCode: string; type: "CUSTOMER" | "SUPPLIER" | "BOTH";
  legalName: string; displayName: string; initials: string;
  phone: string | null; altPhone: string | null; email: string | null;
  cityId: number | null; city: string | null; province: string | null; addressLine: string | null;
  categoryId: number | null; category: string | null; categoryName: string | null;
  industry: string | null; ntn: string | null; strn: string | null; cnic: string | null;
  creditLimit: number; creditDays: number;
  holdPolicyId: number | null; creditHoldPolicy: string | null;
  openingBalance: number;
  salesPersonUserId: number | null; salesPerson: string | null;
  defaultLocationId: number | null;
  rating: string | null; notes: string | null;
  isActive: boolean; createdAt: string;
  orderCount: number; invoiceCount: number; currentBalance: number;
};

/* GET /parties/{id}/statement — the ledger tab. */
type StatementLine = {
  id: number; date: string; entryNo: string; entryType: string;
  reference: string | null; narration: string | null;
  debit: number; credit: number; balance: number;
};
type Statement = {
  openingBalance: number; closingBalance: number;
  totalDebit: number; totalCredit: number; lines: StatementLine[];
};

type OrderRow = { id: number; orderNo: string; orderDate: string; statusName: string; total: number };
type InvoiceRow = { id: number; invoiceNo: string; invoiceDate: string; statusName: string; total: number };
type VisitRow = {
  id: number; customerId: number; visitedAt: string;
  salesPerson: string | null; outcomeName: string | null; note: string | null;
};

const TYPE_LABEL: Record<Party["type"], { label: string; variant: "info" | "warning" | "accent" }> = {
  CUSTOMER: { label: "Customer", variant: "info" },
  SUPPLIER: { label: "Supplier", variant: "warning" },
  BOTH: { label: "Customer & Supplier", variant: "accent" },
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function PartyDetailPage() {
  const params = useParams<{ id: string }>();
  const partyId = parseInt(params.id ?? "0", 10);

  const [party, setParty] = React.useState<Party | null>(null);
  const [statement, setStatement] = React.useState<Statement | null>(null);
  const [orders, setOrders] = React.useState<OrderRow[]>([]);
  const [invoices, setInvoices] = React.useState<InvoiceRow[]>([]);
  const [visits, setVisits] = React.useState<VisitRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [toggling, setToggling] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!partyId) { setNotFound(true); setLoading(false); return; }
    try {
      const res = await axios.get<Party>(`${API_BASE_URL}/parties/${partyId}`, { headers: authHeader() });
      setParty(res.data);
      setNotFound(false);
      setError(null);

      /* The tabs are secondary: if one of them fails the header should still
         render, so they are settled separately from the party itself. */
      const [st, ord, inv, vis] = await Promise.allSettled([
        axios.get<Statement>(`${API_BASE_URL}/parties/${partyId}/statement`, { headers: authHeader() }),
        axios.get<{ items: OrderRow[] } | OrderRow[]>(`${API_BASE_URL}/sales/orders`, { params: { customerId: partyId, pageSize: 100 }, headers: authHeader() }),
        axios.get<{ items: InvoiceRow[] } | InvoiceRow[]>(`${API_BASE_URL}/sales/invoices`, { params: { customerId: partyId, pageSize: 100 }, headers: authHeader() }),
        axios.get<VisitRow[] | { items: VisitRow[] }>(`${API_BASE_URL}/parties/visits`, { headers: authHeader() }),
      ]);

      if (st.status === "fulfilled") setStatement(st.value.data);
      if (ord.status === "fulfilled") {
        const d = ord.value.data;
        setOrders(Array.isArray(d) ? d : d.items);
      }
      if (inv.status === "fulfilled") {
        const d = inv.value.data;
        setInvoices(Array.isArray(d) ? d : d.items);
      }
      if (vis.status === "fulfilled") {
        const d = vis.value.data;
        const rows = Array.isArray(d) ? d : d.items;
        setVisits(rows.filter((v) => v.customerId === partyId));
      }
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) setNotFound(true);
      else setError(apiMessage(e, "Could not load this party."));
    } finally {
      setLoading(false);
    }
  }, [partyId]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. */
    void load();
  }, [load]);

  async function toggleActive() {
    if (!party) return;
    setToggling(true);
    try {
      /* The endpoint binds to ActiveRequest(bool Value), so the field is
         `value` -- and it answers { id, isActive }, not a message. */
      await axios.patch(
        `${API_BASE_URL}/parties/${party.id}/active`,
        { value: !party.isActive },
        { headers: authHeader() }
      );
      const wasActive = party.isActive;
      await load();
      toast.success(wasActive ? "Party deactivated" : "Party reactivated", {
        description: wasActive
          ? `${party.displayName} will no longer appear in pickers.`
          : `${party.displayName} can be used again.`,
      });
    } catch (e) {
      toast.error("Could not change the status", { description: apiMessage(e, "Please try again.") });
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "People" }, { label: "Parties", href: "/parties" }]} title="Loading…" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </>
    );
  }

  if (notFound) {
    return (
      <EmptyState icon={AlertCircle} title="Party not found" description={`No party with id ${partyId}.`}
        action={<Button variant="accent" asChild><Link href="/parties">Back to Parties</Link></Button>} />
    );
  }

  if (error || !party) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "People" }, { label: "Parties", href: "/parties" }]} title="Party" />
        <Card><CardBody className="flex items-center gap-3">
          <AlertCircle className="size-5 text-danger shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-navy-900 dark:text-white">{error}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">The API must be running on {API_BASE_URL}.</div>
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setLoading(true); void load(); }}>
            <RefreshCw className="size-4" /> Try again
          </Button>
        </CardBody></Card>
      </>
    );
  }

  const overLimit = party.creditLimit > 0 && party.currentBalance > party.creditLimit;
  const usedPercent = party.creditLimit > 0 ? Math.min(100, (party.currentBalance / party.creditLimit) * 100) : 0;

  const ledgerColumns: Column<StatementLine>[] = [
    { key: "date", header: "Date", cell: (l) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(l.date)}</span> },
    { key: "entryNo", header: "Entry", cell: (l) => <span className="tabular text-xs font-medium text-navy-900 dark:text-white">{l.entryNo}</span> },
    { key: "reference", header: "Reference", cell: (l) => <span className="tabular text-xs text-slate-600 dark:text-slate-300">{l.reference ?? "—"}</span> },
    { key: "narration", header: "Description", cell: (l) => <span className="text-sm text-slate-600 dark:text-slate-300">{l.narration ?? l.entryType}</span> },
    { key: "debit", header: "Debit", align: "right", cell: (l) => l.debit > 0 ? <span className="tabular text-sm font-semibold">{formatMoney(l.debit)}</span> : <span className="text-slate-300">—</span> },
    { key: "credit", header: "Credit", align: "right", cell: (l) => l.credit > 0 ? <span className="tabular text-sm font-semibold text-success">{formatMoney(l.credit)}</span> : <span className="text-slate-300">—</span> },
    { key: "balance", header: "Balance", align: "right", cell: (l) => <span className="tabular text-sm font-bold text-navy-900 dark:text-white">{formatMoney(l.balance)}</span> },
  ];

  const orderColumns: Column<OrderRow>[] = [
    { key: "orderNo", header: "Order", cell: (o) => <span className="tabular text-sm font-medium text-navy-900 dark:text-white">{o.orderNo}</span> },
    { key: "orderDate", header: "Date", cell: (o) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(o.orderDate)}</span> },
    { key: "statusName", header: "Status", cell: (o) => <Badge variant="muted">{o.statusName}</Badge> },
    { key: "total", header: "Total", align: "right", cell: (o) => <span className="tabular text-sm font-semibold">{formatMoney(o.total)}</span> },
  ];

  const invoiceColumns: Column<InvoiceRow>[] = [
    { key: "invoiceNo", header: "Invoice", cell: (i) => <span className="tabular text-sm font-medium text-navy-900 dark:text-white">{i.invoiceNo}</span> },
    { key: "invoiceDate", header: "Date", cell: (i) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(i.invoiceDate)}</span> },
    { key: "statusName", header: "Status", cell: (i) => <Badge variant="muted">{i.statusName}</Badge> },
    { key: "total", header: "Total", align: "right", cell: (i) => <span className="tabular text-sm font-semibold">{formatMoney(i.total)}</span> },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "People" }, { label: "Parties", href: "/parties" }, { label: party.displayName }]}
        title={
          <div className="flex items-center gap-3">
            <Avatar initials={party.initials} size="xl" className="size-12" />
            <div>
              <div>{party.legalName}</div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="tabular text-xs text-slate-500 dark:text-slate-400">{party.partyCode}</span>
                <Badge variant={TYPE_LABEL[party.type].variant}>{TYPE_LABEL[party.type].label}</Badge>
                {party.categoryName && <Badge variant="muted">{party.categoryName}</Badge>}
                {party.rating && <Badge variant="muted"><Star className="size-3 inline mr-0.5" />{party.rating}</Badge>}
                <StatusPill variant={party.isActive ? "success" : "muted"}>{party.isActive ? "Active" : "Inactive"}</StatusPill>
              </div>
            </div>
          </div>
        }
        actions={
          <>
            <Button variant="ghost" className="gap-1.5" onClick={() => void load()}><RefreshCw className="size-4" />Refresh</Button>
            <Button variant="secondary" className="gap-1.5" asChild>
              <Link href={`/parties/${party.id}/statement`}><FileText />Statement</Link>
            </Button>
            <Button variant={party.isActive ? "ghost" : "accent"} className="gap-1.5" onClick={() => void toggleActive()} disabled={toggling}>
              {toggling ? <Loader2 className="size-4 animate-spin" /> : <Power className="size-4" />}
              {party.isActive ? "Deactivate" : "Reactivate"}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Balance</div>
          <div className={cn("text-2xl tabular font-bold mt-1", overLimit ? "text-danger" : "text-navy-900 dark:text-white")}>
            {formatMoney(party.currentBalance)}
          </div>
          {overLimit && <div className="text-2xs text-danger mt-1">Over the credit limit</div>}
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Credit Limit</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{formatMoney(party.creditLimit)}</div>
          <div className="w-full h-1 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden mt-2">
            <div className={cn("h-full", overLimit ? "bg-danger" : "bg-success")} style={{ width: `${usedPercent}%` }} />
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Orders</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{party.orderCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Invoices</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{party.invoiceCount}</div>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="overflow-x-auto scrollbar-thin flex-nowrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ledger">Ledger ({statement?.lines.length ?? 0})</TabsTrigger>
          <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
          {party.type !== "SUPPLIER" && <TabsTrigger value="visits">Visits ({visits.length})</TabsTrigger>}
          {party.type !== "SUPPLIER" && <TabsTrigger value="credit">Credit</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardBody>
                <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Contact Information</h3>
                <dl className="space-y-3 text-sm">
                  <Row icon={Phone} label="Phone" value={party.phone ?? "—"} />
                  {party.altPhone && <Row icon={Phone} label="Alt. phone" value={party.altPhone} />}
                  <Row icon={Mail} label="Email" value={party.email ?? "—"} />
                  <Row icon={MapPin} label="Address" value={[party.addressLine, party.city, party.province].filter(Boolean).join(", ") || "—"} />
                  <Row icon={Building2} label="Industry" value={party.industry ?? "—"} />
                  <Row icon={User} label="Sales person" value={party.salesPerson ?? "Not assigned"} />
                </dl>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Tax &amp; Registration</h3>
                <dl className="space-y-3 text-sm">
                  <Row icon={Receipt} label="NTN" value={party.ntn ?? "—"} />
                  <Row icon={Receipt} label="STRN" value={party.strn ?? "—"} />
                  <Row icon={Receipt} label="CNIC" value={party.cnic ?? "—"} />
                  <Row icon={FileText} label="Opened" value={formatDate(party.createdAt)} />
                  <Row icon={FileText} label="Opening balance" value={formatMoney(party.openingBalance)} />
                </dl>
                {party.notes && (
                  <p className="mt-4 pt-4 border-t border-slate-100 dark:border-navy-700 text-xs text-slate-600 dark:text-slate-300">
                    {party.notes}
                  </p>
                )}
              </CardBody>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ledger">
          <Card className="p-0 overflow-hidden">
            {!statement || statement.lines.length === 0 ? (
              <CardBody><EmptyState icon={FileText} title="Nothing posted yet" description="This party has no posted ledger entries." /></CardBody>
            ) : (
              <>
                <DataTable columns={ledgerColumns} data={statement.lines} pageSize={20} />
                <div className="px-5 py-3 border-t border-slate-100 dark:border-navy-700 bg-slate-50 dark:bg-navy-900/40 flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">
                    Opened at {formatMoney(statement.openingBalance)} · {formatMoney(statement.totalDebit)} debit · {formatMoney(statement.totalCredit)} credit
                  </span>
                  <span className="tabular font-bold text-navy-900 dark:text-white">{formatMoney(statement.closingBalance)}</span>
                </div>
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card className="p-0 overflow-hidden">
            {orders.length === 0
              ? <CardBody><EmptyState icon={FileText} title="No orders" description="Nothing has been ordered by this party." /></CardBody>
              : <DataTable columns={orderColumns} data={orders} pageSize={15} rowHref={(o) => `/sales/orders/${o.id}`} />}
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card className="p-0 overflow-hidden">
            {invoices.length === 0
              ? <CardBody><EmptyState icon={Receipt} title="No invoices" description="Nothing has been invoiced to this party." /></CardBody>
              : <DataTable columns={invoiceColumns} data={invoices} pageSize={15} rowHref={(i) => `/sales/invoices/${i.id}`} />}
          </Card>
        </TabsContent>

        {party.type !== "SUPPLIER" && (
          <TabsContent value="visits">
            <Card>
              <CardBody>
                {visits.length === 0 ? (
                  <EmptyState icon={MapPin} title="No visits recorded" description="No sales visit has been logged against this customer." />
                ) : (
                  <div className="space-y-2">
                    {visits.map((v) => (
                      <div key={v.id} className="flex items-start gap-3 p-3 border border-slate-200 dark:border-navy-700 rounded-lg">
                        <MapPin className="size-4 text-brand-yellow shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-navy-900 dark:text-white">
                            {v.salesPerson ?? "Someone"} visited
                            {v.outcomeName && <> · <span className="font-medium">{v.outcomeName}</span></>}
                          </div>
                          {v.note && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{v.note}</div>}
                        </div>
                        <div className="text-2xs text-slate-500 dark:text-slate-400 shrink-0">{formatDate(v.visitedAt)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </TabsContent>
        )}

        {party.type !== "SUPPLIER" && (
          <TabsContent value="credit">
            <Card>
              <CardBody>
                <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4 inline-flex items-center gap-2">
                  <CreditCard className="size-4 text-slate-400" /> Credit Settings
                </h3>
                <dl className="space-y-3 text-sm max-w-md">
                  <Row icon={CreditCard} label="Credit limit" value={formatMoney(party.creditLimit)} />
                  <Row icon={CreditCard} label="Credit days" value={`${party.creditDays} days`} />
                  <Row icon={CreditCard} label="When over limit" value={party.creditHoldPolicy ?? "—"} />
                  <Row icon={CreditCard} label="Currently owes" value={formatMoney(party.currentBalance)} />
                </dl>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
                  {overLimit
                    ? "This party is over its limit. What happens next depends on the hold policy above."
                    : `${formatMoney(Math.max(0, party.creditLimit - party.currentBalance))} of the limit is still available.`}
                </p>
              </CardBody>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
      <dt className="text-slate-500 dark:text-slate-400 w-28 shrink-0">{label}</dt>
      <dd className="text-navy-900 dark:text-white font-medium min-w-0 break-words">{value}</dd>
    </div>
  );
}
