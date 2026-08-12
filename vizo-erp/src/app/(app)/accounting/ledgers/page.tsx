"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Printer, Download, EyeOff, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectNative } from "@/components/ui/select-native";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";
import { accounts, type Account, type AccountType } from "@/data/accounting";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * One screen for every ledger. The old system showed Assets, Expenses,
 * Liabilities, Revenue and Capital as five near-identical windows; here it is a
 * single list with a type filter, which is how people actually use it.
 */

type TypeFilter = "ALL" | AccountType;

const TYPE_TABS: { value: TypeFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ASSET", label: "Assets" },
  { value: "LIABILITY", label: "Liabilities" },
  { value: "EQUITY", label: "Capital" },
  { value: "REVENUE", label: "Revenue" },
  { value: "EXPENSE", label: "Expenses" },
];

const TYPE_TONE: Record<AccountType, string> = {
  ASSET: "text-success",
  LIABILITY: "text-warning",
  EQUITY: "text-brand-yellow",
  REVENUE: "text-info",
  EXPENSE: "text-danger",
};

const TYPE_LABEL: Record<AccountType, string> = {
  ASSET: "Asset",
  LIABILITY: "Liability",
  EQUITY: "Capital",
  REVENUE: "Revenue",
  EXPENSE: "Expense",
};

export default function LedgersPage() {
  const [type, setType] = React.useState<TypeFilter>("ALL");
  const [query, setQuery] = React.useState("");
  const [hideZero, setHideZero] = React.useState(true);
  const [sortBy, setSortBy] = React.useState<"name" | "code" | "balance">("name");

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = accounts.filter((a) => {
      if (a.isGroup) return false;
      if (type !== "ALL" && a.type !== type) return false;
      if (hideZero && a.balance === 0) return false;
      if (!q) return true;
      return a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q);
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "balance") return Math.abs(b.balance) - Math.abs(a.balance);
      if (sortBy === "code") return a.code.localeCompare(b.code);
      return a.name.localeCompare(b.name);
    });
  }, [type, query, hideZero, sortBy]);

  const total = rows.reduce((sum, a) => sum + a.balance, 0);
  const zeroCount = accounts.filter((a) => !a.isGroup && a.balance === 0).length;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Money" }, { label: "Ledgers" }]}
        title="Ledgers"
        subtitle="Every account and where it stands. Click any row for its full history."
        actions={
          <>
            <Button variant="ghost" size="md" className="gap-1.5"
              onClick={() => toast.info("Preparing print view…")}>
              <Printer />
              <span className="hidden sm:inline">Print</span>
            </Button>
            <Button variant="secondary" size="md" className="gap-1.5"
              onClick={() => toast.success("Export started", { description: `${rows.length} accounts` })}>
              <Download />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </>
        }
      />

      {/* Type tabs */}
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        {TYPE_TABS.map((t) => {
          const count =
            t.value === "ALL"
              ? accounts.filter((a) => !a.isGroup).length
              : accounts.filter((a) => !a.isGroup && a.type === t.value).length;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                type === t.value
                  ? "bg-navy-900 text-brand-yellow dark:bg-navy-800"
                  : "bg-white dark:bg-navy-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-navy-700 hover:border-slate-300"
              )}
            >
              {t.label} <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <Card className="mb-4">
        <CardBody className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Account name or code…"
              className="pl-9"
            />
          </div>

          <SelectNative
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="lg:w-44"
            aria-label="Sort accounts"
          >
            <option value="name">Sort by name</option>
            <option value="code">Sort by code</option>
            <option value="balance">Sort by balance</option>
          </SelectNative>

          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap cursor-pointer">
            <Checkbox checked={hideZero} onCheckedChange={(v) => setHideZero(Boolean(v))} />
            <EyeOff className="size-3.5 text-slate-400" />
            Hide zero balances
            <span className="text-2xs text-slate-400">({zeroCount})</span>
          </label>
        </CardBody>
      </Card>

      {/* List */}
      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No accounts match"
            description="Try a different search, or switch off “hide zero balances”."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-navy-700 text-left">
                  <th className="px-4 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-400">Account</th>
                  <th className="px-4 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-400 w-28">Code</th>
                  <th className="px-4 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-400 w-28">Type</th>
                  <th className="px-4 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-400 text-right w-44">Balance</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-800">
                {rows.map((a) => (
                  <LedgerRow key={a.id} account={a} />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900">
                  <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {rows.length} {rows.length === 1 ? "account" : "accounts"}
                    {type !== "ALL" && ` · ${TYPE_TABS.find((t) => t.value === type)?.label}`}
                  </td>
                  <td className="px-4 py-3 text-right tabular text-sm font-bold text-navy-900 dark:text-white">
                    {formatMoney(total)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function LedgerRow({ account }: { account: Account }) {
  const negative = account.balance < 0;
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-navy-800/50 group">
      <td className="px-4 py-2.5">
        <Link
          href={`/accounting/ledger?account=${account.id}`}
          className="font-medium text-navy-900 dark:text-white hover:text-brand-yellow transition-colors"
        >
          {account.name}
        </Link>
      </td>
      <td className="px-4 py-2.5 tabular text-xs text-slate-500 dark:text-slate-400">
        {account.code}
      </td>
      <td className="px-4 py-2.5">
        <span className={cn("text-2xs font-semibold", TYPE_TONE[account.type])}>
          {TYPE_LABEL[account.type]}
        </span>
      </td>
      <td
        className={cn(
          "px-4 py-2.5 text-right tabular text-sm font-semibold",
          negative ? "text-danger" : "text-navy-900 dark:text-white"
        )}
      >
        {negative ? `(${formatMoney(Math.abs(account.balance))})` : formatMoney(account.balance)}
      </td>
      <td className="px-4 py-2.5">
        <ChevronRight className="size-4 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
      </td>
    </tr>
  );
}
