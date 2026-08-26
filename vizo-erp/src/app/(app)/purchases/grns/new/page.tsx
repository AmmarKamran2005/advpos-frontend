"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, type Control } from "react-hook-form";
import { z } from "zod";
import { Save, ArrowLeft, Loader2, Package, Search, Truck, AlertTriangle , AlertCircle, RefreshCw } from "lucide-react";
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
import axios from "axios";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/* GET /purchases/orders -> the POs that can still be received against, and
   GET /purchases/orders/{id} -> that order's real lines. Both used to be
   hard-coded: the PO picker read a frozen array and every PO opened the SAME
   three sample lines, whichever order you chose. */
type OpenPo = {
  id: number; poNo: string; supplierId: number; supplierName: string;
  status: string; total: number; locationId?: number;
};
type PoDetailLine = {
  id: number; productId: number; sku: string; name: string;
  qty: number; unitCost: number; received: number;
};
type PoDetail = {
  id: number; poNo: string; supplierId: number; supplierName: string;
  locationId: number; expectedDate: string | null; lines: PoDetailLine[];
};
type LookupLocation = { id: number; code: string; name: string };

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}
import { toast } from "@/components/ui/toaster";
import { formatMoney, formatDate } from "@/lib/format";

const ItemSchema = z.object({
  poItemId: z.number(),
  productId: z.coerce.number().positive(),
  sku: z.string(),
  name: z.string(),
  unitCost: z.coerce.number().nonnegative(),
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

  const [openPos, setOpenPos] = React.useState<OpenPo[]>([]);
  const [locations, setLocations] = React.useState<LookupLocation[]>([]);
  const [po, setPo] = React.useState<PoDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingPo, setLoadingPo] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<Form>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      poId: 0 as unknown as number,
      locationId: 0,
      receiptDate: new Date().toISOString().slice(0, 10),
      deliveryNoteNo: "",
      vehicleNo: "",
      items: [],
      notes: "",
    },
  });
  const { fields, replace } = useFieldArray({ control: form.control, name: "items" });

  const items = form.watch("items");

  const load = React.useCallback(async () => {
    try {
      const [orders, lookups] = await Promise.all([
        axios.get<OpenPo[] | { items: OpenPo[] }>(`${API_BASE_URL}/purchases/orders`, { headers: authHeader() }),
        axios.get<{ locations: LookupLocation[] }>(`${API_BASE_URL}/purchases/lookups`, { headers: authHeader() }),
      ]);
      const rows = Array.isArray(orders.data) ? orders.data : orders.data.items;
      /* Only what can still be received against. A DRAFT order has not been
         agreed and a RECEIVED one is finished. */
      setOpenPos(rows.filter((o) => o.status === "APPROVED" || o.status === "PARTIALLY_RECEIVED"));
      setLocations(lookups.data.locations ?? []);
      form.setValue("locationId", lookups.data.locations?.[0]?.id ?? 0);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load open purchase orders."));
    } finally {
      setLoading(false);
    }
  }, [form]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. */
    void load();
  }, [load]);

  const totalAccepted = items.reduce((s, i) => s + (Number(i.qtyReceived) || 0), 0);
  const totalDamaged  = items.reduce((s, i) => s + (Number(i.qtyDamaged) || 0), 0);
  const totalValue    = items.reduce(
    (s, i) => s + ((Number(i.qtyReceived) || 0) + (Number(i.qtyDamaged) || 0)) * (Number(i.unitCost) || 0), 0);

  /** Reads the chosen order and seeds one row per line still outstanding. */
  async function pickPo(id: number) {
    setPickPO(false);
    setLoadingPo(true);
    try {
      const res = await axios.get<PoDetail>(`${API_BASE_URL}/purchases/orders/${id}`, { headers: authHeader() });
      setPo(res.data);
      form.setValue("poId", id);
      if (res.data.locationId) form.setValue("locationId", res.data.locationId);
      replace(res.data.lines.map((l) => ({
        poItemId: l.id,
        alreadyReceived: l.received,
        productId: l.productId,
        sku: l.sku,
        name: l.name,
        unitCost: l.unitCost,
        ordered: l.qty,
        /* Default to whatever is still outstanding on the line -- the common
           case is the rest of the order turning up. */
        qtyReceived: Math.max(0, l.qty - l.received),
        qtyDamaged: 0,
        batchNo: "",
        expiryDate: "",
      })));
    } catch (e) {
      toast.error("Could not open that purchase order", { description: apiMessage(e, "Please try again.") });
    } finally {
      setLoadingPo(false);
    }
  }

  async function onSubmit(d: Form) {
    if (!po) { toast.error("Pick a purchase order first."); return; }
    const lines = d.items.filter((i) => (Number(i.qtyReceived) || 0) + (Number(i.qtyDamaged) || 0) > 0);
    if (lines.length === 0) {
      toast.error("Nothing to receive", { description: "Enter a received or damaged quantity on at least one line." });
      return;
    }
    try {
      const res = await axios.post<{ id: number; message: string }>(
        `${API_BASE_URL}/purchases/grns`,
        {
          poId: d.poId,
          supplierId: po.supplierId,
          locationId: d.locationId,
          receiptDate: d.receiptDate,
          deliveryNoteNo: d.deliveryNoteNo.trim(),
          vehicleNo: d.vehicleNo?.trim() || null,
          notes: d.notes?.trim() || null,
          lines: lines.map((i) => ({
            productId: i.productId,
            qtyReceived: Number(i.qtyReceived) || 0,
            qtyDamaged: Number(i.qtyDamaged) || 0,
            unitCost: Number(i.unitCost) || 0,
            batchNo: i.batchNo?.trim() || null,
            expiryDate: i.expiryDate || null,
          })),
        },
        { headers: authHeader() }
      );
      toast.success("Goods receipt created", { description: res.data.message });
      router.push(`/purchases/grns/${res.data.id}`);
    } catch (e) {
      toast.error("Goods receipt not created", { description: apiMessage(e, "Please try again.") });
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Purchases" }, { label: "GRNs", href: "/purchases/grns" }, { label: "New GRN" }]}
        title={<><Package className="size-6 inline-block mr-2 text-brand-yellow" />Goods Receipt Note</>}
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/purchases/grns"><ArrowLeft />Back</Link></Button>
            <Button variant="accent" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting || loading || loadingPo}>
              {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save />Save Draft</>}
            </Button>
          </>
        }
      />

      {error && (
        <Card className="mb-6">
          <CardBody className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-navy-900 dark:text-white">{error}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">The API must be running on {API_BASE_URL}.</div>
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setLoading(true); void load(); }}>
              <RefreshCw className="size-4" /> Try again
            </Button>
          </CardBody>
        </Card>
      )}

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
                      <div className="text-xs text-slate-500 dark:text-slate-400">{po.supplierName} · Expected {po.expectedDate ? formatDate(po.expectedDate) : "—"}</div>
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
                            {openPos.map((p) => (
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
                          {loading ? <Skeleton className="h-10" /> : (
                            <SelectNative {...field}>{locations.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</SelectNative>
                          )}
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
