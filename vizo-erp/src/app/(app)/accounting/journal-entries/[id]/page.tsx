"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm, useFieldArray, type Control } from "react-hook-form";
import { z } from "zod";
import axios from "axios";
import {
  ArrowLeft, AlertCircle, RotateCcw, Lock, CheckCircle2, Edit3, Trash2,
  Save, Loader2, Plus,
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

/* GET /accounting/journal-entries/{id} */
type EntryLine = {
  id: number;
  lineNo: number;
  accountId: number;
  accountCode: string;
  accountName: string;
  partyId: number | null;
  partyName: string | null;
  description: string | null;
  debit: number;
  credit: number;
};

type Entry = {
  id: number;
  entryNo: string;
  entryDate: string;
  entryType: string;
  entryTypeName: string;
  reference: string | null;
  locationId: number;
  location: string;
  period: string;
  narration: string;
  status: string;
  statusName: string;
  createdBy: string;
  createdAt: string;
  postedBy: string | null;
  /** Set when this entry has been undone by a mirror entry. */
  reversedById: number | null;
  reversedBy: string | null;
  /** Set when this entry IS the mirror that undid another one. */
  reversesId: number | null;
  reverses: string | null;
  totalDebit: number;
  totalCredit: number;
  lines: EntryLine[];
};

type LookupAccount = { id: number; code: string; name: string; isGroup: boolean };
type LookupRow = { id: number; name: string };
type Lookups = { accounts: LookupAccount[]; locations: LookupRow[] };

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
  .refine(
    (v) => {
      const d = v.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
      const c = v.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
      return Math.abs(d - c) < 0.005 && d > 0;
    },
    { message: "Debits and credits must be equal and above zero", path: ["lines"] }
  );
type FormValues = z.infer<typeof Schema>;

const STATUS_VARIANT: Record<string, "success" | "muted" | "warning" | "danger"> = {
  POSTED: "success",
  DRAFT: "muted",
  REVERSED: "warning",
  REJECTED: "danger",
  CANCELLED: "danger",
};

const BLANK_LINE = { accountId: 0 as unknown as number, description: "", debit: 0, credit: 0 };

export default function JournalEntryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number.parseInt(params.id ?? "", 10);

  const [entry, setEntry] = React.useState<Entry | null>(null);
  const [lookups, setLookups] = React.useState<Lookups | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notFound, setNotFound] = React.useState(false);

  const [editing, setEditing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [postOpen, setPostOpen] = React.useState(false);
  const [reverseOpen, setReverseOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const form = useForm<FormValues>({ resolver: vizoResolver(Schema) });
  const { reset } = form;
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });

  const load = React.useCallback(async () => {
    if (!Number.isFinite(id)) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    try {
      const [one, look] = await Promise.all([
        axios.get<Entry>(`${API_BASE_URL}/accounting/journal-entries/${id}`, { headers: authHeader() }),
        axios.get<Lookups>(`${API_BASE_URL}/accounting/lookups`, { headers: authHeader() }),
      ]);
      setEntry(one.data);
      setLookups(look.data);
      setError(null);
      setNotFound(false);
      reset({
        entryDate: one.data.entryDate,
        locationId: one.data.locationId,
        reference: one.data.reference ?? "",
        narration: one.data.narration,
        lines: one.data.lines.map((l) => ({
          accountId: l.accountId,
          description: l.description ?? "",
          debit: l.debit,
          credit: l.credit,
        })),
      });
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) setNotFound(true);
      else setError(apiMessage(e, "Could not load the journal entry."));
    } finally {
      setLoading(false);
    }
  }, [id, reset]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const postableAccounts = React.useMemo(
    () => (lookups?.accounts ?? []).filter((a) => !a.isGroup),
    [lookups]
  );

  const draftLines = form.watch("lines") ?? [];
  const draftDebit = draftLines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const draftCredit = draftLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const draftBalanced = Math.abs(draftDebit - draftCredit) < 0.005 && draftDebit > 0;

  async function onSave(values: FormValues) {
    try {
      const res = await axios.put<{ message: string }>(
        `${API_BASE_URL}/accounting/journal-entries/${id}`,
        {
          entryDate: values.entryDate,
          locationId: values.locationId,
          reference: values.reference?.trim() || null,
          narration: values.narration.trim(),
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
      toast.success(res.data.message);
      setEditing(false);
      await load();
    } catch (e) {
      toast.error(apiMessage(e, "The entry was not updated."));
    }
  }

  async function post() {
    setBusy(true);
    try {
      const res = await axios.post<{ message: string }>(
        `${API_BASE_URL}/accounting/journal-entries/${id}/post`, {}, { headers: authHeader() }
      );
      toast.success(res.data.message);
      await load();
    } catch (e) {
      toast.error(apiMessage(e, "The entry was not posted."));
    } finally {
      setBusy(false);
      setPostOpen(false);
    }
  }

  async function reverse(reason?: string) {
    setBusy(true);
    try {
      const res = await axios.post<{ message: string; reversalId: number }>(
        `${API_BASE_URL}/accounting/journal-entries/${id}/reverse`,
        { reason: reason ?? null },
        { headers: authHeader() }
      );
      toast.success(res.data.message);
      await load();
    } catch (e) {
      toast.error(apiMessage(e, "The entry was not reversed."));
    } finally {
      setBusy(false);
      setReverseOpen(false);
    }
  }

  async function remove_() {
    setBusy(true);
    try {
      const res = await axios.delete<{ message: string }>(
        `${API_BASE_URL}/accounting/journal-entries/${id}`, { headers: authHeader() }
      );
      toast.success(res.data.message);
      router.push("/accounting/journal-entries");
    } catch (e) {
      toast.error(apiMessage(e, "The entry was not deleted."));
      setBusy(false);
      setDeleteOpen(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Accounting" }, { label: "Journal Entries", href: "/accounting/journal-entries" }]} title="Journal Entry" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><Skeleton className="h-96" /></div>
          <Skeleton className="h-64" />
        </div>
      </>
    );
  }

  if (notFound) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Journal entry not found"
        description="It may have been deleted, or the link is wrong."
        action={<Button asChild><Link href="/accounting/journal-entries">Back to journal entries</Link></Button>}
      />
    );
  }

  if (error || !entry) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Accounting" }, { label: "Journal Entries", href: "/accounting/journal-entries" }]} title="Journal Entry" />
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

  const je = entry;
  const isDraft = je.status === "DRAFT";
  const isPosted = je.status === "POSTED";
  const alreadyReversed = je.reversedById !== null;
  const balanced = Math.abs(je.totalDebit - je.totalCredit) < 0.005;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Journal Entries", href: "/accounting/journal-entries" }, { label: je.entryNo }]}
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{je.entryNo}</span>
            <StatusPill variant={STATUS_VARIANT[je.status] ?? "muted"}>{je.statusName}</StatusPill>
            <Badge variant="muted">{je.entryTypeName}</Badge>
            {alreadyReversed && <Badge variant="warning">Reversed</Badge>}
          </div>
        }
        subtitle={je.narration}
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/accounting/journal-entries"><ArrowLeft />Back</Link></Button>
            <DocumentActions kind="journal-entry" id={id} label="journal entry" />

            {isDraft && !editing && (
              <Button variant="secondary" className="gap-1.5" onClick={() => setEditing(true)}><Edit3 />Edit</Button>
            )}
            {isDraft && (
              <>
                <Button variant="accent" className="gap-1.5" disabled={busy} onClick={() => setPostOpen(true)}>
                  <CheckCircle2 />Post Entry
                </Button>
                <Button variant="ghost" className="text-danger" disabled={busy} onClick={() => setDeleteOpen(true)}>
                  <Trash2 />Delete
                </Button>
              </>
            )}
            {isPosted && !alreadyReversed && (
              <Can permission="ledger.manage">
                <Button variant="danger" className="gap-1.5" disabled={busy} onClick={() => setReverseOpen(true)}>
                  <RotateCcw />Reverse Entry
                </Button>
              </Can>
            )}
          </>
        }
      />

      {isPosted && !alreadyReversed && (
        <Card className="bg-success/5 border-success/30 mb-6">
          <CardBody className="py-3">
            <div className="flex items-center gap-2 text-sm text-success-dark dark:text-success-light">
              <Lock className="size-4" />
              <span><strong>A posted entry is history.</strong> It is never edited — to correct it, post a reversing entry.</span>
            </div>
          </CardBody>
        </Card>
      )}

      {alreadyReversed && je.reversedById && (
        <Card className="bg-warning/5 border-warning/30 mb-6">
          <CardBody className="py-3">
            <div className="flex items-center gap-2 text-sm text-navy-900 dark:text-white">
              <RotateCcw className="size-4 text-warning" />
              <span>
                Undone by{" "}
                <Link href={`/accounting/journal-entries/${je.reversedById}`} className="font-semibold underline underline-offset-2">
                  {je.reversedBy}
                </Link>
                . Both entries stay posted so the two cancel each other in every statement.
              </span>
            </div>
          </CardBody>
        </Card>
      )}

      {je.reversesId && (
        <Card className="bg-info/5 border-info/30 mb-6">
          <CardBody className="py-3">
            <div className="flex items-center gap-2 text-sm text-navy-900 dark:text-white">
              <RotateCcw className="size-4 text-info" />
              <span>
                This entry reverses{" "}
                <Link href={`/accounting/journal-entries/${je.reversesId}`} className="font-semibold underline underline-offset-2">
                  {je.reverses}
                </Link>
                .
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
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Edit {je.entryNo}</h3>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSave)} className="space-y-5" noValidate>
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
                        <FormItem><FormLabel>Reference</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="narration" render={({ field }) => (
                        <FormItem className="sm:col-span-3"><FormLabel required>Narration</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-navy-900 dark:text-white">Lines</h4>
                        <Button type="button" variant="accent" size="sm" className="gap-1" onClick={() => append({ ...BLANK_LINE })}>
                          <Plus />Add line
                        </Button>
                      </div>
                      <div className="grid grid-cols-12 gap-2 px-2 py-1 text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-navy-700">
                        <div className="col-span-4">Account</div>
                        <div className="col-span-4">Description</div>
                        <div className="col-span-1 text-right">Debit</div>
                        <div className="col-span-2 text-right">Credit</div>
                        <div className="col-span-1" />
                      </div>
                      <div className="space-y-1 mt-1">
                        {fields.map((f, i) => (
                          <EditLine
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
                        <div className="col-span-1 text-right tabular text-sm font-bold text-navy-900 dark:text-white">{formatMoney(draftDebit)}</div>
                        <div className="col-span-2 text-right tabular text-sm font-bold text-navy-900 dark:text-white">{formatMoney(draftCredit)}</div>
                      </div>
                      <div className="text-right">
                        {draftBalanced ? (
                          <span className="text-xs text-success font-semibold">✓ Balanced</span>
                        ) : (
                          <span className="text-xs text-danger font-semibold inline-flex items-center gap-1">
                            <AlertCircle className="size-3" /> Difference: {formatMoney(Math.abs(draftDebit - draftCredit))}
                          </span>
                        )}
                      </div>
                      <FormField control={form.control} name="lines" render={() => <FormMessage />} />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button type="submit" variant="accent" disabled={!draftBalanced || form.formState.isSubmitting}>
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
            <Card className="p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-navy-700">
                <h3 className="text-base font-semibold text-navy-900 dark:text-white">Journal Lines</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-navy-700/50 text-left">
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2">Account</th>
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2">Party</th>
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2">Description</th>
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Debit</th>
                      <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                    {je.lines.map((l) => (
                      <tr key={l.id}>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-navy-900 dark:text-white">{l.accountName}</div>
                          <div className="text-2xs tabular text-slate-500 dark:text-slate-400">{l.accountCode}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{l.partyName ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{l.description ?? "—"}</td>
                        <td className="px-4 py-3 text-right tabular text-sm font-semibold text-navy-900 dark:text-white">{l.debit > 0 ? formatMoney(l.debit) : "—"}</td>
                        <td className="px-4 py-3 text-right tabular text-sm font-semibold text-success">{l.credit > 0 ? formatMoney(l.credit) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-navy-900 text-white">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-sm font-bold uppercase tracking-wider">Totals</td>
                      <td className="px-4 py-3 text-right tabular text-sm font-bold">{formatMoney(je.totalDebit)}</td>
                      <td className="px-4 py-3 text-right tabular text-sm font-bold">{formatMoney(je.totalCredit)}</td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="px-4 py-2 text-right text-2xs">
                        {balanced
                          ? <span className="text-brand-yellow">✓ Balanced</span>
                          : <span className="text-danger">⚠ Difference: {formatMoney(Math.abs(je.totalDebit - je.totalCredit))}</span>}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Entry Details</h3>
              <dl className="space-y-2.5 text-sm">
                <Meta label="Entry #" value={<span className="tabular">{je.entryNo}</span>} />
                <Meta label="Type" value={<Badge variant="muted">{je.entryTypeName}</Badge>} />
                <Meta label="Date" value={formatDate(je.entryDate)} />
                <Meta label="Period" value={je.period} />
                <Meta label="Location" value={je.location} />
                <Meta label="Reference" value={<span className="tabular">{je.reference ?? "—"}</span>} />
                <Meta label="Created By" value={je.createdBy} />
                <Meta label="Created On" value={formatDate(je.createdAt)} />
                {je.postedBy && <Meta label="Posted By" value={je.postedBy} />}
              </dl>
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={postOpen}
        onOpenChange={setPostOpen}
        title={`Post ${je.entryNo}?`}
        description="Once posted the entry counts in every statement and can no longer be edited. To correct it afterwards you post a reversing entry."
        variant="info"
        confirmLabel="Yes, post it"
        loading={busy}
        onConfirm={() => void post()}
      />

      <ConfirmDialog
        open={reverseOpen}
        onOpenChange={setReverseOpen}
        title={`Reverse ${je.entryNo}?`}
        description="A mirror entry is posted with debits and credits swapped. Both entries stay in the ledger and cancel each other — the original is not erased."
        variant="danger"
        confirmLabel="Yes, reverse it"
        requireReason
        reasonLabel="Reason for reversal"
        loading={busy}
        onConfirm={(reason) => void reverse(reason)}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${je.entryNo}?`}
        description="It is still a draft, so nothing has reached the ledger. This cannot be undone."
        variant="danger"
        confirmLabel="Yes, delete it"
        loading={busy}
        onConfirm={() => void remove_()}
      />
    </>
  );
}

function EditLine({
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
          <FormControl><Input type="number" step="0.01" min={0} className="text-right tabular" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={control} name={`lines.${idx}.credit`} render={({ field }) => (
        <FormItem className="col-span-2">
          <FormControl><Input type="number" step="0.01" min={0} className="text-right tabular" {...field} /></FormControl>
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

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-navy-900 dark:text-white">{value}</dd>
    </div>
  );
}
