"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import axios from "axios";
import { Save, ArrowLeft, Loader2, Receipt, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { vizoResolver } from "@/lib/zod-resolver";
import { toast } from "@/components/ui/toaster";
import { formatMoney } from "@/lib/format";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/* GET /accounting/lookups -- the only source of accounts, locations and
   payment methods. Nothing on this page is a hard-coded list. */
type LookupAccount = { id: number; code: string; name: string; isGroup: boolean; type: string; group: string };
type LookupRow = { id: number; code?: string; key?: string; name: string; kind?: string };
type Lookups = {
  accounts: LookupAccount[];
  paymentMethods: LookupRow[];
  locations: LookupRow[];
};

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

/* The same two rules the API enforces in ValidateExpense. Checking here as
   well is not duplication for its own sake -- it is the difference between a
   mistake caught while typing and a mistake caught after a round trip. */
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

export default function NewExpensePage() {
  const router = useRouter();

  const [lookups, setLookups] = React.useState<Lookups | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      expenseDate: new Date().toISOString().slice(0, 10),
      locationId: 0,
      categoryName: "",
      expenseAccountId: 0,
      paidFromAccountId: 0,
      amount: 0,
      vendorName: "",
      methodId: 0,
      description: "",
    },
  });

  const { reset } = form;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<Lookups>(`${API_BASE_URL}/accounting/lookups`, {
        headers: authHeader(),
      });
      setLookups(res.data);
      setError(null);

      /* The defaults can only be chosen once the chart of accounts is known,
         so they are filled in here rather than in defaultValues. */
      const expense = res.data.accounts.find((a) => !a.isGroup && a.group === "Expenses");
      const cash = res.data.accounts.find((a) => !a.isGroup && a.type === "Cash & Bank");
      const bankMethod = res.data.paymentMethods.find((m) => m.key === "BANK");
      reset((current) => ({
        ...current,
        locationId: res.data.locations[0]?.id ?? 0,
        expenseAccountId: expense?.id ?? 0,
        paidFromAccountId: cash?.id ?? 0,
        methodId: bankMethod?.id ?? res.data.paymentMethods[0]?.id ?? 0,
      }));
    } catch (e) {
      setError(apiMessage(e, "Could not load the accounts and locations."));
    } finally {
      setLoading(false);
    }
  }, [reset]);

  React.useEffect(() => {
    void load();
  }, [load]);

  /* Only accounts that can actually take this posting are offered. The API
     refuses the rest; the dropdown simply never suggests them. */
  const expenseAccounts = React.useMemo(
    () => (lookups?.accounts ?? []).filter((a) => !a.isGroup && a.group === "Expenses"),
    [lookups]
  );
  const cashBankAccounts = React.useMemo(
    () => (lookups?.accounts ?? []).filter((a) => !a.isGroup && a.type === "Cash & Bank"),
    [lookups]
  );

  const amount = Number(form.watch("amount")) || 0;
  const expenseAccountId = Number(form.watch("expenseAccountId"));
  const paidFromAccountId = Number(form.watch("paidFromAccountId"));
  const drName = expenseAccounts.find((a) => a.id === expenseAccountId)?.name ?? "Expense account";
  const crName = cashBankAccounts.find((a) => a.id === paidFromAccountId)?.name ?? "Cash / Bank";

  async function onSubmit(values: FormValues) {
    try {
      const res = await axios.post<{ id: number; expenseNo: string; message: string }>(
        `${API_BASE_URL}/accounting/expenses`,
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
      toast.success(res.data.message, {
        description: `${formatMoney(values.amount)} to ${values.vendorName.trim()}`,
      });
      router.push(`/accounting/expenses/${res.data.id}`);
    } catch (e) {
      /* The API's own wording, not a generic apology. It knows which rule
         was broken and this page does not. */
      toast.error(apiMessage(e, "The expense was not saved."));
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader
          breadcrumbs={[{ label: "Accounting" }, { label: "Expenses", href: "/accounting/expenses" }, { label: "New" }]}
          title="New Expense"
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-40" />
          </div>
          <Skeleton className="h-52" />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader
          breadcrumbs={[{ label: "Accounting" }, { label: "Expenses", href: "/accounting/expenses" }, { label: "New" }]}
          title="New Expense"
        />
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

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Expenses", href: "/accounting/expenses" }, { label: "New" }]}
        title={<><Receipt className="size-6 inline-block mr-2 text-brand-yellow" />New Expense</>}
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/accounting/expenses"><ArrowLeft />Back</Link></Button>
            <Button variant="accent" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? <><Loader2 className="size-4 animate-spin" /> Saving…</>
                : <><Save />Record Expense</>}
            </Button>
          </>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl" noValidate>
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Expense Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <FormItem><FormLabel required>Category</FormLabel><FormControl><Input placeholder="e.g. Office Rent, Utilities" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="expenseAccountId" render={({ field }) => (
                    <FormItem><FormLabel required>Expense Account</FormLabel><FormControl>
                      <SelectNative {...field}>
                        {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
                      </SelectNative>
                    </FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="vendorName" render={({ field }) => (
                    <FormItem><FormLabel required>Vendor</FormLabel><FormControl><Input placeholder="e.g. K-Electric" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem><FormLabel required>Amount (PKR)</FormLabel><FormControl><Input type="number" step="0.01" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem className="sm:col-span-2"><FormLabel>Description</FormLabel><FormControl><Textarea rows={2} placeholder="Bill number, period, what was purchased…" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Payment</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="methodId" render={({ field }) => (
                    <FormItem><FormLabel required>Paid via</FormLabel><FormControl>
                      <SelectNative {...field}>
                        {lookups?.paymentMethods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
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
                </div>
              </CardBody>
            </Card>
          </div>

          <div>
            <Card className="lg:sticky lg:top-20">
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Summary</h3>
                <div className="text-3xl tabular font-bold text-danger mt-2">-{formatMoney(amount)}</div>
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-navy-700">
                  <div className="text-2xs uppercase font-semibold text-slate-500">Entry on approval</div>
                  <div className="text-xs font-mono mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                    <div>DR &nbsp;{drName} &nbsp;{formatMoney(amount)}</div>
                    <div>CR &nbsp;{crName} &nbsp;{formatMoney(amount)}</div>
                  </div>
                  <p className="text-2xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
                    Saved as a draft. The entry above is written to the ledger when
                    the expense is approved, not before.
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>
        </form>
      </Form>
    </>
  );
}
