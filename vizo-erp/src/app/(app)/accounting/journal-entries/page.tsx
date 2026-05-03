"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, FileText, CheckCircle2, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusPill } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { journalEntries, JE_STATUS_VARIANT, type JE } from "@/data/accounting";
import { formatMoney, formatDate } from "@/lib/format";

export default function JournalEntriesPage() {
  const [search, setSearch] = React.useState("");
  const filtered = journalEntries.filter((j) =>
    !search || j.entryNo.toLowerCase().includes(search.toLowerCase()) || j.narration.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<JE>[] = [
    { key: "entryNo", header: "Entry #", cell: (j) => <span className="tabular text-sm font-medium text-navy-900 dark:text-white">{j.entryNo}</span> },
    { key: "entryDate", header: "Date", cell: (j) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(j.entryDate)}</span> },
    { key: "entryType", header: "Type", cell: (j) => <Badge variant="muted">{j.entryType}</Badge> },
    { key: "reference", header: "Reference", cell: (j) => <span className="tabular text-xs text-slate-600 dark:text-slate-300">{j.reference}</span> },
    { key: "narration", header: "Narration", cell: (j) => <span className="text-sm text-slate-700 dark:text-slate-200 line-clamp-1">{j.narration}</span> },
    { key: "branch", header: "Branch", cell: (j) => <span className="text-xs text-slate-600 dark:text-slate-300">{j.branch}</span> },
    { key: "totalDebit", header: "Debit", align: "right", cell: (j) => <span className="tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(j.totalDebit)}</span> },
    { key: "totalCredit", header: "Credit", align: "right", cell: (j) => <span className="tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(j.totalCredit)}</span> },
    { key: "status", header: "Status", cell: (j) => <StatusPill variant={JE_STATUS_VARIANT[j.status]}>{j.status}</StatusPill> },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Journal Entries" }]}
        title="Journal Entries"
        subtitle="Complete double-entry transaction log"
        actions={
          <Button variant="accent" size="md" className="gap-1.5" asChild>
            <Link href="/accounting/journal-entries/new"><Plus /><span>New Entry</span></Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Total Entries</div>
              <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{journalEntries.length}</div>
            </div>
            <FileText className="size-5 text-info" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Posted</div>
              <div className="text-2xl tabular font-bold text-success mt-1">{journalEntries.filter((j) => j.status === "POSTED").length}</div>
            </div>
            <CheckCircle2 className="size-5 text-success" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Draft</div>
          <div className="text-2xl tabular font-bold text-warning mt-1">{journalEntries.filter((j) => j.status === "DRAFT").length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Reversed</div>
              <div className="text-2xl tabular font-bold text-danger mt-1">{journalEntries.filter((j) => j.status === "REVERSED").length}</div>
            </div>
            <RotateCcw className="size-5 text-danger" />
          </div>
        </Card>
      </div>

      <FilterBar searchPlaceholder="Search entries by number or narration…" searchValue={search} onSearchChange={setSearch} />

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={filtered} pageSize={15} />
      </Card>
    </>
  );
}
