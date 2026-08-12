"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, type Control } from "react-hook-form";
import { z } from "zod";
import { Save, ArrowLeft, Loader2, Package, Search, Truck, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { vizoResolver } from "@/lib/zod-resolver";
import { purchaseOrders } from "@/data/purchases";
import { activeLocations } from "@/data/settings";
import { toast } from "@/components/ui/toaster";
import { formatMoney, formatDate } from "@/lib/format";

const SAMPLE_PO_LINES = [
  { poItemId: 1, sku: "VZ-TIT-T9-BLK",   name: "VIZO Titan T9 Earbuds", ordered: 100, alreadyReceived: 0, unitCost: 580 },
  { poItemId: 2, sku: "VZ-VLT-65W-PD",   name: "VIZO VOLT 65W Charger", ordered: 80,  alreadyReceived: 0, unitCost: 1480 },
  { poItemId: 3, sku: "VZ-VR-TC-1.5M",   name: "VIZO VR Type-C Cable",  ordered: 60,  alreadyReceived: 0, unitCost: 95 },
];

const ItemSchema = z.object({
  poItemId: z.number(),
  sku: z.string(),
  name: z.string(),
  ordered: z.number(),
  alreadyReceived: z.number(),
  qtyReceived: z.coerce.number().min(0),
  qtyDamaged: z.coerce.number().min(0),
  batchNo: z.string().max(50).optional().or(z.literal("")),
  expiryDate: z.string().optional().or(z.literal("")),
}).refine((d) => d.qtyReceived + d.qtyDamaged + d.alreadyReceived <= d.ordered, { message: "Total exceeds ordered qty", path: ["qtyReceived"] });

const Schema = z.object({
  poId: z.coerce.number({ message: "Pick a PO" }).positive(),
  locationId: z.coerce.number().positive(),
  receiptDate: z.string().min(1),
  deliveryNoteNo: z.string().min(1, "Delivery note no. required"),
  vehicleNo: z.string().optional().or(z.literal("")),
  items: z.array(ItemSchema)
    .refine((items) => items.some((i) => i.qtyReceived > 0 || i.qtyDamaged > 0), { message: "Receive at least one item" }),
  notes: z.string().max(500).optional(),
});
type Form = z.infer<typeof Schema>;

export default function NewGRNPage() {
  const router = useRouter();
  const [pickPO, setPickPO] = React.useState(false);

  const form = useForm<Form>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      poId: 0 as unknown as number,
      locationId: activeLocations()[0]?.id ?? 1,
      receiptDate: new Date().toISOString().slice(0, 10),
      deliveryNoteNo: "",
      vehicleNo: "",
      items: [],
      notes: "",
    },
  });
  const { fields, replace } = useFieldArray({ control: form.control, name: "items" });

  const poId = form.watch("poId");
  const items = form.watch("items");
  const po = purchaseOrders.find((p) => p.id === poId);

  const totalAccepted = items.reduce((s, i) => s + i.qtyReceived, 0);
  const totalDamaged  = items.reduce((s, i) => s + i.qtyDamaged, 0);
  const totalValue    = items.reduce((s, i) => s + (i.qtyReceived + i.qtyDamaged) * (SAMPLE_PO_LINES.find((l) => l.poItemId === i.poItemId)?.unitCost ?? 0), 0);

  function pickPo(id: number) {
    form.setValue("poId", id);
    replace(SAMPLE_PO_LINES.map((l) => ({ ...l, qtyReceived: 0, qtyDamaged: 0, batchNo: "", expiryDate: "" })));
    setPickPO(false);
  }

  async function onSubmit(_d: Form) {
    await new Promise((r) => setTimeout(r, 700));
    toast.success("GRN draft created", { description: `Will post stock when finalized. Damaged: ${totalDamaged} units flagged.` });
    router.push("/purchases/grns");
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Purchases" }, { label: "GRNs", href: "/purchases/grns" }, { label: "New GRN" }]}
        title={<><Package className="size-6 inline-block mr-2 text-brand-yellow" />Goods Receipt Note</>}
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/purchases/grns"><ArrowLeft />Back</Link></Button>
            <Button variant="accent" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save />Save Draft</>}
            </Button>
          </>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6" noValidate>
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Source PO <span className="text-danger">*</span></h3>
                {po ? (
                  <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-navy-700 rounded-lg">
                    <div>
                      <div className="tabular text-base font-bold text-navy-900 dark:text-white">{po.poNo}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{po.supplierName} · Expected {formatDate(po.expectedDate)}</div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => { form.setValue("poId", 0 as unknown as number); replace([]); }}>Change</Button>
                  </div>
                ) : (
                  <Popover open={pickPO} onOpenChange={setPickPO}>
                    <PopoverTrigger asChild>
                      <button type="button" className="w-full p-3 border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg text-sm text-slate-500 dark:text-slate-400 text-left hover:border-brand-yellow transition-colors">
                        <Search className="size-4 inline-block mr-2" />Search approved/in-progress PO…
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[500px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Type PO number…" />
                        <CommandList>
                          <CommandEmpty>No PO found.</CommandEmpty>
                          <CommandGroup>
                            {purchaseOrders.filter((p) => p.status === "APPROVED" || p.status === "PARTIALLY_RECEIVED").map((p) => (
                              <CommandItem key={p.id} value={`${p.poNo} ${p.supplierName}`} onSelect={() => pickPo(p.id)}>
                                <Truck className="size-3 text-slate-400" />
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-navy-900 dark:text-white">{p.poNo}</div>
                                  <div className="text-2xs text-slate-500 dark:text-slate-400">{p.supplierName}</div>
                                </div>
                                <span className="tabular text-2xs text-slate-500 dark:text-slate-400">{formatMoney(p.total)}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
                <FormField control={form.control} name="poId" render={() => <FormMessage />} />
              </CardBody>
            </Card>

            {fields.length > 0 && (
              <>
                <Card>
                  <CardBody>
                    <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Receipt Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="receiptDate" render={({ field }) => (
                        <FormItem><FormLabel required>Receipt date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="locationId" render={({ field }) => (
                        <FormItem><FormLabel required>Receiving location</FormLabel><FormControl>
                          <SelectNative {...field}>{activeLocations().map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</SelectNative>
                        </FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="deliveryNoteNo" render={({ field }) => (
                        <FormItem><FormLabel required>Supplier DN #</FormLabel><FormControl><Input placeholder="e.g. SEH-2026-0419" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="vehicleNo" render={({ field }) => (
                        <FormItem><FormLabel>Vehicle No.</FormLabel><FormControl><Input placeholder="BHN-882" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardBody>
                    <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Items Received</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Per-line: enter accepted qty + any damaged qty. Damaged units go to the damaged-goods location and a debit-note suggestion is created.</p>
                    <div className="space-y-3">
                      {fields.map((f, i) => <GRNRow key={f.id} idx={i} control={form.control} />)}
                    </div>
                    <FormField control={form.control} name="items" render={() => <FormMessage />} />
                  </CardBody>
                </Card>

                <Card>
                  <CardBody>
                    <FormField control={form.control} name="notes" render={({ field }) => (
                      <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea rows={2} placeholder="e.g. Goods inspected, packaging intact" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </CardBody>
                </Card>
              </>
            )}
          </div>

          <div>
            <Card className="lg:sticky lg:top-20">
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Summary</h3>
                <div className="space-y-2 text-sm">
                  <RowKV label="Lines" v={`${fields.length}`} />
                  <RowKV label="Accepted units" v={`${totalAccepted}`} colorClass={totalAccepted > 0 ? "text-success" : ""} />
                  <RowKV label="Damaged units"  v={`${totalDamaged}`}  colorClass={totalDamaged > 0 ? "text-danger" : ""} />
                  <div className="pt-2 border-t border-slate-200 dark:border-navy-700">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-navy-900 dark:text-white">Stock value</span>
                      <span className="tabular text-base font-bold text-navy-900 dark:text-white">{formatMoney(totalValue)}</span>
                    </div>
                  </div>
                </div>
                {totalDamaged > 0 && (
                  <div className="mt-4 p-3 bg-warning/5 border border-warning/30 rounded-lg flex items-start gap-2 text-xs text-warning-dark dark:text-warning-light">
                    <AlertTriangle className="size-3.5 flex-shrink-0 mt-0.5" />
                    <span>Damaged items will trigger a debit note to the supplier on posting.</span>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </form>
      </Form>
    </>
  );
}

function GRNRow({ idx, control }: { idx: number; control: Control<Form> }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-start p-3 border border-slate-200 dark:border-navy-700 rounded-lg">
      <FormField control={control} name={`items.${idx}.name`} render={({ field }) => (
        <div className="col-span-12 sm:col-span-4">
          <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{field.value}</div>
          <FormField control={control} name={`items.${idx}.ordered`} render={({ field: og }) => (
            <FormField control={control} name={`items.${idx}.sku`} render={({ field: f }) => (
              <div className="text-2xs tabular text-slate-500 mt-0.5">{f.value} · Ordered {og.value}</div>
            )} />
          )} />
        </div>
      )} />
      <FormField control={control} name={`items.${idx}.qtyReceived`} render={({ field }) => (
        <FormItem className="col-span-3 sm:col-span-2"><FormLabel className="text-2xs">Accepted</FormLabel><FormControl><Input type="number" min={0} placeholder="0" className="text-right tabular" {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={control} name={`items.${idx}.qtyDamaged`} render={({ field }) => (
        <FormItem className="col-span-3 sm:col-span-2"><FormLabel className="text-2xs">Damaged</FormLabel><FormControl><Input type="number" min={0} placeholder="0" className="text-right tabular" {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={control} name={`items.${idx}.batchNo`} render={({ field }) => (
        <FormItem className="col-span-3 sm:col-span-2"><FormLabel className="text-2xs">Batch</FormLabel><FormControl><Input placeholder="e.g. 2026-04" {...field} /></FormControl></FormItem>
      )} />
      <FormField control={control} name={`items.${idx}.expiryDate`} render={({ field }) => (
        <FormItem className="col-span-3 sm:col-span-2"><FormLabel className="text-2xs">Expiry</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
      )} />
    </div>
  );
}

function RowKV({ label, v, colorClass }: { label: string; v: string; colorClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`tabular font-medium text-navy-900 dark:text-white ${colorClass ?? ""}`}>{v}</span>
    </div>
  );
}
