"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  AlertCircle, BookOpen, ChevronRight, FileSpreadsheet, Loader2, MapPin, Plus, Search, Sparkles, UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
import { Pager } from "@/components/ui/pager";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader, useSession } from "@/components/providers/session-provider";
import { CategoryManager, type ManagedCategory } from "@/components/ledgers/category-manager";
import { apiMessage, ledgerAmount } from "@/components/ledgers/ledger-kit";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────────────────────
   CUSTOMER LEDGERS -- every customer's account, from the books.

   The balance on each row is the customer's opening balance plus every posted
   line on Accounts Receivable that carries their id -- the same figure the
   statement ends on, the trial balance's 1130 adds up to, and the credit-limit
   check reads (CustomerLedgerController). Paged on the server: the old system
   had 1,504 accounts, and the import brings them.

   Super Admin and Accountant only (proxy.ts, and the API by role).
   ─────────────────────────────────────────────────────────────────────────── */

type Account = {
  id: number; code: string; name: string; legalName: string;
  categoryId: number; category: string; city: string; phone: string | null;
  creditLimit: number; isActive: boolean; salesPerson: string | null; balance: number;
};
type Page = { total: number; page: number; pageSize: number; totalReceivable: number; items: Account[] };
type City = { id: number; name: string };
type Rep = { id: number; name: string };
type Lookups = { categories: ManagedCategory[]; cities: City[]; salesPeople: Rep[] };
type Pending = { invoices: number; returns: number; collections: number; pending: number; invoiceTotal: number };

const PAGE_SIZE = 25;

export default function CustomerLedgersPage() {
  const router = useRouter();
  const { role } = useSession();

  const [q, setQ] = React.useState("");
  const [term, setTerm] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<number | null>(null);
  const [sort, setSort] = React.useState("newest");
  const [page, setPage] = React.useState(1);

  const [data, setData] = React.useState<Page | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [lookups, setLookups] = React.useState<Lookups | null>(null);
  const [pending, setPending] = React.useState<Pending | null>(null);
  const [posting, setPosting] = React.useState(false);
  const [newOpen, setNewOpen] = React.useState(false);

  /* The search box waits for a pause in typing before asking the server. */
  React.useEffect(() => {
    const t = setTimeout(() => { setTerm(q.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<Page>(`${API_BASE_URL}/ledgers/customers`, {
        params: { q: term || undefined, categoryId: categoryId ?? undefined, sort, page, pageSize: PAGE_SIZE },
        headers: authHeader(),
      });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the customer ledgers."));
    } finally {
      setLoading(false);
    }
  }, [term, categoryId, sort, page]);

  const loadLookups = React.useCallback(async () => {
    try {
      const [lk, ps] = await Promise.all([
        axios.get<Lookups>(`${API_BASE_URL}/ledgers/customers/lookups`, { headers: authHeader() }),
        axios.get<Pending>(`${API_BASE_URL}/ledgers/customers/posting-status`, { headers: authHeader() }),
      ]);
      setLookups(lk.data);
      setPending(ps.data);
    } catch {
      /* The list below still works without its pickers. */
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void loadLookups();
  }, [loadLookups]);

  async function postMissing() {
    setPosting(true);
    try {
      const res = await axios.post<{ message: string; failed: number }>(
        `${API_BASE_URL}/ledgers/customers/post-missing`, {}, { headers: authHeader() });
      (res.data.failed > 0 ? toast.warning : toast.success)("Books updated", { description: res.data.message });
      void loadLookups();
      void load();
    } catch (e) {
      toast.error("Could not post", { description: apiMessage(e, "Please try again.") });
    } finally {
      setPosting(false);
    }
  }

  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const categories = lookups?.categories ?? [];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Money" }, { label: "Customer Ledgers" }]}
        title="Customer Ledgers"
        subtitle={data
          ? `${data.total.toLocaleString()} account${data.total === 1 ? "" : "s"} · ${formatMoney(data.totalReceivable)} receivable`
          : "Every customer's account, from the books."}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <CategoryManager endpoint="ledgers/customers/categories" categories={categories}
              onChanged={() => void loadLookups()} />
            <Button variant="secondary" size="md" className="gap-1.5" asChild>
              <Link href="/ledgers/customers/import"><FileSpreadsheet /><span>Import</span></Link>
            </Button>
            <Button variant="accent" size="md" className="gap-1.5" onClick={() => setNewOpen(true)}>
              <Plus /><span>New account</span>
            </Button>
          </div>
        }
      />

      {/* The one-off that closes HANDOFF D7 for history: documents billed
          before the books were wired up. Only the Super Admin runs it. */}
      {pending && pending.pending > 0 && (
        <Card className="p-4 mb-4 border-brand-yellow/50 bg-brand-yellow/5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Sparkles className="size-5 text-brand-yellow-600 shrink-0" />
            <div className="flex-1 min-w-0 text-sm text-navy-900 dark:text-white">
              <span className="font-semibold">{pending.pending} document{pending.pending === 1 ? " is" : "s are"} not in the books yet</span>
              <span className="text-slate-500 dark:text-slate-400">
                {" "}-- {pending.invoices} invoice{pending.invoices === 1 ? "" : "s"} ({formatMoney(pending.invoiceTotal)}),
                {" "}{pending.returns} return{pending.returns === 1 ? "" : "s"}
                {pending.collections > 0 ? `, ${pending.collections} collection${pending.collections === 1 ? "" : "s"}` : ""}.
                {" "}Balances below leave them out until they are posted.
              </span>
            </div>
            {role === "super-admin" ? (
              <Button variant="accent" size="md" className="gap-1.5 shrink-0" disabled={posting} onClick={() => void postMissing()}>
                {posting ? <Loader2 className="animate-spin" /> : <BookOpen />} Post them now
              </Button>
            ) : (
              <span className="text-2xs text-slate-500 shrink-0">The Super Admin posts these.</span>
            )}
          </div>
        </Card>
      )}

      {/* FILTERS */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Code, name, city or phone…" className="pl-9" />
          </div>
          <div className="w-36 sm:w-44">
            <SelectNative value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} aria-label="Sort">
              <option value="newest">Newest first</option>
              <option value="name">Name A–Z</option>
              <option value="balance">Highest balance</option>
              <option value="code">Account code</option>
              <option value="limit">Credit limit</option>
            </SelectNative>
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1 -mx-1 px-1">
          {[{ id: null as number | null, name: "All" }, ...categories].map((c) => (
            <button key={c.id ?? "all"} type="button"
              onClick={() => { setCategoryId(c.id); setPage(1); }}
              className={cn(
                "shrink-0 px-3 h-8 rounded-full text-xs font-medium border transition-colors",
                categoryId === c.id
                  ? "bg-navy-900 text-white border-navy-900 dark:bg-brand-yellow dark:text-navy-900 dark:border-brand-yellow"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-navy-800 dark:text-slate-300 dark:border-navy-700"
              )}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <Card className="p-6 text-center">
          <AlertCircle className="size-7 text-danger mx-auto mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
          <Button variant="ghost" className="mt-2" onClick={() => void load()}>Try again</Button>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          {loading && !data ? (
            <div className="p-4 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : !data || data.items.length === 0 ? (
            <EmptyState icon={BookOpen} title="No accounts here"
              description={term || categoryId ? "Nothing matches that search or category." : "Open the first account with New account, or import them from the old system."} />
          ) : (
            <div className={cn(loading && "opacity-60 transition-opacity")}>
              {/* Desktop: a table. */}
              <table className="hidden md:table w-full text-sm">
                <thead>
                  <tr className="text-2xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-navy-700">
                    <th className="text-left font-semibold px-4 py-2.5">Code</th>
                    <th className="text-left font-semibold px-4 py-2.5">Customer</th>
                    <th className="text-left font-semibold px-4 py-2.5">Category</th>
                    <th className="text-left font-semibold px-4 py-2.5">City</th>
                    <th className="text-right font-semibold px-4 py-2.5">Credit limit</th>
                    <th className="text-right font-semibold px-4 py-2.5">Balance</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((a) => {
                    const over = a.creditLimit > 0 && a.balance > a.creditLimit;
                    return (
                      <tr key={a.id} onClick={() => router.push(`/ledgers/customers/${a.id}`)}
                        className="border-b border-slate-100 dark:border-navy-700/60 hover:bg-slate-50 dark:hover:bg-navy-700/40 cursor-pointer">
                        <td className="px-4 py-3 tabular text-xs font-semibold text-slate-500 dark:text-slate-400">{a.code}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-navy-900 dark:text-white">{a.name}</div>
                          {a.salesPerson && <div className="text-2xs text-slate-500 dark:text-slate-400">{a.salesPerson}</div>}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{a.category}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{a.city.replace(" - Pakistan", "")}</td>
                        <td className="px-4 py-3 text-right tabular text-slate-600 dark:text-slate-300">
                          {a.creditLimit > 0 ? ledgerAmount(a.creditLimit) : <span className="text-slate-400">No limit</span>}
                        </td>
                        <td className={cn("px-4 py-3 text-right tabular font-semibold",
                          over ? "text-danger" : a.balance < 0 ? "text-success" : "text-navy-900 dark:text-white")}>
                          {ledgerAmount(a.balance, "0")}
                        </td>
                        <td className="pr-3"><ChevronRight className="size-4 text-slate-300" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Phone: one card per account, the balance where the thumb is. */}
              <ul className="md:hidden divide-y divide-slate-100 dark:divide-navy-700/60">
                {data.items.map((a) => {
                  const over = a.creditLimit > 0 && a.balance > a.creditLimit;
                  return (
                    <li key={a.id}>
                      <Link href={`/ledgers/customers/${a.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-slate-50 dark:active:bg-navy-700/40">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-navy-900 dark:text-white truncate">{a.name}</div>
                          <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 min-w-0">
                            <span className="tabular shrink-0">{a.code}</span>
                            <span>·</span><span className="truncate">{a.category}</span>
                            <MapPin className="size-3 shrink-0" /><span className="truncate">{a.city.replace(" - Pakistan", "")}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={cn("tabular text-sm font-bold",
                            over ? "text-danger" : a.balance < 0 ? "text-success" : "text-navy-900 dark:text-white")}>
                            {ledgerAmount(a.balance, "0")}
                          </div>
                          <div className="text-2xs text-slate-400 tabular">
                            {a.creditLimit > 0 ? `limit ${ledgerAmount(a.creditLimit)}` : "no limit"}
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {data && (
            <Pager page={page} pageCount={pageCount} total={data.total} noun="accounts"
              onPage={setPage} disabled={loading} />
          )}
        </Card>
      )}

      {lookups && (
        <NewAccountDialog open={newOpen} onOpenChange={setNewOpen} lookups={lookups}
          onCreated={(id) => { setNewOpen(false); router.push(`/ledgers/customers/${id}`); }} />
      )}
    </>
  );
}

/* ─────────────────────────── the quick form ─────────────────────────── */

function NewAccountDialog({
  open, onOpenChange, lookups, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lookups: Lookups;
  onCreated: (id: number) => void;
}) {
  const [name, setName] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [cityId, setCityId] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [limit, setLimit] = React.useState("");
  const [opening, setOpening] = React.useState("");
  const [repId, setRepId] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function save() {
    if (!name.trim()) { toast.error("The account needs a name."); return; }
    if (!categoryId) { toast.error("Pick a category -- every account needs one."); return; }
    if (!cityId) { toast.error("Pick a city."); return; }
    setSaving(true);
    try {
      const res = await axios.post<{ id: number; message: string }>(`${API_BASE_URL}/ledgers/customers/accounts`, {
        name: name.trim(), categoryId: Number(categoryId), cityId: Number(cityId),
        phone: phone.trim() || null,
        creditLimit: Number(limit) || 0,
        openingBalance: Number(opening) || 0,
        salesPersonUserId: repId ? Number(repId) : null,
      }, { headers: authHeader() });
      toast.success("Account opened", { description: res.data.message });
      onCreated(res.data.id);
    } catch (e) {
      toast.error("Not opened", { description: apiMessage(e, "Please try again.") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>New customer account</DialogTitle>
          <DialogDescription>
            The quick way: the account and its ledger. Documents, tax numbers and the rest are on the{" "}
            <Link href="/parties/new?type=customer" className="text-navy-900 dark:text-brand-yellow underline underline-offset-2">full customer form</Link>.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Label required>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Shop or trading name" className="mt-1" />
          </div>
          <div>
            <Label required>Category</Label>
            <SelectNative value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1">
              <option value="">Pick one…</option>
              {lookups.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectNative>
          </div>
          <div>
            <Label required>City</Label>
            <SelectNative value={cityId} onChange={(e) => setCityId(e.target.value)} className="mt-1">
              <option value="">Pick one…</option>
              {lookups.cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectNative>
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="0300 1234567" className="mt-1" />
          </div>
          <div>
            <Label>Salesperson</Label>
            <SelectNative value={repId} onChange={(e) => setRepId(e.target.value)} className="mt-1">
              <option value="">Nobody yet</option>
              {lookups.salesPeople.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </SelectNative>
          </div>
          <div>
            <Label>Credit limit</Label>
            <Input value={limit} onChange={(e) => setLimit(e.target.value)} inputMode="decimal" placeholder="0 = no limit" className="mt-1 tabular" />
          </div>
          <div>
            <Label>Opening balance</Label>
            <Input value={opening} onChange={(e) => setOpening(e.target.value)} inputMode="decimal" placeholder="What they owe today" className="mt-1 tabular" />
            <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1">Owed to us is positive; in credit is negative. Shown as Balance B/F.</p>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="accent" className="gap-1.5" disabled={saving} onClick={() => void save()}>
            {saving ? <Loader2 className="animate-spin" /> : <UserRound />} Open account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
