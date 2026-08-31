"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import axios from "axios";
import {
  ArrowLeft, AlertCircle, ArrowDownToLine, ArrowUpFromLine, FileText,
  CheckCircle2, X, Edit3, Trash2, Save, Loader2, Scale,
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
import { cn } from "@/lib/utils";
import { API_BASE_URL, authHeader, Can } from "@/components/providers/session-provider";

/* GET /accounting/vouchers/{id} */
type Allocation = {
  id: number;
  salesInvoiceId: number | null;
  purchaseInvoiceId: number | null;
  amount: number;
};

type Voucher = {
  id: number;
  voucherNo: string;
  type: string;
  typeName: string;
  isReceipt: boolean;
  date: string;
  locationId: number;
  location: string;
  partyId: number | null;
  partyName: string | null;
  cashBankAccountId: number | null;
  cashBankAccount: string | null;
  amount: number;
  paymentMethod: string;
  paymentProvider: string | null;
  reference: string | null;
  walletTxnId: string | null;
  narration: string | null;
  status: string;
  statusName: string;
  entryId: number | null;
  entryNo: string | null;
  reversalEntryNo: string | null;
  createdBy: string;
  allocations: Allocation[];
};

type LookupAccount = { id: number; code: string; name: string; isGroup: boolean; type: string };
type LookupMethod = { id: number; key: string; name: string; kind: string };
type LookupVoucherType = { id: number; code: string; name: string; isReceipt: boolean };
type LookupRow = { id: number; name: string };
type Lookups = {
  accounts: LookupAccount[];
  voucherTypes: LookupVoucherType[];
  paymentMethods: LookupMethod[];
  locations: LookupRow[];
};

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

const Schema = z.object({
  voucherTypeId: z.coerce.number().positive("Pick a voucher type"),
  voucherDate: z.string().min(1, "Pick a date"),
  locationId: z.coerce.number().positive("Pick a location"),
  cashBankAccountId: z.coerce.number().positive("Pick the cash or bank account"),
  amount: z.coerce.number().positive("Amount must be above zero"),
  methodId: z.coerce.number().positive("Pick a payment method"),
  paymentProvider: z.string().max(80).optional().or(z.literal("")),
  reference: z.string().max(50).optional().or(z.literal("")),
  walletTxnId: z.string().max(50).optional().or(z.literal("")),
  narration: z.string().max(500).optional().or(z.literal("")),
});
type FormValues = z.infer<typeof Schema>;

const STATUS_VARIANT: Record<string, "success" | "muted" | "warning" | "danger" | "info"> = {
  POSTED: "success",
  DRAFT: "muted",
  REVERSED: "warning",
  REJECTED: "danger",
  CANCELLED: "danger",
  RECONCILED: "info",
};

export default function VoucherDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number.parseInt(params.id ?? "", 10);

  const [voucher, setVoucher] = React.useState<Voucher | null>(null);
  const [lookups, setLookups] = React.useState<Lookups | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notFound, setNotFound] = React.useState(false);

  const [editing, setEditing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [postOpen, setPostOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

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
        axios.get<Voucher>(`${API_BASE_URL}/accounting/vouchers/${id}`, { headers: authHeader() }),
        axios.get<Lookups>(`${API_BASE_URL}/accounting/lookups`, { headers: authHeader() }),
      ]);
      setVoucher(one.data);
      setLookups(look.data);
      setError(null);
      setNotFound(false);

      const vType = look.data.voucherTypes.find((t) => t.code === one.data.type);
      const method = look.data.paymentMethods.find((m) => m.key === one.data.paymentMethod);
      reset({
        voucherTypeId: vType?.id ?? 0,
        voucherDate: one.data.date,
        locationId: one.data.locationId,
        cashBankAccountId: one.data.cashBankAccountId ?? 0,
        amount: one.data.amount,
        methodId: method?.id ?? 0,
        paymentProvider: one.data.paymentProvider ?? "",
        reference: one.data.reference ?? "",
        walletTxnId: one.data.walletTxnId ?? "",
        narration: one.data.narration ?? "",
      });
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) setNotFound(true);
      else setError(apiMessage(e, "Could not load the voucher."));
    } finally {
      setLoading(false);
    }
  }, [id, reset]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  const cashBankAccounts = React.useMemo(
    () => (lookups?.accounts ?? []).filter((a) => !a.isGroup && a.type === "Cash & Bank"),
    [lookups]
  );

  async function onSave(values: FormValues) {
    try {
      /* The allocations are sent back untouched. UpdateVoucher replaces them
         wholesale, so omitting them here would silently unclear the invoices
         this voucher was set against. */
      const res = await axios.put<{ message: string }>(
        `${API_BASE_URL}/accounting/vouchers/${id}`,
        {
          voucherTypeId: values.voucherTypeId,
          voucherDate: values.voucherDate,
          locationId: values.locationId,
          partyId: voucher?.partyId ?? null,
          cashBankAccountId: values.cashBankAccountId,
          amount: values.amount,
          methodId: values.methodId,
          paymentProvider: values.paymentProvider?.trim() || null,
          reference: values.reference?.trim() || null,
          walletTxnId: values.walletTxnId?.trim() || null,
          narration: values.narration?.trim() || null,
          allocations: (voucher?.allocations ?? []).map((a) => ({
            salesInvoiceId: a.salesInvoiceId,
            purchaseInvoiceId: a.purchaseInvoiceId,
            amount: a.amount,
          })),
        },
        { headers: authHeader() }
      );
      toast.success(res.data.message);
      setEditing(false);
      await load();
    } catch (e) {
      toast.error(apiMessage(e, "The voucher was not updated."));
    }
  }

  async function post() {
    setBusy(true);
    try {
      const res = await axios.post<{ message: string }>(
        `${API_BASE_URL}/accounting/vouchers/${id}/post`, {}, { headers: authHeader() }
      );
      toast.success(res.data.message);
      await load();
    } catch (e) {
      toast.error(apiMessage(e, "The voucher was not posted."));
    } finally {
      setBusy(false);
      setPostOpen(false);
    }
  }

  async function cancel(reason?: string) {
    setBusy(true);
    try {
      const res = await axios.post<{ message: string }>(
        `${API_BASE_URL}/accounting/vouchers/${id}/cancel`,
        { reason: reason ?? null },
        { headers: authHeader() }
      );
      toast.success(res.data.message);
      await load();
    } catch (e) {
      toast.error(apiMessage(e, "The voucher was not cancelled."));
    } finally {
      setBusy(false);
      setCancelOpen(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await axios.delete<{ message: string }>(
        `${API_BASE_URL}/accounting/vouchers/${id}`, { headers: authHeader() }
      );
      toast.success(res.data.message);
      router.push("/accounting/vouchers");
    } catch (e) {
      toast.error(apiMessage(e, "The voucher was not deleted."));
      setBusy(false);
      setDeleteOpen(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Accounting" }, { label: "Vouchers", href: "/accounting/vouchers" }]} title="Voucher" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6"><Skeleton className="h-72" /><Skeleton className="h-32" /></div>
          <Skeleton className="h-48" />
        </div>
      </>
    );
  }

  if (notFound) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Voucher not found"
        description="It may have been deleted, or the link is wrong."
        action={<Button asChild><Link href="/accounting/vouchers">Back to vouchers</Link></Button>}
      />
    );
  }

  if (error || !voucher) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Accounting" }, { label: "Vouchers", href: "/accounting/vouchers" }]} title="Voucher" />
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

  const v = voucher;
  const isReceipt = v.isReceipt;
  const isDraft = v.status === "DRAFT";
  const isPosted = v.status === "POSTED";
  const isDead = v.status === "CANCELLED" || v.status === "REVERSED";
  const allocated = v.allocations.reduce((s, a) => s + a.amount, 0);
  const method = lookups?.paymentMethods.find((m) => m.key === v.paymentMethod) ?? null;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Vouchers", href: "/accounting/vouchers" }, { label: v.voucherNo }]}
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{v.voucherNo}</span>
            <Badge variant={isReceipt ? "success" : "danger"}>{v.typeName}</Badge>
            <StatusPill variant={STATUS_VARIANT[v.status] ?? "muted"}>{v.statusName}</StatusPill>
          </div>
        }
        subtitle={v.narration?.split("\n")[0] ?? `${v.typeName} · ${formatDate(v.date)}`}
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/accounting/vouchers"><ArrowLeft />Back</Link></Button>
            <DocumentActions kind="voucher" id={id} label="voucher" />

            {isDraft && !editing && (
              <Button variant="secondary" className="gap-1.5" onClick={() => setEditing(true)}><Edit3 />Edit</Button>
            )}
            {isDraft && (
              <>
                <Button variant="accent" className="gap-1.5" disabled={busy} onClick={() => setPostOpen(true)}>
                  <CheckCircle2 />Post
                </Button>
                <Button variant="ghost" className="text-danger" disabled={busy} onClick={() => setDeleteOpen(true)}>
                  <Trash2 />Delete
                </Button>
              </>
            )}
            {isPosted && (
              <Can permission="money.manage">
                <Button variant="ghost" className="text-danger gap-1.5" disabled={busy} onClick={() => setCancelOpen(true)}>
                  <X />Cancel
                </Button>
              </Can>
            )}
          </>
        }
      />

      {isDead && (
        <Card className="bg-danger/5 border-danger/30 mb-6">
          <CardBody className="py-3">
            <div className="flex items-center gap-2 text-sm text-navy-900 dark:text-white">
              <X className="size-4 text-danger" />
              <span>
                This voucher is {v.statusName.toLowerCase()}
                {v.reversalEntryNo ? <> — its entry was reversed by <strong className="tabular">{v.reversalEntryNo}</strong></> : null}
                . Anything it was set against is owing again.
              </span>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {editing ? (
            <Card>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Edit {v.voucherNo}</h3>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSave)} className="grid grid-cols-1 sm:grid-cols-2 gap-4" noValidate>
                    <FormField control={form.control} name="voucherTypeId" render={({ field }) => (
                      <FormItem><FormLabel required>Type</FormLabel><FormControl>
                        <SelectNative {...field}>
                          {lookups?.voucherTypes.map((t) => <option key={t.id} value={t.id}>{t.code} — {t.name}</option>)}
                        </SelectNative>
                      </FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="voucherDate" render={({ field }) => (
                      <FormItem><FormLabel required>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="locationId" render={({ field }) => (
                      <FormItem><FormLabel required>Location</FormLabel><FormControl>
                        <SelectNative {...field}>
                          {lookups?.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </SelectNative>
                      </FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="cashBankAccountId" render={({ field }) => (
                      <FormItem><FormLabel required>{isReceipt ? "Received into" : "Paid from"}</FormLabel><FormControl>
                        <SelectNative {...field}>
                          {cashBankAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
                        </SelectNative>
                      </FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="amount" render={({ field }) => (
                      <FormItem><FormLabel required>Amount (PKR)</FormLabel><FormControl><Input type="number" step="0.01" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="methodId" render={({ field }) => (
                      <FormItem><FormLabel required>Method</FormLabel><FormControl>
                        <SelectNative {...field}>
                          {lookups?.paymentMethods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </SelectNative>
                      </FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="paymentProvider" render={({ field }) => (
                      <FormItem><FormLabel>Provider / Bank</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="reference" render={({ field }) => (
                      <FormItem><FormLabel>Reference</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="walletTxnId" render={({ field }) => (
                      <FormItem><FormLabel>Wallet Txn ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="narration" render={({ field }) => (
                      <FormItem className="sm:col-span-2"><FormLabel>Narration</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />

                    {allocated > 0 && (
                      <p className="sm:col-span-2 text-2xs text-slate-500 dark:text-slate-400">
                        {formatMoney(allocated)} is set against {v.allocations.length}{" "}
                        {v.allocations.length === 1 ? "invoice" : "invoices"} and is kept as it is.
                        Dropping the amount below that will be refused.
                      </p>
                    )}

                    <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                      <Button type="submit" variant="accent" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting
                          ? <><Loader2 className="size-4 animate-spin" />Saving…</>
                          : <><Save />Save changes</>}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => { setEditing(false); void load(); }}>Cancel</Button>
                    </div>
                  </form>
                </Form>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody>
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-navy-700">
                  <div className={cn("size-12 rounded-xl flex items-center justify-center",
                    isReceipt ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
                    {isReceipt ? <ArrowDownToLine className="size-5" /> : <ArrowUpFromLine className="size-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Amount</div>
                    <div className={cn("text-3xl tabular font-bold", isReceipt ? "text-success" : "text-danger")}>
                      {isReceipt ? "+" : "-"}{formatMoney(v.amount)}
                    </div>
                  </div>
                  <Badge variant="muted">{method?.name ?? v.paymentMethod}</Badge>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <Meta label="Voucher Date" value={formatDate(v.date)} />
                  <Meta label="Type" value={`${v.type} — ${v.typeName}`} />
                  <Meta label="Location" value={v.location} />
                  <Meta label="Party" value={
                    v.partyId && v.partyName
                      ? <Link href={`/parties/${v.partyId}`} className="underline underline-offset-2">{v.partyName}</Link>
                      : "—"
                  } />
                  <Meta label={isReceipt ? "Received into" : "Paid from"} value={v.cashBankAccount ?? "—"} />
                  <Meta label="Payment Method" value={<Badge variant="muted">{method?.name ?? v.paymentMethod}</Badge>} />
                  {v.paymentProvider && <Meta label="Provider" value={v.paymentProvider} />}
                  {v.reference && <Meta label="Reference" value={<span className="tabular">{v.reference}</span>} />}
                  {v.walletTxnId && <Meta label="Wallet Txn" value={<span className="tabular">{v.walletTxnId}</span>} />}
                  <Meta label="Created By" value={v.createdBy} />
                </dl>

                {v.narration && (
                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-navy-700">
                    <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Narration</div>
                    <p className="text-sm text-slate-700 dark:text-slate-200 mt-1.5 whitespace-pre-line">{v.narration}</p>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardBody>
              <div className="flex items-center gap-2 mb-3">
                <Scale className="size-4 text-info" />
                <h3 className="text-base font-semibold text-navy-900 dark:text-white">
                  Set against {isReceipt ? "invoices" : "bills"}
                </h3>
              </div>
              {v.allocations.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Nothing allocated — the full {formatMoney(v.amount)} sits on the party&apos;s account.
                </p>
              ) : (
                <div className="space-y-2">
                  {v.allocations.map((a) => {
                    const invoiceId = a.salesInvoiceId ?? a.purchaseInvoiceId;
                    const href = a.salesInvoiceId
                      ? `/sales/invoices/${a.salesInvoiceId}`
                      : `/purchases/invoices/${a.purchaseInvoiceId}`;
                    return (
                      <Link
                        key={a.id}
                        href={href}
                        className="flex items-center justify-between p-3 border border-slate-200 dark:border-navy-700 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700"
                      >
                        <span className="text-sm text-navy-900 dark:text-white">
                          {a.salesInvoiceId ? "Sales invoice" : "Purchase invoice"} #{invoiceId}
                        </span>
                        <span className="tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(a.amount)}</span>
                      </Link>
                    );
                  })}
                  <div className="flex items-center justify-between pt-2 text-sm font-semibold text-navy-900 dark:text-white">
                    <span>Allocated</span>
                    <span className="tabular">{formatMoney(allocated)}</span>
                  </div>
                  {v.amount - allocated > 0.004 && (
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>On account</span>
                      <span className="tabular">{formatMoney(v.amount - allocated)}</span>
                    </div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="size-4 text-info" />
                <h3 className="text-base font-semibold text-navy-900 dark:text-white">Linked Journal Entry</h3>
              </div>
              {v.entryId && v.entryNo ? (
                <Link
                  href={`/accounting/journal-entries/${v.entryId}`}
                  className="block p-3 border border-slate-200 dark:border-navy-700 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="tabular text-sm font-semibold text-navy-900 dark:text-white">{v.entryNo}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {v.narration?.split("\n")[0] ?? v.typeName}
                      </div>
                    </div>
                    <Badge variant={v.reversalEntryNo ? "warning" : "success"}>
                      {v.reversalEntryNo ? "Reversed" : "Posted"}
                    </Badge>
                  </div>
                </Link>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No entry yet. The ledger is written when the voucher is posted —
                  a draft has not moved any money.
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">
                {v.entryId ? "Posting" : "Posting on approval"}
              </h3>
              <div className="text-xs font-mono space-y-1.5 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-navy-900 p-3 rounded-lg">
                {isReceipt ? (
                  <>
                    <div>DR &nbsp;{v.cashBankAccount ?? "Cash / Bank"} &nbsp;{formatMoney(v.amount)}</div>
                    <div>CR &nbsp;Accounts Receivable &nbsp;{formatMoney(v.amount)}</div>
                  </>
                ) : (
                  <>
                    <div>DR &nbsp;Accounts Payable &nbsp;{formatMoney(v.amount)}</div>
                    <div>CR &nbsp;{v.cashBankAccount ?? "Cash / Bank"} &nbsp;{formatMoney(v.amount)}</div>
                  </>
                )}
              </div>
            </CardBody>
          </Card>

          {isPosted && method && (method.kind === "bank" || method.kind === "wallet") && (
            <Card>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-1.5">Bank reconciliation</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  This voucher is matched against a bank statement on the reconciliation
                  screen, where the statement lines it has to agree with actually live.
                </p>
                <Button variant="secondary" size="sm" className="mt-3" asChild>
                  <Link href="/accounting/reconciliation">Open reconciliation</Link>
                </Button>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={postOpen}
        onOpenChange={setPostOpen}
        title={`Post ${v.voucherNo}?`}
        description="The journal entry is written and anything this voucher is set against is cleared by that much. It can no longer be edited afterwards."
        variant="info"
        confirmLabel="Yes, post it"
        loading={busy}
        onConfirm={() => void post()}
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={`Cancel ${v.voucherNo}?`}
        description="Its journal entry is reversed by a mirror entry and every allocation is released, so the invoices it cleared go back to owing."
        variant="danger"
        confirmLabel="Yes, cancel it"
        requireReason
        reasonLabel="Why is it being cancelled?"
        reasonPlaceholder="e.g. Cheque bounced"
        loading={busy}
        onConfirm={(reason) => void cancel(reason)}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${v.voucherNo}?`}
        description="It is still a draft, so nothing has reached the ledger. This cannot be undone."
        variant="danger"
        confirmLabel="Yes, delete it"
        loading={busy}
        onConfirm={() => void remove()}
      />
    </>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-navy-900 dark:text-white mt-1">{value}</dd>
    </div>
  );
}
