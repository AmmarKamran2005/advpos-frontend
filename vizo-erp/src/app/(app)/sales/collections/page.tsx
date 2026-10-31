"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import { Plus, Wallet, CalendarCheck, AlertCircle, Banknote, Landmark, HandCoins } from "lucide-react";
import { usePageRefresh } from "@/lib/page-refresh";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────────────────────
   PAYMENT COLLECTION -- the salesperson's money screen (the owner, 1 Nov)

   Every collection that is the rep's: the ones they recorded here, and any the
   accountant collected directly against one of their orders. A collection
   stays "Awaiting confirmation" -- outside the customer's ledger -- until the
   accountant or the Super Admin confirms it into Cash on Hand, Meezan or
   Faysal; until then the rep is reminded to hand the money in.
   GET /sales/collections (SalesCollectionsController).
   ─────────────────────────────────────────────────────────────────────────── */

type Item = {
  id: number;
  receiptNo: string;
  customerId: number;
  customerName: string;
  customerCode: string;
  collectedOn: string;
  collectedBy: string;
  byMe: boolean;
  amount: number;
  method: string;
  methodName: string;
  bank: string | null;
  reference: string | null;
  chequeDate: string | null;
  status: "AWAITING" | "CONFIRMED" | "BOUNCED";
  statusName: string;
  confirmedOn: string | null;
  confirmedBy: string | null;
  receivedInto: string | null;
  voucherNo: string | null;
  note: string | null;
  orders: string[];
};

type Response = {
  summary: { awaitingCount: number; awaitingTotal: number; confirmedThisMonth: number };
  items: Item[];
};

const STATUS_VARIANT = { AWAITING: "warning", CONFIRMED: "success", BOUNCED: "danger" } as const;

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function PaymentCollectionsPage() {
  const [data, setData] = React.useState<Response | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<"AWAITING" | "CONFIRMED" | "ALL">("AWAITING");

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<Response>(`${API_BASE_URL}/sales/collections`, { headers: authHeader() });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load your collections."));
    }
  }, []);

  usePageRefresh(load);   // the top bar's Refresh button -- lib/page-refresh.ts

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  const items = data?.items ?? [];
  const shown = tab === "ALL" ? items : items.filter((c) => c.status === tab);
  const tabs = [
    { key: "AWAITING" as const, label: "With me", count: items.filter((c) => c.status === "AWAITING").length },
    { key: "CONFIRMED" as const, label: "Confirmed", count: items.filter((c) => c.status === "CONFIRMED").length },
    { key: "ALL" as const, label: "All", count: items.length },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Sales" }, { label: "Payment Collection" }]}
        title="Payment Collection"
        subtitle="Money you collect from customers. It counts once the accountant confirms it."
        actions={
          <Button variant="accent" size="md" className="gap-1.5" asChild>
            <Link href="/sales/collections/new"><Plus />New collection</Link>
          </Button>
        }
      />

      {error && (
        <Card className="mb-4 border-danger/30 bg-danger/5">
          <CardBody className="flex items-center gap-2 text-sm text-danger">
            <AlertCircle className="size-4" />{error}
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => void load()}>Try again</Button>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-2xs uppercase font-semibold tracking-wider text-warning-dark dark:text-warning-light">
            <Wallet className="size-3.5" />With me, not yet confirmed
          </div>
          {data ? (
            <>
              <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{formatMoney(data.summary.awaitingTotal)}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {data.summary.awaitingCount} {data.summary.awaitingCount === 1 ? "collection" : "collections"} to hand in
              </div>
            </>
          ) : <Skeleton className="h-10 mt-1" />}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-2xs uppercase font-semibold tracking-wider text-success">
            <CalendarCheck className="size-3.5" />Confirmed this month
          </div>
          {data ? (
            <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{formatMoney(data.summary.confirmedThisMonth)}</div>
          ) : <Skeleton className="h-10 mt-1" />}
        </Card>
      </div>

      <div className="flex gap-1 mb-3 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={cn(
              "px-3 h-8 rounded-lg text-sm font-medium whitespace-nowrap border transition-colors",
              tab === t.key
                ? "bg-navy-900 text-white border-navy-900 dark:bg-brand-yellow dark:text-navy-900 dark:border-brand-yellow"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-navy-800 dark:text-slate-300 dark:border-navy-700"
            )}>
            {t.label} <span className="tabular opacity-70">{t.count}</span>
          </button>
        ))}
      </div>

      {!data && !error ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState icon={HandCoins}
            title={tab === "AWAITING" ? "Nothing waiting" : "No collections here"}
            description={tab === "AWAITING"
              ? "Every payment you collected has been confirmed. Record a new one when a customer pays you."
              : "Payments you collect show here."}
            action={<Button variant="accent" asChild><Link href="/sales/collections/new"><Plus />New collection</Link></Button>} />
        </Card>
      ) : (
        <div className="space-y-2">
          {shown.map((c) => <CollectionRow key={c.id} c={c} />)}
        </div>
      )}
    </>
  );
}

function CollectionRow({ c }: { c: Item }) {
  const cash = c.method === "CASH";
  return (
    <Card>
      <CardBody className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className={cn("size-10 rounded-xl flex items-center justify-center shrink-0",
          cash ? "bg-success/10 text-success" : "bg-info/10 text-info")}>
          {cash ? <Banknote className="size-5" /> : <Landmark className="size-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-navy-900 dark:text-white truncate">{c.customerName}</span>
            <span className="text-2xs tabular text-slate-400">{c.customerCode}</span>
            <StatusPill variant={STATUS_VARIANT[c.status] ?? "muted"}>{c.statusName}</StatusPill>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <span className="tabular">{c.receiptNo}</span> · {formatDate(c.collectedOn)}
            {c.orders.length > 0 && <> · on <span className="tabular">{c.orders.join(", ")}</span></>}
            {" · "}{c.methodName}{c.bank ? ` — ${c.bank}` : ""}{c.reference ? `, ref ${c.reference}` : ""}
          </div>
          {!c.byMe && (
            <div className="text-2xs text-slate-400 mt-0.5">Collected by {c.collectedBy}</div>
          )}
          {c.status === "CONFIRMED" && (
            <div className="text-2xs text-success mt-0.5">
              Confirmed{c.confirmedBy ? ` by ${c.confirmedBy}` : ""}{c.confirmedOn ? ` on ${formatDate(c.confirmedOn)}` : ""}
              {c.receivedInto ? ` into ${c.receivedInto}` : ""}
            </div>
          )}
          {c.status === "AWAITING" && (
            <div className="text-2xs text-warning-dark dark:text-warning-light mt-0.5">
              Hand this to the accountant or the Super Admin to have it confirmed.
            </div>
          )}
        </div>
        <div className="text-lg tabular font-bold text-navy-900 dark:text-white sm:text-right">{formatMoney(c.amount)}</div>
      </CardBody>
    </Card>
  );
}
