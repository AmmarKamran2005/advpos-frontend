"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { vizoResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import axios from "axios";
import {
  Save, X, Plus, Loader2, AlertCircle, RefreshCw, AlertTriangle, FileText,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { isPastDate, PAST_DATE_MESSAGE } from "@/lib/dates";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { ProductPicker } from "@/components/products/product-picker";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader, useSession } from "@/components/providers/session-provider";
import { formatMoney } from "@/lib/format";
import { round2 } from "@/lib/pricing";
import {
  OrderEditLineCard, MAX_SALES_MARGIN_PERCENT,
  editLine, lineFromOrder, lineProblem, lineTotal, newLine,
  type EditBox, type EditLine,
} from "@/components/orders/order-edit-line";

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

   THE LINE, SINCE 30 SEPTEMBER: Quantity · Original price · Margin (Rs.) ·
   Margin % · Final price · Total, in that order, and no Tax or Discount box
   (components/orders/order-edit-line.tsx has the arithmetic and why). An
   edited order is billed at exactly quantity x final price -- the API writes
   discount and tax as 0 on the order, on its invoice, and so on the ledger.

   The lines live in plain state rather than in the form: five boxes that each
   rewrite the other three are one small function, and a form library that
   validates every keystroke of every box would only fight it. The header
   (customer, payment, delivery date, notes) stays in the form.
   ─────────────────────────────────────────────────────────────────────────── */

type LookupProduct = {
  id: number; sku: string; name: string; imageUrl?: string | null; packing: number;
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
  id: number; lineNo: number; productId: number; name: string; sku: string; imageUrl?: string | null;
  qty: number; rate: number; basePrice?: number | null; discountPercent: number; taxPercent: number; lineTotal: number;
};

type OrderDetail = {
  id: number; orderNo: string; status: string; statusName: string;
  customerId: number; customerName: string;
  locationId: number; methodId: number;
  orderDate: string; deliveryDate: string | null;
  notes: string | null;
  total: number;
  invoiceId: number | null; invoiceNo: string | null;
  lines: OrderLine[];
};

/** What PUT /sales/orders/{id} answers with (SalesController.UpdateOrder). */
type SaveReply = {
  message: string;
  invoiceId?: number | null;
  invoiceRebuilt?: string | null;
  total?: number;
  /** null: no invoice yet. false: the invoice moved but its month is closed, so the ledger did not. */
  ledgerUpdated?: boolean | null;
  ledgerNote?: string | null;
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

const Schema = z.object({
  customerId: z.coerce.number().positive("Pick a customer"),
  locationId: z.coerce.number().positive("Pick a location"),
  methodId: z.coerce.number().positive("Pick a payment method"),
  deliveryDate: z.string().min(1, "Delivery date required"),
  notes: z.string().max(500, "Max 500 characters").optional(),
});

type FormValues = z.infer<typeof Schema>;

export default function EditOrderPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "", 10);
  const router = useRouter();
  const { role } = useSession();

  /* WHO MAY REPRICE. The Super Admin and the accountant can change every box,
     the original price included, and are not held to the salesperson's 10%
     margin cap -- the same rule SalesController.ValidateOrderRequest applies.
     Anybody else here is editing on an approved one-shot request: the original
     is the catalogue's and the margin stops at 10%, and the API checks both. */
  const mayReprice = role === "super-admin" || role === "accountant";
  const cap = mayReprice ? null : MAX_SALES_MARGIN_PERCENT;

  const [order, setOrder] = React.useState<OrderDetail | null>(null);
  const [lookups, setLookups] = React.useState<Lookups | null>(null);
  const [lines, setLines] = React.useState<EditLine[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: vizoResolver(Schema),
    mode: "onChange",
    defaultValues: {
      customerId: 0, locationId: 0, methodId: 0,
      deliveryDate: "", notes: "",
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
      });

      /* The original price is read back as the product's selling price --
         see lineFromOrder for why, and for what happens to an old discount. */
      const catalogue = new Map(l.data.products.map((p) => [p.id, p.salePrice]));
      setLines(o.data.lines.map((ln) => lineFromOrder(ln, catalogue.get(ln.productId) ?? 0)));

      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load this order."));
    } finally {
      setLoading(false);
    }
  }, [id, form]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  /* The same arithmetic the API runs on the way in: quantity x final price,
     nothing discounted, nothing taxed. Anything else and this screen promises
     a total the invoice will not honour. */
  const total = round2(lines.reduce((s, l) => s + lineTotal(l), 0));
  const margin = round2(lines.reduce((s, l) => s + l.qty * l.margin, 0));
  const units = lines.reduce((s, l) => s + l.qty, 0);

  /* Tax and discount are gone from this screen. An order written before that
     may still carry them; say so BEFORE saving drops them, rather than let the
     total move without a word. (A discount is folded into the final price, so
     it does not move the total -- only tax does.) */
  const carriedTax = order?.lines.some((l) => l.taxPercent > 0) ?? false;
  const carriedDiscount = order?.lines.some((l) => l.discountPercent > 0) ?? false;

  const problem =
    lines.length === 0 ? "An order needs at least one line."
    : lines.map((l) => lineProblem(l, cap)).find((p) => p !== null) ?? null;

  const onEdit = React.useCallback((key: string, box: EditBox, typed: string) => {
    setLines((prev) => prev.map((l) => (l.key === key ? editLine(l, box, typed, cap) : l)));
  }, [cap]);

  const onRemove = React.useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  function addProduct(p: LookupProduct) {
    setLines((prev) => {
      /* Already on the order: one more of it, rather than a second line for the
         same item -- dispatch counts by product. */
      const at = prev.findIndex((l) => l.productId === p.id);
      if (at >= 0) {
        return prev.map((l, i) => (i === at ? editLine(l, "qty", String(l.qty + 1), cap) : l));
      }
      return [...prev, newLine(p)];
    });
  }

  async function onSubmit(d: FormValues) {
    /* No delivery date before today -- except the one the order already has. */
    const kept = (order?.deliveryDate ?? order?.orderDate ?? "").slice(0, 10);
    if (isPastDate(d.deliveryDate) && d.deliveryDate.slice(0, 10) !== kept) {
      form.setError("deliveryDate", { message: PAST_DATE_MESSAGE });
      return;
    }
    if (problem) { toast.error(problem); return; }

    setSaving(true);
    try {
      const res = await axios.put<SaveReply>(
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
          /* The price in its three parts. The API checks that final = original
             + margin, stores the final price as the line's rate, and writes
             discount and tax as 0 (SalesController.PriceEditedLines). The
             margin % is not sent: it is margin / original, and the API works
             it out rather than trust a third copy. */
          lines: lines.map((l) => ({
            productId: l.productId,
            qty: l.qty,
            originalPrice: round2(l.original),
            marginPrice: round2(l.margin),
            finalPrice: round2(l.final),
          })),
        },
        { headers: authHeader() }
      );
      /* The order and the invoice are saved either way; a closed month is the
         one case where the customer's ledger could not follow, and whoever
         saved needs to know to post a correction. */
      if (res.data.ledgerUpdated === false) {
        toast.warning("Saved, but the ledger was not updated", {
          description: res.data.ledgerNote ?? res.data.message,
        });
      } else {
        toast.success("Order updated", { description: res.data.message });
      }
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
                    Its lines and totals are rebuilt from what you save here, the
                    customer&apos;s ledger entry is rewritten to the new total, and the
                    stored bill is thrown away so the next print shows the new
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
                          <DateInput keep={order?.deliveryDate ?? order?.orderDate} {...field} />
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
                  <ProductPicker
                    products={lookups.products}
                    align="end"
                    onPick={(p) => addProduct(p)}
                    detail={(p) => `${p.sku} · ${p.totalStock} in stock`}
                    right={(p) => formatMoney(p.salePrice)}
                    trigger={
                      <Button type="button" variant="accent" size="sm" className="gap-1.5 shrink-0">
                        <Plus className="size-4" />Add an item
                      </Button>
                    } />
                </div>

                {(carriedTax || carriedDiscount) && (
                  <div className="flex items-start gap-2 text-xs text-warning p-3 rounded-lg bg-warning/5 border border-warning/30">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                    <span>
                      This order was written with
                      {carriedTax && carriedDiscount ? " tax and a discount" : carriedTax ? " tax" : " a discount"} on
                      some lines. Tax and discount are no longer used on an edited order:
                      {carriedDiscount && " each discount has been folded into that line's final price,"}
                      {carriedTax && " the tax will be removed and the total will drop by it,"}
                      {" "}once you save.
                    </span>
                  </div>
                )}

                {lines.length === 0 && (
                  <div className="flex items-center gap-2 text-sm text-warning p-3 rounded-lg bg-warning/5 border border-warning/30">
                    <AlertTriangle className="size-4" />
                    An order needs at least one line.
                  </div>
                )}

                <div className="space-y-3">
                  {lines.map((l) => (
                    <OrderEditLineCard
                      key={l.key}
                      line={l}
                      cap={cap}
                      lockOriginal={!mayReprice}
                      onEdit={onEdit}
                      onRemove={onRemove}
                    />
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardBody className="space-y-2">
                <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-2">
                  New total
                </h3>
                <Row label="Items" value={`${lines.length} · ${units} pcs`} />
                <Row label="Margin on this order" value={formatMoney(margin, { decimals: 2 })} />
                <Row label="Was" value={formatMoney(order.total, { decimals: 2 })} />
                <div className="pt-2 mt-2 border-t border-slate-200 dark:border-navy-700">
                  <Row label="Total" value={formatMoney(total, { decimals: 2 })} bold />
                </div>
                <p className="text-2xs text-slate-500 dark:text-slate-400 pt-2">
                  Quantity × final price on every line, with no tax and no
                  discount. The server works it out again on the way in; this is
                  the same arithmetic, shown early.
                </p>
                {problem && lines.length > 0 && (
                  <p role="alert" className="text-2xs font-medium text-danger">{problem}</p>
                )}
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
