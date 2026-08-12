"use client";

import * as React from "react";
import { Lock, Info } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import {
  accountTypes, accountGroups, nextAccountCode,
  type AccountType, type AccountGroup,
} from "@/data/settings";
import { cn } from "@/lib/utils";

const GROUP_TONE: Record<AccountGroup, string> = {
  Assets: "text-success",
  Capital: "text-brand-yellow",
  Expenses: "text-danger",
  Liabilities: "text-warning",
  Revenue: "text-info",
};

export default function AccountTypesPage() {
  const [group, setGroup] = React.useState<AccountGroup | "all">("all");

  const rows = React.useMemo(
    () => (group === "all" ? accountTypes : accountTypes.filter((t) => t.group === group)),
    [group]
  );

  const columns: Column<AccountType>[] = [
    {
      key: "name",
      header: "Type",
      sortable: true,
      cell: (t) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-navy-900 dark:text-white">{t.name}</span>
          {t.isSystem && (
            <Lock className="size-3 text-slate-300 dark:text-slate-600" aria-label="Built-in type" />
          )}
        </div>
      ),
    },
    {
      key: "group",
      header: "Group",
      sortable: true,
      cell: (t) => (
        <span className={cn("text-xs font-semibold", GROUP_TONE[t.group])}>{t.group}</span>
      ),
    },
    {
      key: "prefix",
      header: "Code starts with",
      cell: (t) => <span className="tabular text-sm">{t.prefix}</span>,
    },
    {
      key: "sample",
      header: "Next code",
      cell: (t) => (
        <span className="tabular text-xs text-slate-500 dark:text-slate-400">
          {nextAccountCode(t.id, 1511)}
        </span>
      ),
    },
    {
      key: "normalBalance",
      header: "Normal side",
      cell: (t) => (
        <Badge variant={t.normalBalance === "debit" ? "info" : "accent"}>
          {t.normalBalance === "debit" ? "Debit" : "Credit"}
        </Badge>
      ),
    },
    {
      key: "onBalanceSheet",
      header: "Appears on",
      cell: (t) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {t.onBalanceSheet ? "Balance Sheet" : "Income Statement"}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Setup" }, { label: "Account Types" }]}
        title="Account Types"
        subtitle="The categories every account falls into, and the code each one gets."
      />

      <Card className="mb-4">
        <CardBody className="flex items-start gap-3 py-3">
          <Info className="size-4 text-info flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 dark:text-slate-300">
            The prefix decides how new account codes are built — a new customer
            under <span className="tabular font-medium">Acc Receivables</span> becomes{" "}
            <span className="tabular font-medium text-navy-900 dark:text-white">
              {nextAccountCode(5, 1511)}
            </span>
            . Built-in types{" "}
            <Lock className="inline size-3 text-slate-400" /> can be renamed but not
            removed, because the statements are built from them.
          </p>
        </CardBody>
      </Card>

      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        <FilterChip active={group === "all"} onClick={() => setGroup("all")}>
          All ({accountTypes.length})
        </FilterChip>
        {accountGroups.map((g) => (
          <FilterChip key={g} active={group === g} onClick={() => setGroup(g)}>
            {g} ({accountTypes.filter((t) => t.group === g).length})
          </FilterChip>
        ))}
      </div>

      <Card>
        <DataTable columns={columns} data={rows} pageSize={20} />
      </Card>
    </>
  );
}

function FilterChip({
  active, onClick, children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
        active
          ? "bg-navy-900 text-brand-yellow dark:bg-navy-800"
          : "bg-white dark:bg-navy-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-navy-700 hover:border-slate-300"
      )}
    >
      {children}
    </button>
  );
}
