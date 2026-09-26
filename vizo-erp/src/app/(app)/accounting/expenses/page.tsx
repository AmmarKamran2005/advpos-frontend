"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import {
  Plus, Receipt, AlertCircle, FileDown, Loader2, CalendarPlus, ChevronRight, CalendarDays, MapPin,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { StatusPill } from "@/components/ui/badge";
import { FilterBar } from "@/components/ui/filter-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { Pager } from "@/components/ui/pager";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";
import { formatMoney, formatDate } from "@/lib/format";
import { todayISO } from "@/lib/dates";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Expenses, a day at a time
 * ─────────────────────────────────────────────────────────────────────────────
 * Until 26 Sep this screen listed single expenses, each its own voucher. The
 * owner asked for one invoice per day, so it now lists DAY SHEETS: one row per
 * date and location, with how many expenses the day had, what they came to and
 * whether the accountant has approved it. Opening a row opens the day's grid.
 *
 * "New" opens today's sheet for your location (or the one already open), and
 * "Open a date" does the same for any past day -- yesterday's petty cash is
 * entered today all the time. The per-expense lines can still be exported.
 */

type SheetRow = {
  id: number;
  sheetNo: string;
  sheetDate: string;
  locationId: number;
  location: string;
  status: "DRAFT" | "POSTED" | "REVERSED";
  statusName: string;
  lines: number;
  total: number;
  createdBy: string;
  approvedBy: string | null;
  updatedAt: string;
};

type ListResponse = {
  count: number;
  total: number;
  draftCount: number;
  page: number;
  pageSize: number;
  pageCount: number;
  items: SheetRow[];
};

type Lookups = {
  locations: { id: number; name: string }[];
  defaultLocationId: number | null;
  today: string;
};

const PAGE_SIZE = 25;
const STATUS_VARIANT = { DRAFT: "warning", POSTED: "success", REVERSED: "danger" } as const;
const STATUS_TEXT: Record<string, string> = { DRAFT: "Draft", POSTED: "Approved", REVERSED: "Reversed" };
const EMPTY: ListResponse = { count: 0, total: 0, draftCount: 0, page: 1, pageSize: PAGE_SIZE, pageCount: 1, items: [] };

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

function weekday(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
}

export default function ExpenseSheetsPage() {
  const router = useRouter();
  const params = useSearchParams();

  const [data, setData] = React.useState<ListResponse>(EMPTY);
  const [lookups, setLookups] = React.useState<Lookups | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);
  const [opening, setOpening] = React.useState(false);

  const [search, setSearch] = React.useState("");
  const [query, setQuery] = React.useState("");
  /* The accountant's dashboard links here with ?status=DRAFT ("Review"). */
  const [status, setStatus] = React.useState(() => (params.get("status") ?? "").toUpperCase());
  const [locationId, setLocationId] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [page, setPage] = React.useState(1);

  /* "Open a date": any day up to today, for one of your places. */
  const [openDate, setOpenDate] = React.useState(todayISO());
  const [openLocation, setOpenLocation] = React.useState("");

  React.useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  React.useEffect(() => {
    let live = true;
    axios
      .get<Lookups>(`${API_BASE_URL}/expense-sheets/lookups`, { headers: authHeader() })
      .then((r) => {
        if (!live) return;
        setLookups(r.data);
        setOpenLocation(String(r.data.defaultLocationId ?? r.data.locations[0]?.id ?? ""));
        /* The server's today is Pakistan's; a browser elsewhere may be a day off. */
        setOpenDate(r.data.today.slice(0, 10));
      })
      .catch(() => undefined);
    return () => { live = false; };
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<ListResponse>(`${API_BASE_URL}/expense-sheets`, {
        headers: authHeader(),
        params: {
          q: query || undefined,
          status: status || undefined,
          locationId: locationId || undefined,
          from: from || undefined,
          to: to || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
      });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the expense sheets."));
    } finally {
      setLoading(false);
    }
  }, [query, status, locationId, from, to, page]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  const locationName = lookups?.locations.find((l) => String(l.id) === locationId)?.name;
  const chips = [
    status && { key: "status", label: "Status", value: STATUS_TEXT[status] ?? status },
    locationId && { key: "location", label: "Location", value: locationName ?? locationId },
    from && { key: "from", label: "From", value: formatDate(from) },
    to && { key: "to", label: "To", value: formatDate(to) },
    query && { key: "q", label: "Search", value: query },
  ].filter(Boolean) as { key: string; label: string; value: string }[];

  function removeChip(key: string) {
    if (key === "status") setStatus("");
    if (key === "location") setLocationId("");
    if (key === "from") setFrom("");
    if (key === "to") setTo("");
    if (key === "q") { setSearch(""); setQuery(""); }
    setPage(1);
  }

  function clearAll() {
    setStatus(""); setLocationId(""); setFrom(""); setTo(""); setSearch(""); setQuery(""); setPage(1);
  }

  async function openDay(date?: string, loc?: string) {
    setOpening(true);
    try {
      const res = await axios.post<{ id: number; sheetNo: string; created: boolean }>(
        `${API_BASE_URL}/expense-sheets/open`,
        { date: date || null, locationId: loc ? Number(loc) : null },
        { headers: authHeader() }
      );
      if (res.data.created) toast.success(`${res.data.sheetNo} opened`);
      router.push(`/accounting/expenses/sheets/${res.data.id}`);
    } catch (e) {
      toast.error(apiMessage(e, "The day could not be opened."));
      setOpening(false);
    }
  }

  /* The lines behind the days, as a spreadsheet -- the old export, same filters. */
  async function exportXlsx() {
    setExporting(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/accounting/expenses/export`, {
        headers: authHeader(),
        responseType: "blob",
        params: { q: query || undefined, from: from || undefined, to: to || undefined },
      });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expenses-${todayISO()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (e) {
      toast.error(apiMessage(e, "The export could not be built."));
    } finally {
      setExporting(false);
    }
  }

  const multiPlace = (lookups?.locations.length ?? 0) > 1;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Expenses" }]}
        title="Expenses"
        subtitle="One sheet per day and location — enter the day's expenses, print the day's invoice"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="md" className="gap-1.5" onClick={() => void exportXlsx()} disabled={exporting || data.count === 0}>
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <FileDown />}
              <span>Export lines</span>
            </Button>
            <Button variant="accent" size="md" className="gap-1.5" asChild>
              <Link href="/accounting/expenses/new"><Plus /><span>New — today</span></Link>
            </Button>
          </div>
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

      {/* ── open any day ── */}
      <Card className="p-4 mb-6">
        <form
          className="flex flex-col sm:flex-row sm:items-end gap-3"
          onSubmit={(e) => { e.preventDefault(); void openDay(openDate, openLocation); }}
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-navy-900 dark:text-white sm:mb-2 sm:mr-2">
            <CalendarPlus className="size-4 text-brand-yellow" />Open a date
          </div>
          <label className="flex-1 min-w-0 sm:max-w-[12rem]">
            <span className="block text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Date</span>
            <Input
              type="date"
              value={openDate}
              max={lookups?.today.slice(0, 10)}
              onChange={(e) => setOpenDate(e.target.value)}
              required
            />
          </label>
          {multiPlace && (
            <label className="flex-1 min-w-0 sm:max-w-[16rem]">
              <span className="block text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Location</span>
              <SelectNative value={openLocation} onChange={(e) => setOpenLocation(e.target.value)}>
                {lookups?.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </SelectNative>
            </label>
          )}
          <Button type="submit" variant="primary" size="md" className="gap-1.5" disabled={opening || !openDate}>
            {opening ? <Loader2 className="size-4 animate-spin" /> : <ChevronRight />}Open sheet
          </Button>
          <p className="text-xs text-slate-500 dark:text-slate-400 sm:mb-2.5 sm:ml-auto">
            Opens the day if it is already there, or starts it.
          </p>
        </form>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
                {chips.length ? "Spent in this selection" : "Spent, all days"}
              </div>
              <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{formatMoney(data.total)}</div>
            </div>
            <Receipt className="size-5 text-danger" />
          </div>
          <div className="text-2xs text-slate-400 mt-1">Drafts included · reversed days left out</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Days</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{data.count.toLocaleString()}</div>
        </Card>
        <button
          type="button"
          onClick={() => { setStatus(status === "DRAFT" ? "" : "DRAFT"); setPage(1); }}
          className="text-left"
          title="Show only the days waiting for approval"
        >
          <Card className={`p-4 h-full transition-colors ${status === "DRAFT" ? "ring-2 ring-brand-yellow" : "hover:bg-slate-50 dark:hover:bg-navy-700"}`}>
            <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Awaiting approval</div>
            <div className={`text-2xl tabular font-bold mt-1 ${data.draftCount ? "text-warning" : "text-slate-400"}`}>{data.draftCount.toLocaleString()}</div>
          </Card>
        </button>
      </div>

      <FilterBar
        searchPlaceholder="Sheet number, vendor or description…"
        searchValue={search}
        onSearchChange={setSearch}
        chips={chips}
        onRemoveChip={removeChip}
        onClearAll={clearAll}
        extraActions={
          <div className="flex flex-wrap items-center gap-2">
            <SelectNative aria-label="Status" value={status} onChange={(ev) => { setStatus(ev.target.value); setPage(1); }} className="w-36">
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="POSTED">Approved</option>
              <option value="REVERSED">Reversed</option>
            </SelectNative>
            {multiPlace && (
              <SelectNative aria-label="Location" value={locationId} onChange={(ev) => { setLocationId(ev.target.value); setPage(1); }} className="w-44">
                <option value="">All locations</option>
                {lookups?.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </SelectNative>
            )}
            <Input type="date" aria-label="From date" value={from} onChange={(ev) => { setFrom(ev.target.value); setPage(1); }} className="w-40" />
            <Input type="date" aria-label="To date" value={to} onChange={(ev) => { setTo(ev.target.value); setPage(1); }} className="w-40" />
          </div>
        }
      />

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={chips.length ? "No days match" : "No expense sheets yet"}
            description={chips.length ? "Try a wider date range or clear the filters." : "Open today's sheet and type the day's expenses into it."}
            action={<Button variant="accent" asChild><Link href="/accounting/expenses/new"><Plus />Open today</Link></Button>}
          />
        ) : (
          <>
            {/* desktop: a table */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="text-left text-2xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-navy-700">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Sheet</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold text-right">Lines</th>
                  <th className="px-4 py-3 font-semibold text-right">Total</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Entered by</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => router.push(`/accounting/expenses/sheets/${s.id}`)}
                    className="border-b border-slate-100 dark:border-navy-700/60 hover:bg-slate-50 dark:hover:bg-navy-700/50 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-navy-900 dark:text-white">{formatDate(s.sheetDate)}</div>
                      <div className="text-xs text-slate-400">{weekday(s.sheetDate)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/accounting/expenses/sheets/${s.id}`} className="tabular font-medium text-navy-900 dark:text-white hover:underline" onClick={(e) => e.stopPropagation()}>
                        {s.sheetNo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.location}</td>
                    <td className="px-4 py-3 text-right tabular text-slate-600 dark:text-slate-300">{s.lines}</td>
                    <td className={`px-4 py-3 text-right tabular font-semibold ${s.status === "REVERSED" ? "line-through text-slate-400" : "text-navy-900 dark:text-white"}`}>
                      {formatMoney(s.total, { decimals: 2 })}
                    </td>
                    <td className="px-4 py-3"><StatusPill variant={STATUS_VARIANT[s.status] ?? "muted"}>{s.statusName}</StatusPill></td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {s.createdBy}
                      {s.approvedBy && <div className="text-slate-400">approved by {s.approvedBy}</div>}
                    </td>
                    <td className="pr-3 text-slate-300"><ChevronRight className="size-4" /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* phone: a card per day */}
            <ul className="md:hidden divide-y divide-slate-100 dark:divide-navy-700">
              {data.items.map((s) => (
                <li key={s.id}>
                  <Link href={`/accounting/expenses/sheets/${s.id}`} className="flex items-start gap-3 px-4 py-3 active:bg-slate-50 dark:active:bg-navy-700">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-navy-900 dark:text-white inline-flex items-center gap-1.5">
                          <CalendarDays className="size-3.5 text-slate-400" />{weekday(s.sheetDate)} {formatDate(s.sheetDate)}
                        </span>
                        <StatusPill variant={STATUS_VARIANT[s.status] ?? "muted"}>{s.statusName}</StatusPill>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                        <MapPin className="size-3" />{s.location}
                        <span className="text-slate-300">·</span>
                        <span className="tabular">{s.sheetNo}</span>
                        <span className="text-slate-300">·</span>
                        {s.lines} {s.lines === 1 ? "expense" : "expenses"}
                      </div>
                    </div>
                    <div className={`tabular font-bold text-right shrink-0 ${s.status === "REVERSED" ? "line-through text-slate-400" : "text-navy-900 dark:text-white"}`}>
                      {formatMoney(s.total)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <Pager page={data.page} pageCount={data.pageCount} total={data.count} noun="days" onPage={setPage} disabled={loading} />
          </>
        )}
      </Card>
    </>
  );
}
