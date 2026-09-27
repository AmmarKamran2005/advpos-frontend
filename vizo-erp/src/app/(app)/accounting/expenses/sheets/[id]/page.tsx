"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft, AlertCircle, Check, Loader2, Printer, Download, RotateCcw, Save,
  Trash2, CopyPlus, CalendarDays, MapPin, BookOpen, Receipt,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import { formatMoney, formatDate, formatDateTime } from "@/lib/format";
import { openDocumentWhenReady, viewableUrl, printPdf, downloadPdf } from "@/lib/documents";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import {
  ExpenseGrid, isBlank, newRowKey, parseAmount, validateRow,
  type GridRow, type Head, type Method, type PaidFromAccount, type RowErrors, type Field,
} from "../../_components/expense-grid";

/* GET /expense-sheets/{id} */
type Line = {
  id: number;
  expenseNo: string;
  expenseAccountId: number;
  head: string;
  headCode: string;
  description: string | null;
  vendorName: string;
  paidFromAccountId: number;
  paidFrom: string;
  methodId: number;
  method: string;
  amount: number;
  status: string;
  entryId: number | null;
  entryNo: string | null;
  locked: boolean;
  excluded: boolean;
};

type Sheet = {
  id: number;
  sheetNo: string;
  sheetDate: string;
  locationId: number;
  location: string;
  status: "DRAFT" | "POSTED" | "REVERSED";
  statusName: string;
  notes: string | null;
  entryId: number | null;
  entryNo: string | null;
  reversalEntryId: number | null;
  reversalEntryNo: string | null;
  perLineEntries: { id: number; no: string | null; reversed: boolean }[];
  createdBy: string;
  createdAt: string;
  updatedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  reversedBy: string | null;
  reversedAt: string | null;
  reversalReason: string | null;
  lines: Line[];
  total: number;
  lineCount: number;
  liveSheetId: number | null;
  canEdit: boolean;
  canApprove: boolean;
  canReverse: boolean;
  canDelete: boolean;
  canReenter: boolean;
};

/* GET /expense-sheets/lookups */
type Lookups = {
  heads: Head[];
  paidFrom: PaidFromAccount[];
  methods: Method[];
  locations: { id: number; name: string }[];
  defaultLocationId: number | null;
  vendors: string[];
  canApprove: boolean;
};

type StoredFile = { archived: boolean; pdfUrl?: string; shareUrl?: string; isDeliverable?: boolean };

const STATUS_VARIANT = { DRAFT: "warning", POSTED: "success", REVERSED: "danger" } as const;

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

function toRow(l: Line): GridRow {
  return {
    key: `l${l.id}`,
    id: l.id,
    expenseNo: l.expenseNo,
    expenseAccountId: l.expenseAccountId,
    description: l.description ?? "",
    vendorName: l.vendorName,
    paidFromAccountId: l.paidFromAccountId,
    methodId: l.methodId,
    amount: l.amount.toFixed(2).replace(/\.00$/, ""),
    locked: l.locked,
    excluded: l.excluded,
    head: l.head,
    headCode: l.headCode,
    paidFrom: l.paidFrom,
    method: l.method,
    status: l.status,
  };
}

/** A long weekday date, read as the calendar day it is (never shifted by zone). */
function longDay(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
}

export default function ExpenseSheetPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number.parseInt(params.id ?? "", 10);

  const [sheet, setSheet] = React.useState<Sheet | null>(null);
  const [lookups, setLookups] = React.useState<Lookups | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notFound, setNotFound] = React.useState(false);

  const [rows, setRows] = React.useState<GridRow[]>([]);
  const [notes, setNotes] = React.useState("");
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [busy, setBusy] = React.useState<null | "approve" | "reverse" | "delete" | "reenter" | "print">(null);
  const [serverErrors, setServerErrors] = React.useState<Record<string, RowErrors>>({});
  const [showAllErrors, setShowAllErrors] = React.useState(false);
  const [reverseOpen, setReverseOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const editable = !!sheet?.canEdit;

  const defaultPaidFromId = React.useMemo(() => {
    if (!lookups || !sheet) return 0;
    /* Shop 2 pays out of "Cash - Shop 2"; everywhere else out of the main
       cash account. Read from the names -- there is no link in the chart. */
    const loc = sheet.location.toLowerCase();
    const own = lookups.paidFrom.find((a) => a.name.toLowerCase().includes(loc));
    const cash = lookups.paidFrom.find((a) => /cash/i.test(a.name) && !/jazz/i.test(a.name));
    return (own ?? cash ?? lookups.paidFrom[0])?.id ?? 0;
  }, [lookups, sheet]);

  const spareRow = React.useCallback(
    (paidFromId: number, look: Lookups | null): GridRow => ({
      key: newRowKey(),
      expenseAccountId: 0,
      description: "",
      vendorName: "",
      paidFromAccountId: paidFromId,
      methodId: look?.paidFrom.find((a) => a.id === paidFromId)?.defaultMethodId ?? 0,
      amount: "",
    }),
    []
  );

  const load = React.useCallback(async () => {
    if (!Number.isFinite(id)) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    try {
      const [one, look] = await Promise.all([
        axios.get<Sheet>(`${API_BASE_URL}/expense-sheets/${id}`, { headers: authHeader() }),
        axios.get<Lookups>(`${API_BASE_URL}/expense-sheets/lookups`, { headers: authHeader() }),
      ]);
      setSheet(one.data);
      setLookups(look.data);
      setNotes(one.data.notes ?? "");
      const base = one.data.lines.map(toRow);
      if (one.data.canEdit) {
        const loc = one.data.location.toLowerCase();
        const pf =
          [...base].reverse().find((r) => !r.locked)?.paidFromAccountId ??
          look.data.paidFrom.find((a) => a.name.toLowerCase().includes(loc))?.id ??
          look.data.paidFrom.find((a) => /cash/i.test(a.name) && !/jazz/i.test(a.name))?.id ??
          look.data.paidFrom[0]?.id ?? 0;
        base.push(spareRow(pf, look.data));
      }
      setRows(base);
      setDirty(false);
      setServerErrors({});
      setShowAllErrors(false);
      setError(null);
      setNotFound(false);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) setNotFound(true);
      else setError(apiMessage(e, "Could not load the expense sheet."));
    } finally {
      setLoading(false);
    }
  }, [id, spareRow]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  /* Typed lines are not lost to a stray click on the sidebar. */
  React.useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /* ── the running figures, straight off the grid as it is typed ── */
  const live = React.useMemo(() => rows.filter((r) => !isBlank(r) && !r.excluded), [rows]);
  const total = React.useMemo(() => live.reduce((s, r) => s + parseAmount(r.amount), 0), [live]);
  const byPaidFrom = React.useMemo(() => {
    const m = new Map<number, { name: string; count: number; amount: number }>();
    for (const r of live) {
      const name = r.paidFrom ?? lookups?.paidFrom.find((a) => a.id === r.paidFromAccountId)?.name ?? "Not chosen";
      const cur = m.get(r.paidFromAccountId) ?? { name, count: 0, amount: 0 };
      cur.count += 1;
      cur.amount += parseAmount(r.amount);
      m.set(r.paidFromAccountId, cur);
    }
    return [...m.values()].sort((a, b) => b.amount - a.amount);
  }, [live, lookups]);

  function onRowsChange(next: GridRow[]) {
    setRows(next);
    setDirty(true);
  }

  function onClearError(rowKey: string, field: Field) {
    setServerErrors((prev) => {
      const row = prev[rowKey];
      if (!row || (!row[field] && !row.row)) return prev;
      const copy = { ...row };
      delete copy[field];
      delete copy.row;
      return { ...prev, [rowKey]: copy };
    });
  }

  /** Saves the whole grid. Returns true when the server took it. */
  async function save(quiet = false): Promise<boolean> {
    if (!sheet) return false;
    const toSend = rows.filter((r) => !isBlank(r) && !r.locked);
    const invalid = toSend.filter((r) => Object.keys(validateRow(r)).length > 0);
    if (invalid.length > 0) {
      setShowAllErrors(true);
      toast.error(invalid.length === 1 ? "One line needs attention" : `${invalid.length} lines need attention`, {
        description: "The problem is shown under each line.",
      });
      return false;
    }

    setSaving(true);
    try {
      const res = await axios.put<{ message: string }>(
        `${API_BASE_URL}/expense-sheets/${sheet.id}`,
        {
          notes: notes.trim() || null,
          lines: toSend.map((r) => ({
            id: r.id ?? null,
            expenseAccountId: r.expenseAccountId,
            description: r.description.trim() || null,
            vendorName: r.vendorName.trim(),
            paidFromAccountId: r.paidFromAccountId,
            methodId: r.methodId || null,
            amount: parseAmount(r.amount),
          })),
        },
        { headers: authHeader() }
      );
      if (!quiet) toast.success(res.data.message);
      await load();
      return true;
    } catch (e) {
      /* The API names the row and the cell; put each message under its row. */
      const data = axios.isAxiosError(e) ? (e.response?.data as { errors?: { row: number; field: Field; message: string }[] }) : undefined;
      if (data?.errors?.length) {
        const mapped: Record<string, RowErrors> = {};
        for (const er of data.errors) {
          const r = toSend[er.row];
          if (!r) continue;
          mapped[r.key] = { ...(mapped[r.key] ?? {}), [er.field]: er.message };
        }
        setServerErrors(mapped);
      }
      toast.error(apiMessage(e, "The sheet was not saved."));
      return false;
    } finally {
      setSaving(false);
    }
  }

  /* Ctrl+S / Cmd+S saves, the way it does in every spreadsheet. */
  const saveRef = React.useRef(save);
  React.useEffect(() => {
    /* The latest save, with the latest rows in its closure, for the key handler. */
    saveRef.current = save;
  });
  React.useEffect(() => {
    if (!editable) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editable]);

  /**
   * Print and Download open the day's stored PDF. Unsaved typing is saved
   * first, so the paper always matches the screen; the tab is opened inside
   * the click (a popup opened after an await is blocked) and pointed at the
   * file when it is ready. See lib/documents.ts for why it is the stored
   * Cloudinary link and never an API route.
   */
  async function openPdf(attachment: boolean) {
    if (!sheet) return;
    if (dirty && editable) {
      const ok = await save(true);
      if (!ok) return;
    }
    setBusy("print");
    /* Print prints; Download saves -- from the API, rebuilt from the database
       (lib/documents.ts). The stored copy is the fallback. */
    const path = `/documents/expense-sheet/${sheet.id}/pdf`;
    let opened = attachment ? await downloadPdf(path, sheet.sheetNo ?? `expense-sheet-${sheet.id}`) : await printPdf(path);
    if (!opened) opened = await openDocumentWhenReady(async () => {
      const kind = "expense-sheet";
      const file = await axios.get<StoredFile>(`${API_BASE_URL}/documents/${kind}/${sheet.id}/file`, { headers: authHeader() });
      if (file.data.archived) return viewableUrl(file.data);
      const made = await axios.post<StoredFile>(`${API_BASE_URL}/documents/${kind}/${sheet.id}/pdf`, {}, { headers: authHeader() });
      return viewableUrl(made.data);
    }, attachment);
    setBusy(null);
    if (!opened) toast.error("Could not open the expense invoice", { description: "Try again in a moment." });
  }

  async function approve() {
    if (!sheet) return;
    if (dirty) {
      const ok = await save(true);
      if (!ok) return;
    }
    setBusy("approve");
    try {
      const res = await axios.post<{ message: string }>(`${API_BASE_URL}/expense-sheets/${sheet.id}/approve`, {}, { headers: authHeader() });
      toast.success(res.data.message);
      await load();
    } catch (e) {
      toast.error(apiMessage(e, "The sheet was not approved."));
    } finally {
      setBusy(null);
    }
  }

  async function reverse(reason?: string) {
    if (!sheet) return;
    setBusy("reverse");
    try {
      const res = await axios.post<{ message: string }>(
        `${API_BASE_URL}/expense-sheets/${sheet.id}/reverse`, { reason: reason ?? null }, { headers: authHeader() });
      toast.success(res.data.message);
      setReverseOpen(false);
      await load();
    } catch (e) {
      toast.error(apiMessage(e, "The sheet was not reversed."));
    } finally {
      setBusy(null);
    }
  }

  async function reenter() {
    if (!sheet) return;
    setBusy("reenter");
    try {
      const res = await axios.post<{ id: number; message: string }>(
        `${API_BASE_URL}/expense-sheets/${sheet.id}/reenter`, {}, { headers: authHeader() });
      toast.success(res.data.message);
      router.push(`/accounting/expenses/sheets/${res.data.id}`);
    } catch (e) {
      toast.error(apiMessage(e, "The day could not be opened again."));
      setBusy(null);
    }
  }

  async function remove() {
    if (!sheet) return;
    setBusy("delete");
    try {
      const res = await axios.delete<{ message: string }>(`${API_BASE_URL}/expense-sheets/${sheet.id}`, { headers: authHeader() });
      toast.success(res.data.message);
      setDirty(false);
      router.push("/accounting/expenses");
    } catch (e) {
      toast.error(apiMessage(e, "The sheet was not deleted."));
      setBusy(null);
      setDeleteOpen(false);
    }
  }

  const crumbs = [{ label: "Accounting" }, { label: "Expenses", href: "/accounting/expenses" }];

  if (loading) {
    return (
      <>
        <PageHeader breadcrumbs={crumbs} title="Expense sheet" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
        </div>
        <Skeleton className="h-80" />
      </>
    );
  }

  if (notFound) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Expense sheet not found"
        description="It may have been deleted, or the link is wrong."
        action={<Button asChild><Link href="/accounting/expenses">Back to expenses</Link></Button>}
      />
    );
  }

  if (error || !sheet || !lookups) {
    return (
      <>
        <PageHeader breadcrumbs={crumbs} title="Expense sheet" />
        <Card className="p-4 border-danger/40 max-w-2xl">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{error}</div>
            <Button variant="secondary" size="sm" onClick={() => void load()}>Try again</Button>
          </div>
        </Card>
      </>
    );
  }

  const s = sheet;
  const anyBusy = busy !== null || saving;

  return (
    <>
      <PageHeader
        breadcrumbs={[...crumbs, { label: s.sheetNo }]}
        title={
          <span className="flex items-center gap-3 flex-wrap">
            <span>{s.sheetNo}</span>
            <StatusPill variant={STATUS_VARIANT[s.status] ?? "muted"}>{s.statusName}</StatusPill>
            {dirty && editable && <span className="text-xs font-medium text-warning">Unsaved changes</span>}
          </span>
        }
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />{longDay(s.sheetDate)}</span>
            <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{s.location}</span>
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
            <Button variant="ghost" size="md" asChild className="hidden sm:inline-flex">
              <Link href="/accounting/expenses"><ArrowLeft />Back</Link>
            </Button>
            {/* The owner's "Print button at the top". */}
            <Button variant="primary" size="md" className="gap-1.5" onClick={() => void openPdf(false)} disabled={anyBusy}>
              {busy === "print" ? <Loader2 className="size-4 animate-spin" /> : <Printer />}Print
            </Button>
            <Button variant="secondary" size="md" className="gap-1.5" onClick={() => void openPdf(true)} disabled={anyBusy}>
              <Download /><span>Download</span>
            </Button>
            {editable && (
              <Button variant="accent" size="md" className="gap-1.5" onClick={() => void save()} disabled={anyBusy || !dirty}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save />}Save
              </Button>
            )}
            {s.status === "DRAFT" && lookups.canApprove && (
              <Button
                variant="outline"
                size="md"
                className="gap-1.5 border-success/40 text-success hover:bg-success/10"
                onClick={() => void approve()}
                disabled={anyBusy || (!s.canApprove && !(dirty && live.some((r) => !r.locked)))}
                title="Approve the whole day and post it to the ledger"
              >
                {busy === "approve" ? <Loader2 className="size-4 animate-spin" /> : <Check />}Approve day
              </Button>
            )}
            {s.canReverse && (
              <Button variant="secondary" size="md" className="gap-1.5" onClick={() => setReverseOpen(true)} disabled={anyBusy}>
                <RotateCcw />Reverse
              </Button>
            )}
            {s.canReenter && (
              <Button variant="accent" size="md" className="gap-1.5" onClick={() => void reenter()} disabled={anyBusy}>
                {busy === "reenter" ? <Loader2 className="size-4 animate-spin" /> : <CopyPlus />}Re-enter day
              </Button>
            )}
            {s.canDelete && (
              <Button variant="ghost" size="md" className="text-danger gap-1.5" onClick={() => setDeleteOpen(true)} disabled={anyBusy}>
                <Trash2 /><span className="sm:hidden lg:inline">Delete</span>
              </Button>
            )}
          </div>
        }
      />

      {/* ── what state the day is in ── */}
      <StateBanner sheet={s} />

      {/* ── the running figures ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <Card className="p-4 col-span-2 lg:col-span-1 bg-navy-900 dark:bg-navy-950 border-navy-900">
          <div className="text-2xs uppercase font-semibold tracking-wider text-brand-yellow">Day total</div>
          <div className="text-2xl sm:text-3xl tabular font-bold text-white mt-1">{formatMoney(total, { decimals: 2 })}</div>
          <div className="lg:hidden text-xs text-slate-300 mt-1">{live.length} {live.length === 1 ? "expense" : "expenses"}</div>
        </Card>
        <Card className="p-4 hidden lg:block">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Expenses</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{live.length}</div>
        </Card>
        <Card className="p-4 col-span-2">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Paid from</div>
          {byPaidFrom.length === 0 ? (
            <div className="text-sm text-slate-400">Nothing yet</div>
          ) : (
            <ul className="space-y-1">
              {byPaidFrom.map((a) => (
                <li key={a.name} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-slate-700 dark:text-slate-200">
                    {a.name} <span className="text-xs text-slate-400">· {a.count}</span>
                  </span>
                  <span className="tabular font-semibold text-navy-900 dark:text-white">{formatMoney(a.amount, { decimals: 2 })}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ── the grid ── */}
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-navy-900 dark:text-white inline-flex items-center gap-2">
          <Receipt className="size-4 text-brand-yellow" />The day&apos;s expenses
        </h2>
        {editable && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <span className="hidden md:inline">Tab or Enter moves to the next cell · ↑ ↓ between rows · Ctrl+S saves. </span>
            A new line appears as you type.
          </p>
        )}
      </div>

      <ExpenseGrid
        rows={rows}
        editable={editable}
        heads={lookups.heads}
        paidFrom={lookups.paidFrom}
        methods={lookups.methods}
        vendors={lookups.vendors}
        errors={serverErrors}
        showAllErrors={showAllErrors}
        onRowsChange={onRowsChange}
        onClearError={onClearError}
        defaultPaidFromId={defaultPaidFromId}
      />

      {/* The total: under the grid on a desktop, pinned to the bottom of the
          screen on a phone so it stays in sight while the list of cards grows.
          Fixed rather than sticky -- <main> is an overflow container that does
          not itself scroll, so sticky never engages. The spacer at the foot of
          the page keeps it from covering the last card. */}
      <div className="fixed inset-x-0 bottom-0 z-30 md:static md:z-auto mt-3 px-4 py-3 bg-white/95 dark:bg-navy-900/95 backdrop-blur border-t md:border md:rounded-xl border-slate-200 dark:border-navy-700 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] md:shadow-none flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            {live.length} {live.length === 1 ? "expense" : "expenses"}
          </div>
          <div className="text-lg tabular font-bold text-navy-900 dark:text-white">{formatMoney(total, { decimals: 2 })}</div>
        </div>
        {editable && (
          <Button variant="accent" size="md" className="gap-1.5 shrink-0" onClick={() => void save()} disabled={anyBusy || !dirty}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save />}{dirty ? "Save sheet" : "Saved"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Card className="lg:col-span-2">
          <CardBody>
            <label htmlFor="sheet-notes" className="text-sm font-semibold text-navy-900 dark:text-white">Note for the day</label>
            {editable ? (
              <Textarea
                id="sheet-notes"
                rows={2}
                maxLength={500}
                className="mt-2"
                placeholder="Anything the accountant should know about this day"
                value={notes}
                onChange={(e) => { setNotes(e.target.value); setDirty(true); }}
              />
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 whitespace-pre-line">{s.notes || "—"}</p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3 inline-flex items-center gap-2">
              <BookOpen className="size-4 text-slate-400" />In the ledger
            </h3>
            <LedgerCard sheet={s} total={total} />
          </CardBody>
        </Card>
      </div>

      <p className="text-xs text-slate-400 mt-4">
        Opened by {s.createdBy} on {formatDateTime(s.createdAt)}
        {s.updatedAt ? ` · last saved ${formatDateTime(s.updatedAt)}` : ""}
      </p>

      <div className="h-20 md:hidden" aria-hidden />

      <ConfirmDialog
        open={reverseOpen}
        onOpenChange={setReverseOpen}
        title={`Reverse ${s.sheetNo}?`}
        description="A mirror entry cancels the whole day in the ledger, and every expense on it is marked reversed. Nothing is erased. You can then enter the corrected day again."
        variant="warning"
        confirmLabel="Reverse the day"
        requireReason
        reasonLabel="Why is the day being reversed?"
        reasonPlaceholder="e.g. Petrol was entered twice"
        loading={busy === "reverse"}
        onConfirm={(reason) => void reverse(reason)}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${s.sheetNo}?`}
        description="The sheet is still a draft, so nothing has reached the ledger. Its lines are deleted with it. This cannot be undone."
        variant="danger"
        confirmLabel="Yes, delete the sheet"
        loading={busy === "delete"}
        onConfirm={() => void remove()}
      />
    </>
  );
}

function StateBanner({ sheet: s }: { sheet: Sheet }) {
  if (s.status === "DRAFT") {
    return (
      <div className="mb-5 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
        <span className="font-semibold text-warning-dark dark:text-warning-light">Draft.</span>{" "}
        Nothing on this sheet has reached the ledger. The accountant approves the whole day in one click, and that posts it.
      </div>
    );
  }
  if (s.status === "POSTED") {
    return (
      <div className="mb-5 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
        <span className="font-semibold text-success-dark dark:text-success-light">Approved</span>
        {s.approvedBy ? ` by ${s.approvedBy}` : ""}{s.approvedAt ? ` on ${formatDate(s.approvedAt)}` : ""}.{" "}
        The day is in the ledger and can no longer be edited — reverse it to correct it.
      </div>
    );
  }
  return (
    <div className="mb-5 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
      <span className="font-semibold text-danger">Reversed</span>
      {s.reversedBy ? ` by ${s.reversedBy}` : ""}{s.reversedAt ? ` on ${formatDate(s.reversedAt)}` : ""}
      {s.reversalReason ? `: ${s.reversalReason}` : "."}
      {s.liveSheetId && (
        <> {" "}<Link href={`/accounting/expenses/sheets/${s.liveSheetId}`} className="font-semibold text-navy-900 dark:text-white underline underline-offset-2">Open the corrected day</Link></>
      )}
    </div>
  );
}

function LedgerCard({ sheet: s, total }: { sheet: Sheet; total: number }) {
  if (s.entryId && s.entryNo) {
    return (
      <div className="space-y-2">
        <Link
          href={`/accounting/journal-entries/${s.entryId}`}
          className="flex items-center justify-between gap-2 p-3 rounded-lg border border-slate-200 dark:border-navy-700 hover:bg-slate-50 dark:hover:bg-navy-700"
        >
          <span className="tabular text-sm font-semibold text-navy-900 dark:text-white">{s.entryNo}</span>
          <span className="text-xs text-slate-500">one entry for the day</span>
        </Link>
        {s.reversalEntryNo && s.reversalEntryId && (
          <Link
            href={`/accounting/journal-entries/${s.reversalEntryId}`}
            className="flex items-center justify-between gap-2 p-3 rounded-lg border border-danger/30 bg-danger/5 hover:bg-danger/10"
          >
            <span className="tabular text-sm font-semibold text-navy-900 dark:text-white">{s.reversalEntryNo}</span>
            <span className="text-xs text-danger">reversal</span>
          </Link>
        )}
      </div>
    );
  }
  if (s.perLineEntries.length > 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Posted one expense at a time, before day sheets existed:
        </p>
        <div className="flex flex-wrap gap-2">
          {s.perLineEntries.map((e) => (
            <Link key={e.id} href={`/accounting/journal-entries/${e.id}`} className="tabular text-xs font-semibold px-2 py-1 rounded-md border border-slate-200 dark:border-navy-700 hover:bg-slate-50 dark:hover:bg-navy-700 text-navy-900 dark:text-white">
              {e.no}{e.reversed && <span className="ml-1 font-normal text-danger">reversed</span>}
            </Link>
          ))}
        </div>
      </div>
    );
  }
  return (
    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
      Nothing yet. Approval writes one journal entry: each expense debited to its head
      ({formatMoney(total, { decimals: 2 })} in all), and one credit per cash or bank account it was paid from.
    </p>
  );
}
