"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Edit3, MoreHorizontal, AlertCircle, CheckCircle2, Truck, Package, FileText,
  Printer, Mail, Phone, MapPin, Globe, X, Plus,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { purchaseOrders, PO_STATUS_VARIANT } from "@/data/purchases";
import { getParty } from "@/data/parties";
import { formatMoney, formatDate, formatNumber } from "@/lib/format";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/labels";

const STATE_FLOW = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "PARTIALLY_RECEIVED", "RECEIVED"];

const MOCK_ITEMS = [
  { id: 1, sku: "VZ-TIT-T9-BLK", name: "VIZO Titan T9 Wireless Earbuds — Black", qty: 200, received: 200, unitCost: 580, taxPercent: 18, lineTotal: 136880 },
  { id: 2, sku: "VZ-VLT-65W-PD", name: "VIZO VOLT 65W GaN Type-C Charger",       qty: 100, received: 100, unitCost: 1480, taxPercent: 18, lineTotal: 174640 },
  { id: 3, sku: "VZ-VR-TC-1.5M", name: "VIZO VR Type-C Data Cable 1.5m",         qty: 500, received: 350, unitCost: 95,   taxPercent: 18, lineTotal: 56050 },
];

const ACTIVITY = [
  { id: 1, user: "Ahmed Riaz",   action: "created PO",                  time: "30 Apr · 10:00 AM", icon: FileText, variant: "info" as const },
  { id: 2, user: "Ahmed Riaz",   action: "submitted for approval",      time: "30 Apr · 10:15 AM", icon: CheckCircle2, variant: "info" as const },
  { id: 3, user: "Umer Memon",   action: "approved PO",                  time: "30 Apr · 11:30 AM", icon: CheckCircle2, variant: "success" as const },
  { id: 4, user: "System",       action: "PO emailed to supplier",      time: "30 Apr · 11:31 AM", icon: Mail, variant: "info" as const },
];

export default function PODetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "1", 10);
  const po = purchaseOrders.find((p) => p.id === id);
  const [confirmCancel, setConfirmCancel] = React.useState(false);

  if (!po) {
    return (
      <EmptyState icon={AlertCircle} title="Purchase order not found" action={<Button asChild><Link href="/purchases/orders">Back</Link></Button>} />
    );
  }

  const supplier = getParty(po.supplierId);
  const stateIdx = STATE_FLOW.indexOf(po.status);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Purchases" }, { label: "POs", href: "/purchases/orders" }, { label: po.poNo }]}
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{po.poNo}</span>
            <StatusPill variant={PO_STATUS_VARIANT[po.status]}>{statusLabel(po.status)}</StatusPill>
          </div>
        }
        subtitle={`Created ${formatDate(po.poDate)} · Expected ${formatDate(po.expectedDate)} · ${po.location}`}
        actions={
          <>
            <Button variant="ghost" className="gap-1.5"><Printer />Print</Button>
            <Button variant="ghost" className="gap-1.5" onClick={() => toast.success("PO emailed to supplier")}><Mail />Email</Button>
            {po.status === "PENDING_APPROVAL" && (
              <Button variant="accent" className="gap-1.5" onClick={() => toast.success("PO approved")}>
                <CheckCircle2 /> Approve
              </Button>
            )}
            {(po.status === "APPROVED" || po.status === "PARTIALLY_RECEIVED") && (
              <Button variant="accent" className="gap-1.5" asChild>
                <Link href="/purchases/grns/new"><Plus />Receive Goods (GRN)</Link>
              </Button>
            )}
            <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
          </>
        }
      />

      {/* Pipeline */}
      {po.status !== "DRAFT" && po.status !== "CANCELLED" && (
        <Card className="mb-6">
          <CardBody>
            <div className="flex items-center justify-between gap-2">
              {STATE_FLOW.map((s, i) => {
                const passed = i <= stateIdx;
                const current = i === stateIdx;
                return (
                  <React.Fragment key={s}>
                    <div className="flex flex-col items-center gap-1.5 flex-1">
                      <div className={cn(
                        "size-9 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                        current ? "bg-brand-yellow text-navy-900 ring-4 ring-brand-yellow/20"
                        : passed ? "bg-success text-white"
                        : "bg-slate-200 dark:bg-navy-700 text-slate-500"
                      )}>
                        {passed && !current ? <CheckCircle2 className="size-4" /> : i + 1}
                      </div>
                      <div className={cn("text-2xs font-semibold uppercase tracking-wider text-center",
                        passed ? "text-navy-900 dark:text-white" : "text-slate-400"
                      )}>
                        {s.replace("_", " ")}
                      </div>
                    </div>
                    {i < STATE_FLOW.length - 1 && (
                      <div className={cn("flex-1 h-0.5 -mt-6", i < stateIdx ? "bg-success" : "bg-slate-200 dark:bg-navy-700")} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-navy-700 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-navy-900 dark:text-white">Items</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{po.itemCount} products · {formatNumber(MOCK_ITEMS.reduce((s, i) => s + i.qty, 0))} units ordered</p>
              </div>
              <Badge variant={po.receivedPercent === 100 ? "success" : po.receivedPercent > 0 ? "warning" : "muted"}>
                {po.receivedPercent}% received
              </Badge>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-navy-700/50 text-left">
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2">Product</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Ordered</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Received</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Cost</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                {MOCK_ITEMS.map((item) => {
                  const pct = (item.received / item.qty) * 100;
                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-navy-900 dark:text-white">{item.name}</div>
                        <div className="text-2xs tabular text-slate-500 dark:text-slate-400 mt-0.5">{item.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular text-sm text-navy-900 dark:text-white">{item.qty}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="tabular text-sm font-semibold text-success">{item.received}</div>
                        <div className="w-16 h-1 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden mt-1 ml-auto">
                          <div className="h-full bg-success" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular text-sm text-slate-700 dark:text-slate-300">{formatMoney(item.unitCost)}</td>
                      <td className="px-4 py-3 text-right tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(item.lineTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-5 py-4 border-t border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900/40">
              <div className="ml-auto max-w-xs space-y-1.5">
                <Row label="Subtotal" value={formatMoney(po.total / 1.18)} />
                <Row label="Sales Tax (18%)" value={formatMoney(po.total - po.total / 1.18)} />
                <div className="border-t border-slate-200 dark:border-navy-700 pt-2 mt-2">
                  <Row label="Total" value={formatMoney(po.total)} bold />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Activity</h3>
              <Tabs defaultValue="activity">
                <TabsList>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="grns">GRNs ({po.receivedPercent > 0 ? 1 : 0})</TabsTrigger>
                  <TabsTrigger value="invoices">Invoices (0)</TabsTrigger>
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
                            <div className="text-sm text-navy-900 dark:text-white"><span className="font-semibold">{a.user}</span> {a.action}</div>
                            <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">{a.time}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
                <TabsContent value="grns">
                  {po.receivedPercent > 0 ? (
                    <Link href="/purchases/grns" className="block p-3 border border-slate-200 dark:border-navy-700 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold tabular text-navy-900 dark:text-white">GRN-26-0089</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">29 Apr · Bilal Ahmed</div>
                        </div>
                        <Badge variant="success">POSTED</Badge>
                      </div>
                    </Link>
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-sm">No GRNs yet</div>
                  )}
                </TabsContent>
                <TabsContent value="invoices">
                  <div className="text-center py-8 text-slate-400 text-sm">No supplier invoices yet</div>
                </TabsContent>
              </Tabs>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Supplier</h3>
                {supplier && <Link href={`/parties/${supplier.id}`} className="text-xs text-brand-yellow hover:underline font-medium">View</Link>}
              </div>
              {supplier && (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar initials={supplier.initials} size="lg" />
                    <div>
                      <div className="font-semibold text-navy-900 dark:text-white">{supplier.legalName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{supplier.category}</div>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="inline-flex items-center gap-1.5"><Phone className="size-3 text-slate-400" />{supplier.phone}</div>
                    {supplier.email && <div className="inline-flex items-center gap-1.5 truncate"><Globe className="size-3 text-slate-400" />{supplier.email}</div>}
                    <div className="inline-flex items-center gap-1.5"><MapPin className="size-3 text-slate-400" />{supplier.city}</div>
                  </div>
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">PO Details</h3>
              <dl className="space-y-2.5 text-sm">
                <Meta label="PO Date" value={formatDate(po.poDate)} />
                <Meta label="Expected" value={formatDate(po.expectedDate)} />
                <Meta label="Location" value={po.location} />
                <Meta label="Location" value={po.location} />
                <Meta label="Created By" value={po.createdBy} />
                {po.approvedBy && <Meta label="Approved By" value={po.approvedBy} />}
              </dl>
            </CardBody>
          </Card>

          {(po.status === "DRAFT" || po.status === "PENDING_APPROVAL" || po.status === "APPROVED") && (
            <Card className="bg-danger/5 border-danger/20">
              <CardBody>
                <h3 className="text-sm font-semibold text-danger-dark dark:text-danger-light mb-2">Danger Zone</h3>
                <p className="text-xs text-danger-dark/80 dark:text-danger-light/80 mb-3">
                  Cancelling a PO sends a notification to the supplier.
                </p>
                <Button variant="danger" size="md" className="w-full" onClick={() => setConfirmCancel(true)}>
                  Cancel Purchase Order
                </Button>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel this purchase order?"
        description={`PO ${po.poNo} of ${formatMoney(po.total)} will be cancelled. The supplier will be notified.`}
        variant="danger"
        confirmLabel="Yes, cancel PO"
        requireReason
        reasonLabel="Cancellation reason"
        reasonPlaceholder="e.g. Specifications changed, supplier delayed..."
        onConfirm={(reason) => {
          toast.success("Purchase order cancelled", { description: `Reason: ${reason}` });
          setConfirmCancel(false);
        }}
      />
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
