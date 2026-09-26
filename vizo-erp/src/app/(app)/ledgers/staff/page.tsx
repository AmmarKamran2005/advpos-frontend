"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { AlertCircle, CalendarCheck, ChevronRight, KeyRound, Loader2, Search, UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Pager } from "@/components/ui/pager";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { CategoryManager, type ManagedCategory } from "@/components/ledgers/category-manager";
import { StaffDialog } from "@/components/ledgers/staff-dialog";
import { apiMessage, ledgerAmount, pkToday } from "@/components/ledgers/ledger-kit";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────────────────────
   STAFF LEDGERS -- what the business owes each member of staff, and what each
   owes back, on 2140 Staff Payables (one account, split by person).

   Everybody on the payroll is here: every login that is an employee (added
   the first time this screen opens) and the drivers and helpers who have no
   login at all -- opened with "New staff", which creates nobody who can sign
   in. The balance is in the payroll's own sense: positive is salary still
   owed to them, negative is an advance they still owe back.

   Super Admin and Accountant only.
   ─────────────────────────────────────────────────────────────────────────── */

type Staff = {
  id: number; code: string; name: string; categoryId: number; category: string; phone: string | null;
  monthlySalary: number; hasLogin: boolean; role: string | null; isActive: boolean; balance: number;
};
type Page = { total: number; page: number; pageSize: number; totalPayable: number; items: Staff[] };
type Lookups = { categories: ManagedCategory[]; unlinkedUsers: { id: number; name: string; role: string }[] };

export default function StaffLedgersPage() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [term, setTerm] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<number | null>(null);
  const [inactive, setInactive] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<Page | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [lookups, setLookups] = React.useState<Lookups | null>(null);
  const [newOpen, setNewOpen] = React.useState(false);
  const [runOpen, setRunOpen] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => { setTerm(q.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<Page>(`${API_BASE_URL}/ledgers/staff`, {
        params: { q: term || undefined, categoryId: categoryId ?? undefined, includeInactive: inactive, page, pageSize: 25 },
        headers: authHeader(),
      });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the staff ledgers."));
    } finally {
      setLoading(false);
    }
  }, [term, categoryId, inactive, page]);

  const loadLookups = React.useCallback(async () => {
    try {
      const res = await axios.get<Lookups>(`${API_BASE_URL}/ledgers/staff/lookups`, { headers: authHeader() });
      setLookups(res.data);
    } catch { /* the list still works */ }
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

  const categories = lookups?.categories ?? [];
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Money" }, { label: "Staff Ledgers" }]}
        title="Staff Ledgers"
        subtitle={data ? `${data.total} on the payroll · ${formatMoney(data.totalPayable)} owed to staff` : "Salary, advances and deductions, per person."}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <CategoryManager endpoint="ledgers/staff/categories" categories={categories} noun="people"
              onChanged={() => { void loadLookups(); void load(); }} />
            <Button variant="secondary" size="md" className="gap-1.5" onClick={() => setRunOpen(true)}>
              <CalendarCheck /><span>Salary run</span>
            </Button>
            <Button variant="accent" size="md" className="gap-1.5" onClick={() => setNewOpen(true)}>
              <UserPlus /><span>New staff</span>
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-3 mb-4">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, code or phone…" className="pl-9" />
          </div>
          <label className="text-xs text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5 shrink-0 cursor-pointer">
            <input type="checkbox" checked={inactive} onChange={(e) => { setInactive(e.target.checked); setPage(1); }} />
            Left
          </label>
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1 -mx-1 px-1">
          {[{ id: null as number | null, name: "Everyone" }, ...categories].map((c) => (
            <button key={c.id ?? "all"} type="button" onClick={() => { setCategoryId(c.id); setPage(1); }}
              className={cn("shrink-0 px-3 h-8 rounded-full text-xs font-medium border transition-colors",
                categoryId === c.id
                  ? "bg-navy-900 text-white border-navy-900 dark:bg-brand-yellow dark:text-navy-900 dark:border-brand-yellow"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-navy-800 dark:text-slate-300 dark:border-navy-700")}>
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
            <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : !data || data.items.length === 0 ? (
            <EmptyState icon={Users} title="Nobody here" description="Add a driver or helper with New staff -- no login is created." />
          ) : (
            <ul className={cn("divide-y divide-slate-100 dark:divide-navy-700/60", loading && "opacity-60")}>
              {data.items.map((s) => (
                <li key={s.id}>
                  <Link href={`/ledgers/staff/${s.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-navy-700/40">
                    <div className="size-10 rounded-full bg-navy-900 text-brand-yellow dark:bg-brand-yellow dark:text-navy-900 flex items-center justify-center text-xs font-bold shrink-0">
                      {s.name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-semibold text-navy-900 dark:text-white truncate">{s.name}</span>
                        {s.hasLogin
                          ? <span title={`Signs in as ${s.role}`} className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-info-dark dark:text-info-light bg-info/10 rounded px-1.5 py-0.5 shrink-0"><KeyRound className="size-3" />{s.role}</span>
                          : <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-navy-700 rounded px-1.5 py-0.5 shrink-0">no login</span>}
                        {!s.isActive && <span className="text-[10px] font-semibold text-danger shrink-0">left</span>}
                      </div>
                      <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        <span className="tabular">{s.code}</span> · {s.category}
                        {s.monthlySalary > 0 && <> · salary <span className="tabular">{ledgerAmount(s.monthlySalary)}</span></>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={cn("tabular text-sm font-bold", s.balance < 0 ? "text-warning-dark dark:text-warning-light" : "text-navy-900 dark:text-white")}>
                        {ledgerAmount(Math.abs(s.balance), "0")}
                      </div>
                      <div className="text-2xs text-slate-400">{s.balance > 0 ? "payable" : s.balance < 0 ? "advance" : "settled"}</div>
                    </div>
                    <ChevronRight className="size-4 text-slate-300 shrink-0 hidden sm:block" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {data && <Pager page={page} pageCount={pageCount} total={data.total} noun="people" onPage={setPage} disabled={loading} />}
        </Card>
      )}

      {lookups && (
        <StaffDialog open={newOpen} onOpenChange={setNewOpen} lookups={lookups}
          onSaved={(id) => { setNewOpen(false); router.push(`/ledgers/staff/${id}`); }} />
      )}
      <SalaryRunDialog open={runOpen} onOpenChange={setRunOpen} onDone={() => { setRunOpen(false); void load(); }} />
    </>
  );
}

/* ─────────────────────────── salary run ─────────────────────────── */

function SalaryRunDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [month, setMonth] = React.useState(pkToday().slice(0, 7));
  const [busy, setBusy] = React.useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await axios.post<{ message: string }>(`${API_BASE_URL}/ledgers/staff/salary-run`, { month }, { headers: authHeader() });
      toast.success("Salary run", { description: res.data.message });
      onDone();
    } catch (e) {
      toast.error("Not posted", { description: apiMessage(e, "Please try again.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Salary due for a month</DialogTitle>
          <DialogDescription>
            Posts each active person&apos;s monthly salary as owed to them (Dr Salary Expense, Cr Staff Payables),
            dated the last day of the month. Safe to run twice -- nobody gets a month twice.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Label>Month</Label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="mt-1" />
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="accent" className="gap-1.5" disabled={busy || !month} onClick={() => void run()}>
            {busy ? <Loader2 className="animate-spin" /> : <CalendarCheck />} Post salaries
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
