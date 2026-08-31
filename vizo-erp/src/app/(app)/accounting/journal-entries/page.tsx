"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import { Plus, FileText, CheckCircle2, RotateCcw, AlertCircle, FileDown, Loader2 } from "lucide-react";
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
import { formatMoney, formatDate } from "@/lib/format";
import { statusLabel } from "@/lib/labels";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/* GET /accounting/journal-entries
   -> { total, page, pageSize, pageCount, postedCount, draftCount,
        reversedCount, items }
   The counts are over the whole filter, not the page on screen. */
type JE = {
  id: number;
  entryNo: string;
  entryDate: string;
  entryType: string;
  entryTypeName: string;
  reference: string | null;
  location: string;
  narration: string;
  status: string;
  statusName: string;
  createdBy: string;
  postedBy: string | null;
  reversedById: number | null;
  reversedBy: string | null;
  totalDebit: number;
  totalCredit: number;
};

type JePage = {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  postedCount: number;
  draftCount: number;
  reversedCount: number;
  items: JE[];
};

const JE_STATUS_VARIANT: Record<string, "success" | "muted" | "danger" | "warning"> = {
  DRAFT: "muted",
  POSTED: "success",
  REVERSED: "warning",
  REJECTED: "danger",
  CANCELLED: "muted",
  RECONCILED: "success",
};

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

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

const EMPTY: JePage = {
  total: 0, page: 1, pageSize: PAGE_SIZE, pageCount: 1,
  postedCount: 0, draftCount: 0, reversedCount: 0, items: [],
};

export default function JournalEntriesPage() {
  const [data, setData] = React.useState<JePage>(EMPTY);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);

  const [search, setSearch] = React.useState("");
  const [query, setQuery] = React.useState("");
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
      const res = await axios.get<JePage>(`${API_BASE_URL}/accounting/journal-entries`, {
        headers: authHeader(),
        params: {
          q: query || undefined,
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
      setError(apiMessage(e, "Could not load the journal entries."));
    } finally {
      setLoading(false);
    }
  }, [query, status, from, to, page]);

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
      const res = await axios.get(`${API_BASE_URL}/accounting/journal-entries/export`, {
        headers: authHeader(),
        responseType: "blob",
        params: { q: query || undefined, status: status || undefined, from: from || undefined, to: to || undefined },
      });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `journal-entries-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (e) {
      toast.error(apiMessage(e, "The export could not be built."));
    } finally {
      setExporting(false);
    }
  }

  const columns: Column<JE>[] = [
    { key: "entryNo", header: "Entry #", cell: (j) => (
      <span className="tabular text-sm font-medium text-navy-900 dark:text-white">{j.entryNo}</span>
    ) },
    { key: "entryDate", header: "Date", cell: (j) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(j.entryDate)}</span> },
    { key: "entryType", header: "Type", cell: (j) => <Badge variant="muted">{j.entryTypeName}</Badge> },
    { key: "reference", header: "Reference", cell: (j) => <span className="tabular text-xs text-slate-600 dark:text-slate-300">{j.reference ?? "—"}</span> },
    { key: "narration", header: "Narration", cell: (j) => <span className="text-sm text-slate-700 dark:text-slate-200 line-clamp-1">{j.narration}</span> },
    { key: "location", header: "Location", cell: (j) => <span className="text-xs text-slate-600 dark:text-slate-300">{j.location}</span> },
    { key: "totalDebit", header: "Debit", align: "right", cell: (j) => <span className="tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(j.totalDebit)}</span> },
    { key: "totalCredit", header: "Credit", align: "right", cell: (j) => <span className="tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(j.totalCredit)}</span> },
    { key: "status", header: "Status", cell: (j) => (
      <div className="flex items-center gap-1.5">
        <StatusPill variant={JE_STATUS_VARIANT[j.status] ?? "muted"}>{j.statusName}</StatusPill>
        {/* A reversed entry stays POSTED so the pair cancels in the
            statements. Without this badge the list could not say so. */}
        {j.reversedBy && <Badge variant="warning">Reversed</Badge>}
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Journal Entries" }]}
        title="Journal Entries"
        subtitle="Complete double-entry transaction log"
        actions={
          <>
            <Button variant="secondary" size="md" className="gap-1.5" onClick={() => void exportXlsx()} disabled={exporting || data.total === 0}>
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <FileDown />}
              <span>Export</span>
            </Button>
            <Button variant="accent" size="md" className="gap-1.5" asChild>
              <Link href="/accounting/journal-entries/new"><Plus /><span>New Entry</span></Link>
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
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
                {chips.length ? "Matching Entries" : "Total Entries"}
              </div>
              <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{data.total.toLocaleString()}</div>
            </div>
            <FileText className="size-5 text-info" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Posted</div>
              <div className="text-2xl tabular font-bold text-success mt-1">{data.postedCount.toLocaleString()}</div>
            </div>
            <CheckCircle2 className="size-5 text-success" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Draft</div>
          <div className={`text-2xl tabular font-bold mt-1 ${data.draftCount ? "text-warning" : "text-slate-400"}`}>
            {data.draftCount.toLocaleString()}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Reversed</div>
              <div className="text-2xl tabular font-bold text-danger mt-1">{data.reversedCount.toLocaleString()}</div>
            </div>
            <RotateCcw className="size-5 text-danger" />
          </div>
        </Card>
      </div>

      <FilterBar
        searchPlaceholder="Search by number, narration or reference…"
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
              <option value="REVERSED">Reversed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="RECONCILED">Reconciled</option>
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
              rowHref={(j) => `/accounting/journal-entries/${j.id}`}
              pageSize={PAGE_SIZE}
            />
            <Pager
              page={data.page}
              pageCount={data.pageCount}
              total={data.total}
              noun="entries"
              onPage={setPage}
              disabled={loading}
            />
          </>
        )}
      </Card>
    </>
  );
}
