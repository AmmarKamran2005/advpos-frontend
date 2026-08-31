"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import axios from "axios";
import {
  Save, ArrowLeft, Loader2, Banknote, Landmark, Smartphone, ArrowDownToLine,
  ArrowUpFromLine, FileText, Search, AlertCircle, CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { vizoResolver } from "@/lib/zod-resolver";
import { toast } from "@/components/ui/toaster";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/* GET /accounting/lookups */
type LookupAccount = { id: number; code: string; name: string; isGroup: boolean; type: string };
type LookupParty = { id: number; code: string; name: string; type: "CUSTOMER" | "SUPPLIER" | "BOTH" };
type LookupMethod = { id: number; key: string; name: string; kind: string };
type LookupVoucherType = { id: number; code: string; name: string; isReceipt: boolean };
type LookupRow = { id: number; name: string };
type Lookups = {
  accounts: LookupAccount[];
  voucherTypes: LookupVoucherType[];
  paymentMethods: LookupMethod[];
  locations: LookupRow[];
  parties: LookupParty[];
};

/* GET /accounting/open-invoices */
type OpenInvoice = {
  id: number;
  invoiceNo: string;
  supplierInvoiceNo?: string;
  invoiceDate: string;
  dueDate: string;
  partyId: number;
  partyName: string;
  total: number;
  paid: number;
  balance: number;
};
type OpenInvoiceResponse = { kind: string; count: number; outstanding: number; items: OpenInvoice[] };

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

/** The icon each voucher type gets. Keyed by the code the API returns. */
const TYPE_ICON: Record<string, typeof Banknote> = {
  CR: ArrowDownToLine, CP: ArrowUpFromLine,
  BR: Landmark, BP: Landmark,
  WR: Smartphone, WP: Smartphone,
  JV: FileText,
};

function initialsOf(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

const Schema = z.object({
  voucherTypeId: z.coerce.number().positive("Pick a voucher type"),
  voucherDate: z.string().min(1, "Pick a date"),
  locationId: z.coerce.number().positive("Pick a location"),
  partyId: z.coerce.number().optional(),
  cashBankAccountId: z.coerce.number().positive("Pick the cash or bank account"),
  amount: z.coerce.number().positive("Amount must be above zero"),
  methodId: z.coerce.number().positive("Pick a payment method"),
  paymentProvider: z.string().max(80).optional().or(z.literal("")),
  reference: z.string().max(50).optional().or(z.literal("")),
  walletTxnId: z.string().max(50).optional().or(z.literal("")),
  narration: z.string().min(5, "Say what this voucher is for").max(500),
});
type FormValues = z.infer<typeof Schema>;

export default function NewVoucherPage() {
  const router = useRouter();

  const [lookups, setLookups] = React.useState<Lookups | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [partyOpen, setPartyOpen] = React.useState(false);
  const [posting, setPosting] = React.useState(false);

  /* The invoices this voucher can be set against, and how much of the amount
     has been put on each. */
  const [openInvoices, setOpenInvoices] = React.useState<OpenInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = React.useState(false);
  const [allocations, setAllocations] = React.useState<Record<number, number>>({});

  const form = useForm<FormValues>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      voucherTypeId: 0,
      voucherDate: new Date().toISOString().slice(0, 10),
      locationId: 0,
      partyId: 0,
      cashBankAccountId: 0,
      amount: 0,
      methodId: 0,
      paymentProvider: "",
      reference: "",
      walletTxnId: "",
      narration: "",
    },
  });
  const { reset, setValue } = form;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<Lookups>(`${API_BASE_URL}/accounting/lookups`, { headers: authHeader() });
      setLookups(res.data);
      setError(null);

      const firstType = res.data.voucherTypes[0];
      const cash = res.data.accounts.find((a) => !a.isGroup && a.type === "Cash & Bank");
      const cashMethod = res.data.paymentMethods.find((m) => m.key === "CASH");
      reset((current) => ({
        ...current,
        voucherTypeId: firstType?.id ?? 0,
        locationId: res.data.locations[0]?.id ?? 0,
        cashBankAccountId: cash?.id ?? 0,
        methodId: cashMethod?.id ?? res.data.paymentMethods[0]?.id ?? 0,
      }));
    } catch (e) {
      setError(apiMessage(e, "Could not load the voucher types and accounts."));
    } finally {
      setLoading(false);
    }
  }, [reset]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const voucherTypeId = Number(form.watch("voucherTypeId"));
  const partyId = Number(form.watch("partyId"));
  const methodId = Number(form.watch("methodId"));
  const amount = Number(form.watch("amount")) || 0;

  const type = lookups?.voucherTypes.find((t) => t.id === voucherTypeId) ?? null;
  const isReceipt = type?.isReceipt ?? true;
  const isJournalVoucher = type?.code === "JV";
  const method = lookups?.paymentMethods.find((m) => m.id === methodId) ?? null;
  const party = lookups?.parties.find((p) => p.id === partyId) ?? null;
  const cashBankAccounts = React.useMemo(
    () => (lookups?.accounts ?? []).filter((a) => !a.isGroup && a.type === "Cash & Bank"),
    [lookups]
  );

  /* A receipt is money from a customer; a payment is money to a supplier.
     Offering the other side is how a receipt ends up filed against a
     supplier's ledger. */
  const partyOptions = React.useMemo(() => {
    const all = lookups?.parties ?? [];
    if (isJournalVoucher) return all;
    return all.filter((p) => p.type === "BOTH" || p.type === (isReceipt ? "CUSTOMER" : "SUPPLIER"));
  }, [lookups, isReceipt, isJournalVoucher]);

  /* Changing the voucher type changes who the party can be, so a party that no
     longer belongs is dropped rather than silently kept. */
  React.useEffect(() => {
    if (!partyId || !lookups) return;
    if (!partyOptions.some((p) => p.id === partyId)) {
      /* Clearing a selection the new voucher type cannot accept. */
      setValue("partyId", 0);
      setAllocations({});
    }
  }, [partyOptions, partyId, lookups, setValue]);

  /* The open invoices for whoever is selected, on whichever side. */
  const loadOpenInvoices = React.useCallback(async () => {
    if (!partyId || isJournalVoucher) {
      setOpenInvoices([]);
      return;
    }
    setInvoicesLoading(true);
    try {
      const res = await axios.get<OpenInvoiceResponse>(`${API_BASE_URL}/accounting/open-invoices`, {
        headers: authHeader(),
        params: { kind: isReceipt ? "sales" : "purchase", partyId },
      });
      setOpenInvoices(res.data.items);
    } catch {
      /* Allocation is optional -- a voucher can be recorded without it. A
         failure here must not stop the money being written down. */
      setOpenInvoices([]);
    } finally {
      setInvoicesLoading(false);
    }
  }, [partyId, isReceipt, isJournalVoucher]);

  React.useEffect(() => {
    void loadOpenInvoices();
  }, [loadOpenInvoices]);

  const allocatedTotal = Object.values(allocations).reduce((s, v) => s + (Number(v) || 0), 0);
  const unallocated = amount - allocatedTotal;
  const overAllocated = allocatedTotal - amount > 0.004;

  function setAllocation(invoiceId: number, value: number) {
    setAllocations((prev) => {
      const next = { ...prev };
      if (!value || value <= 0) delete next[invoiceId];
      else next[invoiceId] = value;
      return next;
    });
  }

  /** Put as much of the remaining amount on this invoice as it can take. */
  function fillInvoice(inv: OpenInvoice) {
    const alreadyHere = allocations[inv.id] ?? 0;
    const spare = amount - (allocatedTotal - alreadyHere);
    const put = Math.min(inv.balance, Math.max(0, spare));
    setAllocation(inv.id, Number(put.toFixed(2)));
  }

  async function submit(values: FormValues, postImmediately: boolean) {
    if (overAllocated) {
      toast.error("Allocations come to more than the voucher amount.");
      return;
    }
    try {
      const rows = Object.entries(allocations)
        .filter(([, amt]) => Number(amt) > 0)
        .map(([invoiceId, amt]) => (
          isReceipt
            ? { salesInvoiceId: Number(invoiceId), purchaseInvoiceId: null, amount: Number(amt) }
            : { salesInvoiceId: null, purchaseInvoiceId: Number(invoiceId), amount: Number(amt) }
        ));

      const res = await axios.post<{ id: number; voucherNo: string; unallocated: number; message: string }>(
        `${API_BASE_URL}/accounting/vouchers`,
        {
          voucherTypeId: values.voucherTypeId,
          voucherDate: values.voucherDate,
          locationId: values.locationId,
          partyId: values.partyId || null,
          cashBankAccountId: values.cashBankAccountId,
          amount: values.amount,
          methodId: values.methodId,
          paymentProvider: values.paymentProvider?.trim() || null,
          reference: values.reference?.trim() || null,
          walletTxnId: values.walletTxnId?.trim() || null,
          narration: values.narration.trim(),
          postImmediately,
          allocations: rows,
        },
        { headers: authHeader() }
      );
      toast.success(res.data.message, {
        description: `${type?.name ?? "Voucher"} · ${formatMoney(values.amount)}`,
      });
      router.push(`/accounting/vouchers/${res.data.id}`);
    } catch (e) {
      toast.error(apiMessage(e, "The voucher was not saved."));
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
          breadcrumbs={[{ label: "Accounting" }, { label: "Vouchers", href: "/accounting/vouchers" }, { label: "New" }]}
          title="New Voucher"
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl">
          <div className="lg:col-span-2 space-y-6"><Skeleton className="h-40" /><Skeleton className="h-72" /></div>
          <Skeleton className="h-56" />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader
          breadcrumbs={[{ label: "Accounting" }, { label: "Vouchers", href: "/accounting/vouchers" }, { label: "New" }]}
          title="New Voucher"
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

  const TypeIcon = TYPE_ICON[type?.code ?? ""] ?? Banknote;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Vouchers", href: "/accounting/vouchers" }, { label: "New" }]}
        title={<><TypeIcon className="size-6 inline-block mr-2 text-brand-yellow" />New Voucher</>}
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/accounting/vouchers"><ArrowLeft />Back</Link></Button>
            <Button variant="secondary" onClick={() => void saveDraft()} disabled={form.formState.isSubmitting || overAllocated}>
              {form.formState.isSubmitting && !posting
                ? <><Loader2 className="size-4 animate-spin" /> Saving…</>
                : <><Save />Save as Draft</>}
            </Button>
            <Button variant="accent" onClick={() => void saveAndPost()} disabled={form.formState.isSubmitting || overAllocated}>
              {posting
                ? <><Loader2 className="size-4 animate-spin" /> Posting…</>
                : <><CheckCircle2 />Save &amp; Post</>}
            </Button>
          </>
        }
      />

      <Form {...form}>
        <form onSubmit={(ev) => { ev.preventDefault(); void saveDraft(); }} className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl" noValidate>
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Voucher Type <span className="text-danger">*</span></h3>
                <FormField control={form.control} name="voucherTypeId" render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {lookups?.voucherTypes.map((v) => {
                        const Icon = TYPE_ICON[v.code] ?? Banknote;
                        const active = Number(field.value) === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => field.onChange(v.id)}
                            className={cn(
                              "p-3 rounded-lg border-2 text-left transition-colors",
                              active ? "border-brand-yellow bg-brand-yellow/5" : "border-slate-200 dark:border-navy-700 hover:border-slate-300"
                            )}
                          >
                            <Icon className={cn("size-4", active ? "text-brand-yellow" : "text-slate-400")} />
                            <div className="text-2xs font-bold mt-2">{v.code}</div>
                            <div className="text-xs text-slate-600 dark:text-slate-300">{v.name}</div>
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  {!isJournalVoucher && (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>{isReceipt ? "Customer" : "Supplier"}</FormLabel>
                      {party ? (
                        <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-navy-700 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Avatar initials={initialsOf(party.name)} size="sm" />
                            <div>
                              <div className="text-sm font-medium">{party.name}</div>
                              <div className="text-2xs tabular text-slate-500 dark:text-slate-400">{party.code}</div>
                            </div>
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => { setValue("partyId", 0); setAllocations({}); }}>
                            Change
                          </Button>
                        </div>
                      ) : (
                        <Popover open={partyOpen} onOpenChange={setPartyOpen}>
                          <PopoverTrigger asChild>
                            <button type="button" className="w-full p-3 border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg text-sm text-slate-500 text-left hover:border-brand-yellow">
                              <Search className="size-4 inline-block mr-2" />
                              Search {isReceipt ? "customer" : "supplier"}…
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[420px] p-0">
                            <Command>
                              <CommandInput placeholder="Type name…" />
                              <CommandList>
                                <CommandEmpty>None found.</CommandEmpty>
                                <CommandGroup>
                                  {partyOptions.map((p) => (
                                    <CommandItem key={p.id} value={`${p.name} ${p.code}`} onSelect={() => { setValue("partyId", p.id); setAllocations({}); setPartyOpen(false); }}>
                                      <Avatar initials={initialsOf(p.name)} size="sm" />
                                      <span className="text-sm">{p.name}</span>
                                      <span className="text-2xs tabular text-slate-400 ml-auto">{p.code}</span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      )}
                      <FormDescription>
                        Optional — leave empty for a voucher that is not against anyone&apos;s account.
                      </FormDescription>
                    </FormItem>
                  )}

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
                  <FormField control={form.control} name="cashBankAccountId" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel required>{isReceipt ? "Received into" : "Paid from"}</FormLabel>
                      <FormControl>
                        <SelectNative {...field}>
                          {cashBankAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
                        </SelectNative>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {method && (method.kind === "bank") && (
                    <>
                      <FormField control={form.control} name="paymentProvider" render={({ field }) => (
                        <FormItem><FormLabel>Bank name</FormLabel><FormControl><Input placeholder="HBL / Meezan / UBL" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="reference" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{method.key === "CHEQUE" ? "Cheque #" : "Txn reference"}</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </>
                  )}
                  {method && method.kind === "wallet" && (
                    <FormField control={form.control} name="walletTxnId" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Wallet Txn ID</FormLabel>
                        <FormControl><Input placeholder="EP-… / JC-…" {...field} /></FormControl>
                        <FormDescription>From the wallet provider&apos;s confirmation</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                  {method && method.kind === "cash" && (
                    <FormField control={form.control} name="reference" render={({ field }) => (
                      <FormItem className="sm:col-span-2"><FormLabel>Reference</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  )}

                  <FormField control={form.control} name="narration" render={({ field }) => (
                    <FormItem className="sm:col-span-2"><FormLabel required>Narration</FormLabel><FormControl><Textarea rows={2} placeholder="What this voucher is for" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </CardBody>
            </Card>

            {!isJournalVoucher && partyId > 0 && (
              <Card>
                <CardBody>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-navy-900 dark:text-white">
                      Set against {isReceipt ? "invoices" : "bills"}
                    </h3>
                    <span className={cn("text-xs tabular font-semibold", overAllocated ? "text-danger" : "text-slate-500 dark:text-slate-400")}>
                      {overAllocated
                        ? `Over by ${formatMoney(Math.abs(unallocated))}`
                        : `Unallocated ${formatMoney(unallocated)}`}
                    </span>
                  </div>

                  {invoicesLoading ? (
                    <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
                  ) : openInvoices.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Nothing outstanding for {party?.name ?? "this party"}. The voucher can still be
                      recorded — it simply sits on their account.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {openInvoices.map((inv) => (
                        <div key={inv.id} className="flex items-center gap-3 p-3 border border-slate-200 dark:border-navy-700 rounded-lg">
                          <div className="min-w-0 flex-1">
                            <div className="tabular text-sm font-medium text-navy-900 dark:text-white">{inv.invoiceNo}</div>
                            <div className="text-2xs text-slate-500 dark:text-slate-400">
                              Due {formatDate(inv.dueDate)} · {formatMoney(inv.balance)} outstanding of {formatMoney(inv.total)}
                            </div>
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => fillInvoice(inv)}>
                            Fill
                          </Button>
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            max={inv.balance}
                            aria-label={`Amount against ${inv.invoiceNo}`}
                            className="w-32 text-right tabular"
                            value={allocations[inv.id] ?? ""}
                            onChange={(ev) => setAllocation(inv.id, Number(ev.target.value))}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            )}
          </div>

          <div>
            <Card className={cn("lg:sticky lg:top-20", isReceipt ? "border-success/30" : "border-danger/30")}>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">{type?.name ?? "Voucher"}</h3>
                <div className="text-3xl tabular font-bold mt-1">
                  <span className={isReceipt ? "text-success" : "text-danger"}>
                    {isReceipt ? "+" : "-"}{formatMoney(amount)}
                  </span>
                </div>
                {method && <Badge variant="muted" className="mt-2">{method.name}</Badge>}

                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-navy-700">
                  <div className="text-2xs uppercase font-semibold text-slate-500">Posting</div>
                  <div className="text-xs font-mono mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                    {isReceipt ? (
                      <>
                        <div>DR &nbsp;{cashBankAccounts.find((a) => a.id === Number(form.watch("cashBankAccountId")))?.name ?? "Cash / Bank"} &nbsp;{formatMoney(amount)}</div>
                        <div>CR &nbsp;Accounts Receivable &nbsp;{formatMoney(amount)}</div>
                      </>
                    ) : (
                      <>
                        <div>DR &nbsp;Accounts Payable &nbsp;{formatMoney(amount)}</div>
                        <div>CR &nbsp;{cashBankAccounts.find((a) => a.id === Number(form.watch("cashBankAccountId")))?.name ?? "Cash / Bank"} &nbsp;{formatMoney(amount)}</div>
                      </>
                    )}
                  </div>
                  <p className="text-2xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
                    A draft records the voucher without touching the ledger. Posting
                    writes the entry above and clears whatever it was set against.
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
