"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import { MapPin, Search, AlertCircle, RefreshCw, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SelectNative } from "@/components/ui/select-native";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /parties/visits -> CustomerVisit rows, newest first. This page used to
   render a frozen VISITS array declared at the top of the file, so a visit
   logged by a rep never appeared here at all. */
type Visit = {
  id: number;
  customerId: number;
  customerName: string;
  customerInitials: string;
  visitedAt: string;
  salesPerson: string | null;
  outcome: string | null;
  outcomeName: string | null;
  note: string | null;
};

const OUTCOME_VARIANT: Record<string, "success" | "info" | "warning" | "muted" | "danger"> = {
  ORDER_PLACED: "success",
  PAYMENT_COLLECTED: "success",
  FOLLOW_UP: "warning",
  NO_ORDER: "muted",
  CLOSED: "muted",
  COMPLAINT: "danger",
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function VisitsPage() {
  const [visits, setVisits] = React.useState<Visit[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [outcome, setOutcome] = React.useState("ALL");
  const [person, setPerson] = React.useState("ALL");

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<Visit[] | { items: Visit[] }>(`${API_BASE_URL}/parties/visits`, { headers: authHeader() });
      setVisits(Array.isArray(res.data) ? res.data : res.data.items);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the visit log."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. */
    void load();
  }, [load]);

  /* Both filter lists are built from what actually came back, so they can
     never offer an outcome or a rep that does not exist in the data. */
  const outcomes = React.useMemo(
    () => Array.from(new Set(visits.map((v) => v.outcomeName).filter((x): x is string => Boolean(x)))).sort(),
    [visits]
  );
  const people = React.useMemo(
    () => Array.from(new Set(visits.map((v) => v.salesPerson).filter((x): x is string => Boolean(x)))).sort(),
    [visits]
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return visits.filter((v) => {
      if (outcome !== "ALL" && v.outcomeName !== outcome) return false;
      if (person !== "ALL" && v.salesPerson !== person) return false;
      if (!q) return true;
      return v.customerName.toLowerCase().includes(q) || (v.note ?? "").toLowerCase().includes(q);
    });
  }, [visits, query, outcome, person]);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "People" }, { label: "Visits" }]}
        title="Customer Visits"
        subtitle="Where the sales team has been, and what came of it"
        actions={
          <Button variant="ghost" size="md" className="gap-1.5" onClick={() => { setLoading(true); void load(); }}>
            <RefreshCw className="size-4" /><span className="hidden sm:inline">Refresh</span>
          </Button>
        }
      />

      {error && (
        <Card className="mb-4">
          <CardBody className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-navy-900 dark:text-white">{error}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">The API must be running on {API_BASE_URL}.</div>
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setLoading(true); void load(); }}>
              <RefreshCw className="size-4" /> Try again
            </Button>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Visits logged" value={String(visits.length)} loading={loading} />
        <Stat label="Customers seen" value={String(new Set(visits.map((v) => v.customerId)).size)} loading={loading} />
        <Stat label="Reps out" value={String(people.length)} loading={loading} />
        <Stat
          label="Led to an order"
          value={String(visits.filter((v) => v.outcome === "ORDER_PLACED").length)}
          loading={loading}
          tone="text-success"
        />
      </div>

      <Card className="mb-4">
        <CardBody className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customer or note" className="pl-9" />
          </div>
          <SelectNative value={outcome} onChange={(e) => setOutcome(e.target.value)} className="sm:w-48" aria-label="Filter by outcome">
            <option value="ALL">All outcomes</option>
            {outcomes.map((o) => <option key={o} value={o}>{o}</option>)}
          </SelectNative>
          <SelectNative value={person} onChange={(e) => setPerson(e.target.value)} className="sm:w-48" aria-label="Filter by sales person">
            <option value="ALL">All reps</option>
            {people.map((p) => <option key={p} value={p}>{p}</option>)}
          </SelectNative>
        </CardBody>
      </Card>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={MapPin}
            title={visits.length === 0 ? "No visits logged" : "No visits match"}
            description={visits.length === 0
              ? "Nothing has been recorded in CustomerVisit yet."
              : "Try clearing the search or the filters."}
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((v) => (
            <Card key={v.id} className="hover:border-brand-yellow/40 transition-colors">
              <CardBody className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <Link href={`/parties/${v.customerId}`} className="flex items-center gap-3 flex-1 min-w-0 group">
                  <Avatar initials={v.customerInitials} size="md" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-navy-900 dark:text-white truncate group-hover:text-brand-yellow transition-colors">
                      {v.customerName}
                    </div>
                    {v.note && <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{v.note}</div>}
                  </div>
                </Link>

                {v.salesPerson && (
                  <div className="text-xs text-slate-600 dark:text-slate-300 sm:w-32 truncate">{v.salesPerson}</div>
                )}

                {v.outcomeName && (
                  <Badge variant={OUTCOME_VARIANT[v.outcome ?? ""] ?? "muted"}>{v.outcomeName}</Badge>
                )}

                <div className="text-2xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5 sm:w-32 sm:justify-end shrink-0">
                  <CalendarDays className="size-3" />
                  {formatDate(v.visitedAt)}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function Stat({ label, value, loading, tone }: { label: string; value: string; loading: boolean; tone?: string }) {
  return (
    <Card className="p-4">
      <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      {loading
        ? <Skeleton className="h-7 mt-1" />
        : <div className={cn("text-2xl tabular font-bold mt-1", tone ?? "text-navy-900 dark:text-white")}>{value}</div>}
    </Card>
  );
}
