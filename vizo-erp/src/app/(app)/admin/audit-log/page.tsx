"use client";

import * as React from "react";
import axios from "axios";
import {
  Filter, Globe, Building2, Clock, Mail, Tag, AlertCircle, RefreshCw,
  ChevronLeft, ChevronRight, ScrollText, Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ReportToolbar } from "@/components/widgets/report-toolbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { initials, formatDate, formatRelative, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ─────────────────────────── shapes from the API ─────────────────────────── */

type AuditRow = {
  id: number;
  user: string;
  action: string;
  entityType: string | null;
  entityReference: string | null;
  entity: string | null;
  detail: string | null;
  time: string;
  ip: string | null;
  location: string | null;
  severity: string;
};

type AuditDetail = AuditRow & { userEmail: string | null };

type AuditPage = {
  items: AuditRow[];
  total: number;
  page: number;
  pageSize: number;
};

type AuditStats = {
  totalToday: number;
  failedLogins: number;
  permissionChanges: number;
  recentLogins: number;
};

type SeverityLevel = { id: number; key: string; name: string };

type BadgeVariant = "success" | "warning" | "danger" | "info" | "muted" | "accent" | "outline";

const SEVERITY_VARIANT: Record<string, BadgeVariant> = {
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
  muted: "muted",
};

function severityVariant(key: string): BadgeVariant {
  return SEVERITY_VARIANT[key] ?? "muted";
}

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

const PAGE_SIZE = 25;

export default function AuditLogPage() {
  /* filters — every one of them is applied by the server */
  const [search, setSearch] = React.useState("");
  const [q, setQ] = React.useState("");
  const [from, setFrom] = React.useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [severity, setSeverity] = React.useState("all");
  const [page, setPage] = React.useState(1);

  const [data, setData] = React.useState<AuditPage | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [stats, setStats] = React.useState<AuditStats | null>(null);
  const [levels, setLevels] = React.useState<SeverityLevel[]>([]);

  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [detail, setDetail] = React.useState<AuditDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);

  /* Typing shouldn't hit the API on every keystroke — settle for ~300ms first,
     and drop back to page 1 in the same tick so only one request goes out. */
  React.useEffect(() => {
    const t = setTimeout(() => {
      setQ(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<AuditPage>(`${API_BASE_URL}/admin/audit-log`, {
        headers: authHeader(),
        params: {
          q: q || undefined,
          from: from || undefined,
          to: to || undefined,
          severity: severity === "all" ? undefined : severity,
          page,
          pageSize: PAGE_SIZE,
        },
      });
      setData(res.data);
    } catch (e) {
      setError(apiMessage(e, "Could not load the audit log."));
    } finally {
      setLoading(false);
    }
  }, [q, from, to, severity, page]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const loadStats = React.useCallback(async () => {
    try {
      const res = await axios.get<AuditStats>(`${API_BASE_URL}/admin/audit-log/stats`, {
        headers: authHeader(),
      });
      setStats(res.data);
    } catch {
      setStats(null);
    }
  }, []);

  const loadLevels = React.useCallback(async () => {
    try {
      const res = await axios.get<SeverityLevel[]>(`${API_BASE_URL}/admin/severity-levels`, {
        headers: authHeader(),
      });
      setLevels(res.data);
    } catch {
      setLevels([]);
    }
  }, []);

  React.useEffect(() => {
    void loadStats();
    void loadLevels();
  }, [loadStats, loadLevels]);

  /* The row list carries a summary; the dialog shows the stored record itself. */
  React.useEffect(() => {
    if (selectedId === null) return;
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    axios
      .get<AuditDetail>(`${API_BASE_URL}/admin/audit-log/${selectedId}`, { headers: authHeader() })
      .then((res) => {
        if (!cancelled) setDetail(res.data);
      })
      .catch((e) => {
        if (!cancelled) setDetailError(apiMessage(e, "Could not load this entry."));
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  function applyRange(f: string, t: string) {
    setFrom(f);
    setTo(t);
    setPage(1);
  }

  function applySeverity(s: string) {
    setSeverity(s);
    setPage(1);
  }

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? PAGE_SIZE;
  const currentPage = data?.page ?? page;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const firstRow = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastRow = Math.min(currentPage * pageSize, total);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "Audit Log" }]}
        title="Audit Log"
        subtitle="Complete trail of every action across the system"
        actions={
          <ReportToolbar mode="range" reportName="Audit Log" fromDate={from} toDate={to} onRangeChange={applyRange} />
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Events Today" value={stats?.totalToday} tone="text-navy-900 dark:text-white" />
        <StatCard label="Failed Logins" value={stats?.failedLogins} tone="text-danger" />
        <StatCard label="Permission Changes" value={stats?.permissionChanges} tone="text-warning" />
        <StatCard label="Logins (last 24h)" value={stats?.recentLogins} tone="text-success" />
      </div>

      <FilterBar
        searchPlaceholder="Search by user, action, entity…"
        searchValue={search}
        onSearchChange={setSearch}
        extraActions={
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="secondary" size="md" className="gap-1.5">
                <Filter />
                <span className="hidden sm:inline">Severity{severity !== "all" && `: ${severity}`}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-44 p-1">
              <button
                onClick={() => applySeverity("all")}
                className={cn(
                  "w-full text-left px-2.5 py-2 text-sm rounded-md hover:bg-slate-50 dark:hover:bg-navy-700 capitalize",
                  severity === "all" && "text-brand-yellow font-semibold"
                )}
              >
                all
              </button>
              {levels.map((s) => (
                <button
                  key={s.id}
                  onClick={() => applySeverity(s.key)}
                  className={cn(
                    "w-full text-left px-2.5 py-2 text-sm rounded-md hover:bg-slate-50 dark:hover:bg-navy-700 capitalize",
                    s.key === severity && "text-brand-yellow font-semibold"
                  )}
                >
                  {s.name}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        }
      />

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-100 dark:divide-navy-700">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-4">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={AlertCircle}
            title="Could not load the audit log"
            description={error}
            action={
              <Button variant="accent" onClick={() => void load()}>
                <RefreshCw />
                Try again
              </Button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No events match the current filters"
            description="Widen the date range, clear the search, or pick a different severity."
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-navy-700">
            {rows.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className="w-full flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors text-left"
              >
                <Avatar initials={a.user === "System" ? "SY" : initials(a.user)} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-navy-900 dark:text-white">{a.user}</span>
                    <Badge variant={severityVariant(a.severity)}>{a.action}</Badge>
                    <span className="text-sm text-slate-600 dark:text-slate-300 truncate">
                      {a.entity ?? [a.entityType, a.entityReference].filter(Boolean).join(" ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-2xs text-slate-500 dark:text-slate-400">
                    <span>{formatRelative(a.time)}</span>
                    {a.ip && (
                      <>
                        <span>·</span>
                        <span className="tabular">{a.ip}</span>
                      </>
                    )}
                    {a.location && a.location !== "—" && (
                      <>
                        <span>·</span>
                        <span>{a.location}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className="text-xs text-brand-yellow font-medium flex-shrink-0">View details →</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      {!loading && !error && total > 0 && (
        <div className="flex items-center justify-between gap-3 mt-4">
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular">
            Showing {formatNumber(firstRow)}–{formatNumber(lastRow)} of {formatNumber(total)}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="gap-1"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-3.5" />
              Previous
            </Button>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular px-1">
              Page {currentPage} of {lastPage}
            </span>
            <Button
              variant="secondary"
              size="sm"
              className="gap-1"
              disabled={currentPage >= lastPage}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={selectedId !== null} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Avatar initials={detail?.user === "System" ? "SY" : initials(detail?.user ?? "")} size="sm" />
              <span>{detail?.user ?? "Audit entry"}</span>
              {detail && <Badge variant={severityVariant(detail.severity)}>{detail.action}</Badge>}
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center gap-2 py-8 justify-center text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="size-4 animate-spin" />
              Loading entry…
            </div>
          ) : detailError ? (
            <div className="py-6 text-sm text-danger">{detailError}</div>
          ) : detail ? (
            <div className="space-y-4 mt-2">
              <div className="text-sm text-slate-700 dark:text-slate-200">
                <span className="font-semibold">Entity:</span>{" "}
                {[detail.entityType, detail.entityReference].filter(Boolean).join(" · ") || "—"}
              </div>
              {detail.detail && (
                <div className="rounded-lg bg-slate-50 dark:bg-navy-800 p-3 text-xs text-slate-600 dark:text-slate-300 max-h-40 overflow-auto">
                  <div className="text-2xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    What was recorded
                  </div>
                  {detail.detail}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <Meta icon={Clock} label="When" value={`${formatDate(detail.time)} · ${formatRelative(detail.time)}`} />
                <Meta icon={Mail} label="User Email" value={detail.userEmail ?? "—"} plain />
                <Meta icon={Globe} label="IP Address" value={detail.ip ?? "—"} plain />
                <Meta icon={Building2} label="Location" value={detail.location ?? "—"} />
                <Meta icon={Tag} label="Entity Type" value={detail.entityType ?? "—"} />
                <Meta icon={Filter} label="Severity" value={detail.severity} />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number | undefined; tone: string }) {
  return (
    <Card className="p-4">
      <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      {value === undefined ? (
        <Skeleton className="h-7 w-12 mt-1.5" />
      ) : (
        <div className={cn("text-2xl tabular font-bold mt-1", tone)}>{formatNumber(value)}</div>
      )}
    </Card>
  );
}

function Meta({
  icon: Icon,
  label,
  value,
  plain,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  plain?: boolean;
}) {
  return (
    <div>
      <dt className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
        <Icon className="size-3.5 text-slate-400" />
        {label}
      </dt>
      <dd
        className={cn(
          "text-sm font-medium text-navy-900 dark:text-white mt-1 break-words",
          plain ? "tabular" : "capitalize"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
