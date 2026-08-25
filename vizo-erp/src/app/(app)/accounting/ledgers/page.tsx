"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import { Search, EyeOff, ChevronRight, AlertCircle, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectNative } from "@/components/ui/select-native";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * One screen for every ledger. The old system showed Assets, Expenses,
 * Liabilities, Revenue and Capital as five near-identical windows; here it is a
 * single list with a type filter, which is how people actually use it.
 *
 * This is the INDEX. Clicking a row opens /accounting/ledger?accountId=N, which
 * is the same account's transaction history over a date range. The two screens
 * are a list/detail pair, not a duplicate.
 */

/* GET /accounting/coa -> a flat list of every account, groups included.
   `balance` is computed by the API from POSTED journal lines plus the opening
   balance, already flipped onto a debit basis where the account is
   credit-normal. */
type Account = {
  id: number;
  code: string;
  name: string;
  parentId: number | null;
  accountTypeId: number;
  type: string;
  group: string;
  isGroup: boolean;
  openingBalance: number;
  currency: string;
  isActive: boolean;
  balance: number;
};

/* The five AccountGroup rows, spelled the way the database spells them:
   plural, with "Capital" rather than "Equity" and "Revenue" rather than
   "Income". Guessing these does not error -- the filter simply matches nothing
   and the screen reads empty. */
type AccountGroup = "Assets" | "Liabilities" | "Capital" | "Revenue" | "Expenses";
type GroupFilter = "ALL" | AccountGroup;

const TYPE_TABS: { value: GroupFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "Assets", label: "Assets" },
  { value: "Liabilities", label: "Liabilities" },
  { value: "Capital", label: "Capital" },
  { value: "Revenue", label: "Revenue" },
  { value: "Expenses", label: "Expenses" },
];

const GROUP_TONE: Record<string, string> = {
  Assets: "text-success",
  Liabilities: "text-warning",
  Capital: "text-brand-yellow",
  Revenue: "text-info",
  Expenses: "text-danger",
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function LedgersPage() {
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [group, setGroup] = React.useState<GroupFilter>("ALL");
  const [query, setQuery] = React.useState("");
  const [hideZero, setHideZero] = React.useState(true);
  const [sortBy, setSortBy] = React.useState<"name" | "code" | "balance">("name");

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<Account[]>(`${API_BASE_URL}/accounting/coa`, { headers: authHeader() });
      setAccounts(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the chart of accounts."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. */
    void load();
  }, [load]);

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = accounts.filter((a) => {
      if (a.isGroup) return false;
      if (group !== "ALL" && a.group !== group) return false;
      if (hideZero && a.balance === 0) return false;
      if (!q) return true;
      return a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q);
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "balance") return Math.abs(b.balance) - Math.abs(a.balance);
      if (sortBy === "code") return a.code.localeCompare(b.code);
      return a.name.localeCompare(b.name);
    });
  }, [accounts, group, query, hideZero, sortBy]);

  const total = rows.reduce((sum, a) => sum + a.balance, 0);
  const zeroCount = accounts.filter((a) => !a.isGroup && a.balance === 0).length;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Money" }, { label: "Ledgers" }]}
        title="Ledgers"
        subtitle="Every account and where it stands. Click any row for its full history."
        actions={
          <Button variant="ghost" size="md" className="gap-1.5" onClick={() => { setLoading(true); void load(); }}>
            <RefreshCw className="size-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
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
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setLoading(true); void load(); }}>
              <RefreshCw className="size-4" /> Try again
            </Button>
          </CardBody>
        </Card>
      )}

      <Card className="mb-4">
        <CardBody className="flex flex-col gap-3">
          <div className="flex gap-1 overflow-x-auto scrollbar-thin">
            {TYPE_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setGroup(t.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                  group === t.value
                    ? "bg-brand-yellow/10 text-brand-yellow-700 dark:text-brand-yellow"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-700"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or code"
                className="pl-9"
              />
            </div>
            <SelectNative
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="sm:w-44"
              aria-label="Sort by"
            >
              <option value="name">Sort by name</option>
              <option value="code">Sort by code</option>
              <option value="balance">Sort by balance</option>
            </SelectNative>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
              <Checkbox checked={hideZero} onCheckedChange={(v) => setHideZero(Boolean(v))} />
              <EyeOff className="size-3.5 text-slate-400" />
              Hide zero ({zeroCount})
            </label>
          </div>
        </CardBody>
      </Card>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={Search}
            title="No accounts match"
            description={
              hideZero
                ? "Try clearing the search, or untick “Hide zero” to include accounts with no balance."
                : "Try clearing the search or picking a different group."
            }
          />
        </Card>
      ) : (
        <>
          <div className="space-y-1.5">
            {rows.map((a) => (
              <Link
                key={a.id}
                href={`/accounting/ledger?accountId=${a.id}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 hover:border-brand-yellow/40 transition-colors group"
              >
                <span className="tabular text-xs text-slate-500 dark:text-slate-400 w-16 shrink-0">{a.code}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-navy-900 dark:text-white truncate group-hover:text-brand-yellow transition-colors">
                    {a.name}
                  </div>
                  <div className={cn("text-2xs uppercase font-semibold tracking-wider mt-0.5", GROUP_TONE[a.group] ?? "text-slate-400")}>
                    {a.type}
                  </div>
                </div>
                <div className="tabular text-sm font-bold text-navy-900 dark:text-white text-right">
                  {formatMoney(a.balance)}
                </div>
                <ChevronRight className="size-4 text-slate-300 group-hover:text-brand-yellow shrink-0" />
              </Link>
            ))}
          </div>

          <Card className="mt-4">
            <CardBody className="py-3 flex items-center justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {rows.length} {rows.length === 1 ? "account" : "accounts"}
                {group !== "ALL" && ` in ${group}`}
              </span>
              <span className="tabular text-base font-bold text-navy-900 dark:text-white">
                {formatMoney(total)}
              </span>
            </CardBody>
          </Card>
          {/* A mixed-group total is the sum of debit-basis balances, which only
              means something within one group -- so say which one it is. */}
          {group === "ALL" && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
              Totalling across groups mixes debits and credits. Pick a single group for a figure that means something.
            </p>
          )}
        </>
      )}
    </>
  );
}
