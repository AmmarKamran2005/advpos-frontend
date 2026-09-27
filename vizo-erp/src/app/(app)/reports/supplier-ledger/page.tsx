"use client";

import * as React from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ReportToolbar } from "@/components/widgets/report-toolbar";
import { Card, CardBody } from "@/components/ui/card";
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { ReportStat, ReportError, apiMessage } from "@/components/widgets/report-bits";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatCompact, formatDate } from "@/lib/format";
import { todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";

/* GET /reports/supplier-ledger?supplierId=&from=&to= and
   GET /reports/supplier-ledger/suppliers (PurchaseReportsController).
   Super Admin and accountant.

   One supplier's account over a range, in the PAYABLE sense -- a positive
   balance is what we owe him: brought forward, then every bill (purchase
   invoice), payment voucher and hand-written 2101 adjustment, with a running
   balance. Read from the documents because most older bills were never posted
   to the books. The accountant sees each bill's total only; its lines -- what
   an item cost -- come to the Super Admin alone (`showsItems`). */
type Supplier = { id: number; code: string; name: string; city: string | null; balance: number; lastActivity: string | null };

type Item = { name: string; qty: number; unitCost: number; amount: number };
type Row = {
  date: string; kind: "bill" | "payment" | "refund" | "adjustment"; reference: string;
  particulars: string; detail: string | null; debit: number; credit: number; balance: number;
  documentId: number | null; items: Item[] | null;
};
type Ledger = {
  supplier: { id: number; code: string; name: string; city: string | null; phone: string | null; creditDays: number; openingBalance: number };
  from: string; to: string; showsItems: boolean;
  balanceBroughtForward: number; bills: number; payments: number; refunds: number; adjustments: number;
  totalDebit: number; totalCredit: number; closingBalance: number; count: number; rows: Row[];
};

const KIND: Record<Row["kind"], { label: string; variant: "warning" | "success" | "info" | "muted" }> = {
  bill: { label: "Bill", variant: "warning" },
  payment: { label: "Payment", variant: "success" },
  refund: { label: "Refund", variant: "info" },
  adjustment: { label: "Adjustment", variant: "muted" },
};

export default function SupplierLedgerPage() {
  return (
    <React.Suspense fallback={<div className="p-6"><Skeleton className="h-64" /></div>}>
      <SupplierLedgerScreen />
    </React.Suspense>
  );
}

function SupplierLedgerScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [suppliers, setSuppliers] = React.useState<Supplier[] | null>(null);
  const [supplierId, setSupplierId] = React.useState<number | null>(() => Number(searchParams.get("supplierId")) || null);
  const [from, setFrom] = React.useState(() => `${todayISO().slice(0, 4)}-01-01`);
  const [to, setTo] = React.useState(() => todayISO());
  const [data, setData] = React.useState<Ledger | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    let live = true;
    axios.get<Supplier[]>(`${API_BASE_URL}/reports/supplier-ledger/suppliers`, { headers: authHeader() })
      .then((r) => { if (live) setSuppliers(r.data); })
      .catch((e) => { if (live) { setSuppliers([]); setError(apiMessage(e, "Could not load the suppliers.")); } });
    return () => { live = false; };
  }, []);

  const load = React.useCallback(async () => {
    if (!supplierId) { setData(null); return; }
    setLoading(true);
    try {
      const res = await axios.get<Ledger>(`${API_BASE_URL}/reports/supplier-ledger`, {
        params: { supplierId, from, to }, headers: authHeader(),
      });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not build the supplier ledger."));
    } finally {
      setLoading(false);
    }
  }, [supplierId, from, to]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  function pick(id: number | null) {
    setSupplierId(id);
    setOpen(new Set());
    router.replace(id ? `/reports/supplier-ledger?supplierId=${id}` : "/reports/supplier-ledger", { scroll: false });
  }

  function toggle(key: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const d = data;
  const totalOwed = (suppliers ?? []).reduce((s, x) => s + x.balance, 0);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Supplier Ledger" }]}
        title="Supplier Ledger"
        subtitle={d ? `${d.supplier.name} — ${from} to ${to}` : "Bills, payments and what is owed, supplier by supplier"}
        actions={supplierId ? (
          <ReportToolbar
            mode="range"
            reportName={`Supplier Ledger ${d?.supplier.code ?? ""}`.trim()}
            fromDate={from}
            toDate={to}
            onRangeChange={(f, t) => { setFrom(f); setTo(t); }}
            doc={{ family: "report", key: "supplier-ledger" }}
            docParams={{ supplierId }}
            exportPath="reports/supplier-ledger/export"
          />
        ) : undefined}
      />

      {error && <ReportError message={error} onRetry={() => void load()} />}

      <Card className="mb-4">
        <CardBody className="flex flex-col sm:flex-row gap-3 sm:items-center">
          {suppliers === null ? <Skeleton className="h-10 sm:w-96" /> : (
            <SelectNative value={supplierId === null ? "" : String(supplierId)} className="sm:w-96" aria-label="Supplier"
              onChange={(e) => pick(e.target.value ? Number(e.target.value) : null)}>
              <option value="">— Pick a supplier —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name} · {s.code} · owe {formatMoney(s.balance)}</option>
              ))}
            </SelectNative>
          )}
          {suppliers && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {suppliers.length} suppliers · {formatMoney(totalOwed)} owed in all
            </span>
          )}
        </CardBody>
      </Card>

      {!supplierId ? (
        suppliers && suppliers.length > 0 ? (
          <Card className="p-0 overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-navy-700">
              {suppliers.map((s) => (
                <button key={s.id} type="button" onClick={() => pick(s.id)}
                  className="w-full text-left flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-navy-800">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{s.name}</div>
                    <div className="text-2xs text-slate-500 dark:text-slate-400 truncate">
                      {s.code}{s.city ? ` · ${s.city}` : ""}{s.lastActivity ? ` · last ${formatDate(s.lastActivity)}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("tabular text-sm font-semibold", s.balance > 0 ? "text-warning" : "text-slate-500")}>{formatMoney(s.balance)}</span>
                    <ChevronRight className="size-4 text-slate-300" />
                  </div>
                </button>
              ))}
            </div>
          </Card>
        ) : (
          <Card><EmptyState icon={BookOpen} title="Pick a supplier" description="Choose a supplier above to open his ledger." /></Card>
        )
      ) : loading || !d ? (
        <Skeleton className="h-72" />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <ReportStat label="Brought forward" loading={false} value={formatCompact(d.balanceBroughtForward)} sub={`at ${formatDate(d.from)}`} />
            <ReportStat label="Billed" loading={false} value={formatCompact(d.bills)} tone="text-warning" />
            <ReportStat label="Paid" loading={false} value={formatCompact(d.payments)} tone="text-success" />
            <ReportStat label="We owe" loading={false} value={formatCompact(d.closingBalance)} sub={`at ${formatDate(d.to)}`}
              tone={d.closingBalance > 0 ? "text-danger" : "text-success"} />
          </div>

          <Card className="p-0 overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-navy-700">
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 dark:bg-navy-700/40">
                <span className="text-sm font-semibold text-navy-900 dark:text-white">Balance brought forward</span>
                <span className="tabular text-sm font-bold text-navy-900 dark:text-white">{formatMoney(d.balanceBroughtForward)}</span>
              </div>
              {d.rows.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No bills or payments in this range.</div>
              )}
              {d.rows.map((r, i) => {
                const key = `${r.kind}-${r.reference}-${i}`;
                const hasItems = Boolean(r.items && r.items.length > 0);
                const expanded = open.has(key);
                return (
                  <div key={key} className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="w-20 shrink-0 tabular text-xs text-slate-500 dark:text-slate-400 pt-0.5">{formatDate(r.date)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={KIND[r.kind].variant}>{KIND[r.kind].label}</Badge>
                          <span className="tabular text-sm font-semibold text-navy-900 dark:text-white">{r.reference}</span>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 break-words">{r.particulars}</div>
                        {r.detail && <div className="text-2xs text-slate-500 dark:text-slate-400">{r.detail}</div>}
                        {hasItems && (
                          <button type="button" onClick={() => toggle(key)}
                            className="mt-1 inline-flex items-center gap-1 text-2xs font-medium text-info hover:underline">
                            {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                            {r.items!.length} item{r.items!.length === 1 ? "" : "s"}
                          </button>
                        )}
                        {hasItems && expanded && (
                          <div className="mt-1.5 rounded-md border border-slate-200 dark:border-navy-700 divide-y divide-slate-100 dark:divide-navy-700">
                            {r.items!.map((it, j) => (
                              <div key={j} className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-2xs">
                                <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">{it.name}</span>
                                <span className="tabular text-slate-500 dark:text-slate-400 shrink-0">
                                  {it.qty} × {formatMoney(it.unitCost)} = <span className="font-semibold text-navy-900 dark:text-white">{formatMoney(it.amount)}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className={cn("tabular text-sm font-semibold", r.credit > 0 ? "text-warning" : "text-success")}>
                          {r.credit > 0 ? `+${formatMoney(r.credit)}` : `−${formatMoney(r.debit)}`}
                        </div>
                        <div className="tabular text-2xs text-slate-500 dark:text-slate-400">bal {formatMoney(r.balance)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-navy-900 text-white">
                <span className="text-sm font-bold uppercase tracking-wider">We owe</span>
                <span className="tabular text-base font-bold text-brand-yellow">{formatMoney(d.closingBalance)}</span>
              </div>
            </div>
          </Card>
          <p className="text-2xs text-slate-500 dark:text-slate-400 mt-3">
            + a bill (we owe more) · − a payment (we owe less). {d.showsItems ? "Bill lines are shown to the Super Admin only." : "Bill totals only — item costs are the Super Admin's."}
          </p>
        </>
      )}
    </>
  );
}
