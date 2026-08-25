"use client";

import * as React from "react";
import axios from "axios";
import {
  Database, Download, Play, CheckCircle2, XCircle, HardDrive, Archive,
  ShieldCheck, AlertCircle, RefreshCw, Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatDate, formatRelative, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ─────────────────────────── shapes from the API ─────────────────────────── */

type Backup = {
  id: number;
  startedAt: string;
  type: string;
  typeKey: string;
  status: string;
  statusKey: string;
  sizeMb: number | null;
  destination: string | null;
  durationSeconds: number | null;
  hash: string | null;
  triggeredBy: string | null;
};

type BackupStats = {
  lastBackupAt: string | null;
  lastBackupStatus: string | null;
  totalSizeMb: number;
  retained: number;
  successRate: number;
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

/** `sizeMb` arrives as a number now — turn it into something readable. */
function formatSize(mb: number | null) {
  if (mb === null || Number.isNaN(mb)) return "—";
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

/** `durationSeconds` arrives as a number now — `222` → `3m 42s`. */
function formatDuration(seconds: number | null) {
  if (seconds === null || Number.isNaN(seconds)) return "—";
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  if (m < 60) return `${m}m ${rest}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/* The status cell used to be a green tick no matter what the row said. It is
   driven by statusKey now, so a failed run reads as failed. */
const STATUS_META: Record<string, { icon: typeof CheckCircle2; className: string; spin?: boolean }> = {
  SUCCESS: { icon: CheckCircle2, className: "text-success" },
  FAILED: { icon: XCircle, className: "text-danger" },
  RUNNING: { icon: Loader2, className: "text-info", spin: true },
};

export default function BackupPage() {
  const [rows, setRows] = React.useState<Backup[]>([]);
  const [stats, setStats] = React.useState<BackupStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [running, setRunning] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, summary] = await Promise.all([
        axios.get<Backup[]>(`${API_BASE_URL}/admin/backups`, { headers: authHeader() }),
        axios.get<BackupStats>(`${API_BASE_URL}/admin/backups/stats`, { headers: authHeader() }),
      ]);
      setRows(list.data);
      setStats(summary.data);
    } catch (e) {
      setError(apiMessage(e, "Could not load the backup history."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const runBackup = React.useCallback(async () => {
    setRunning(true);
    try {
      const res = await axios.post<{ message?: string }>(
        `${API_BASE_URL}/admin/backups/run`,
        { typeKey: "MANUAL", destination: "Manual download" },
        { headers: authHeader() }
      );
      toast.success(res.data?.message ?? "Backup started.");
      await load();
    } catch (e) {
      toast.error(apiMessage(e, "The backup could not be started."));
    } finally {
      setRunning(false);
    }
  }, [load]);

  const columns: Column<Backup>[] = [
    {
      key: "startedAt",
      header: "Date",
      cell: (b) => (
        <div>
          <div className="text-sm font-medium text-navy-900 dark:text-white">{formatDate(b.startedAt)}</div>
          <div className="text-2xs text-slate-500 dark:text-slate-400">{formatRelative(b.startedAt)}</div>
        </div>
      ),
    },
    { key: "type", header: "Type", cell: (b) => <Badge variant={b.typeKey === "MANUAL" ? "accent" : "info"}>{b.type}</Badge> },
    { key: "sizeMb", header: "Size", align: "right", cell: (b) => <span className="tabular text-sm text-slate-600 dark:text-slate-300">{formatSize(b.sizeMb)}</span> },
    { key: "durationSeconds", header: "Duration", cell: (b) => <span className="tabular text-xs text-slate-500 dark:text-slate-400">{formatDuration(b.durationSeconds)}</span> },
    { key: "destination", header: "Destination", cell: (b) => <span className="text-xs text-slate-600 dark:text-slate-300">{b.destination ?? "—"}</span> },
    { key: "hash", header: "Integrity", cell: (b) => <span className="font-mono text-2xs text-slate-500 dark:text-slate-400 truncate max-w-[120px] block">{b.hash ?? "—"}</span> },
    {
      key: "status",
      header: "Status",
      cell: (b) => {
        const meta = STATUS_META[b.statusKey] ?? { icon: AlertCircle, className: "text-slate-500" };
        const Icon = meta.icon;
        return (
          <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", meta.className)}>
            <Icon className={cn("size-3.5", meta.spin && "animate-spin")} />
            {b.status}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      /* No download endpoint exists and none is planned: the dump is written to
         the backup destination by pg_dump, not served by the web app. Left
         visible but disabled so nobody mistakes it for a working control. */
      cell: () => (
        <span title="Backups are pulled from the backup destination, not downloaded from the web app.">
          <Button variant="ghost" size="sm" className="gap-1" disabled>
            <Download className="size-3.5" />
            Download
          </Button>
        </span>
      ),
    },
  ];

  const lastOk = (stats?.lastBackupStatus ?? "").toLowerCase().startsWith("success");

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "Backup & Restore" }]}
        title="Backup & Restore"
        subtitle="Every backup run the server has recorded"
        actions={
          <Button variant="accent" size="md" className="gap-1.5" onClick={() => void runBackup()} disabled={running}>
            {running ? <Loader2 className="animate-spin" /> : <Play />}
            <span>{running ? "Starting…" : "Run Backup Now"}</span>
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Last Backup</div>
              {stats === null ? (
                <Skeleton className="h-6 w-24 mt-1.5" />
              ) : (
                <>
                  <div className="text-base tabular font-bold text-navy-900 dark:text-white mt-1">
                    {stats.lastBackupAt ? formatRelative(stats.lastBackupAt) : "Never"}
                  </div>
                  <div className={cn("text-xs mt-1 inline-flex items-center gap-1", lastOk ? "text-success" : "text-slate-500 dark:text-slate-400")}>
                    {lastOk ? <CheckCircle2 className="size-3" /> : <AlertCircle className="size-3" />}
                    {stats.lastBackupStatus ?? "No runs recorded"}
                  </div>
                </>
              )}
            </div>
            <Database className={cn("size-5", lastOk ? "text-success" : "text-slate-400")} />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Storage Used</div>
              {stats === null ? (
                <Skeleton className="h-6 w-24 mt-1.5" />
              ) : (
                <>
                  <div className="text-base tabular font-bold text-navy-900 dark:text-white mt-1">{formatSize(stats.totalSizeMb)}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">across every retained run</div>
                </>
              )}
            </div>
            <HardDrive className="size-5 text-info" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Backups Retained</div>
              {stats === null ? (
                <Skeleton className="h-6 w-16 mt-1.5" />
              ) : (
                <>
                  <div className="text-base tabular font-bold text-navy-900 dark:text-white mt-1">{formatNumber(stats.retained)}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">runs on record</div>
                </>
              )}
            </div>
            <Archive className="size-5 text-warning" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Success Rate</div>
              {stats === null ? (
                <Skeleton className="h-6 w-16 mt-1.5" />
              ) : (
                <>
                  <div className="text-base tabular font-bold text-navy-900 dark:text-white mt-1">{formatPercent(stats.successRate)}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">of all recorded runs</div>
                </>
              )}
            </div>
            <ShieldCheck className={cn("size-5", (stats?.successRate ?? 100) >= 95 ? "text-success" : "text-warning")} />
          </div>
        </Card>
      </div>

      <div className="mb-3">
        <h3 className="text-base font-semibold text-navy-900 dark:text-white">Backup History</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Recording a run here is not the same as taking the dump — that is a <code className="bg-slate-100 dark:bg-navy-700 px-1.5 py-0.5 rounded font-mono text-2xs">pg_dump</code> job on the server.
        </p>
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : error ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={AlertCircle}
              title="Could not load the backup history"
              description={error}
              action={
                <Button variant="accent" onClick={() => void load()}>
                  <RefreshCw />
                  Try again
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <DataTable
            columns={columns}
            data={rows}
            emptyState={
              <EmptyState
                icon={Database}
                title="No backups recorded yet"
                description="Nothing has been logged against this database. Run one now to create the first entry."
                action={
                  <Button variant="accent" onClick={() => void runBackup()} disabled={running}>
                    {running ? <Loader2 className="animate-spin" /> : <Play />}
                    Run Backup Now
                  </Button>
                }
              />
            }
          />
        </Card>
      )}
    </>
  );
}
