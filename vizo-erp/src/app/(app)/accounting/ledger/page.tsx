"use client";

import * as React from "react";
import { Search, Calendar, Download, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/ui/data-table";
import { accounts } from "@/data/accounting";
import { formatMoney, formatDate } from "@/lib/format";

const SAMPLE_TXNS = [
  { id: 1, date: "2026-04-30", entry: "JE-26-1042", reference: "INV-KHI-26-0142", description: "Sales invoice — Hafeez Center #28", debit: 145000, credit: 0,      balance: 18545000 },
  { id: 2, date: "2026-04-29", entry: "JE-26-1041", reference: "VCH-KHI-26-0089", description: "Bank receipt — Hafeez Center #28",  debit: 0,      credit: 100000, balance: 18400000 },
  { id: 3, date: "2026-04-29", entry: "JE-26-1038", reference: "INV-KHI-26-0140", description: "Sales invoice — Cellular World",   debit: 142000, credit: 0,      balance: 18500000 },
  { id: 4, date: "2026-04-28", entry: "JE-26-1037", reference: "VCH-KHI-26-0085", description: "Cash receipt — Saddar Mobile",      debit: 0,      credit: 32750,  balance: 18358000 },
  { id: 5, date: "2026-04-28", entry: "JE-26-1036", reference: "INV-LHR-26-0088", description: "Sales invoice — Faisal Mobile",     debit: 18400,  credit: 0,      balance: 18390750 },
  { id: 6, date: "2026-04-27", entry: "JE-26-1035", reference: "INV-ISB-26-0034", description: "Sales invoice — Margalla Distrib.", debit: 218000, credit: 0,      balance: 18372350 },
];

type Txn = (typeof SAMPLE_TXNS)[number];

export default function LedgerPage() {
  const [accountId, setAccountId] = React.useState<number>(119); // Accounts Receivable

  const account = accounts.find((a) => a.id === accountId);
  const leaves = accounts.filter((a) => !a.isGroup);

  const totalDebit  = SAMPLE_TXNS.reduce((s, t) => s + t.debit, 0);
  const totalCredit = SAMPLE_TXNS.reduce((s, t) => s + t.credit, 0);

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
        subtitle="Drill into any account's transaction history"
        actions={
          <>
            <Button variant="secondary" size="md" className="gap-1.5"><Calendar /><span>Last 30 days</span></Button>
            <Button variant="secondary" size="md" className="gap-1.5"><Download /><span className="hidden sm:inline">Export</span></Button>
          </>
        }
      />

      {/* Account picker + summary */}
      <Card className="mb-4">
        <CardBody>
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1 max-w-md">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Account</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(+e.target.value)}
                className="input bg-white dark:bg-navy-800 dark:border-navy-700 dark:text-white"
              >
                {leaves.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
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
        <DataTable columns={columns} data={SAMPLE_TXNS} />
      </Card>
    </>
  );
}
