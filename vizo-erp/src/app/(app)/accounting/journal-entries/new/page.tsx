"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, type Control } from "react-hook-form";
import { z } from "zod";
import { Save, ArrowLeft, Loader2, Plus, Trash2, AlertCircle, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { vizoResolver } from "@/lib/zod-resolver";
import { accounts } from "@/data/accounting";
import { activeLocations } from "@/data/settings";
import { toast } from "@/components/ui/toaster";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { defaultLocation } from "@/data/settings";

const LineSchema = z.object({
  accountId: z.coerce.number({ message: "Pick account" }).positive("Pick account"),
  description: z.string().max(200).optional().or(z.literal("")),
  debit: z.coerce.number().min(0),
  credit: z.coerce.number().min(0),
}).refine((d) => (d.debit > 0 || d.credit > 0) && !(d.debit > 0 && d.credit > 0), { message: "Set debit OR credit (not both)", path: ["debit"] });

const Schema = z.object({
  date: z.string().min(1),
  locationId: z.coerce.number().positive(),
  entryType: z.enum(["JOURNAL", "ADJUSTMENT", "OPENING", "CLOSING", "CONTRA"]),
  reference: z.string().optional().or(z.literal("")),
  narration: z.string().min(5, "Narration required").max(500),
  lines: z.array(LineSchema).min(2, "JE needs at least 2 lines"),
});
type Form = z.infer<typeof Schema>;

const postableAccounts = accounts.filter((a) => !a.isGroup);

export default function NewJEPage() {
  const router = useRouter();
  const form = useForm<Form>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      locationId: defaultLocation().id,
      entryType: "JOURNAL",
      reference: "",
      narration: "",
      lines: [
        { accountId: 0 as unknown as number, description: "", debit: 0, credit: 0 },
        { accountId: 0 as unknown as number, description: "", debit: 0, credit: 0 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
  const lines = form.watch("lines");
  const totalDebit  = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.005 && totalDebit > 0;

  async function onSubmit(_d: Form) {
    if (!balanced) {
      toast.error("Entry not balanced", { description: `Debits: ${formatMoney(totalDebit)} ≠ Credits: ${formatMoney(totalCredit)}` });
      return;
    }
    await new Promise((r) => setTimeout(r, 600));
    toast.success("Journal entry created (DRAFT)", { description: "Review and post when ready." });
    router.push("/accounting/journal-entries");
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "JEs", href: "/accounting/journal-entries" }, { label: "New JE" }]}
        title={<><BookOpen className="size-6 inline-block mr-2 text-brand-yellow" />Manual Journal Entry</>}
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/accounting/journal-entries"><ArrowLeft />Back</Link></Button>
            <Button variant="accent" onClick={form.handleSubmit(onSubmit)} disabled={!balanced || form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save />Save as Draft</>}
            </Button>
          </>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Entry Header</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem><FormLabel required>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="locationId" render={({ field }) => (
                  <FormItem><FormLabel required>Location</FormLabel><FormControl>
                    <SelectNative {...field}>{activeLocations().map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</SelectNative>
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="entryType" render={({ field }) => (
                  <FormItem><FormLabel required>Type</FormLabel><FormControl>
                    <SelectNative {...field}>
                      <option>JOURNAL</option><option>ADJUSTMENT</option><option>OPENING</option><option>CLOSING</option><option>CONTRA</option>
                    </SelectNative>
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="reference" render={({ field }) => (
                  <FormItem><FormLabel>Reference</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="narration" render={({ field }) => (
                  <FormItem className="sm:col-span-4"><FormLabel required>Narration</FormLabel><FormControl><Textarea rows={2} placeholder="Why this entry is being posted" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Lines <span className="text-danger">*</span></h3>
                <Button type="button" variant="accent" size="sm" className="gap-1" onClick={() => append({ accountId: 0 as unknown as number, description: "", debit: 0, credit: 0 })}>
                  <Plus />Add line
                </Button>
              </div>
              <div className="overflow-x-auto scrollbar-thin">
                <div className="grid grid-cols-12 gap-2 px-2 py-1 text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-navy-700">
                  <div className="col-span-4">Account</div>
                  <div className="col-span-4">Description</div>
                  <div className="col-span-1 text-right">Debit</div>
                  <div className="col-span-2 text-right">Credit</div>
                  <div className="col-span-1"></div>
                </div>
                <div className="space-y-1 mt-1">
                  {fields.map((f, i) => <JELine key={f.id} idx={i} control={form.control} canRemove={fields.length > 2} onRemove={() => remove(i)} />)}
                </div>
                <div className="grid grid-cols-12 gap-2 px-2 py-3 mt-2 border-t-2 border-navy-900 dark:border-brand-yellow">
                  <div className="col-span-8 text-sm font-bold text-right uppercase tracking-wider text-navy-900 dark:text-white">Totals</div>
                  <div className="col-span-1 text-right tabular text-sm font-bold text-navy-900 dark:text-white">{formatMoney(totalDebit)}</div>
                  <div className="col-span-2 text-right tabular text-sm font-bold text-navy-900 dark:text-white">{formatMoney(totalCredit)}</div>
                </div>
                <div className="text-right">
                  {balanced ? (
                    <span className="text-xs text-success font-semibold">✓ Balanced</span>
                  ) : (
                    <span className="text-xs text-danger font-semibold inline-flex items-center gap-1">
                      <AlertCircle className="size-3" /> Difference: {formatMoney(Math.abs(totalDebit - totalCredit))}
                    </span>
                  )}
                </div>
              </div>
              <FormField control={form.control} name="lines" render={() => <FormMessage />} />
            </CardBody>
          </Card>
        </form>
      </Form>
    </>
  );
}

function JELine({ idx, control, canRemove, onRemove }: { idx: number; control: Control<Form>; canRemove: boolean; onRemove: () => void }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-start">
      <FormField control={control} name={`lines.${idx}.accountId`} render={({ field }) => (
        <FormItem className="col-span-4">
          <FormControl>
            <SelectNative {...field}>
              <option value="">— Select account —</option>
              {postableAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
            </SelectNative>
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={control} name={`lines.${idx}.description`} render={({ field }) => (
        <FormItem className="col-span-4">
          <FormControl><Input placeholder="Line memo" {...field} /></FormControl>
        </FormItem>
      )} />
      <FormField control={control} name={`lines.${idx}.debit`} render={({ field }) => (
        <FormItem className="col-span-1">
          <FormControl><Input type="number" step="0.01" min={0} placeholder="0" className="text-right tabular" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={control} name={`lines.${idx}.credit`} render={({ field }) => (
        <FormItem className="col-span-2">
          <FormControl><Input type="number" step="0.01" min={0} placeholder="0" className="text-right tabular" {...field} /></FormControl>
        </FormItem>
      )} />
      <div className="col-span-1">
        {canRemove && <Button type="button" variant="ghost" size="icon-sm" className={cn("text-danger")} onClick={onRemove} aria-label="Remove line"><Trash2 /></Button>}
      </div>
    </div>
  );
}
