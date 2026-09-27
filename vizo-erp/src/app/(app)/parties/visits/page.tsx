"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import { MapPin, Search, AlertCircle, RefreshCw, CalendarDays, Plus, CalendarClock, Phone } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SelectNative } from "@/components/ui/select-native";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Pager } from "@/components/ui/pager";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { LogVisitSheet, VisitMapLink } from "@/components/parties/log-visit-sheet";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /visits -> { total, page, pageSize, summary, mayLog, items } (VisitsController).

   It used to read GET /parties/visits and render whatever came back: the seven
   seed rows, for every rep, with nothing able to add an eighth. The list is
   now paged and filtered on the server, a rep sees his own customers' visits
   only, the cards are counted over everything that matches, and "Log visit"
   writes a real row. */
type Visit = {
  id: number;
  customerId: number;
  customerName: string;
  customerInitials: string;
  customerCode: string;
  city: string | null;
  phone: string | null;
  visitedAt: string;
  loggedAt: string | null;
  salesPersonId: number;
  salesPerson: string;
  outcome: string;
  outcomeName: string;
  note: string | null;
  nextFollowUp: string | null;
  latitude: number | null;
  longitude: number | null;
  gpsAccuracyM: number | null;
  followUpDue: boolean;
  loggedLate: boolean;
};

type VisitsResponse = {
  total: number;
  page: number;
  pageSize: number;
  summary: { visits: number; customersSeen: number; reps: number; ledToOrder: number; thisMonth: number; followUpsDue: number };
  mayLog: boolean;
  items: Visit[];
};

type Outcome = { id: number; key: string; name: string };

const OUTCOME_VARIANT: Record<string, "success" | "info" | "warning" | "muted" | "danger"> = {
  ORDER_PLACED: "success",
  PAYMENT_COLLECTED: "success",
  FOLLOWUP: "warning",
  NO_ORDER: "muted",
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

const PAGE_SIZE = 25;

export default function VisitsPage() {
  const [data, setData] = React.useState<VisitsResponse | null>(null);
  const [outcomes, setOutcomes] = React.useState<Outcome[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [applied, setApplied] = React.useState("");
  const [outcome, setOutcome] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [logging, setLogging] = React.useState(false);

  /* Typing searches after a pause, not on every key -- the list is paged on
     the server, so each search is a request. */
  React.useEffect(() => {
    const t = setTimeout(() => { setApplied(query.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<VisitsResponse>(`${API_BASE_URL}/visits`, {
        params: { q: applied || undefined, outcome: outcome || undefined, page, pageSize: PAGE_SIZE },
        headers: authHeader(),
      });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the visit log."));
    } finally {
      setLoading(false);
    }
  }, [applied, outcome, page]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. */
    void load();
  }, [load]);

  /* The outcome filter offers the VisitOutcome table, not whatever outcomes
     happen to be on this page. */
  React.useEffect(() => {
    let live = true;
    axios.get<{ outcomes: Outcome[] }>(`${API_BASE_URL}/visits/lookups`, { headers: authHeader() })
      .then((r) => { if (live) setOutcomes(r.data.outcomes); })
      .catch(() => { /* the filter just offers "All outcomes" */ });
    return () => { live = false; };
  }, []);

  const s = data?.summary;
  const pageCount = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "People" }, { label: "Visits" }]}
        title="Customer Visits"
        subtitle="Where the sales team has been, and what came of it"
        actions={
          <>
            <Button variant="ghost" size="md" className="gap-1.5" onClick={() => { setLoading(true); void load(); }}>
              <RefreshCw className="size-4" /><span className="hidden sm:inline">Refresh</span>
            </Button>
            {data?.mayLog && (
              <Button variant="accent" size="md" className="gap-1.5" onClick={() => setLogging(true)}>
                <Plus className="size-4" /> Log visit
              </Button>
            )}
          </>
        }
      />

      {error && (
        <Card className="mb-4">
          <CardBody className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0 text-sm font-semibold text-navy-900 dark:text-white">{error}</div>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setLoading(true); void load(); }}>
              <RefreshCw className="size-4" /> Try again
            </Button>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Visits logged" value={s?.visits} sub={s ? `${s.thisMonth} this month` : undefined} loading={loading} />
        <Stat label="Customers seen" value={s?.customersSeen} sub={s ? `by ${s.reps} rep${s.reps === 1 ? "" : "s"}` : undefined} loading={loading} />
        <Stat label="Led to an order" value={s?.ledToOrder} loading={loading} tone="text-success" />
        <Stat label="Follow-ups due" value={s?.followUpsDue} loading={loading} tone={s?.followUpsDue ? "text-warning" : undefined} />
      </div>

      <Card className="mb-4">
        <CardBody className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customer, code or note" className="pl-9" />
          </div>
          <SelectNative value={outcome} onChange={(e) => { setOutcome(e.target.value); setPage(1); }} className="sm:w-52" aria-label="Filter by outcome">
            <option value="">All outcomes</option>
            {outcomes.map((o) => <option key={o.id} value={o.key}>{o.name}</option>)}
          </SelectNative>
        </CardBody>
      </Card>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : !data || data.items.length === 0 ? (
        <Card>
          <EmptyState
            icon={MapPin}
            title={applied || outcome ? "No visits match" : "No visits logged"}
            description={applied || outcome
              ? "Try clearing the search or the filter."
              : data?.mayLog ? "Log the first one from the shop, with the button above." : "Nothing has been logged yet."}
            action={data?.mayLog && !applied && !outcome
              ? <Button variant="accent" onClick={() => setLogging(true)}><Plus className="size-4" /> Log visit</Button>
              : undefined}
          />
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-navy-700">
            {data.items.map((v) => (
              <div key={v.id} className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <Link href={`/parties/${v.customerId}`} className="flex items-center gap-3 flex-1 min-w-0 group">
                  <Avatar initials={v.customerInitials} size="md" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-navy-900 dark:text-white truncate group-hover:text-brand-yellow transition-colors">
                      {v.customerName}
                    </div>
                    <div className="text-2xs text-slate-500 dark:text-slate-400 truncate">
                      {v.customerCode}{v.city ? ` · ${v.city}` : ""} · {v.salesPerson}
                    </div>
                    {v.note && <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">{v.note}</div>}
                  </div>
                </Link>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end sm:w-72 shrink-0 pl-12 sm:pl-0">
                  <Badge variant={OUTCOME_VARIANT[v.outcome] ?? "muted"}>{v.outcomeName}</Badge>
                  <span className="text-2xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1" title={v.loggedAt ? `logged ${formatDateTime(v.loggedAt)}` : undefined}>
                    <CalendarDays className="size-3" /> {formatDateTime(v.visitedAt)}
                    {v.loggedLate && <span className="text-warning">· logged later</span>}
                  </span>
                  {v.nextFollowUp && (
                    <span className={cn("text-2xs inline-flex items-center gap-1", v.followUpDue ? "text-warning font-medium" : "text-slate-500 dark:text-slate-400")}>
                      <CalendarClock className="size-3" /> back {formatDate(v.nextFollowUp)}
                    </span>
                  )}
                  {v.latitude != null && v.longitude != null && (
                    <VisitMapLink lat={v.latitude} lng={v.longitude} accuracy={v.gpsAccuracyM} />
                  )}
                  {v.phone && (
                    <a href={`tel:${v.phone}`} className="text-2xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1 hover:text-brand-yellow">
                      <Phone className="size-3" /> call
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pager page={page} pageCount={pageCount} total={data.total} noun="visits" onPage={setPage} disabled={loading} />
        </Card>
      )}

      {logging && (
        <LogVisitSheet
          open
          onOpenChange={setLogging}
          onLogged={() => { setLogging(false); setPage(1); void load(); }}
        />
      )}
    </>
  );
}

function Stat({ label, value, sub, loading, tone }: { label: string; value?: number; sub?: string; loading: boolean; tone?: string }) {
  return (
    <Card className="p-4">
      <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      {loading
        ? <Skeleton className="h-7 mt-1" />
        : <div className={cn("text-2xl tabular font-bold mt-1", tone ?? "text-navy-900 dark:text-white")}>{value ?? 0}</div>}
      {sub && !loading && <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">{sub}</div>}
    </Card>
  );
}
