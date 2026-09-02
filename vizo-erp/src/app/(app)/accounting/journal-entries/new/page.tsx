"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, type Control } from "react-hook-form";
import { z } from "zod";
import axios from "axios";
import { Save, ArrowLeft, Loader2, Plus, Trash2, AlertCircle, BookOpen, CheckCircle2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/* GET /accounting/lookups */
type LookupAccount = { id: number; code: string; name: string; isGroup: boolean; type: string; group: string };
type LookupRow = { id: number; name: string };
type LookupPeriod = { id: number; name: string; isClosed: boolean };
type Lookups = { accounts: LookupAccount[]; locations: LookupRow[]; periods: LookupPeriod[] };

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

const LineSchema = z
  .object({
    accountId: z.coerce.number({ message: "Pick account" }).positive("Pick account"),
    description: z.string().max(200).optional().or(z.literal("")),
    debit: z.coerce.number().min(0),
    credit: z.coerce.number().min(0),
  })
  .refine((d) => (d.debit > 0 || d.credit > 0) && !(d.debit > 0 && d.credit > 0), {
    message: "Set debit OR credit, never both",
    path: ["debit"],
  });

const Schema = z
  .object({
    entryDate: z.string().min(1, "Pick a date"),
    locationId: z.coerce.number().positive("Pick a location"),
    reference: z.string().max(50).optional().or(z.literal("")),
    narration: z.string().min(5, "Say why this entry is being made").max(500),
    lines: z.array(LineSchema).min(2, "An entry needs at least two lines"),
  })
  /* The one rule that makes it double entry. The API refuses an unbalanced
     entry too -- this is so the person typing finds out before they submit. */
  .refine(
    (v) => {
      const d = v.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
      const c = v.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
      return Math.abs(d - c) < 0.005 && d > 0;
    },
    { message: "Debits and credits must be equal and above zero", path: ["lines"] }
  );
type FormValues = z.infer<typeof Schema>;

const BLANK_LINE = { accountId: 0 as unknown as number, description: "", debit: 0, credit: 0 };

export default function NewJournalEntryPage() {
  const router = useRouter();

  const [lookups, setLookups] = React.useState<Lookups | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [posting, setPosting] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      entryDate: new Date().toISOString().slice(0, 10),
      locationId: 0,
      reference: "",
      narration: "",
      lines: [{ ...BLANK_LINE }, { ...BLANK_LINE }],
    },
  });
  const { reset } = form;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<Lookups>(`${API_BASE_URL}/accounting/lookups`, { headers: authHeader() });
      setLookups(res.data);
      setError(null);
      reset((current) => ({ ...current, locationId: res.data.locations[0]?.id ?? 0 }));
    } catch (e) {
      setError(apiMessage(e, "Could not load the chart of accounts."));
    } finally {
      setLoading(false);
    }
  }, [reset]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
  const lines = form.watch("lines");
  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.005 && totalDebit > 0;

  /* Only postable accounts. A group heading is a title in the chart, not a
     place money can sit, and the API refuses one. */
  const postableAccounts = React.useMemo(
    () => (lookups?.accounts ?? []).filter((a) => !a.isGroup),
    [lookups]
  );

  async function submit(values: FormValues, postImmediately: boolean) {
    try {
      const res = await axios.post<{ id: number; entryNo: string; message: string }>(
        `${API_BASE_URL}/accounting/journal-entries`,
        {
          entryDate: values.entryDate,
          locationId: values.locationId,
          reference: values.reference?.trim() || null,
          narration: values.narration.trim(),
          postImmediately,
          lines: values.lines.map((l) => ({
            accountId: l.accountId,
            partyId: null,
            description: l.description?.trim() || null,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
          })),
        },
        { headers: authHeader() }
      );
      toast.success(res.data.message, { description: `${formatMoney(totalDebit)} over ${values.lines.length} lines` });
      router.push(`/accounting/journal-entries/${res.data.id}`);
    } catch (e) {
      toast.error(apiMessage(e, "The entry was not saved."));
    }
  }

  const saveDraft = form.handleSubmit((v) => submit(v, false));
  const saveAndPost = form.handleSubmit(async (v) => {
    setPosting(true);
    try {
      await submit(v, true);
    } finally {
      setPosting(false);
    }
  });

  if (loading) {
    return (
      <>
        <PageHeader
          breadcrumbs={[{ label: "Accounting" }, { label: "Journal Entries", href: "/accounting/journal-entries" }, { label: "New" }]}
          title="Manual Journal Entry"
        />
        <div className="space-y-6"><Skeleton className="h-44" /><Skeleton className="h-72" /></div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader
          breadcrumbs={[{ label: "Accounting" }, { label: "Journal Entries", href: "/accounting/journal-entries" }, { label: "New" }]}
          title="Manual Journal Entry"
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
        breadcrumbs={[{ label: "Accounting" }, { label: "Journal Entries", href: "/accounting/journal-entries" }, { label: "New" }]}
        title={<><BookOpen className="size-6 inline-block mr-2 text-brand-yellow" />Manual Journal Entry</>}
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/accounting/journal-entries"><ArrowLeft />Back</Link></Button>
            <Button
              variant="secondary"
              onClick={() => void saveDraft()}
              disabled={!balanced || form.formState.isSubmitting}
            >
              {form.formState.isSubmitting && !posting
                ? <><Loader2 className="size-4 animate-spin" /> Saving…</>
                : <><Save />Save as Draft</>}
            </Button>
            <Button
              variant="accent"
              onClick={() => void saveAndPost()}
              disabled={!balanced || form.formState.isSubmitting}
            >
              {posting
                ? <><Loader2 className="size-4 animate-spin" /> Posting…</>
                : <><CheckCircle2 />Save &amp; Post</>}
            </Button>
          </>
        }
      />

      <Form {...form}>
        <form onSubmit={(ev) => { ev.preventDefault(); void saveDraft(); }} className="space-y-6" noValidate>
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Entry Header</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField control={form.control} name="entryDate" render={({ field }) => (
                  <FormItem><FormLabel required>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="locationId" render={({ field }) => (
                  <FormItem><FormLabel required>Location</FormLabel><FormControl>
                    <SelectNative {...field}>
                      {lookups?.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </SelectNative>
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="reference" render={({ field }) => (
                  <FormItem><FormLabel>Reference</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="narration" render={({ field }) => (
                  <FormItem className="sm:col-span-3"><FormLabel required>Narration</FormLabel><FormControl><Textarea rows={2} placeholder="Why this entry is being posted" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <p className="text-2xs text-slate-500 dark:text-slate-400 mt-3">
                The date decides the fiscal period. A closed period is refused.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Lines <span className="text-danger">*</span></h3>
                <Button type="button" variant="accent" size="sm" className="gap-1" onClick={() => append({ ...BLANK_LINE })}>
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
                  {fields.map((f, i) => (
                    <JELine
                      key={f.id}
                      idx={i}
                      control={form.control}
                      accounts={postableAccounts}
                      canRemove={fields.length > 2}
                      onRemove={() => remove(i)}
                    />
                  ))}
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

function JELine({
  idx, control, accounts, canRemove, onRemove,
}: {
  idx: number;
  control: Control<FormValues>;
  accounts: LookupAccount[];
  canRemove: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-12 gap-2 items-start">
      <FormField control={control} name={`lines.${idx}.accountId`} render={({ field }) => (
        <FormItem className="col-span-4">
          <FormControl>
            <SelectNative {...field}>
              <option value="">— Select account —</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
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
        {canRemove && (
          <Button type="button" variant="ghost" size="icon-sm" className={cn("text-danger")} onClick={onRemove} aria-label="Remove line">
            <Trash2 />
          </Button>
        )}
      </div>
    </div>
  );
}
