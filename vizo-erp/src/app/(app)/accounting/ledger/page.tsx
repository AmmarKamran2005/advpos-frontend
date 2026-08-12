"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { SelectNative } from "@/components/ui/select-native";
import { Label } from "@/components/ui/label";
import { ReportToolbar } from "@/components/widgets/report-toolbar";
import { DataTable, type Column } from "@/components/ui/data-table";
import { accounts } from "@/data/accounting";
import { formatMoney, formatDate } from "@/lib/format";
import { getLocation } from "@/data/settings";

const SAMPLE_TXNS_BY_ACCOUNT: Record<number, Array<{ id: number; date: string; entry: string; entryId: number; reference: string; description: string; debit: number; credit: number; balance: number }>> = {
  119: [
    { id: 1, date: "2026-04-30", entry: "JE-26-1042", entryId: 1, reference: "INV-26-0142", description: "Sales invoice — Hafeez Center #28", debit: 145000, credit: 0,      balance: 18545000 },
    { id: 2, date: "2026-04-29", entry: "JE-26-1041", entryId: 2, reference: "VCH-26-0089", description: "Bank receipt — Hafeez Center #28",  debit: 0,      credit: 100000, balance: 18400000 },
    { id: 3, date: "2026-04-29", entry: "JE-26-1038", entryId: 5, reference: "INV-26-0140", description: "Sales invoice — Cellular World",   debit: 142000, credit: 0,      balance: 18500000 },
    { id: 4, date: "2026-04-28", entry: "JE-26-1037", entryId: 6, reference: "VCH-26-0085", description: "Cash receipt — Saddar Mobile",      debit: 0,      credit: 32750,  balance: 18358000 },
    { id: 5, date: "2026-04-28", entry: "JE-26-1036", entryId: 7, reference: "INV-26-0088", description: "Sales invoice — Faisal Mobile",     debit: 18400,  credit: 0,      balance: 18390750 },
    { id: 6, date: "2026-04-27", entry: "JE-26-1035", entryId: 1, reference: "INV-26-0034", description: "Sales invoice — Margalla Distrib.", debit: 218000, credit: 0,      balance: 18372350 },
  ],
};

type Txn = typeof SAMPLE_TXNS_BY_ACCOUNT[119][number];

export default function LedgerPage() {
  const params = useSearchParams();
  const initialAccountId = params.get("accountId") ? parseInt(params.get("accountId")!, 10) : 119;

  const [accountId, setAccountId] = React.useState<number>(initialAccountId);
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = React.useState(monthAgo);
  const [to, setTo] = React.useState(today);
  const [locationId, setLocationId] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (params.get("accountId")) setAccountId(parseInt(params.get("accountId")!, 10));
  }, [params]);

  const account = accounts.find((a) => a.id === accountId);
  const leaves = accounts.filter((a) => !a.isGroup);
  const txns = SAMPLE_TXNS_BY_ACCOUNT[accountId] ?? SAMPLE_TXNS_BY_ACCOUNT[119];

  const totalDebit  = txns.reduce((s, t) => s + t.debit, 0);
  const totalCredit = txns.reduce((s, t) => s + t.credit, 0);

  const columns: Column<Txn>[] = [
    { key: "date",        header: "Date",        cell: (t) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(t.date)}</span> },
    { key: "entry",       header: "Entry #",     cell: (t) => <span className="tabular text-xs font-medium text-navy-900 dark:text-white">{t.entry}</span> },
    { key: "reference",   header: "Reference",   cell: (t) => <span className="tabular text-xs text-slate-600 dark:text-slate-300">{t.reference}</span> },
    { key: "description", header: "Description", cell: (t) => <span className="text-sm text-slate-600 dark:text-slate-300">{t.description}</span> },
    { key: "debit",       header: "Debit",       align: "right", cell: (t) => t.debit > 0 ? <span className="tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(t.debit)}</span> : <span className="text-slate-300">—</span> },
    { key: "credit",      header: "Credit",      align: "right", cell: (t) => t.credit > 0 ? <span className="tabular text-sm font-semibold text-success">{formatMoney(t.credit)}</span> : <span className="text-slate-300">—</span> },
    { key: "balance",     header: "Balance",     align: "right", cell: (t) => <span className="tabular text-sm font-bold text-navy-900 dark:text-white">{formatMoney(t.balance)}</span> },
  ];

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
            onRangeChange={(f, t) => { setFrom(f); setTo(t); }}
            locationId={locationId}
            onLocationChange={setLocationId}
          />
        }
      />

      <Card className="mb-4">
        <CardBody>
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1 max-w-md">
              <Label htmlFor="acct-picker" className="text-2xs uppercase tracking-wider">Account</Label>
              <SelectNative
                id="acct-picker"
                value={accountId}
                onChange={(e) => setAccountId(+e.target.value)}
                className="mt-1.5"
              >
                {leaves.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </SelectNative>
            </div>
            <div className="grid grid-cols-3 gap-4 flex-1">
              <div>
                <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Total Debits</div>
                <div className="tabular text-lg font-bold text-navy-900 dark:text-white inline-flex items-center gap-1.5 mt-1">
                  <ArrowDownToLine className="size-4 text-info" />
                  {formatMoney(totalDebit)}
                </div>
              </div>
              <div>
                <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Total Credits</div>
                <div className="tabular text-lg font-bold text-navy-900 dark:text-white inline-flex items-center gap-1.5 mt-1">
                  <ArrowUpFromLine className="size-4 text-success" />
                  {formatMoney(totalCredit)}
                </div>
              </div>
              <div>
                <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Closing Balance</div>
                <div className="tabular text-lg font-bold text-brand-yellow mt-1">{account ? formatMoney(account.balance) : "—"}</div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="p-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={txns}
          rowHref={(t) => `/accounting/journal-entries/${t.entryId}`}
        />
        <div className="px-5 py-3 border-t border-slate-100 dark:border-navy-700 bg-slate-50 dark:bg-navy-900/40 text-xs text-slate-500 dark:text-slate-400 text-center">
          💡 Click any row to view the underlying Journal Entry · Location filter: <span className="font-semibold text-navy-900 dark:text-white">{locationId ? getLocation(locationId)?.name : "All"}</span>
        </div>
      </Card>

      {/* Quick navigation back to other reports */}
      <Card className="mt-4">
        <CardBody className="py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Other reports:</span>
            <div className="flex items-center gap-3">
              <Link href="/accounting/trial-balance" className="text-brand-yellow hover:underline">Trial Balance</Link>
              <Link href="/accounting/profit-loss" className="text-brand-yellow hover:underline">P&L</Link>
              <Link href="/accounting/balance-sheet" className="text-brand-yellow hover:underline">Balance Sheet</Link>
              <Link href="/accounting/cash-flow" className="text-brand-yellow hover:underline">Cash Flow</Link>
            </div>
          </div>
        </CardBody>
      </Card>
    </>
  );
}
