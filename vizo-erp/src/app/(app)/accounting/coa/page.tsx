"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import {
  Plus, Folder, FileText, Edit3, Search, Trash2, AlertCircle, Lock, RotateCcw, Loader2, FolderPlus, BookOpen,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/dialogs";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────────────────────
   CHART OF ACCOUNTS — every figure and every action from the database (27 Sep)

   GET    /accounting/coa               the chart, balances signed by type
   GET    /accounting/accounts/lookups  account types, group headings, the
                                        accounts the system posts to by code
   POST   /accounting/accounts          add
   PUT    /accounting/accounts/{id}     edit / switch off / switch on
   DELETE /accounting/accounts/{id}     delete, or switch off if it has history

   Until today New / Edit / Delete only showed a success toast — the API could
   read the chart and nothing more — and the form offered ASSET / LIABILITY /
   EQUITY types that match nothing in the database.
   ─────────────────────────────────────────────────────────────────────────── */

type Account = {
  id: number; code: string; name: string; parentId: number | null; accountTypeId: number;
  type: string; group: string; isGroup: boolean; openingBalance: number; currency: string;
  isActive: boolean; balance: number;
};
type Lookups = {
  types: { id: number; name: string; groupId: number; group: string; isDebitNormal: boolean }[];
  groups: { id: number; code: string; name: string; typeId: number; groupId: number }[];
  systemCodes: string[];
};

/* The real "AccountGroup".GroupName values. */
const GROUPS = ["Assets", "Liabilities", "Capital", "Revenue", "Expenses"] as const;
const TYPE_COLOR: Record<string, string> = {
  Assets: "bg-info-light text-info-dark dark:bg-info/15 dark:text-info-light",
  Liabilities: "bg-warning-light text-warning-dark dark:bg-warning/15 dark:text-warning-light",
  Capital: "bg-brand-yellow-50 text-brand-yellow-700 dark:bg-brand-yellow/10 dark:text-brand-yellow",
  Revenue: "bg-success-light text-success-dark dark:bg-success/15 dark:text-success-light",
  Expenses: "bg-danger-light text-danger-dark dark:bg-danger/15 dark:text-danger-light",
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) return (e.response.data as { message?: string })?.message ?? fallback;
  return "Cannot reach the server.";
}

type Draft = {
  id?: number; code: string; name: string; accountTypeId: string; parentId: string;
  isGroup: boolean; openingBalance: string; isActive: boolean;
};

export default function COAPage() {
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [lookups, setLookups] = React.useState<Lookups | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [showInactive, setShowInactive] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [del, setDel] = React.useState<Account | null>(null);

  const load = React.useCallback(async () => {
    try {
      const [coa, lk] = await Promise.all([
        axios.get<Account[]>(`${API_BASE_URL}/accounting/coa`, { headers: authHeader() }),
        axios.get<Lookups>(`${API_BASE_URL}/accounting/accounts/lookups`, { headers: authHeader() }).catch(() => null),
      ]);
      setAccounts(coa.data);
      if (lk) setLookups(lk.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the chart of accounts."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- axios inside the page, as the brief asks. */
    void load();
  }, [load]);

  const canEdit = lookups !== null;   // the lookups need ledger.manage; without it the chart is read-only
  const system = React.useMemo(() => new Set(lookups?.systemCodes ?? []), [lookups]);
  const visible = accounts.filter((a) => showInactive || a.isActive);
  const byParent = React.useMemo(() => {
    const m = new Map<number | null, Account[]>();
    for (const a of visible) m.set(a.parentId, [...(m.get(a.parentId) ?? []), a]);
    return m;
  }, [visible]);
  const term = search.trim().toLowerCase();
  const matches = (a: Account): boolean =>
    !term || a.name.toLowerCase().includes(term) || a.code.includes(term)
    || (byParent.get(a.id) ?? []).some(matches);

  function openNew(parent?: Account) {
    const type = parent ? (lookups?.types.find((t) => t.id === parent.accountTypeId)) : lookups?.types[0];
    /* Suggest the next free code under the parent: the parent's code + the next number. */
    let code = "";
    if (parent) {
      const kids = accounts.filter((a) => a.parentId === parent.id).map((a) => Number(a.code)).filter(Number.isFinite);
      code = String(kids.length ? Math.max(...kids) + 1 : Number(parent.code) + 1);
    }
    setDraft({ code, name: "", accountTypeId: String(type?.id ?? ""), parentId: parent ? String(parent.id) : "",
      isGroup: false, openingBalance: "0", isActive: true });
  }
  function openEdit(a: Account) {
    setDraft({ id: a.id, code: a.code, name: a.name, accountTypeId: String(a.accountTypeId),
      parentId: a.parentId ? String(a.parentId) : "", isGroup: a.isGroup, openingBalance: String(a.openingBalance), isActive: a.isActive });
  }

  async function remove(a: Account) {
    try {
      const r = await axios.delete<{ message: string }>(`${API_BASE_URL}/accounting/accounts/${a.id}`, { headers: authHeader() });
      toast.success(r.data.message);
      setDel(null);
      await load();
    } catch (e) {
      toast.error("Not removed", { description: apiMessage(e, "Please try again.") });
    }
  }
  async function reactivate(a: Account) {
    try {
      await axios.put(`${API_BASE_URL}/accounting/accounts/${a.id}`, {
        code: a.code, name: a.name, accountTypeId: a.accountTypeId, parentId: a.parentId,
        isGroup: a.isGroup, openingBalance: a.openingBalance, isActive: true,
      }, { headers: authHeader() });
      toast.success(`${a.name} is back in use.`);
      await load();
    } catch (e) {
      toast.error("Not saved", { description: apiMessage(e, "Please try again.") });
    }
  }

  function renderAccount(a: Account, depth = 0): React.ReactNode {
    if (!matches(a)) return null;
    const children = byParent.get(a.id) ?? [];
    const locked = system.has(a.code);
    return (
      <div key={a.id}>
        <div className={cn("group flex items-center gap-2 sm:gap-3 rounded-lg py-2.5 pr-2 hover:bg-slate-50 dark:hover:bg-navy-700", !a.isActive && "opacity-50")}
          style={{ paddingLeft: `${0.5 + depth * 1.25}rem` }}>
          {a.isGroup ? <Folder className="size-4 shrink-0 text-brand-yellow" /> : <FileText className="size-4 shrink-0 text-slate-400" />}
          <span className="w-12 shrink-0 tabular text-xs text-slate-500 dark:text-slate-400">{a.code}</span>
          <span className={cn("min-w-0 flex-1 truncate text-sm", a.isGroup ? "font-semibold text-navy-900 dark:text-white" : "text-slate-700 dark:text-slate-200")}>
            {a.isGroup || !a.isActive ? a.name : (
              <Link href={`/accounting/ledger?accountId=${a.id}`} className="hover:text-brand-yellow-700 hover:underline dark:hover:text-brand-yellow">{a.name}</Link>
            )}
            {locked && <Lock className="ml-1.5 inline size-3 text-slate-400" aria-label="Used by the system" />}
            {!a.isActive && <span className="ml-2 text-2xs font-medium text-slate-500">(switched off)</span>}
          </span>
          {!a.isGroup && (
            <>
              <Badge variant="outline" className="hidden sm:inline-flex text-2xs">{a.type}</Badge>
              <span className="w-28 sm:w-32 text-right tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(a.balance)}</span>
            </>
          )}
          {canEdit && (
            <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100">
              {a.isGroup && a.isActive && (
                <Button variant="ghost" size="icon-sm" onClick={() => openNew(a)} aria-label="Add an account under this"><FolderPlus /></Button>
              )}
              {a.isActive ? (
                <>
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(a)} aria-label="Edit account"><Edit3 /></Button>
                  {!locked && <Button variant="ghost" size="icon-sm" className="text-danger" onClick={() => setDel(a)} aria-label="Delete account"><Trash2 /></Button>}
                </>
              ) : (
                <Button variant="ghost" size="icon-sm" onClick={() => void reactivate(a)} aria-label="Switch back on"><RotateCcw /></Button>
              )}
            </div>
          )}
        </div>
        {children.map((c) => renderAccount(c, depth + 1))}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Money" }, { label: "Account List" }]}
        title="Chart of Accounts"
        subtitle="Every account in the books, with its balance — add, rename, retire. Click an account for its ledger."
        actions={canEdit ? (
          <Button variant="accent" size="md" className="gap-1.5" onClick={() => openNew()}><Plus /><span>New account</span></Button>
        ) : undefined}
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

      {/* Group totals: each account's balance as the API signed it, added up —
          the old tiles added absolute values, overstating any group holding a
          balance on the unusual side. */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        {GROUPS.map((g) => {
          const members = accounts.filter((a) => a.group === g && !a.isGroup && a.isActive);
          return (
            <Card key={g} className="p-4">
              <div className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider", TYPE_COLOR[g])}>{g}</div>
              {loading ? <Skeleton className="mt-2 h-7 w-24" /> : (
                <div className="mt-2 truncate tabular text-xl sm:text-2xl font-bold text-navy-900 dark:text-white"
                  title={formatMoney(members.reduce((s, a) => s + a.balance, 0))}>
                  {formatCompact(members.reduce((s, a) => s + a.balance, 0))}
                </div>
              )}
              <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{members.length} accounts</div>
            </Card>
          );
        })}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search accounts by name or code…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <Switch checked={showInactive} onCheckedChange={setShowInactive} /> Show switched-off accounts
        </label>
      </div>

      <Card>
        <CardBody>
          <div className="space-y-0.5">
            {loading
              ? Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10 mb-1" />)
              : (byParent.get(null) ?? []).map((root) => renderAccount(root))}
          </div>
          {canEdit && (
            <p className="mt-3 flex items-center gap-1.5 text-2xs text-slate-500">
              <Lock className="size-3" /> The system posts to these by code — they can be renamed, never removed.
            </p>
          )}
        </CardBody>
      </Card>

      {draft && lookups && (
        <AccountDialog draft={draft} setDraft={setDraft} lookups={lookups} accounts={accounts}
          locked={draft.id ? system.has(accounts.find((a) => a.id === draft.id)?.code ?? "") : false}
          onSaved={() => { setDraft(null); void load(); }} />
      )}

      <ConfirmDialog
        open={del !== null}
        onOpenChange={(o) => !o && setDel(null)}
        title={`Remove ${del?.code} ${del?.name}?`}
        description="An account nothing has ever posted to is deleted. One with history is switched off instead — it leaves the pickers and keeps its ledger."
        variant="danger"
        confirmLabel="Remove"
        onConfirm={async () => { if (del) await remove(del); }}
      />
    </>
  );
}

function AccountDialog({ draft, setDraft, lookups, accounts, locked, onSaved }: {
  draft: Draft; setDraft: (d: Draft | null) => void; lookups: Lookups; accounts: Account[];
  locked: boolean; onSaved: () => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v });

  const parent = lookups.groups.find((g) => String(g.id) === draft.parentId);
  /* Under a heading, only the types of that heading's group make sense. */
  const types = parent ? lookups.types.filter((t) => t.groupId === parent.groupId) : lookups.types;
  const type = lookups.types.find((t) => String(t.id) === draft.accountTypeId);
  const existing = draft.id ? accounts.find((a) => a.id === draft.id) : undefined;

  async function save() {
    setSaving(true);
    const body = {
      code: draft.code.trim(), name: draft.name.trim(), accountTypeId: Number(draft.accountTypeId),
      parentId: draft.parentId ? Number(draft.parentId) : null, isGroup: draft.isGroup,
      openingBalance: Number(draft.openingBalance) || 0, isActive: draft.id ? draft.isActive : null,
    };
    try {
      const r = draft.id
        ? await axios.put<{ message: string }>(`${API_BASE_URL}/accounting/accounts/${draft.id}`, body, { headers: authHeader() })
        : await axios.post<{ message: string }>(`${API_BASE_URL}/accounting/accounts`, body, { headers: authHeader() });
      toast.success(r.data.message);
      onSaved();
    } catch (e) {
      toast.error("Not saved", { description: apiMessage(e, "Please try again.") });
    } finally {
      setSaving(false);
    }
  }

  const problem = !draft.name.trim() ? "Give the account a name." : !/^\d{3,15}$/.test(draft.code.trim()) ? "The code is 3 to 15 digits."
    : !draft.accountTypeId ? "Pick its type." : null;

  return (
    <Dialog open onOpenChange={(o) => !o && setDraft(null)}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{draft.id ? `Edit ${existing?.code} ${existing?.name}` : "New account"}</DialogTitle>
          <DialogDescription>
            {locked ? "The system posts to this account by its code, so only its name and opening balance can change."
              : "A group is a heading that holds accounts; an ordinary account takes postings."}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="mb-1.5 block">Under (group)</Label>
            <SelectNative value={draft.parentId} disabled={locked}
              onChange={(e) => {
                const g = lookups.groups.find((x) => String(x.id) === e.target.value);
                const firstType = g ? lookups.types.find((t) => t.groupId === g.groupId) : undefined;
                setDraft({ ...draft, parentId: e.target.value,
                  accountTypeId: g && type && type.groupId !== g.groupId ? String(firstType?.id ?? "") : draft.accountTypeId });
              }}>
              <option value="">— Top level —</option>
              {lookups.groups.filter((g) => g.id !== draft.id).map((g) => <option key={g.id} value={g.id}>{g.code} {g.name}</option>)}
            </SelectNative>
          </div>
          <div>
            <Label className="mb-1.5 block">Type <span className="text-danger">*</span></Label>
            <SelectNative value={draft.accountTypeId} disabled={locked} onChange={(e) => set("accountTypeId", e.target.value)}>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.group})</option>)}
            </SelectNative>
            {type && <p className="mt-1 text-2xs text-slate-500">{type.isDebitNormal ? "Grows with debits" : "Grows with credits"}</p>}
          </div>
          <div>
            <Label className="mb-1.5 block">Code <span className="text-danger">*</span></Label>
            <Input value={draft.code} inputMode="numeric" disabled={locked} maxLength={15} className="tabular"
              onChange={(e) => set("code", e.target.value.replace(/\D/g, ""))} />
            {parent && <p className="mt-1 text-2xs text-slate-500">Starts with {parent.code[0]}, like {parent.code}.</p>}
          </div>
          <div>
            <Label className="mb-1.5 block">Name <span className="text-danger">*</span></Label>
            <Input value={draft.name} maxLength={100} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Bank Alfalah Account" />
          </div>
          <div className="sm:col-span-2 flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 dark:border-navy-700">
            <div>
              <div className="text-sm font-medium">Group heading</div>
              <div className="text-2xs text-slate-500">Holds other accounts; takes no postings itself.</div>
            </div>
            <Switch checked={draft.isGroup} disabled={locked} onCheckedChange={(v) => set("isGroup", v)} />
          </div>
          {!draft.isGroup && (
            <div className="sm:col-span-2">
              <Label className="mb-1.5 block">Opening balance (PKR)</Label>
              <Input type="number" inputMode="decimal" step="0.01" className="tabular max-w-60"
                value={draft.openingBalance} onChange={(e) => set("openingBalance", e.target.value)} />
              <p className="mt-1 text-2xs text-slate-500">In the account&apos;s own direction — what it held before the first entry in this system.</p>
            </div>
          )}
        </DialogBody>
        <DialogFooter className="items-center">
          {problem && <p className="mr-auto text-xs text-danger">{problem}</p>}
          <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
          <Button variant="accent" disabled={!!problem || saving} onClick={() => void save()}>
            {saving ? <Loader2 className="animate-spin" /> : <BookOpen />} {draft.id ? "Save" : "Add account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
