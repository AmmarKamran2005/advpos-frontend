"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import axios from "axios";
import {
  ArrowLeft, Edit3, AlertCircle, Trash2, Receipt, Calendar, Building2, Tag,
  Banknote, Check, X, RotateCcw, Loader2, Save,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { vizoResolver } from "@/lib/zod-resolver";
import { DocumentActions } from "@/components/widgets/document-actions";
import { Badge, StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { formatMoney, formatDate } from "@/lib/format";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader, Can } from "@/components/providers/session-provider";

/* GET /accounting/expenses/{id} */
type Expense = {
  id: number;
  expenseNo: string;
  expenseDate: string;
  locationId: number;
  location: string;
  categoryName: string;
  expenseAccountId: number;
  expenseAccount: string;
  paidFromAccountId: number;
  paidFromAccount: string;
  amount: number;
  vendorName: string;
  paymentMethod: string;
  description: string | null;
  status: string;
  statusName: string;
  entryId: number | null;
  entryNo: string | null;
  reversalEntryNo: string | null;
  createdBy: string;
};

type LookupAccount = { id: number; code: string; name: string; isGroup: boolean; type: string; group: string };
type LookupRow = { id: number; key?: string; name: string };
type Lookups = { accounts: LookupAccount[]; paymentMethods: LookupRow[]; locations: LookupRow[] };

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

const Schema = z
  .object({
    expenseDate: z.string().min(1, "Pick a date"),
    locationId: z.coerce.number().positive("Pick a location"),
    categoryName: z.string().min(2, "Category is required").max(80),
    expenseAccountId: z.coerce.number().positive("Pick an expense account"),
    paidFromAccountId: z.coerce.number().positive("Pick the account it was paid from"),
    amount: z.coerce.number().positive("Amount must be above zero"),
    vendorName: z.string().min(2, "Who was paid?").max(150),
    methodId: z.coerce.number().positive("Pick a payment method"),
    description: z.string().max(500).optional(),
  })
  .refine((v) => v.expenseAccountId !== v.paidFromAccountId, {
    message: "The expense account and the account it is paid from cannot be the same",
    path: ["paidFromAccountId"],
  });
type FormValues = z.infer<typeof Schema>;

const STATUS_VARIANT: Record<string, "success" | "muted" | "warning" | "danger"> = {
  POSTED: "success",
  DRAFT: "muted",
  REVERSED: "warning",
  REJECTED: "danger",
  CANCELLED: "danger",
};

export default function ExpenseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number.parseInt(params.id ?? "", 10);

  const [expense, setExpense] = React.useState<Expense | null>(null);
  const [lookups, setLookups] = React.useState<Lookups | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notFound, setNotFound] = React.useState(false);

  const [editing, setEditing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [reverseOpen, setReverseOpen] = React.useState(false);

  const form = useForm<FormValues>({ resolver: vizoResolver(Schema) });
  const { reset } = form;

  const load = React.useCallback(async () => {
    if (!Number.isFinite(id)) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    try {
      const [one, look] = await Promise.all([
        axios.get<Expense>(`${API_BASE_URL}/accounting/expenses/${id}`, { headers: authHeader() }),
        axios.get<Lookups>(`${API_BASE_URL}/accounting/lookups`, { headers: authHeader() }),
      ]);
      setExpense(one.data);
      setLookups(look.data);
      setError(null);
      setNotFound(false);

      const method = look.data.paymentMethods.find((m) => m.key === one.data.paymentMethod);
      reset({
        expenseDate: one.data.expenseDate,
        locationId: one.data.locationId,
        categoryName: one.data.categoryName ?? "",
        expenseAccountId: one.data.expenseAccountId,
        paidFromAccountId: one.data.paidFromAccountId,
        amount: one.data.amount,
        vendorName: one.data.vendorName,
        methodId: method?.id ?? 0,
        description: one.data.description ?? "",
      });
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) setNotFound(true);
      else setError(apiMessage(e, "Could not load the expense."));
    } finally {
      setLoading(false);
    }
  }, [id, reset]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  const expenseAccounts = React.useMemo(
    () => (lookups?.accounts ?? []).filter((a) => !a.isGroup && a.group === "Expenses"),
    [lookups]
  );
  const cashBankAccounts = React.useMemo(
    () => (lookups?.accounts ?? []).filter((a) => !a.isGroup && a.type === "Cash & Bank"),
    [lookups]
  );

  async function onSave(values: FormValues) {
    try {
      const res = await axios.put<{ message: string }>(
        `${API_BASE_URL}/accounting/expenses/${id}`,
        {
          expenseDate: values.expenseDate,
          locationId: values.locationId,
          categoryName: values.categoryName.trim(),
          expenseAccountId: values.expenseAccountId,
          paidFromAccountId: values.paidFromAccountId,
          amount: values.amount,
          vendorName: values.vendorName.trim(),
          methodId: values.methodId,
          description: values.description?.trim() || null,
        },
        { headers: authHeader() }
      );
      toast.success(res.data.message);
      setEditing(false);
      await load();
    } catch (e) {
      toast.error(apiMessage(e, "The expense was not updated."));
    }
  }

  async function decide(statusKey: "POSTED" | "REJECTED", reason?: string) {
    setBusy(true);
    try {
      const res = await axios.patch<{ message: string }>(
        `${API_BASE_URL}/accounting/expenses/${id}/status`,
        { statusKey, reason: reason ?? null },
        { headers: authHeader() }
      );
      toast.success(res.data.message);
      await load();
    } catch (e) {
      toast.error(apiMessage(e, "The status was not changed."));
    } finally {
      setBusy(false);
      setRejectOpen(false);
    }
  }

  async function reverse(reason?: string) {
    setBusy(true);
    try {
      const res = await axios.post<{ message: string }>(
        `${API_BASE_URL}/accounting/expenses/${id}/reverse`,
        { reason: reason ?? null },
        { headers: authHeader() }
      );
      toast.success(res.data.message);
      await load();
    } catch (e) {
      toast.error(apiMessage(e, "The expense was not reversed."));
    } finally {
      setBusy(false);
      setReverseOpen(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await axios.delete<{ message: string }>(
        `${API_BASE_URL}/accounting/expenses/${id}`,
        { headers: authHeader() }
      );
      toast.success(res.data.message);
      router.push("/accounting/expenses");
    } catch (e) {
      toast.error(apiMessage(e, "The expense was not deleted."));
      setBusy(false);
      setDeleteOpen(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Accounting" }, { label: "Expenses", href: "/accounting/expenses" }]} title="Expense" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><Skeleton className="h-80" /></div>
          <Skeleton className="h-56" />
        </div>
      </>
    );
  }

  if (notFound) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Expense not found"
        description="It may have been deleted, or the link is wrong."
        action={<Button asChild><Link href="/accounting/expenses">Back to expenses</Link></Button>}
      />
    );
  }

  if (error || !expense) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Accounting" }, { label: "Expenses", href: "/accounting/expenses" }]} title="Expense" />
        <Card className="p-4 border-danger/40 max-w-2xl">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{error}</div>
            <Button variant="secondary" size="sm" onClick={() => void load()}>Try again</Button>
          </div>
        </Card>
      </>
    );
  }

  const e = expense;
  const isDraft = e.status === "DRAFT";
  const isPosted = e.status === "POSTED";

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Expenses", href: "/accounting/expenses" }, { label: e.expenseNo }]}
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{e.expenseNo}</span>
            <StatusPill variant={STATUS_VARIANT[e.status] ?? "muted"}>{e.statusName}</StatusPill>
            {e.categoryName && <Badge variant="muted">{e.categoryName}</Badge>}
          </div>
        }
        subtitle={`${formatDate(e.expenseDate)} · ${e.vendorName} · recorded by ${e.createdBy}`}
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/accounting/expenses"><ArrowLeft />Back</Link></Button>
            <DocumentActions kind="expense" id={id} label="expense voucher" />

            {/* A draft is scratch: it can be corrected, approved, rejected or
                thrown away. Everything else is history and only reverses. */}
            {isDraft && !editing && (
              <Button variant="secondary" className="gap-1.5" onClick={() => setEditing(true)}>
                <Edit3 />Edit
              </Button>
            )}
            {isDraft && (
              <Can permission="expenses.manage">
                <Button variant="accent" className="gap-1.5" disabled={busy} onClick={() => void decide("POSTED")}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Check />}Approve
                </Button>
                <Button variant="ghost" className="text-danger gap-1.5" disabled={busy} onClick={() => setRejectOpen(true)}>
                  <X />Reject
                </Button>
              </Can>
            )}
            {isPosted && (
              <Can permission="expenses.manage">
                <Button variant="secondary" className="gap-1.5" disabled={busy} onClick={() => setReverseOpen(true)}>
                  <RotateCcw />Reverse
                </Button>
              </Can>
            )}
            {isDraft && (
              <Button variant="ghost" className="text-danger" disabled={busy} onClick={() => setDeleteOpen(true)}>
                <Trash2 />Delete
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {editing ? (
            <Card>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Edit {e.expenseNo}</h3>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSave)} className="grid grid-cols-1 sm:grid-cols-2 gap-4" noValidate>
                    <FormField control={form.control} name="expenseDate" render={({ field }) => (
                      <FormItem><FormLabel required>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="locationId" render={({ field }) => (
                      <FormItem><FormLabel required>Location</FormLabel><FormControl>
                        <SelectNative {...field}>
                          {lookups?.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </SelectNative>
                      </FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="categoryName" render={({ field }) => (
                      <FormItem><FormLabel required>Category</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="vendorName" render={({ field }) => (
                      <FormItem><FormLabel required>Vendor</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="expenseAccountId" render={({ field }) => (
                      <FormItem><FormLabel required>Expense Account</FormLabel><FormControl>
                        <SelectNative {...field}>
                          {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
                        </SelectNative>
                      </FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="paidFromAccountId" render={({ field }) => (
                      <FormItem><FormLabel required>Paid from</FormLabel><FormControl>
                        <SelectNative {...field}>
                          {cashBankAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
                        </SelectNative>
                      </FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="amount" render={({ field }) => (
                      <FormItem><FormLabel required>Amount (PKR)</FormLabel><FormControl><Input type="number" step="0.01" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="methodId" render={({ field }) => (
                      <FormItem><FormLabel required>Paid via</FormLabel><FormControl>
                        <SelectNative {...field}>
                          {lookups?.paymentMethods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </SelectNative>
                      </FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem className="sm:col-span-2"><FormLabel>Description</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />

                    <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                      <Button type="submit" variant="accent" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting
                          ? <><Loader2 className="size-4 animate-spin" />Saving…</>
                          : <><Save />Save changes</>}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => { setEditing(false); void load(); }}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody>
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-navy-700">
                  <div className="size-12 rounded-xl bg-danger/10 text-danger flex items-center justify-center">
                    <Receipt className="size-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Amount</div>
                    <div className="text-3xl tabular font-bold text-danger">-{formatMoney(e.amount)}</div>
                  </div>
                  <Badge variant="muted">{e.paymentMethod}</Badge>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <Meta label="Date"     icon={Calendar}  value={formatDate(e.expenseDate)} />
                  <Meta label="Location" icon={Building2} value={e.location} />
                  <Meta label="Category" icon={Tag}       value={e.categoryName || "—"} />
                  <Meta label="Vendor"   icon={Receipt}   value={e.vendorName} />
                  <Meta label="Expense account"           value={e.expenseAccount} />
                  <Meta label="Paid from" icon={Banknote} value={e.paidFromAccount} />
                </dl>

                {e.description && (
                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-navy-700">
                    <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Description</div>
                    <p className="text-sm text-slate-700 dark:text-slate-200 mt-1.5 whitespace-pre-line">{e.description}</p>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Linked Journal Entry</h3>

              {e.entryId && e.entryNo ? (
                <Link
                  href={`/accounting/journal-entries/${e.entryId}`}
                  className="block p-3 border border-slate-200 dark:border-navy-700 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="tabular text-sm font-semibold text-navy-900 dark:text-white">{e.entryNo}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {e.categoryName} — {e.vendorName}
                      </div>
                    </div>
                    <Badge variant="success">POSTED</Badge>
                  </div>
                </Link>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  No entry yet. The ledger is written when this expense is approved —
                  a draft has not spent anything.
                </p>
              )}

              {e.reversalEntryNo && (
                <div className="mt-3 p-3 rounded-lg bg-warning/10 border border-warning/30">
                  <div className="text-2xs uppercase font-semibold tracking-wider text-warning">Reversed</div>
                  <div className="tabular text-sm font-semibold text-navy-900 dark:text-white mt-0.5">
                    {e.reversalEntryNo}
                  </div>
                </div>
              )}

              <div className="mt-4 p-3 bg-slate-50 dark:bg-navy-900 rounded-lg">
                <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                  {e.entryId ? "Posting" : "Posting on approval"}
                </div>
                <div className="text-xs font-mono mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                  <div>DR &nbsp;{e.expenseAccount} &nbsp;{formatMoney(e.amount)}</div>
                  <div>CR &nbsp;{e.paidFromAccount} &nbsp;{formatMoney(e.amount)}</div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${e.expenseNo}?`}
        description="It is still a draft, so nothing has reached the ledger and there is nothing to reverse. This cannot be undone."
        variant="danger"
        confirmLabel="Yes, delete it"
        loading={busy}
        onConfirm={() => void remove()}
      />

      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title={`Reject ${e.expenseNo}?`}
        description="The expense stays on record as rejected. Nothing is posted to the ledger."
        variant="warning"
        confirmLabel="Reject expense"
        requireReason
        reasonLabel="Why is it being rejected?"
        reasonPlaceholder="e.g. No receipt attached"
        loading={busy}
        onConfirm={(reason) => void decide("REJECTED", reason)}
      />

      <ConfirmDialog
        open={reverseOpen}
        onOpenChange={setReverseOpen}
        title={`Reverse ${e.expenseNo}?`}
        description="A mirror entry is posted to cancel the original. Both stay in the ledger — the expense is undone, not erased."
        variant="warning"
        confirmLabel="Reverse expense"
        requireReason
        reasonLabel="Why is it being reversed?"
        reasonPlaceholder="e.g. Booked to the wrong account"
        loading={busy}
        onConfirm={(reason) => void reverse(reason)}
      />
    </>
  );
}

function Meta({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: typeof Calendar }) {
  return (
    <div>
      <dt className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-navy-900 dark:text-white mt-1 inline-flex items-center gap-2">
        {Icon && <Icon className="size-3.5 text-slate-400" />}
        {value}
      </dd>
    </div>
  );
}
