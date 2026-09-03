"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { vizoResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import axios from "axios";
import {
  Save, X, Plus, Trash2, Loader2, AlertCircle, RefreshCw, AlertTriangle, FileText,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney } from "@/lib/format";

/* ───────────────────────────────────────────────────────────────────────────
   EDITING AN ORDER

   Only the Super Admin gets here on their own. A salesperson has to ask, the
   owner approves, and the approval is a ONE-SHOT key: it is spent the moment
   this form saves. The API enforces all of that -- PUT /sales/orders/{id}
   checks it again on the way in, because a button this page chose not to draw
   is not a rule.

   THE INVOICE FOLLOWS. If the order has been billed, the API rebuilds that
   invoice's lines and totals from the edited order and throws away the stored
   PDF so the next print is the new figures. That is the whole reason editing
   an invoiced order is allowed at all: the alternative is a bill that quietly
   disagrees with the order it came from.

   Deliberately not a wizard. The three-step flow on /sales/orders/new is right
   for taking an order over the phone; somebody correcting a quantity wants one
   screen with the mistake on it.
   ─────────────────────────────────────────────────────────────────────────── */

type LookupProduct = {
  id: number; sku: string; name: string; packing: number;
  salePrice: number; costPrice: number; taxRatePercent: number; totalStock: number;
};

type Lookups = {
  locations: { id: number; code: string; name: string; kind: string; isSellable: boolean }[];
  paymentMethods: { id: number; key: string; name: string; kind: string }[];
  salesPeople: { id: number; name: string }[];
  customers: { id: number; code: string; name: string; city: string }[];
  products: LookupProduct[];
  defaultTaxPercent: number;
};

type OrderLine = {
  id: number; lineNo: number; productId: number; name: string; sku: string;
  qty: number; rate: number; discountPercent: number; taxPercent: number; lineTotal: number;
};

type OrderDetail = {
  id: number; orderNo: string; status: string; statusName: string;
  customerId: number; customerName: string;
  locationId: number; methodId: number;
  orderDate: string; deliveryDate: string | null;
  notes: string | null;
  invoiceId: number | null; invoiceNo: string | null;
  lines: OrderLine[];
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

const ItemSchema = z.object({
  productId: z.coerce.number().positive("Pick a product"),
  name: z.string(),
  sku: z.string(),
  qty: z.coerce.number().positive("Qty > 0").max(99999, "Too large"),
  unitPrice: z.coerce.number().nonnegative("Cannot be negative"),
  discount: z.coerce.number().min(0).max(100, "Max 100%"),
  taxPercent: z.coerce.number().min(0).max(100),
});

const Schema = z.object({
  customerId: z.coerce.number().positive("Pick a customer"),
  locationId: z.coerce.number().positive("Pick a location"),
  methodId: z.coerce.number().positive("Pick a payment method"),
  deliveryDate: z.string().min(1, "Delivery date required"),
  items: z.array(ItemSchema).min(1, "An order needs at least one line"),
  notes: z.string().max(500, "Max 500 characters").optional(),
});

type FormValues = z.infer<typeof Schema>;

export default function EditOrderPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "", 10);
  const router = useRouter();

  const [order, setOrder] = React.useState<OrderDetail | null>(null);
  const [lookups, setLookups] = React.useState<Lookups | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [adding, setAdding] = React.useState("");

  const form = useForm<FormValues>({
    resolver: vizoResolver(Schema),
    mode: "onChange",
    defaultValues: {
      customerId: 0, locationId: 0, methodId: 0,
      deliveryDate: "", items: [], notes: "",
    },
  });

  const load = React.useCallback(async () => {
    if (!Number.isFinite(id)) { setLoading(false); return; }
    try {
      const [o, l] = await Promise.all([
        axios.get<OrderDetail>(`${API_BASE_URL}/sales/orders/${id}`, { headers: authHeader() }),
        axios.get<Lookups>(`${API_BASE_URL}/sales/lookups`, { headers: authHeader() }),
      ]);

      setOrder(o.data);
      setLookups(l.data);

      form.reset({
        customerId: o.data.customerId,
        locationId: o.data.locationId,
        methodId: o.data.methodId,
        /* The order date is deliberately absent from this form. Changing when
           an order was placed is rewriting history, not correcting a mistake,
           and the API refuses to move it. */
        deliveryDate: o.data.deliveryDate ?? o.data.orderDate,
        notes: o.data.notes ?? "",
        items: o.data.lines.map((ln) => ({
          productId: ln.productId,
          name: ln.name,
          sku: ln.sku,
          qty: ln.qty,
          unitPrice: ln.rate,
          discount: ln.discountPercent,
          taxPercent: ln.taxPercent,
        })),
      });

      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load this order."));
    } finally {
      setLoading(false);
    }
  }, [id, form]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const items = form.watch("items");

  /* The same arithmetic the API runs on the way in: discount per line, then
     tax on what is left. Anything else and this screen promises a total the
     invoice will not honour. */
  const subtotal = items.reduce((s, i) => s + (Number(i.unitPrice) || 0) * (Number(i.qty) || 0), 0);
  const discountAmount = items.reduce(
    (s, i) => s + (Number(i.unitPrice) || 0) * (Number(i.qty) || 0) * ((Number(i.discount) || 0) / 100), 0);
  const tax = items.reduce((s, i) => {
    const net = (Number(i.unitPrice) || 0) * (Number(i.qty) || 0) * (1 - (Number(i.discount) || 0) / 100);
    return s + net * ((Number(i.taxPercent) || 0) / 100);
  }, 0);
  const total = subtotal - discountAmount + tax;

  function addProduct(productId: number) {
    const p = lookups?.products.find((x) => x.id === productId);
    if (!p) return;
    append({
      productId: p.id,
      name: p.name,
      sku: p.sku,
      qty: 1,
      unitPrice: p.salePrice,
      discount: 0,
      taxPercent: p.taxRatePercent ?? lookups?.defaultTaxPercent ?? 0,
    });
    setAdding("");
  }

  async function onSubmit(d: FormValues) {
    setSaving(true);
    try {
      const res = await axios.put<{ message: string; invoiceNo?: string | null }>(
        `${API_BASE_URL}/sales/orders/${id}`,
        {
          customerId: d.customerId,
          locationId: d.locationId,
          salesPersonUserId: null,
          orderDate: null,
          deliveryDate: d.deliveryDate,
          dueDate: null,
          methodId: d.methodId,
          notes: d.notes ?? "",
          saveAsDraft: false,
          raiseInvoice: false,
          lines: d.items.map((i) => ({
            productId: Number(i.productId),
            qty: Number(i.qty),
            rate: Number(i.unitPrice),
            discountPercent: Number(i.discount),
            taxPercent: Number(i.taxPercent),
          })),
        },
        { headers: authHeader() }
      );
      toast.success("Order updated", { description: res.data.message });
      router.push(`/sales/orders/${id}`);
    } catch (e) {
      toast.error("Could not save the changes", { description: apiMessage(e, "Please try again.") });
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (error || !order || !lookups) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Could not open this order for editing"
        description={error ?? "The order could not be found."}
        action={
          <Button variant="accent" onClick={() => { setLoading(true); void load(); }}>
            <RefreshCw />
            Try again
          </Button>
        }
      />
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <PageHeader
          breadcrumbs={[
            { label: "Sales" },
            { label: "Orders", href: "/sales/orders" },
            { label: order.orderNo, href: `/sales/orders/${order.id}` },
            { label: "Edit" },
          ]}
          title={`Edit ${order.orderNo}`}
          subtitle={`${order.customerName} · currently ${order.statusName.toLowerCase()}`}
          actions={
            <>
              <Button variant="ghost" size="md" asChild>
                <Link href={`/sales/orders/${order.id}`}>
                  <X />
                  <span className="hidden sm:inline">Cancel</span>
                </Link>
              </Button>
              <Button type="submit" variant="accent" size="md" className="gap-1.5" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save />}
                Save changes
              </Button>
            </>
          }
        />

        {order.invoiceId && (
          <Card className="mb-6 bg-info/5 border-info/30">
            <CardBody>
              <div className="flex items-start gap-3">
                <FileText className="size-5 text-info flex-shrink-0 mt-0.5" />
                <div className="text-sm text-navy-900 dark:text-white">
                  <span className="font-semibold">
                    Invoice {order.invoiceNo} will be updated too.
                  </span>{" "}
                  <span className="text-slate-600 dark:text-slate-300">
                    Its lines and totals are rebuilt from what you save here and the
                    stored bill is thrown away, so the next print shows the new
                    figures. The invoice number does not change.
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardBody className="space-y-4">
                <h3 className="text-base font-semibold text-navy-900 dark:text-white">Order</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer</FormLabel>
                        <FormControl>
                          <SelectNative
                            value={String(field.value)}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          >
                            {lookups.customers.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} — {c.city}
                              </option>
                            ))}
                          </SelectNative>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="locationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serve from</FormLabel>
                        <FormControl>
                          <SelectNative
                            value={String(field.value)}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          >
                            {lookups.locations
                              .filter((l) => l.isSellable || l.id === order.locationId)
                              .map((l) => (
                                <option key={l.id} value={l.id}>
                                  {l.name}
                                </option>
                              ))}
                          </SelectNative>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="methodId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment</FormLabel>
                        <FormControl>
                          <SelectNative
                            value={String(field.value)}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          >
                            {lookups.paymentMethods.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </SelectNative>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deliveryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea rows={2} placeholder="Anything the order team should know…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardBody>
            </Card>

            <Card>
              <CardBody className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-navy-900 dark:text-white">Items</h3>
                  <div className="w-64">
                    <SelectNative
                      value={adding}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v) addProduct(Number(v));
                      }}
                      aria-label="Add an item"
                    >
                      <option value="">Add an item…</option>
                      {lookups.products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.sku}
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                </div>

                {fields.length === 0 && (
                  <div className="flex items-center gap-2 text-sm text-warning p-3 rounded-lg bg-warning/5 border border-warning/30">
                    <AlertTriangle className="size-4" />
                    An order needs at least one line.
                  </div>
                )}

                <div className="space-y-3">
                  {fields.map((f, idx) => (
                    <div
                      key={f.id}
                      className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg border border-slate-200 dark:border-navy-700"
                    >
                      <div className="col-span-12 sm:col-span-4">
                        <div className="text-sm font-medium text-navy-900 dark:text-white">
                          {items[idx]?.name}
                        </div>
                        <div className="text-2xs tabular text-slate-500">{items[idx]?.sku}</div>
                      </div>

                      <FormField
                        control={form.control}
                        name={`items.${idx}.qty`}
                        render={({ field }) => (
                          <FormItem className="col-span-3 sm:col-span-2">
                            <FormLabel className="text-2xs">Qty</FormLabel>
                            <FormControl>
                              <Input type="number" min={1} className="text-right" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${idx}.unitPrice`}
                        render={({ field }) => (
                          <FormItem className="col-span-3 sm:col-span-2">
                            <FormLabel className="text-2xs">Rate</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} step="0.01" className="text-right" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${idx}.discount`}
                        render={({ field }) => (
                          <FormItem className="col-span-3 sm:col-span-1">
                            <FormLabel className="text-2xs">Disc%</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} max={100} className="text-right" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${idx}.taxPercent`}
                        render={({ field }) => (
                          <FormItem className="col-span-3 sm:col-span-1">
                            <FormLabel className="text-2xs">Tax%</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} max={100} className="text-right" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="col-span-9 sm:col-span-1 text-right tabular text-sm font-semibold text-navy-900 dark:text-white">
                        {formatMoney(
                          (Number(items[idx]?.unitPrice) || 0) *
                            (Number(items[idx]?.qty) || 0) *
                            (1 - (Number(items[idx]?.discount) || 0) / 100) *
                            (1 + (Number(items[idx]?.taxPercent) || 0) / 100)
                        )}
                      </div>

                      <div className="col-span-3 sm:col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${items[idx]?.name}`}
                          onClick={() => remove(idx)}
                        >
                          <Trash2 className="text-danger" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {fields.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => document.querySelector<HTMLSelectElement>('[aria-label="Add an item"]')?.focus()}
                  >
                    <Plus />
                    Add another item
                  </Button>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardBody className="space-y-2">
                <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-2">
                  New total
                </h3>
                <Row label="Subtotal" value={formatMoney(subtotal)} />
                <Row label="Discount" value={`− ${formatMoney(discountAmount)}`} />
                <Row label="Sales tax" value={formatMoney(tax)} />
                <div className="pt-2 mt-2 border-t border-slate-200 dark:border-navy-700">
                  <Row label="Total" value={formatMoney(total)} bold />
                </div>
                <p className="text-2xs text-slate-500 dark:text-slate-400 pt-2">
                  The server recomputes every line on the way in. This is the same
                  arithmetic, shown early.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  );
}

function Row({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={bold ? "text-sm font-semibold text-navy-900 dark:text-white" : "text-sm text-slate-600 dark:text-slate-400"}>
        {label}
      </span>
      <span className={bold
        ? "tabular text-base font-bold text-navy-900 dark:text-white"
        : "tabular text-sm text-navy-900 dark:text-white"}>
        {value}
      </span>
    </div>
  );
}
