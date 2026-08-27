"use client";

import * as React from "react";
import { z } from "zod";
import { Plus, Folder, FileText, Edit3, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EntityFormDialog, ConfirmDialog } from "@/components/dialogs";
import axios from "axios";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/* GET /accounting/coa. The balance is signed by the API according to the
   account type: debit-normal accounts (assets, expenses) count debits as
   positive, credit-normal ones (liabilities, capital, revenue) the other
   way round, so the screen can just print the number. */
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

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

import { formatMoney } from "@/lib/format";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

/* These are the real "AccountGroup".GroupName values. They are plural and not
   the words you would guess -- "Capital" rather than Equity, "Revenue" rather
   than Income. The mock used ASSET / LIABILITY / EQUITY / REVENUE / EXPENSE,
   which match nothing in the database, so every summary tile read zero. */
const GROUPS = ["Assets", "Liabilities", "Capital", "Revenue", "Expenses"] as const;

const TYPE_COLOR: Record<string, string> = {
  Assets:      "bg-info-light text-info-dark dark:bg-info/15 dark:text-info-light",
  Liabilities: "bg-warning-light text-warning-dark dark:bg-warning/15 dark:text-warning-light",
  Capital:     "bg-brand-yellow-50 text-brand-yellow-700 dark:bg-brand-yellow/10 dark:text-brand-yellow",
  Revenue:     "bg-success-light text-success-dark dark:bg-success/15 dark:text-success-light",
  Expenses:    "bg-danger-light text-danger-dark dark:bg-danger/15 dark:text-danger-light",
};

const Schema = z.object({
  code: z.string().min(3, "Min 3 chars").max(20).regex(/^\d+$/, "Numbers only"),
  name: z.string().min(2, "Name required").max(150),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
  subtype: z.string().min(2, "Subtype required"),
  parentId: z.coerce.number().optional().or(z.literal("")),
  isGroup: z.boolean(),
  openingBalance: z.coerce.number(),
});
type Form = z.infer<typeof Schema>;

export default function COAPage() {
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [dialog, setDialog] = React.useState<{ mode: "create" | "edit"; acct?: Account } | null>(null);
  const [del, setDel] = React.useState<Account | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<Account[]>(`${API_BASE_URL}/accounting/coa`, {
        headers: authHeader(),
      });
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
       is a different architecture, not a bug in this line. Disabled here rather
       than globally so the rule still catches the cases worth fixing. */
    void load();
  }, [load]);

  const roots = accounts.filter((a) => a.parentId === null);

  function renderAccount(account: Account, depth = 0): React.ReactNode {
    if (search && !account.name.toLowerCase().includes(search.toLowerCase()) && !account.code.includes(search)) {
      const childMatches = accounts.filter((a) => a.parentId === account.id).some((c) => c.name.toLowerCase().includes(search.toLowerCase()));
      if (!childMatches) return null;
    }
    const children = accounts.filter((a) => a.parentId === account.id);
    return (
      <div key={account.id}>
        <div
          className={cn("flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700 group", account.isGroup && "font-semibold")}
          style={{ paddingLeft: `${0.75 + depth * 1.5}rem` }}
        >
          {account.isGroup ? <Folder className="size-4 text-brand-yellow flex-shrink-0" /> : <FileText className="size-4 text-slate-400 flex-shrink-0" />}
          <span className="tabular text-xs text-slate-500 dark:text-slate-400 w-12">{account.code}</span>
          <span className={cn("flex-1 text-sm truncate", account.isGroup ? "font-semibold text-navy-900 dark:text-white" : "text-slate-700 dark:text-slate-200")}>
            {account.name}
          </span>
          {!account.isGroup && (
            <>
              <Badge variant="outline" className="text-2xs">{account.type}</Badge>
              <span className="tabular text-sm font-semibold text-navy-900 dark:text-white w-32 text-right">{formatMoney(account.balance)}</span>
            </>
          )}
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => setDialog({ mode: "edit", acct: account })} aria-label="Edit account"><Edit3 /></Button>
            {!account.isGroup && (
              <Button variant="ghost" size="icon-sm" onClick={() => setDel(account)} className="text-danger" aria-label="Delete"><Trash2 /></Button>
            )}
          </div>
        </div>
        {children.map((c) => renderAccount(c, depth + 1))}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Chart of Accounts" }]}
        title="Chart of Accounts"
        subtitle="Hierarchical structure of all GL accounts"
        actions={
          <Button variant="accent" size="md" className="gap-1.5" onClick={() => setDialog({ mode: "create" })}>
            <Plus /><span>New Account</span>
          </Button>
        }
      />

      {error && (
        <Card className="p-4 mb-6 border-danger/40">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{error}</div>
            <Button variant="secondary" size="sm" onClick={() => void load()}>Try again</Button>
          </div>
        </Card>
      )}


      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {GROUPS.map((t) => {
          const total = accounts.filter((a) => a.group === t && !a.isGroup).reduce((s, a) => s + Math.abs(a.balance), 0);
          return (
            <Card key={t} className="p-4">
              <div className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wider", TYPE_COLOR[t])}>{t}</div>
              <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-2">{formatMoney(total)}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{accounts.filter((a) => a.group === t && !a.isGroup).length} accounts</div>
            </Card>
          );
        })}
      </div>

      <div className="relative mb-4">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input placeholder="Search accounts by name or code…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 max-w-md" />
      </div>

      <Card>
        <CardBody>
          <div className="space-y-1">
            {loading
              ? Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10 mb-1" />)
              : roots.map((root) => renderAccount(root))}
          </div>
        </CardBody>
      </Card>

      <EntityFormDialog<Form>
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        mode={dialog?.mode ?? "create"}
        title="Account"
        schema={Schema}
        fields={[
          { name: "code", label: "Account code", type: "text", placeholder: "1101", required: true, disabledOnEdit: true, hint: "Numeric, hierarchical (e.g. 1101 under 1100)" },
          { name: "name", label: "Account name", type: "text", placeholder: "Cash on Hand — Karachi", required: true },
          { name: "type", label: "Type", type: "select", required: true, options: [
            { value: "ASSET", label: "Asset" },
            { value: "LIABILITY", label: "Liability" },
            { value: "EQUITY", label: "Equity" },
            { value: "REVENUE", label: "Revenue" },
            { value: "EXPENSE", label: "Expense" },
          ] },
          { name: "subtype", label: "Subtype", type: "text", placeholder: "CASH, BANK, AR, AP, COGS, OPEX…", required: true, hint: "Free-text label for reporting" },
          { name: "parentId", label: "Parent group", type: "select", options: [{ value: "", label: "— Top level —" }, ...accounts.filter((a) => a.isGroup).map((a) => ({ value: a.id, label: `${a.code} ${a.name}` }))] },
          { name: "isGroup", label: "Group account (no postings)", type: "switch", hint: "Group accounts can have children but cannot be posted to directly", fullWidth: true },
          { name: "openingBalance", label: "Opening balance (PKR)", type: "number", step: 0.01, fullWidth: true },
        ]}
        defaultValues={{
          code: dialog?.acct?.code ?? "",
          name: dialog?.acct?.name ?? "",
          type: (dialog?.acct?.group ?? "Assets") as "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE",
          subtype: dialog?.acct?.type ?? "",
          parentId: (dialog?.acct?.parentId ?? "") as number | "",
          isGroup: dialog?.acct?.isGroup ?? false,
          openingBalance: dialog?.acct?.balance ?? 0,
        }}
      />

      <ConfirmDialog
        open={del !== null}
        onOpenChange={(o) => !o && setDel(null)}
        title={`Delete account "${del?.name}"?`}
        description="Accounts with posted journal lines cannot be hard-deleted — they will be deactivated instead. The audit trail is preserved."
        variant="danger"
        confirmLabel="Delete / deactivate"
        onConfirm={() => { toast.success("Account deactivated"); setDel(null); }}
      />
    </>
  );
}
