"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Save, ArrowLeft, Loader2, Receipt, Upload } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { vizoResolver } from "@/lib/zod-resolver";
import { activeLocations } from "@/data/settings";
import { accounts } from "@/data/accounting";
import { toast } from "@/components/ui/toaster";
import { formatMoney } from "@/lib/format";
import { defaultLocation } from "@/data/settings";

const Schema = z.object({
  date: z.string().min(1),
  locationId: z.coerce.number().positive(),
  category: z.string().min(2, "Required"),
  accountId: z.coerce.number().positive("Pick expense account"),
  amount: z.coerce.number().positive("Amount > 0"),
  vendor: z.string().min(2, "Vendor required").max(150),
  paidVia: z.enum(["CASH", "BANK", "EASYPAISA", "JAZZCASH", "CHEQUE", "PETTY_CASH"]),
  paidFromAccountId: z.coerce.number().positive(),
  description: z.string().max(500).optional(),
});
type Form = z.infer<typeof Schema>;

const expenseAccounts = accounts.filter((a) => a.type === "EXPENSE" && !a.isGroup);
const cashBankAccounts = accounts.filter((a) => !a.isGroup && (a.subtype === "CASH" || a.subtype === "BANK" || a.subtype === "WALLET"));

export default function NewExpensePage() {
  const router = useRouter();
  const form = useForm<Form>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      locationId: defaultLocation().id,
      category: "",
      accountId: expenseAccounts[0]?.id ?? 0 as unknown as number,
      amount: 0,
      vendor: "",
      paidVia: "BANK",
      paidFromAccountId: cashBankAccounts.find((a) => a.subtype === "BANK")?.id ?? cashBankAccounts[0]?.id ?? 0 as unknown as number,
      description: "",
    },
  });

  const amount = Number(form.watch("amount")) || 0;

  async function onSubmit(_d: Form) {
    await new Promise((r) => setTimeout(r, 600));
    toast.success("Expense recorded", { description: `${formatMoney(amount)} for ${_d.vendor}` });
    router.push("/accounting/expenses");
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
              {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save />Record Expense</>}
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
                  <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem><FormLabel required>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="locationId" render={({ field }) => (
                    <FormItem><FormLabel required>Location</FormLabel><FormControl>
                      <SelectNative {...field}>{activeLocations().map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</SelectNative>
                    </FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem><FormLabel required>Category</FormLabel><FormControl><Input placeholder="e.g. Office Rent, Utilities" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="accountId" render={({ field }) => (
                    <FormItem><FormLabel required>Expense Account</FormLabel><FormControl>
                      <SelectNative {...field}>
                        {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
                      </SelectNative>
                    </FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="vendor" render={({ field }) => (
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
                  <FormField control={form.control} name="paidVia" render={({ field }) => (
                    <FormItem><FormLabel required>Paid via</FormLabel><FormControl>
                      <SelectNative {...field}>
                        <option value="BANK">Bank Transfer</option>
                        <option value="CASH">Cash</option>
                        <option value="EASYPAISA">Easypaisa</option>
                        <option value="JAZZCASH">JazzCash</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="PETTY_CASH">Petty Cash</option>
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

            <Card>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Receipt / Invoice Attachment</h3>
                <div className="border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg p-6 text-center hover:border-brand-yellow cursor-pointer">
                  <Upload className="size-6 text-slate-300 mx-auto mb-2" />
                  <div className="text-sm text-navy-900 dark:text-white">Drop receipt here or click to upload</div>
                  <div className="text-xs text-slate-500 mt-1">PDF, PNG, JPG up to 5MB</div>
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
                  <div className="text-2xs uppercase font-semibold text-slate-500">Auto-posting</div>
                  <div className="text-xs font-mono mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                    <div>DR &nbsp;Expense Account &nbsp;{formatMoney(amount)}</div>
                    <div>CR &nbsp;Cash/Bank &nbsp;{formatMoney(amount)}</div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </form>
      </Form>
    </>
  );
}
