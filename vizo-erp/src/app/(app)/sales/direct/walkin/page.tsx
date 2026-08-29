"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import {
  Users, ArrowLeft, Printer, MessageCircle, AlertCircle, RefreshCw,
  ShoppingBag, Receipt, Banknote, ChevronLeft, ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { WhatsAppShareDialog } from "@/components/dialogs/whatsapp-share-dialog";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatDate } from "@/lib/format";
import { statusLabel } from "@/lib/labels";
import { prettyPhone } from "@/lib/whatsapp";

/* GET /sales/direct/walkin -- counter bills made out to somebody with no
   account. Kept off the Sale Invoices ledger on purpose: these never age,
   nobody chases them, and the only thing anyone ever wants from one is the
   bill itself, to print or re-send. */
type WalkInSale = {
  id: number; invoiceNo: string;
  orderId: number | null; orderNo: string | null;
  customerName: string; customerInitials: string; customerPhone: string | null;
  invoiceDate: string; location: string;
  paymentMethod: string; paymentMethodName: string;
  status: string; statusName: string;
  itemCount: number; units: number;
  subtotal: number; discount: number; tax: number; total: number;
  pdfUrl: string | null; shareUrl: string | null;
  soldBy: string;
};

type WalkInPage = {
  total: number; page: number; pageSize: number; totalValue: number; items: WalkInSale[];
};

const INVOICE_STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "info" | "muted"> = {
  DRAFT: "muted", ISSUED: "info", POSTED: "info",
  PARTIAL: "warning", PAID: "success", OVERDUE: "danger", VOID: "muted",
};

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

const PAGE_SIZE = 25;

export default function WalkInSalesPage() {
  const [data, setData] = React.useState<WalkInPage>({
    total: 0, page: 1, pageSize: PAGE_SIZE, totalValue: 0, items: [],
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [page, setPage] = React.useState(1);

  const [share, setShare] = React.useState<WalkInSale | null>(null);

  /* Paged and filtered on the SERVER. There is no ceiling on how many counter
     sales a busy shop rings up, and pulling them all back to filter in the
     browser is exactly what rule 3 of AGENTS.md forbids. */
  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<WalkInPage>(`${API_BASE_URL}/sales/direct/walkin`, {
        params: {
          q: search.trim() || undefined,
          from: from || undefined,
          to: to || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
        headers: authHeader(),
      });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the walk-in bills."));
    } finally {
      setLoading(false);
    }
  }, [search, from, to, page]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  function printBill(invoiceId: number) {
    window.open(`${API_BASE_URL}/sales/invoices/${invoiceId}/pdf`, "_blank", "noopener,noreferrer");
  }

  const pageCount = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const units = data.items.reduce((s, i) => s + i.units, 0);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Sales" }, { label: "Counter Sale", href: "/sales/direct" }, { label: "Walk-in Orders" }]}
        title={<><Users className="size-6 inline-block mr-2 text-brand-yellow" />Walk-in Orders</>}
        subtitle="Every counter bill made out to somebody with no shop account."
        actions={
          <>
            <Button variant="ghost" size="md" className="gap-1.5" asChild>
              <Link href="/sales/direct"><ArrowLeft />Back to counter</Link>
            </Button>
            <Button variant="accent" size="md" className="gap-1.5" asChild>
              <Link href="/sales/direct"><ShoppingBag />New counter sale</Link>
            </Button>
          </>
        }
      />

      {error && (
        <Card className="mb-6 border-danger/40">
          <CardBody className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{error}</div>
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => { setLoading(true); void load(); }}>
              <RefreshCw className="size-4" />Try again
            </Button>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Bills found</div>
              <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{data.total}</div>
            </div>
            <Receipt className="size-5 text-slate-300 dark:text-navy-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Value</div>
              <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{formatMoney(data.totalValue)}</div>
            </div>
            <Banknote className="size-5 text-slate-300 dark:text-navy-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Units on this page</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{units}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardBody className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div className="sm:col-span-2">
            <Label htmlFor="wi-search">Search</Label>
            <Input
              id="wi-search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Bill number, customer name or phone…"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="wi-from">From</Label>
            <Input id="wi-from" type="date" value={from}
              onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="wi-to">To</Label>
            <Input id="wi-to" type="date" value={to}
              onChange={(e) => { setTo(e.target.value); setPage(1); }} className="mt-1.5" />
          </div>
        </CardBody>
      </Card>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : data.items.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={Users}
              title="No walk-in bills"
              description={
                search || from || to
                  ? "Nothing matches those filters. Clear them to see every walk-in bill."
                  : "Counter sales to somebody with no shop account appear here as soon as one is taken."
              }
              action={
                <Button variant="accent" asChild>
                  <Link href="/sales/direct"><ShoppingBag />Take a counter sale</Link>
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.items.map((s) => (
            <Card key={s.id}>
              <CardBody>
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Avatar initials={s.customerInitials} size="lg" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/sales/invoices/${s.id}`}
                          className="tabular text-base font-semibold text-navy-900 dark:text-white hover:text-brand-yellow-700 dark:hover:text-brand-yellow">
                          {s.invoiceNo}
                        </Link>
                        <StatusPill variant={INVOICE_STATUS_VARIANT[s.status] ?? "muted"}>{statusLabel(s.status)}</StatusPill>
                        <Badge variant="muted">{s.paymentMethodName}</Badge>
                      </div>
                      <div className="text-sm text-slate-700 dark:text-slate-200 mt-0.5">
                        {s.customerName}
                        {s.customerPhone && (
                          <span className="text-slate-500 dark:text-slate-400"> · {prettyPhone(s.customerPhone)}</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {formatDate(s.invoiceDate)} · {s.location} · {s.itemCount} items, {s.units} units · sold by {s.soldBy}
                        {s.orderNo && ` · ${s.orderNo}`}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Bill total</div>
                    <div className="text-xl tabular font-bold text-navy-900 dark:text-white">{formatMoney(s.total)}</div>
                    <div className="text-2xs tabular text-slate-500 dark:text-slate-400">
                      tax {formatMoney(s.tax)}{s.discount > 0 && ` · disc ${formatMoney(s.discount)}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="secondary" size="md" className="gap-1.5" onClick={() => printBill(s.id)}>
                      <Printer />Print
                    </Button>
                    <Button
                      variant="accent"
                      size="md"
                      className="gap-1.5"
                      onClick={() => setShare(s)}
                      aria-label={`Send ${s.invoiceNo} on WhatsApp`}
                    >
                      <MessageCircle />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}

          {pageCount > 1 && (
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Page {data.page} of {pageCount} · {data.total} bills
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" className="gap-1"
                  disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft />Previous
                </Button>
                <Button variant="secondary" size="sm" className="gap-1"
                  disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
                  Next<ChevronRight />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {share && (
        <WhatsAppShareDialog
          open={!!share}
          onOpenChange={(o) => !o && setShare(null)}
          docNo={share.invoiceNo}
          docLabel="Invoice"
          customerName={share.customerName}
          customerPhone={share.customerPhone ?? ""}
          total={share.total}
          billLink={share.shareUrl ?? share.pdfUrl}
        />
      )}
    </>
  );
}
