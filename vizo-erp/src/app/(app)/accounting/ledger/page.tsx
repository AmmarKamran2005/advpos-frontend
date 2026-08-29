"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { ArrowDownToLine, ArrowUpFromLine, AlertCircle, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { SelectNative } from "@/components/ui/select-native";
import { Label } from "@/components/ui/label";
import { ReportToolbar } from "@/components/widgets/report-toolbar";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatDate } from "@/lib/format";

/* GET /accounting/coa -> the account picker. Only leaves can carry postings. */
type Account = { id: number; code: string; name: string; isGroup: boolean; group: string };

/* GET /accounting/ledger?accountId=&from=&to=
   The running `balance` is computed server-side from the opening balance
   forward, so paging or filtering in the browser can never make it drift. */
type LedgerLine = {
  id: number;
  date: string;
  entryNo: string;
  entryType: string;
  reference: string | null;
  narration: string | null;
  party: string | null;
  debit: number;
  credit: number;
  balance: number;
};

type Ledger = {
  account: { id: number; code: string; name: string; type: string; isDebitNormal: boolean };
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
  lines: LedgerLine[];
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function LedgerPage() {
  const params = useSearchParams();

  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [ledger, setLedger] = React.useState<Ledger | null>(null);
  const [loadingAccounts, setLoadingAccounts] = React.useState(true);
  const [loadingLedger, setLoadingLedger] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [accountId, setAccountId] = React.useState<number | null>(
    params.get("accountId") ? parseInt(params.get("accountId")!, 10) : null
  );
  const [from, setFrom] = React.useState(() => new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = React.useState(() => new Date().toISOString().slice(0, 10));

  /* Follow the URL's accountId (e.g. a link from /accounting/ledgers), without
     an effect -- an effect here would run a beat after the mismatched render. */
  const urlAccountId = params.get("accountId") ? parseInt(params.get("accountId")!, 10) : null;
  const [syncedAccountId, setSyncedAccountId] = React.useState(urlAccountId);
  if (urlAccountId !== null && urlAccountId !== syncedAccountId) {
    setSyncedAccountId(urlAccountId);
    setAccountId(urlAccountId);
  }

  /* ── the account picker ──────────────────────────────────────────── */
  const loadAccounts = React.useCallback(async () => {
    try {
      const res = await axios.get<Account[]>(`${API_BASE_URL}/accounting/coa`, { headers: authHeader() });
      const leaves = res.data.filter((a) => !a.isGroup);
      setAccounts(leaves);
      /* Nothing named in the URL: open on the first postable account rather
         than a hard-coded id that may not exist in this database. */
      setAccountId((current) => current ?? leaves[0]?.id ?? null);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the chart of accounts."));
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. */
    void loadAccounts();
  }, [loadAccounts]);

  /* ── the ledger itself, re-read whenever account or range changes ── */
  const loadLedger = React.useCallback(async () => {
    if (accountId === null) return;
    try {
      const res = await axios.get<Ledger>(`${API_BASE_URL}/accounting/ledger`, {
        params: { accountId, from, to },
        headers: authHeader(),
      });
      setLedger(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load this ledger."));
    } finally {
      setLoadingLedger(false);
    }
  }, [accountId, from, to]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       Same reason as above: this is the requested per-page fetch pattern. */
    void loadLedger();
  }, [loadLedger]);

  const columns: Column<LedgerLine>[] = [
    { key: "date", header: "Date", cell: (t) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(t.date)}</span> },
    { key: "entryNo", header: "Entry #", cell: (t) => <span className="tabular text-xs font-medium text-navy-900 dark:text-white">{t.entryNo}</span> },
    { key: "reference", header: "Reference", cell: (t) => <span className="tabular text-xs text-slate-600 dark:text-slate-300">{t.reference ?? "—"}</span> },
    {
      key: "narration", header: "Description",
      cell: (t) => (
        <div className="min-w-0">
          <div className="text-sm text-slate-600 dark:text-slate-300 truncate">{t.narration ?? t.entryType}</div>
          {t.party && <div className="text-2xs text-slate-500 dark:text-slate-400 truncate">{t.party}</div>}
        </div>
      ),
    },
    { key: "debit", header: "Debit", align: "right", cell: (t) => t.debit > 0 ? <span className="tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(t.debit)}</span> : <span className="text-slate-300">—</span> },
    { key: "credit", header: "Credit", align: "right", cell: (t) => t.credit > 0 ? <span className="tabular text-sm font-semibold text-success">{formatMoney(t.credit)}</span> : <span className="text-slate-300">—</span> },
    { key: "balance", header: "Balance", align: "right", cell: (t) => <span className="tabular text-sm font-bold text-navy-900 dark:text-white">{formatMoney(t.balance)}</span> },
  ];

  const account = ledger?.account;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "General Ledger" }]}
        title="General Ledger"
        subtitle={account ? `${account.code} — ${account.name}` : "Pick an account"}
        actions={
          <ReportToolbar
            mode="range"
            reportName="Ledger"
            fromDate={from}
            toDate={to}
            onRangeChange={(f, t) => { setLoadingLedger(true); setFrom(f); setTo(t); }}
            doc={{ family: "statement", key: "ledger" }}
            docParams={{ accountId }}
          />
        }
      />

      {error && (
        <Card className="mb-4">
          <CardBody className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-navy-900 dark:text-white">{error}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                The API must be running on {API_BASE_URL}.
              </div>
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5"
              onClick={() => { setLoadingLedger(true); void loadLedger(); }}>
              <RefreshCw className="size-4" /> Try again
            </Button>
          </CardBody>
        </Card>
      )}

      <Card className="mb-4">
        <CardBody>
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1 max-w-md">
              <Label htmlFor="acct-picker" className="text-2xs uppercase tracking-wider">Account</Label>
              {loadingAccounts ? (
                <Skeleton className="h-10 mt-1.5" />
              ) : (
                <SelectNative
                  id="acct-picker"
                  value={accountId ?? ""}
                  onChange={(e) => { setLoadingLedger(true); setAccountId(+e.target.value); }}
                  className="mt-1.5"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </SelectNative>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4 flex-1">
              <div>
                <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Total Debits</div>
                <div className="tabular text-lg font-bold text-navy-900 dark:text-white inline-flex items-center gap-1.5 mt-1">
                  <ArrowDownToLine className="size-4 text-info" />
                  {ledger ? formatMoney(ledger.totalDebit) : "—"}
                </div>
              </div>
              <div>
                <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Total Credits</div>
                <div className="tabular text-lg font-bold text-navy-900 dark:text-white inline-flex items-center gap-1.5 mt-1">
                  <ArrowUpFromLine className="size-4 text-success" />
                  {ledger ? formatMoney(ledger.totalCredit) : "—"}
                </div>
              </div>
              <div>
                <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Closing Balance</div>
                <div className="tabular text-lg font-bold text-brand-yellow mt-1">
                  {ledger ? formatMoney(ledger.closingBalance) : "—"}
                </div>
              </div>
            </div>
          </div>

          {ledger && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-navy-700 text-xs text-slate-500 dark:text-slate-400">
              Opening balance on {formatDate(from)}:{" "}
              <span className="tabular font-semibold text-navy-900 dark:text-white">
                {formatMoney(ledger.openingBalance)}
              </span>
              {" · "}
              {ledger.account.isDebitNormal ? "debit-normal account" : "credit-normal account, shown on a debit basis"}
            </div>
          )}
        </CardBody>
      </Card>

      {loadingLedger ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
        </div>
      ) : !ledger || ledger.lines.length === 0 ? (
        <Card>
          <EmptyState
            icon={ArrowDownToLine}
            title="Nothing posted in this range"
            description="This account has no posted journal lines between the two dates. Widen the range, or pick another account."
          />
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <DataTable columns={columns} data={ledger.lines} pageSize={25} />
          <div className="px-5 py-3 border-t border-slate-100 dark:border-navy-700 bg-slate-50 dark:bg-navy-900/40 text-xs text-slate-500 dark:text-slate-400 text-center">
            {ledger.lines.length} posted {ledger.lines.length === 1 ? "line" : "lines"} · draft entries are not included
          </div>
        </Card>
      )}

      {/* Quick navigation back to other reports */}
      <Card className="mt-4">
        <CardBody className="py-3">
          <div className="flex items-center justify-between text-sm flex-wrap gap-2">
            <span className="text-slate-500 dark:text-slate-400">Other reports:</span>
            <div className="flex items-center gap-3 flex-wrap">
              <Link href="/accounting/ledgers" className="text-brand-yellow hover:underline">All ledgers</Link>
              <Link href="/accounting/trial-balance" className="text-brand-yellow hover:underline">Trial Balance</Link>
              <Link href="/accounting/profit-loss" className="text-brand-yellow hover:underline">P&amp;L</Link>
              <Link href="/accounting/balance-sheet" className="text-brand-yellow hover:underline">Balance Sheet</Link>
              <Link href="/accounting/cash-flow" className="text-brand-yellow hover:underline">Cash Flow</Link>
            </div>
          </div>
        </CardBody>
      </Card>
    </>
  );
}
