"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import {
  Plus, Wallet, Landmark, Smartphone, ArrowDownToLine, ArrowUpFromLine,
  FileText, AlertCircle, FileDown, Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Badge, StatusPill } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { Pager } from "@/components/ui/pager";
import { toast } from "@/components/ui/toaster";
import { formatMoney, formatDate, formatCompact } from "@/lib/format";
import { statusLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/* GET /accounting/vouchers
   -> { count, total, receiptTotal, paymentTotal, draftCount, page, pageSize,
        pageCount, items }
   `type` is "VoucherType".TypeCode; isReceipt says which direction the money
   went, so the page does not have to keep a list of which codes are receipts.
   The totals are over the whole filter, not the page on screen. */
type Voucher = {
  id: number;
  voucherNo: string;
  type: string;
  typeName: string;
  isReceipt: boolean;
  date: string;
  location: string;
  partyId: number | null;
  partyName: string | null;
  cashBankAccount: string | null;
  amount: number;
  paymentMethod: string;
  paymentProvider: string | null;
  reference: string | null;
  narration: string;
  status: string;
  statusName: string;
  createdBy: string;
};

type VoucherPage = {
  count: number;
  total: number;
  receiptTotal: number;
  paymentTotal: number;
  draftCount: number;
  page: number;
  pageSize: number;
  pageCount: number;
  items: Voucher[];
};

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

const TYPE_ICON: Record<string, typeof Wallet> = {
  CR: ArrowDownToLine,
  CP: ArrowUpFromLine,
  BR: Landmark,
  BP: Landmark,
  WR: Smartphone,
  WP: Smartphone,
  JV: FileText,
};

const TYPE_COLOR: Record<string, string> = {
  CR: "bg-success/10 text-success",
  CP: "bg-danger/10 text-danger",
  BR: "bg-info/10 text-info",
  BP: "bg-warning/10 text-warning",
  WR: "bg-brand-yellow/10 text-brand-yellow",
  WP: "bg-brand-yellow/10 text-brand-yellow",
  JV: "bg-slate-100 text-slate-600 dark:bg-navy-700 dark:text-slate-300",
};

const STATUS_VARIANT: Record<string, "success" | "muted" | "warning" | "danger" | "info"> = {
  POSTED: "success",
  DRAFT: "muted",
  REVERSED: "warning",
  REJECTED: "danger",
  CANCELLED: "danger",
  RECONCILED: "info",
};

const TYPES: { key: string; label: string }[] = [
  { key: "", label: "All" },
  { key: "CR", label: "Cash Receipt" },
  { key: "CP", label: "Cash Payment" },
  { key: "BR", label: "Bank Receipt" },
  { key: "BP", label: "Bank Payment" },
  { key: "WR", label: "Wallet Receipt" },
  { key: "WP", label: "Wallet Payment" },
  { key: "JV", label: "Journal" },
];

/* The shared statusLabel() speaks shopkeeper -- POSTED reads "Confirmed",
   REVERSED reads "Undone". That is right on the sales screens and wrong on an
   accounting one, where the ledger's own word is the word the accountant is
   looking for. Rows use the statusName the API sends; this is only for the
   filter chip, which has the key and nothing else. */
const STATUS_TEXT: Record<string, string> = {
  DRAFT: "Draft",
  POSTED: "Posted",
  REVERSED: "Reversed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  RECONCILED: "Reconciled",
};

const PAGE_SIZE = 25;

const EMPTY: VoucherPage = {
  count: 0, total: 0, receiptTotal: 0, paymentTotal: 0, draftCount: 0,
  page: 1, pageSize: PAGE_SIZE, pageCount: 1, items: [],
};

export default function VouchersPage() {
  const [data, setData] = React.useState<VoucherPage>(EMPTY);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);

  const [search, setSearch] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    const t = setTimeout(() => {
      /* Fires 300ms after typing stops, not on every keystroke -- one
         request per search, not one per letter. */
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<VoucherPage>(`${API_BASE_URL}/accounting/vouchers`, {
        headers: authHeader(),
        params: {
          q: query || undefined,
          type: typeFilter || undefined,
          status: status || undefined,
          from: from || undefined,
          to: to || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
      });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the vouchers."));
    } finally {
      setLoading(false);
    }
  }, [query, typeFilter, status, from, to, page]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  const chips = [
    status && { key: "status", label: "Status", value: STATUS_TEXT[status] ?? status },
    from && { key: "from", label: "From", value: from },
    to && { key: "to", label: "To", value: to },
    query && { key: "q", label: "Search", value: query },
  ].filter(Boolean) as { key: string; label: string; value: string }[];

  function removeChip(key: string) {
    if (key === "status") setStatus("");
    if (key === "from") setFrom("");
    if (key === "to") setTo("");
    if (key === "q") { setSearch(""); setQuery(""); }
    setPage(1);
  }

  function clearAll() {
    setStatus(""); setFrom(""); setTo(""); setSearch(""); setQuery(""); setPage(1);
  }

  async function exportXlsx() {
    setExporting(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/accounting/vouchers/export`, {
        headers: authHeader(),
        responseType: "blob",
        params: {
          q: query || undefined, type: typeFilter || undefined, status: status || undefined,
          from: from || undefined, to: to || undefined,
        },
      });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vouchers-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (e) {
      toast.error(apiMessage(e, "The export could not be built."));
    } finally {
      setExporting(false);
    }
  }

  const columns: Column<Voucher>[] = [
    { key: "voucherNo", header: "Voucher #", cell: (v) => (
        <div className="flex items-center gap-2">
          <div className={cn("size-7 rounded-md flex items-center justify-center", TYPE_COLOR[v.type] ?? TYPE_COLOR.JV)}>
            {React.createElement(TYPE_ICON[v.type] ?? FileText, { className: "size-3.5" })}
          </div>
          <div>
            <div className="tabular text-sm font-medium text-navy-900 dark:text-white">{v.voucherNo}</div>
            <div className="text-2xs text-slate-500 dark:text-slate-400">{v.typeName}</div>
          </div>
        </div>
      )
    },
    { key: "date", header: "Date", cell: (v) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(v.date)}</span> },
    { key: "partyName", header: "Party", cell: (v) => (
        <div>
          <div className="text-sm font-medium text-navy-900 dark:text-white">{v.partyName ?? v.cashBankAccount ?? "—"}</div>
          <div className="text-2xs text-slate-500 dark:text-slate-400">{v.location}</div>
        </div>
      )
    },
    { key: "paymentMethod", header: "Method", cell: (v) => (
        <div>
          <Badge variant="muted">{v.paymentMethod}</Badge>
          {v.paymentProvider && <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">{v.paymentProvider}</div>}
        </div>
      )
    },
    { key: "reference", header: "Reference", cell: (v) => <span className="tabular text-xs text-slate-600 dark:text-slate-300">{v.reference ?? "—"}</span> },
    { key: "narration", header: "Narration", cell: (v) => <span className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">{v.narration}</span> },
    { key: "amount", header: "Amount", align: "right", cell: (v) => (
        /* isReceipt comes from the API, so a new voucher type does not need
           this page to learn a new code before it shows the right sign. */
        <span className={cn("tabular text-sm font-bold", v.isReceipt ? "text-success" : "text-danger")}>
          {v.isReceipt ? "+" : "-"}{formatMoney(v.amount)}
        </span>
      )
    },
    { key: "status", header: "Status", cell: (v) => (
        <StatusPill variant={STATUS_VARIANT[v.status] ?? "muted"}>{v.statusName}</StatusPill>
      )
    },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Vouchers" }]}
        title="Vouchers"
        subtitle="Cash, bank, mobile wallet and journal vouchers"
        actions={
          <>
            <Button variant="secondary" size="md" className="gap-1.5" onClick={() => void exportXlsx()} disabled={exporting || data.count === 0}>
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <FileDown />}
              <span>Export</span>
            </Button>
            <Button variant="accent" size="md" className="gap-1.5" asChild>
              <Link href="/accounting/vouchers/new"><Plus /><span>New Voucher</span></Link>
            </Button>
          </>
        }
      />

      {error && (
        <Card className="p-4 mb-6 border-danger/40">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{error}</div>
            <Button variant="secondary" size="sm" onClick={() => void load()}>Try again</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Money In (posted)</div>
              <div className="text-2xl tabular font-bold text-success mt-1">{formatCompact(data.receiptTotal)}</div>
            </div>
            <ArrowDownToLine className="size-5 text-success" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Money Out (posted)</div>
              <div className="text-2xl tabular font-bold text-danger mt-1">{formatCompact(data.paymentTotal)}</div>
            </div>
            <ArrowUpFromLine className="size-5 text-danger" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Net</div>
              <div className={cn("text-2xl tabular font-bold mt-1",
                data.receiptTotal - data.paymentTotal >= 0 ? "text-success" : "text-danger")}>
                {formatCompact(data.receiptTotal - data.paymentTotal)}
              </div>
            </div>
            <Wallet className="size-5 text-brand-yellow" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Drafts Awaiting Posting</div>
          <div className={cn("text-2xl tabular font-bold mt-1", data.draftCount ? "text-warning" : "text-slate-400")}>
            {data.draftCount.toLocaleString()}
          </div>
        </Card>
      </div>

      {/* Type tabs -- each one is a filter the server applies, not a slice of
          what the browser happens to be holding. */}
      <div className="flex items-center gap-1 mb-4 border-b border-slate-200 dark:border-navy-700 overflow-x-auto scrollbar-thin">
        {TYPES.map((t) => (
          <button
            key={t.key || "ALL"}
            onClick={() => { setTypeFilter(t.key); setPage(1); }}
            className={cn(
              "relative inline-flex items-center px-3.5 py-2.5 text-sm font-medium transition-colors -mb-px outline-none whitespace-nowrap",
              typeFilter === t.key
                ? "text-navy-900 dark:text-white"
                : "text-slate-500 hover:text-navy-900 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            {t.label}
            {typeFilter === t.key && <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-brand-yellow rounded-t-full" />}
          </button>
        ))}
      </div>

      <FilterBar
        searchPlaceholder="Search by number, party or reference…"
        searchValue={search}
        onSearchChange={setSearch}
        chips={chips}
        onRemoveChip={removeChip}
        onClearAll={clearAll}
        extraActions={
          <div className="flex items-center gap-2">
            <SelectNative aria-label="Status" value={status} onChange={(ev) => { setStatus(ev.target.value); setPage(1); }} className="w-40">
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="POSTED">Posted</option>
              <option value="RECONCILED">Reconciled</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REVERSED">Reversed</option>
            </SelectNative>
            <Input type="date" aria-label="From date" value={from} onChange={(ev) => { setFrom(ev.target.value); setPage(1); }} className="w-40" />
            <Input type="date" aria-label="To date" value={to} onChange={(ev) => { setTo(ev.target.value); setPage(1); }} className="w-40" />
          </div>
        }
      />

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={data.items}
              rowHref={(v) => `/accounting/vouchers/${v.id}`}
              pageSize={PAGE_SIZE}
            />
            <Pager
              page={data.page}
              pageCount={data.pageCount}
              total={data.count}
              noun="vouchers"
              onPage={setPage}
              disabled={loading}
            />
          </>
        )}
      </Card>
    </>
  );
}
