"use client";

import * as React from "react";
import axios from "axios";
import {
  Database, Download, Play, CheckCircle2, XCircle, HardDrive, Archive,
  ShieldCheck, AlertCircle, RefreshCw, Loader2, FileArchive, Info,
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
import { downloadFile } from "@/lib/documents";
import { exportError } from "@/lib/export";
import { formatDate, formatDateTime, formatRelative, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Setup -> Backups.
 *
 * Until 27 Sep this page was called "Backup & Restore" and had neither: "Run
 * Backup Now" recorded a RUNNING row that never finished, Download was greyed
 * out for good, and the rows were seed data. Now the button takes a real
 * backup on the server (every table as CSV in one .zip, with a manifest) and
 * Download saves that file.
 *
 * There is no Restore button, on purpose, and the page says so: loading a
 * backup replaces every row in the database, which the owner does from the
 * file into a fresh database following the RESTORE.txt inside it.
 */

/* ─────────────────────────── shapes from the API ─────────────────────────── */

type Backup = {
  id: number;
  startedAt: string;
  type: string;
  typeKey: string;
  status: string;
  statusKey: string;
  sizeMb: number | null;
  sizeBytes: number | null;
  fileName: string | null;
  destination: string | null;
  durationSeconds: number | null;
  hash: string | null;
  tableCount: number | null;
  rowTotal: number | null;
  error: string | null;
  hasFile: boolean;
  triggeredBy: string | null;
};

type BackupStats = {
  lastBackupAt: string | null;
  lastBackupStatus: string | null;
  lastBackupStatusKey: string | null;
  lastSuccessAt: string | null;
  totalSizeMb: number;
  retained: number;
  keepFiles: number;
  runs: number;
  successRate: number | null;
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

/** Exact bytes when the file is still kept; the stored MB figure otherwise. */
function formatSize(bytes: number | null, mb: number | null) {
  const b = bytes ?? (mb !== null ? mb * 1048576 : null);
  if (b === null || Number.isNaN(b) || b <= 0) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`;
  if (b < 1073741824) return `${(b / 1048576).toFixed(1)} MB`;
  return `${(b / 1073741824).toFixed(2)} GB`;
}

function formatDuration(seconds: number | null) {
  if (seconds === null || Number.isNaN(seconds)) return "—";
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  if (m < 60) return `${m}m ${rest}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/* The status cell is driven by statusKey, so a failed run reads as failed. */
const STATUS_META: Record<string, { icon: typeof CheckCircle2; className: string; spin?: boolean }> = {
  SUCCESS: { icon: CheckCircle2, className: "text-success" },
  FAILED: { icon: XCircle, className: "text-danger" },
  RUNNING: { icon: Loader2, className: "text-info", spin: true },
};

function StatusCell({ b }: { b: Backup }) {
  const meta = STATUS_META[b.statusKey] ?? { icon: AlertCircle, className: "text-slate-500" };
  const Icon = meta.icon;
  return (
    <div className="min-w-0">
      <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", meta.className)}>
        <Icon className={cn("size-3.5", meta.spin && "animate-spin")} />
        {b.status}
      </span>
      {b.error && <div className="text-2xs text-danger mt-0.5 max-w-[240px] break-words">{b.error}</div>}
    </div>
  );
}

function DownloadButton({
  b, busy, onDownload, className,
}: {
  b: Backup; busy: boolean; onDownload: (b: Backup) => void; className?: string;
}) {
  if (!b.hasFile) {
    return (
      <span className={cn("text-2xs text-slate-400", className)} title={b.destination ?? undefined}>
        {b.statusKey === "SUCCESS" ? "File not kept" : "No file"}
      </span>
    );
  }
  return (
    <Button variant="secondary" size="sm" className={cn("gap-1", className)} disabled={busy} onClick={() => onDownload(b)}>
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
      Download
    </Button>
  );
}

export default function BackupPage() {
  const [rows, setRows] = React.useState<Backup[]>([]);
  const [stats, setStats] = React.useState<BackupStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [running, setRunning] = React.useState(false);
  const [downloading, setDownloading] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    try {
      const [list, summary] = await Promise.all([
        axios.get<Backup[]>(`${API_BASE_URL}/admin/backups`, { headers: authHeader() }),
        axios.get<BackupStats>(`${API_BASE_URL}/admin/backups/stats`, { headers: authHeader() }),
      ]);
      setRows(list.data);
      setError(null);
      setStats(summary.data);
    } catch (e) {
      setError(apiMessage(e, "Could not load the backup history."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. Disabled here rather
       than globally so the rule still catches the cases worth fixing. */
    void load();
  }, [load]);

  /* The API takes the backup inside this request and answers when it is done
     -- seconds for this database -- so the button simply waits. */
  const runBackup = React.useCallback(async () => {
    setRunning(true);
    try {
      const res = await axios.post<{ message?: string }>(
        `${API_BASE_URL}/admin/backups/run`,
        { typeKey: "MANUAL" },
        { headers: authHeader(), timeout: 10 * 60_000 }
      );
      toast.success("Backup taken", { description: res.data?.message });
    } catch (e) {
      toast.error("Backup failed", { description: apiMessage(e, "The backup could not be taken.") });
    } finally {
      setRunning(false);
      await load();
    }
  }, [load]);

  const download = React.useCallback(async (b: Backup) => {
    setDownloading(b.id);
    try {
      await downloadFile(`/admin/backups/${b.id}/download`, b.fileName ?? `advpos-backup-${b.id}.zip`);
    } catch (e) {
      toast.error("Download failed", { description: await exportError(e, "The file could not be downloaded.") });
    } finally {
      setDownloading(null);
    }
  }, []);

  const columns: Column<Backup>[] = [
    {
      key: "startedAt",
      header: "Date",
      cell: (b) => (
        <div>
          <div className="text-sm font-medium text-navy-900 dark:text-white">{formatDateTime(b.startedAt)}</div>
          <div className="text-2xs text-slate-500 dark:text-slate-400">{formatRelative(b.startedAt)} · {b.triggeredBy ?? "—"}</div>
        </div>
      ),
    },
    { key: "type", header: "Type", cell: (b) => <Badge variant={b.typeKey === "MANUAL" ? "accent" : "info"}>{b.type}</Badge> },
    {
      key: "contents",
      header: "Contents",
      cell: (b) => (
        <span className="tabular text-xs text-slate-600 dark:text-slate-300">
          {b.tableCount ? `${formatNumber(b.tableCount)} tables · ${formatNumber(b.rowTotal ?? 0)} rows` : "—"}
        </span>
      ),
    },
    { key: "size", header: "Size", align: "right", cell: (b) => <span className="tabular text-sm text-slate-600 dark:text-slate-300">{formatSize(b.sizeBytes, b.sizeMb)}</span> },
    { key: "durationSeconds", header: "Took", cell: (b) => <span className="tabular text-xs text-slate-500 dark:text-slate-400">{formatDuration(b.durationSeconds)}</span> },
    {
      key: "hash",
      header: "Checksum",
      cell: (b) => (
        <span title={b.hash ?? undefined} className="font-mono text-2xs text-slate-500 dark:text-slate-400 truncate max-w-[120px] block">
          {b.hash ? b.hash.replace("sha256:", "sha256 ").slice(0, 19) + "…" : "—"}
        </span>
      ),
    },
    { key: "status", header: "Status", cell: (b) => <StatusCell b={b} /> },
    { key: "actions", header: "", align: "right", cell: (b) => <DownloadButton b={b} busy={downloading === b.id} onDownload={(x) => void download(x)} /> },
  ];

  const lastOk = stats?.lastBackupStatusKey === "SUCCESS";

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "Backups" }]}
        title="Backups"
        subtitle="Take a copy of the whole database and download it"
        actions={
          <Button variant="accent" size="md" className="gap-1.5" onClick={() => void runBackup()} disabled={running}>
            {running ? <Loader2 className="animate-spin" /> : <Play />}
            <span>{running ? "Taking backup…" : "Run Backup Now"}</span>
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          label="Last Backup"
          icon={<Database className={cn("size-5", lastOk ? "text-success" : "text-slate-400")} />}
          loading={stats === null}
          value={stats?.lastBackupAt ? formatRelative(stats.lastBackupAt) : "Never"}
          sub={
            <span className={cn("inline-flex items-center gap-1", lastOk ? "text-success" : "text-slate-500 dark:text-slate-400")}>
              {lastOk ? <CheckCircle2 className="size-3" /> : <AlertCircle className="size-3" />}
              {stats?.lastBackupStatus ?? "No runs yet"}
            </span>
          }
        />
        <StatCard
          label="Stored on server"
          icon={<HardDrive className="size-5 text-info" />}
          loading={stats === null}
          value={formatSize(null, stats?.totalSizeMb ?? 0)}
          sub={`${formatNumber(stats?.retained ?? 0)} file${stats?.retained === 1 ? "" : "s"} kept`}
        />
        <StatCard
          label="Files Kept"
          icon={<Archive className="size-5 text-warning" />}
          loading={stats === null}
          value={`${formatNumber(stats?.retained ?? 0)} of ${formatNumber(stats?.keepFiles ?? 0)}`}
          sub="older files are let go"
        />
        <StatCard
          label="Success Rate"
          icon={<ShieldCheck className={cn("size-5", (stats?.successRate ?? 100) >= 95 ? "text-success" : "text-warning")} />}
          loading={stats === null}
          value={stats?.successRate === null || stats?.successRate === undefined ? "—" : formatPercent(stats.successRate, 0)}
          sub={`of ${formatNumber(stats?.runs ?? 0)} run${stats?.runs === 1 ? "" : "s"}`}
        />
      </div>

      <Card className="mb-6 bg-info/5 border-info/20">
        <CardBody>
          <div className="flex items-start gap-3">
            <Info className="size-4 text-info flex-shrink-0 mt-0.5" />
            <div className="text-xs text-info-dark dark:text-info-light space-y-1.5 min-w-0">
              <p>
                <span className="font-semibold">What a backup is.</span> Every table, read at one instant, saved as a
                spreadsheet file (CSV) inside one <code className="font-mono">.zip</code>, with a manifest of the row counts
                and a <code className="font-mono">RESTORE.txt</code>. It is kept on the server — download it and store it
                somewhere else, because a copy on the server does not survive losing the server.
              </p>
              <p>
                <span className="font-semibold">Restoring</span> is not a button here. It replaces every record, so it is
                done by the owner from the downloaded file, into a fresh database, following{" "}
                <code className="font-mono">RESTORE.txt</code>.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="mb-3">
        <h3 className="text-base font-semibold text-navy-900 dark:text-white">Backup History</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Only the newest {stats?.keepFiles ?? "few"} files are kept; older runs stay listed without their file.
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
      ) : rows.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={Database}
              title="No backups yet"
              description="Nothing has been taken from this database. Run one now to make the first file."
              action={
                <Button variant="accent" onClick={() => void runBackup()} disabled={running}>
                  {running ? <Loader2 className="animate-spin" /> : <Play />}
                  Run Backup Now
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Phones: one card per run, so nothing scrolls sideways. */}
          <div className="sm:hidden space-y-3">
            {rows.map((b) => (
              <Card key={b.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-navy-900 dark:text-white">{formatDate(b.startedAt)}</div>
                    <div className="text-2xs text-slate-500 dark:text-slate-400">{formatRelative(b.startedAt)} · {b.triggeredBy ?? "—"}</div>
                  </div>
                  <StatusCell b={b} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 min-w-0">
                    <FileArchive className="size-4 text-slate-400 flex-shrink-0" />
                    <span className="tabular">
                      {formatSize(b.sizeBytes, b.sizeMb)}
                      {b.tableCount ? ` · ${formatNumber(b.tableCount)} tables · ${formatNumber(b.rowTotal ?? 0)} rows` : ""}
                    </span>
                  </div>
                  <DownloadButton b={b} busy={downloading === b.id} onDownload={(x) => void download(x)} className="flex-shrink-0" />
                </div>
              </Card>
            ))}
          </div>
          <Card className="p-0 overflow-hidden hidden sm:block">
            <DataTable columns={columns} data={rows} hoverable={false} />
          </Card>
        </>
      )}
    </>
  );
}

function StatCard({
  label, icon, loading, value, sub,
}: {
  label: string; icon: React.ReactNode; loading: boolean; value: React.ReactNode; sub: React.ReactNode;
}) {
  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
          {loading ? (
            <Skeleton className="h-6 w-20 mt-1.5" />
          ) : (
            <>
              <div className="text-base tabular font-bold text-navy-900 dark:text-white mt-1 truncate">{value}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</div>
            </>
          )}
        </div>
        <div className="flex-shrink-0">{icon}</div>
      </div>
    </Card>
  );
}
