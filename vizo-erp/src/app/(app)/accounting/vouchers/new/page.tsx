"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Save, ArrowLeft, Loader2, Banknote, Landmark, Smartphone, ArrowDownToLine, ArrowUpFromLine, FileText, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { vizoResolver } from "@/lib/zod-resolver";
import { parties } from "@/data/parties";
import { activeLocations } from "@/data/settings";
import { toast } from "@/components/ui/toaster";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { defaultLocation } from "@/data/settings";

const VOUCHER_TYPES = [
  { code: "CR", name: "Cash Receipt",   isReceipt: true,  paymentMethod: "CASH",      icon: ArrowDownToLine },
  { code: "CP", name: "Cash Payment",   isReceipt: false, paymentMethod: "CASH",      icon: ArrowUpFromLine },
  { code: "BR", name: "Bank Receipt",   isReceipt: true,  paymentMethod: "BANK",      icon: Landmark },
  { code: "BP", name: "Bank Payment",   isReceipt: false, paymentMethod: "BANK",      icon: Landmark },
  { code: "WR", name: "Wallet Receipt", isReceipt: true,  paymentMethod: "JAZZCASH",  icon: Smartphone },
  { code: "WP", name: "Wallet Payment", isReceipt: false, paymentMethod: "JAZZCASH",  icon: Smartphone },
  { code: "JV", name: "Journal Voucher",isReceipt: false, paymentMethod: "CASH",      icon: FileText },
] as const;

const Schema = z.object({
  type: z.enum(["CR", "CP", "BR", "BP", "WR", "WP", "JV"]),
  date: z.string().min(1),
  locationId: z.coerce.number().positive(),
  partyType: z.enum(["CUSTOMER", "SUPPLIER", "ACCOUNT", "EMPLOYEE"]),
  partyId: z.coerce.number({ message: "Pick a party" }).positive("Pick a party"),
  amount: z.coerce.number().positive("Amount > 0"),
  paymentMethod: z.enum(["CASH", "BANK", "EASYPAISA", "JAZZCASH", "CHEQUE"]),
  paymentProvider: z.string().optional().or(z.literal("")),
  reference: z.string().optional().or(z.literal("")),
  walletTxnId: z.string().optional().or(z.literal("")),
  narration: z.string().min(5).max(500),
});
type Form = z.infer<typeof Schema>;

export default function NewVoucherPage() {
  const router = useRouter();
  const [partyOpen, setPartyOpen] = React.useState(false);
  const form = useForm<Form>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      type: "CR",
      date: new Date().toISOString().slice(0, 10),
      locationId: defaultLocation().id,
      partyType: "CUSTOMER",
      partyId: 0 as unknown as number,
      amount: 0,
      paymentMethod: "CASH",
      paymentProvider: "",
      reference: "",
      walletTxnId: "",
      narration: "",
    },
  });

  const type = form.watch("type");
  const partyType = form.watch("partyType");
  const partyId = form.watch("partyId");
  const method = form.watch("paymentMethod");
  const amount = form.watch("amount");

  const meta = VOUCHER_TYPES.find((v) => v.code === type)!;
  const isReceipt = meta.isReceipt;

  React.useEffect(() => {
    form.setValue("paymentMethod", meta.paymentMethod as Form["paymentMethod"]);
    if (type === "CR" || type === "BR" || type === "WR") form.setValue("partyType", "CUSTOMER");
    else if (type === "CP" || type === "BP" || type === "WP") form.setValue("partyType", "SUPPLIER");
    else form.setValue("partyType", "ACCOUNT");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const partyOptions = parties.filter((p) =>
    partyType === "CUSTOMER" ? (p.type === "CUSTOMER" || p.type === "BOTH") :
    partyType === "SUPPLIER" ? (p.type === "SUPPLIER" || p.type === "BOTH") : true
  );
  const party = parties.find((p) => p.id === partyId);

  async function onSubmit(_d: Form) {
    await new Promise((r) => setTimeout(r, 600));
    toast.success("Voucher created", { description: `${meta.name} for ${formatMoney(amount)}` });
    router.push("/accounting/vouchers");
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Vouchers", href: "/accounting/vouchers" }, { label: "New Voucher" }]}
        title={<><meta.icon className="size-6 inline-block mr-2 text-brand-yellow" />New Voucher</>}
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/accounting/vouchers"><ArrowLeft />Back</Link></Button>
            <Button variant="accent" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save />Save & Post</>}
            </Button>
          </>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl" noValidate>
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Voucher Type <span className="text-danger">*</span></h3>
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {VOUCHER_TYPES.map((v) => {
                        const Icon = v.icon;
                        const active = field.value === v.code;
                        return (
                          <button key={v.code} type="button" onClick={() => field.onChange(v.code)}
                            className={cn("p-3 rounded-lg border-2 text-left transition-colors",
                              active ? "border-brand-yellow bg-brand-yellow/5" : "border-slate-200 dark:border-navy-700 hover:border-slate-300"
                            )}>
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
                  <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem><FormLabel required>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="locationId" render={({ field }) => (
                    <FormItem><FormLabel required>Location</FormLabel><FormControl>
                      <SelectNative {...field}>{activeLocations().map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</SelectNative>
                    </FormControl><FormMessage /></FormItem>
                  )} />

                  {type !== "JV" && (
                    <FormItem className="sm:col-span-2">
                      <FormLabel required>{partyType === "CUSTOMER" ? "Customer" : "Supplier"}</FormLabel>
                      {party ? (
                        <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-navy-700 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Avatar initials={party.initials} size="sm" />
                            <span className="text-sm font-medium">{party.legalName}</span>
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => form.setValue("partyId", 0 as unknown as number)}>Change</Button>
                        </div>
                      ) : (
                        <Popover open={partyOpen} onOpenChange={setPartyOpen}>
                          <PopoverTrigger asChild>
                            <button type="button" className="w-full p-3 border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg text-sm text-slate-500 text-left hover:border-brand-yellow"><Search className="size-4 inline-block mr-2" />Search {partyType.toLowerCase()}…</button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[420px] p-0">
                            <Command><CommandInput placeholder="Type name…" /><CommandList><CommandEmpty>None found.</CommandEmpty><CommandGroup>
                              {partyOptions.map((p) => (
                                <CommandItem key={p.id} value={p.legalName} onSelect={() => { form.setValue("partyId", p.id); setPartyOpen(false); }}>
                                  <Avatar initials={p.initials} size="sm" />
                                  <span className="text-sm">{p.legalName}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup></CommandList></Command>
                          </PopoverContent>
                        </Popover>
                      )}
                      <FormField control={form.control} name="partyId" render={() => <FormMessage />} />
                    </FormItem>
                  )}

                  <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem><FormLabel required>Amount (PKR)</FormLabel><FormControl><Input type="number" step="0.01" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                    <FormItem><FormLabel required>Method</FormLabel><FormControl>
                      <SelectNative {...field}>
                        <option>CASH</option><option>BANK</option><option>EASYPAISA</option><option>JAZZCASH</option><option>CHEQUE</option>
                      </SelectNative>
                    </FormControl><FormMessage /></FormItem>
                  )} />

                  {(method === "BANK" || method === "CHEQUE") && (
                    <>
                      <FormField control={form.control} name="paymentProvider" render={({ field }) => (
                        <FormItem><FormLabel>Bank name</FormLabel><FormControl><Input placeholder="HBL / Meezan / UBL" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="reference" render={({ field }) => (
                        <FormItem><FormLabel>{method === "CHEQUE" ? "Cheque #" : "Txn reference"}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </>
                  )}
                  {(method === "EASYPAISA" || method === "JAZZCASH") && (
                    <FormField control={form.control} name="walletTxnId" render={({ field }) => (
                      <FormItem className="sm:col-span-2"><FormLabel required>Wallet Txn ID</FormLabel><FormControl><Input placeholder="EP-... / JC-..." {...field} /></FormControl><FormDescription>From wallet provider&apos;s confirmation</FormDescription><FormMessage /></FormItem>
                    )} />
                  )}

                  <FormField control={form.control} name="narration" render={({ field }) => (
                    <FormItem className="sm:col-span-2"><FormLabel required>Narration</FormLabel><FormControl><Textarea rows={2} placeholder="Description for the journal entry" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </CardBody>
            </Card>
          </div>

          <div>
            <Card className={cn("lg:sticky lg:top-20", isReceipt ? "border-success/30" : "border-danger/30")}>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">{meta.name}</h3>
                <div className="text-3xl tabular font-bold mt-1">
                  <span className={isReceipt ? "text-success" : "text-danger"}>{isReceipt ? "+" : "-"}{formatMoney(amount)}</span>
                </div>
                <Badge variant="muted" className="mt-2">{method}</Badge>

                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-navy-700">
                  <div className="text-2xs uppercase font-semibold text-slate-500">Posting</div>
                  <div className="text-xs font-mono mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                    {isReceipt ? (
                      <>
                        <div>DR &nbsp;{method} &nbsp;{formatMoney(amount)}</div>
                        <div>CR &nbsp;Accounts Receivable</div>
                      </>
                    ) : (
                      <>
                        <div>DR &nbsp;Accounts Payable &nbsp;{formatMoney(amount)}</div>
                        <div>CR &nbsp;{method}</div>
                      </>
                    )}
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
