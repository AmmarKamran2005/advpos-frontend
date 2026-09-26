"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft, AlertCircle, Receipt, Calendar, Building2, Tag, Banknote, FileSpreadsheet,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentActions } from "@/components/widgets/document-actions";
import { Badge, StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney, formatDate } from "@/lib/format";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/**
 * ONE EXPENSE, READ-ONLY -- kept for history.
 *
 * Since 26 Sep expenses are lines of a day sheet, and the sheet is where they
 * are typed, approved, printed and reversed (../sheets/[id]). This screen used
 * to do all of that for a single expense; it now only shows the record, its
 * own old voucher PDF and its ledger entry, because notifications, activity
 * logs and old links still point here by expense id. Every button that
 * changed something is gone -- the API refuses those moves for a sheet line
 * anyway -- and the way forward is the "Open the day sheet" button.
 */

/* GET /accounting/expenses/{id} */
type Expense = {
  id: number;
  expenseNo: string;
  expenseDate: string;
  location: string;
  categoryName: string;
  expenseAccount: string;
  paidFromAccount: string;
  amount: number;
  vendorName: string;
  paymentMethod: string;
  description: string | null;
  status: string;
  statusName: string;
  entryId: number | null;
  entryNo: string | null;
  reversalEntryNo: string | null;
  createdBy: string;
  sheetId: number | null;
  sheetNo: string | null;
};

const STATUS_VARIANT: Record<string, "success" | "muted" | "warning" | "danger"> = {
  POSTED: "success",
  DRAFT: "muted",
  REVERSED: "warning",
  REJECTED: "danger",
  CANCELLED: "danger",
};

export default function ExpenseDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number.parseInt(params.id ?? "", 10);

  const [expense, setExpense] = React.useState<Expense | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notFound, setNotFound] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!Number.isFinite(id)) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    try {
      const one = await axios.get<Expense>(`${API_BASE_URL}/accounting/expenses/${id}`, { headers: authHeader() });
      setExpense(one.data);
      setError(null);
      setNotFound(false);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) setNotFound(true);
      else setError(axios.isAxiosError(e) && e.response
        ? (e.response.data as { message?: string })?.message ?? "Could not load the expense."
        : "Cannot reach the server.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  if (loading) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Accounting" }, { label: "Expenses", href: "/accounting/expenses" }]} title="Expense" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><Skeleton className="h-80" /></div>
          <Skeleton className="h-56" />
        </div>
      </>
    );
  }

  if (notFound) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Expense not found"
        description="It may have been deleted from a draft day sheet, or the link is wrong."
        action={<Button asChild><Link href="/accounting/expenses">Back to expenses</Link></Button>}
      />
    );
  }

  if (error || !expense) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Accounting" }, { label: "Expenses", href: "/accounting/expenses" }]} title="Expense" />
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

  const e = expense;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Expenses", href: "/accounting/expenses" }, { label: e.expenseNo }]}
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{e.expenseNo}</span>
            <StatusPill variant={STATUS_VARIANT[e.status] ?? "muted"}>{e.statusName}</StatusPill>
          </div>
        }
        subtitle={`${formatDate(e.expenseDate)} · ${e.vendorName} · recorded by ${e.createdBy}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" asChild><Link href="/accounting/expenses"><ArrowLeft />Back</Link></Button>
            {e.sheetId && (
              <Button variant="accent" className="gap-1.5" asChild>
                <Link href={`/accounting/expenses/sheets/${e.sheetId}`}><FileSpreadsheet />Open the day sheet</Link>
              </Button>
            )}
            <DocumentActions kind="expense" id={id} label="expense voucher" compact />
          </div>
        }
      />

      {e.sheetId && (
        <div className="mb-5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
          This expense is a line of the day sheet{" "}
          <Link href={`/accounting/expenses/sheets/${e.sheetId}`} className="font-semibold text-navy-900 dark:text-white underline underline-offset-2">{e.sheetNo}</Link>.
          It is edited, approved, printed and reversed there, with the rest of that day.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardBody>
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-navy-700">
                <div className="size-12 rounded-xl bg-danger/10 text-danger flex items-center justify-center">
                  <Receipt className="size-5" />
                </div>
                <div className="flex-1">
                  <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Amount</div>
                  <div className="text-3xl tabular font-bold text-danger">-{formatMoney(e.amount)}</div>
                </div>
                <Badge variant="muted">{e.paymentMethod}</Badge>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <Meta label="Date"     icon={Calendar}  value={formatDate(e.expenseDate)} />
                <Meta label="Location" icon={Building2} value={e.location} />
                <Meta label="Category" icon={Tag}       value={e.categoryName || "—"} />
                <Meta label="Vendor"   icon={Receipt}   value={e.vendorName} />
                <Meta label="Expense account"           value={e.expenseAccount} />
                <Meta label="Paid from" icon={Banknote} value={e.paidFromAccount} />
              </dl>

              {e.description && (
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-navy-700">
                  <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Description</div>
                  <p className="text-sm text-slate-700 dark:text-slate-200 mt-1.5 whitespace-pre-line">{e.description}</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardBody>
            <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Linked Journal Entry</h3>
            {e.entryId && e.entryNo ? (
              <Link
                href={`/accounting/journal-entries/${e.entryId}`}
                className="block p-3 border border-slate-200 dark:border-navy-700 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700"
              >
                <div className="tabular text-sm font-semibold text-navy-900 dark:text-white">{e.entryNo}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{e.categoryName} — {e.vendorName}</div>
              </Link>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                No entry yet. The ledger is written when the day sheet is approved.
              </p>
            )}
            {e.reversalEntryNo && (
              <div className="mt-3 p-3 rounded-lg bg-warning/10 border border-warning/30">
                <div className="text-2xs uppercase font-semibold tracking-wider text-warning">Reversed by</div>
                <div className="tabular text-sm font-semibold text-navy-900 dark:text-white mt-0.5">{e.reversalEntryNo}</div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function Meta({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: typeof Calendar }) {
  return (
    <div>
      <dt className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-navy-900 dark:text-white mt-1 inline-flex items-center gap-2">
        {Icon && <Icon className="size-3.5 text-slate-400" />}
        {value}
      </dd>
    </div>
  );
}
