"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Edit3, MoreHorizontal, AlertCircle, CheckCircle2, Truck, Package,
  FileText, Clock, MapPin, Phone, AlertTriangle, ArrowRight, Printer, Mail, MessageSquare,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getOrder, getStatusVariant } from "@/data/sales";
import { formatMoney, formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATE_FLOW = ["DRAFT", "SUBMITTED", "CONFIRMED", "PACKED", "DISPATCHED", "DELIVERED"];

const MOCK_ITEMS = [
  { id: 1, sku: "VZ-TIT-T9-BLK",  name: "VIZO Titan T9 Wireless Earbuds — Black",  qty: 50, unitPrice: 980,  discount: 0, taxPercent: 18, lineTotal: 57820 },
  { id: 2, sku: "VZ-VLT-65W-PD",  name: "VIZO VOLT 65W GaN Type-C Charger (PD)",   qty: 20, unitPrice: 2480, discount: 0, taxPercent: 18, lineTotal: 58528 },
  { id: 3, sku: "VZ-VR-TC-1.5M",  name: "VIZO VR Type-C Data Cable 1.5m",          qty: 100,unitPrice: 195,  discount: 5, taxPercent: 18, lineTotal: 21859 },
];

const ACTIVITY = [
  { id: 1, user: "Sara Khan",   action: "created order",                   time: "30 Apr · 9:15 AM",  variant: "info" as const,    icon: FileText },
  { id: 2, user: "System",      action: "ran credit check — PASS",          time: "30 Apr · 9:15 AM",  variant: "success" as const, icon: CheckCircle2 },
  { id: 3, user: "Sara Khan",   action: "submitted order for confirmation", time: "30 Apr · 9:16 AM",  variant: "info" as const,    icon: ArrowRight },
  { id: 4, user: "Bilal Ahmed", action: "confirmed order",                   time: "30 Apr · 10:42 AM", variant: "info" as const,    icon: CheckCircle2 },
  { id: 5, user: "Hassan Raza", action: "packed and ready for dispatch",     time: "30 Apr · 11:30 AM", variant: "info" as const,    icon: Package },
  { id: 6, user: "Sara Khan",   action: "dispatched order to customer",      time: "30 Apr · 11:42 AM", variant: "success" as const, icon: Truck },
  { id: 7, user: "System",      action: "auto-generated invoice INV-KHI-26-0142", time: "30 Apr · 11:42 AM", variant: "success" as const, icon: FileText },
];

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "1", 10);
  const order = getOrder(id);

  if (!order) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Order not found"
        action={<Button variant="accent" asChild><Link href="/sales/orders">Back to Orders</Link></Button>}
      />
    );
  }

  const isCreditHold = order.status === "CREDIT_HOLD";
  const currentStateIndex = STATE_FLOW.indexOf(order.status);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Sales" },
          { label: "Orders", href: "/sales/orders" },
          { label: order.orderNo },
        ]}
        title={
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span>{order.orderNo}</span>
              <StatusPill variant={getStatusVariant(order.status)}>{order.status.replace("_", " ")}</StatusPill>
            </div>
          </div>
        }
        subtitle={`Created ${formatDate(order.orderDate)} · ${order.salesPerson} · ${order.branch}`}
        actions={
          <>
            <Button variant="ghost" size="md" className="gap-1.5">
              <Printer />
              <span className="hidden sm:inline">Print</span>
            </Button>
            {isCreditHold ? (
              <Button variant="accent" size="md" className="gap-1.5">
                <AlertTriangle />
                Override Credit Hold
              </Button>
            ) : order.status === "PACKED" ? (
              <Button variant="accent" size="md" className="gap-1.5">
                <Truck />
                Dispatch
              </Button>
            ) : order.status === "CONFIRMED" ? (
              <Button variant="accent" size="md" className="gap-1.5">
                <Package />
                Pack
              </Button>
            ) : order.status === "SUBMITTED" ? (
              <Button variant="accent" size="md" className="gap-1.5">
                <CheckCircle2 />
                Confirm
              </Button>
            ) : null}
            <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
          </>
        }
      />

      {/* Credit Hold Warning */}
      {isCreditHold && (
        <Card className="mb-6 bg-warning/5 border-warning/30">
          <CardBody>
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-lg bg-warning/15 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="size-5 text-warning" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-warning-dark dark:text-warning-light">Credit Hold</h3>
                <p className="text-sm text-warning-dark/80 dark:text-warning-light/80 mt-1">
                  {order.creditHoldReason ?? "Customer credit limit exceeded."}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Button variant="accent" size="sm">Override (with reason)</Button>
                  <Button variant="ghost" size="sm">Cancel order</Button>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* State pipeline */}
      {!["DRAFT", "CANCELLED"].includes(order.status) && (
        <Card className="mb-6">
          <CardBody>
            <div className="flex items-center justify-between gap-2">
              {STATE_FLOW.map((s, i) => {
                const passed = i <= currentStateIndex;
                const current = i === currentStateIndex;
                return (
                  <React.Fragment key={s}>
                    <div className="flex flex-col items-center gap-1.5 flex-1">
                      <div className={cn(
                        "size-9 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                        current
                          ? "bg-brand-yellow text-navy-900 ring-4 ring-brand-yellow/20"
                          : passed
                          ? "bg-success text-white"
                          : "bg-slate-200 dark:bg-navy-700 text-slate-500"
                      )}>
                        {passed && !current ? <CheckCircle2 className="size-4" /> : i + 1}
                      </div>
                      <div className={cn(
                        "text-2xs font-semibold uppercase tracking-wider text-center",
                        passed ? "text-navy-900 dark:text-white" : "text-slate-400"
                      )}>
                        {s.replace("_", " ")}
                      </div>
                    </div>
                    {i < STATE_FLOW.length - 1 && (
                      <div className={cn("flex-1 h-0.5 -mt-6",
                        i < currentStateIndex ? "bg-success" : "bg-slate-200 dark:bg-navy-700"
                      )} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items + Totals */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-navy-700 flex items-center justify-between">
              <h3 className="text-base font-semibold text-navy-900 dark:text-white">Order Items</h3>
              <Badge variant="muted">{MOCK_ITEMS.length} items · {formatNumber(MOCK_ITEMS.reduce((s, i) => s + i.qty, 0))} units</Badge>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-navy-700/50 text-left">
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2">Product</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Qty</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Price</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Disc%</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Tax%</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                {MOCK_ITEMS.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-navy-900 dark:text-white">{item.name}</div>
                      <div className="text-2xs tabular text-slate-500 dark:text-slate-400 mt-0.5">{item.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-right tabular text-sm text-navy-900 dark:text-white">{item.qty}</td>
                    <td className="px-4 py-3 text-right tabular text-sm text-slate-700 dark:text-slate-300">{formatMoney(item.unitPrice)}</td>
                    <td className="px-4 py-3 text-right tabular text-xs text-slate-500 dark:text-slate-400">{item.discount}%</td>
                    <td className="px-4 py-3 text-right tabular text-xs text-slate-500 dark:text-slate-400">{item.taxPercent}%</td>
                    <td className="px-4 py-3 text-right tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Totals */}
            <div className="px-5 py-4 border-t border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900/40">
              <div className="ml-auto max-w-xs space-y-1.5">
                <Row label="Subtotal" value={formatMoney(order.subtotal)} />
                <Row label="Discount"  value={`- ${formatMoney(order.discount)}`} />
                <Row label="Sales Tax (18%)" value={formatMoney(order.tax)} />
                <div className="border-t border-slate-200 dark:border-navy-700 pt-2 mt-2">
                  <Row label="Total" value={formatMoney(order.total)} bold />
                </div>
              </div>
            </div>
          </Card>

          {/* Activity timeline */}
          <Card>
            <CardBody>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Activity</h3>
              <Tabs defaultValue="activity">
                <TabsList>
                  <TabsTrigger value="activity">Activity ({ACTIVITY.length})</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>
                <TabsContent value="activity">
                  <div className="space-y-4">
                    {ACTIVITY.map((a, i) => {
                      const Icon = a.icon;
                      const isLast = i === ACTIVITY.length - 1;
                      return (
                        <div key={a.id} className="flex gap-3">
                          <div className="relative flex-shrink-0">
                            <div className={cn("size-8 rounded-full flex items-center justify-center",
                              a.variant === "success" && "bg-success/10 text-success",
                              a.variant === "info" && "bg-info/10 text-info"
                            )}>
                              <Icon className="size-3.5" />
                            </div>
                            {!isLast && <div className="absolute top-8 left-1/2 -translate-x-1/2 w-px h-full bg-slate-200 dark:bg-navy-700" />}
                          </div>
                          <div className="flex-1 min-w-0 pb-4">
                            <div className="text-sm text-navy-900 dark:text-white">
                              <span className="font-semibold">{a.user}</span> {a.action}
                            </div>
                            <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">{a.time}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
                <TabsContent value="documents">
                  <div className="space-y-2">
                    {[
                      { name: "Invoice INV-KHI-26-0142.pdf", size: "84 KB", date: "30 Apr 2026" },
                      { name: "Picking Slip.pdf",             size: "32 KB", date: "30 Apr 2026" },
                      { name: "Delivery Challan.pdf",         size: "28 KB", date: "30 Apr 2026" },
                    ].map((d, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 border border-slate-200 dark:border-navy-700 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-800 cursor-pointer">
                        <FileText className="size-5 text-info" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-navy-900 dark:text-white">{d.name}</div>
                          <div className="text-2xs text-slate-500 dark:text-slate-400">{d.size} · {d.date}</div>
                        </div>
                        <Button variant="ghost" size="sm">Download</Button>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer */}
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Customer</h3>
                <Link href={`/parties/${order.customerId}`} className="text-xs text-brand-yellow hover:underline font-medium">View profile</Link>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <Avatar initials={order.customerInitials} size="lg" />
                <div className="min-w-0">
                  <div className="font-semibold text-navy-900 dark:text-white truncate">{order.customerName}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{order.customerType}</div>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="inline-flex items-center gap-1.5">
                  <Phone className="size-3 text-slate-400" />
                  0300 4567890
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3 text-slate-400" />
                  {order.branch}, Pakistan
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Button variant="secondary" size="md" className="w-full justify-start gap-2"><Printer />Print Invoice</Button>
                <Button variant="secondary" size="md" className="w-full justify-start gap-2"><Mail />Email Invoice</Button>
                <Button variant="secondary" size="md" className="w-full justify-start gap-2"><MessageSquare />Send via SMS</Button>
                <Button variant="secondary" size="md" className="w-full justify-start gap-2"><ArrowRight />Record Payment</Button>
              </div>
            </CardBody>
          </Card>

          {/* Meta */}
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Order Details</h3>
              <dl className="space-y-2.5 text-sm">
                <Meta label="Branch" value={order.branch} />
                <Meta label="Warehouse" value={order.warehouse} />
                <Meta label="Sales Rep" value={order.salesPerson} />
                <Meta label="Order Date" value={formatDate(order.orderDate)} />
                <Meta label="Delivery Date" value={formatDate(order.deliveryDate)} />
                <Meta label="Payment Method" value={order.paymentMethod} />
                <Meta label="Payment Status" value={
                  <Badge variant={order.paymentStatus === "PAID" ? "success" : order.paymentStatus === "PARTIAL" ? "warning" : "muted"}>
                    {order.paymentStatus}
                  </Badge>
                } />
              </dl>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-6 text-sm">
      <span className={cn("text-slate-600 dark:text-slate-300", bold && "font-bold text-navy-900 dark:text-white")}>{label}</span>
      <span className={cn("tabular text-navy-900 dark:text-white", bold && "font-bold text-base")}>{value}</span>
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
