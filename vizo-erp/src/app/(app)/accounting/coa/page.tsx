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
import { accounts, type Account } from "@/data/accounting";
import { formatMoney } from "@/lib/format";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const TYPE_COLOR: Record<string, string> = {
  ASSET:     "bg-info-light text-info-dark dark:bg-info/15 dark:text-info-light",
  LIABILITY: "bg-warning-light text-warning-dark dark:bg-warning/15 dark:text-warning-light",
  EQUITY:    "bg-brand-yellow-50 text-brand-yellow-700 dark:bg-brand-yellow/10 dark:text-brand-yellow",
  REVENUE:   "bg-success-light text-success-dark dark:bg-success/15 dark:text-success-light",
  EXPENSE:   "bg-danger-light text-danger-dark dark:bg-danger/15 dark:text-danger-light",
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
  const [search, setSearch] = React.useState("");
  const [dialog, setDialog] = React.useState<{ mode: "create" | "edit"; acct?: Account } | null>(null);
  const [del, setDel] = React.useState<Account | null>(null);
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
              <Badge variant="outline" className="text-2xs">{account.subtype}</Badge>
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

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const).map((t) => {
          const total = accounts.filter((a) => a.type === t && !a.isGroup).reduce((s, a) => s + Math.abs(a.balance), 0);
          return (
            <Card key={t} className="p-4">
              <div className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wider", TYPE_COLOR[t])}>{t}</div>
              <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-2">{formatMoney(total)}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{accounts.filter((a) => a.type === t && !a.isGroup).length} accounts</div>
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
            {roots.map((root) => renderAccount(root))}
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
          type: (dialog?.acct?.type ?? "ASSET") as "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE",
          subtype: dialog?.acct?.subtype ?? "",
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
