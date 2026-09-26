"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import { AlertCircle, ArrowLeft, Calendar, MapPin, Phone, Truck, User } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/badge";
import { ProductImage } from "@/components/products/product-image";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { apiMessage } from "@/components/ledgers/ledger-kit";
import { formatDate, formatMoney } from "@/lib/format";
import { statusVariant } from "@/components/packing/recent-orders";

/* ───────────────────────────────────────────────────────────────────────────
   ONE ORDER, READ-ONLY, FOR THE ORDER DESK -- opened from "This week" on the
   Packing page. Any status.

   Not /sales/orders/{id}: that screen is built around money the order desk
   must not see (the rep's rates, what has been paid, the customer's balance
   and limit) and buttons it may not press. This is the same order with its
   items, pictures and quantities, the base price the Packing screen already
   shows, and where it has got to -- GET /packing/recent/{id}.
   ─────────────────────────────────────────────────────────────────────────── */

type Line = {
  id: number; productId: number; name: string; sku: string; imageUrl: string | null;
  packing: number; qty: number; dispatchedQty: number | null; price: number;
};
type Order = {
  id: number; orderNo: string; orderDate: string; createdAt: string; deliveryDate: string | null;
  customerName: string; customerCode: string; customerPhone: string | null; customerAddress: string | null;
  city: string; salesPerson: string | null; createdBy: string; status: string; statusName: string;
  location: string; notes: string | null; invoiceNo: string | null;
  channel: string | null; carrier: string | null; trackingNo: string | null;
  dispatchedOn: string | null; deliveredOn: string | null;
  itemCount: number; units: number; totalAtBase: number; lines: Line[];
};

export default function OrderDeskOrderPage() {
  const params = useParams<{ id: string }>();
  const [o, setO] = React.useState<Order | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    axios.get<Order>(`${API_BASE_URL}/packing/recent/${params.id}`, { headers: authHeader() })
      .then((r) => setO(r.data))
      .catch((e) => setError(apiMessage(e, "Could not open this order.")));
  }, [params.id]);

  if (error) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="size-8 text-danger mx-auto mb-2" />
        <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
        <Button variant="ghost" className="mt-2" asChild><Link href="/packing"><ArrowLeft />Back to Packing</Link></Button>
      </Card>
    );
  }
  if (!o) return <div className="space-y-3"><Skeleton className="h-16" /><Skeleton className="h-40" /><Skeleton className="h-64" /></div>;

  const packable = o.status === "INVOICED" || o.status === "AT_ORDER_DEPT";

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Packing", href: "/packing" }, { label: o.orderNo }]}
        title={o.orderNo}
        subtitle={`${o.customerName} · ${formatDate(o.orderDate)}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusPill variant={statusVariant(o.status)}>{o.statusName}</StatusPill>
            <Button variant="ghost" size="md" className="gap-1.5" asChild>
              <Link href="/packing"><ArrowLeft /><span>Packing</span></Link>
            </Button>
          </div>
        }
      />

      {packable && (
        <Card className="p-3 mb-4 border-brand-yellow/50 bg-brand-yellow/5 text-sm text-navy-900 dark:text-white">
          This order is waiting to be packed -- pick it in the Order box on <Link href="/packing" className="font-semibold underline underline-offset-2">Packing</Link> to dispatch it.
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardBody className="space-y-3 text-sm">
            <Fact icon={User} label="Customer" value={`${o.customerName} (${o.customerCode})`} />
            {o.customerPhone && <Fact icon={Phone} label="Phone" value={o.customerPhone} />}
            <Fact icon={MapPin} label="Address" value={[o.customerAddress, o.city].filter(Boolean).join(", ")} />
            <Fact icon={User} label="Salesperson" value={o.salesPerson ?? "--"} />
            <Fact icon={Calendar} label="Taken" value={`${formatDate(o.orderDate)} by ${o.createdBy}`} />
            {o.invoiceNo && <Fact icon={Calendar} label="Invoice" value={o.invoiceNo} />}
            {(o.channel || o.dispatchedOn) && (
              <Fact icon={Truck} label="Dispatch"
                value={[o.channel, o.carrier, o.trackingNo, o.dispatchedOn ? `sent ${formatDate(o.dispatchedOn)}` : null,
                  o.deliveredOn ? `delivered ${formatDate(o.deliveredOn)}` : null].filter(Boolean).join(" · ")} />
            )}
            {o.notes && <div className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-navy-700 pt-2">{o.notes}</div>}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardBody>
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Items</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">{o.itemCount} item{o.itemCount === 1 ? "" : "s"} · {o.units} pcs</span>
            </div>
            <ul className="space-y-2">
              {o.lines.map((l) => (
                <li key={l.id} className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 dark:border-navy-700">
                  <ProductImage url={l.imageUrl} name={l.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-navy-900 dark:text-white line-clamp-2">{l.name}</div>
                    <div className="text-2xs tabular text-slate-500 dark:text-slate-400 mt-0.5">
                      {l.sku} · {formatMoney(l.price)} each
                      {l.dispatchedQty !== null && l.dispatchedQty !== l.qty && <span className="text-warning-dark"> · sent {l.dispatchedQty}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold tabular text-navy-900 dark:text-white">{l.qty}</div>
                    <div className="text-2xs text-slate-400">pcs</div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-navy-700">
              <span className="text-xs text-slate-500 dark:text-slate-400">Total at base price</span>
              <span className="tabular text-base font-bold text-navy-900 dark:text-white">{formatMoney(o.totalAtBase)}</span>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="size-4 text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-2xs uppercase tracking-wider text-slate-400">{label}</div>
        <div className="text-navy-900 dark:text-white break-words">{value || "--"}</div>
      </div>
    </div>
  );
}
