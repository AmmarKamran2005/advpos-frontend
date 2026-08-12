"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Printer, AlertCircle, CheckCircle2, Truck, AlertTriangle, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { grns, GRN_STATUS_VARIANT } from "@/data/purchases";
import { formatMoney, formatDate } from "@/lib/format";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/labels";

const MOCK_LINES = [
  { id: 1, sku: "VZ-TIT-T9-BLK",   name: "VIZO Titan T9 Wireless Earbuds — Black", ordered: 100, received: 100, accepted: 100, damaged: 0, batch: "TIT-2026-04", expiry: null,        unitCost: 580,  total: 58000 },
  { id: 2, sku: "VZ-VLT-65W-PD",   name: "VIZO VOLT 65W GaN Type-C Charger",       ordered: 80,  received: 80,  accepted: 78,  damaged: 2, batch: "VLT-2026-04", expiry: null,        unitCost: 1480, total: 115440 },
  { id: 3, sku: "VZ-VR-TC-1.5M",   name: "VIZO VR Type-C Data Cable 1.5m",         ordered: 60,  received: 60,  accepted: 57,  damaged: 3, batch: "VR-2026-04",  expiry: null,        unitCost: 95,   total: 5415 },
];

export default function GRNDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "1", 10);
  const grn = grns.find((g) => g.id === id);
  const [confirmPost, setConfirmPost] = React.useState(false);
  const [confirmReject, setConfirmReject] = React.useState(false);

  if (!grn) return <EmptyState icon={AlertCircle} title="GRN not found" action={<Button asChild><Link href="/purchases/grns">Back</Link></Button>} />;

  const damaged = MOCK_LINES.reduce((s, l) => s + l.damaged, 0);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Purchases" }, { label: "GRNs", href: "/purchases/grns" }, { label: grn.grnNo }]}
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{grn.grnNo}</span>
            <StatusPill variant={GRN_STATUS_VARIANT[grn.status]}>{statusLabel(grn.status)}</StatusPill>
          </div>
        }
        subtitle={`Received ${formatDate(grn.receiptDate)} · ${grn.location}`}
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/purchases/grns"><ArrowLeft />Back</Link></Button>
            <Button variant="ghost" className="gap-1.5"><Printer />Print</Button>
            {grn.status === "DRAFT" && (
              <>
                <Button variant="danger" onClick={() => setConfirmReject(true)}>Reject</Button>
                <Button variant="accent" className="gap-1.5" onClick={() => setConfirmPost(true)}>
                  <CheckCircle2 />Post GRN
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {grn.unitsDamaged > 0 && (
            <Card className="bg-warning/5 border-warning/30">
              <CardBody>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="size-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-warning-dark dark:text-warning-light">Damaged units detected</h4>
                    <p className="text-sm text-warning-dark/80 dark:text-warning-light/80 mt-1">
                      <span className="font-bold">{damaged}</span> units across {MOCK_LINES.filter((l) => l.damaged > 0).length} SKUs were damaged.
                      These will be moved to the Damaged Goods location and a debit note suggestion will be created for the supplier.
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-navy-700">
              <h3 className="text-base font-semibold text-navy-900 dark:text-white">Received Items</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-navy-700/50 text-left">
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2">Product</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Ordered</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Received</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Damaged</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2">Batch</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                {MOCK_LINES.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-navy-900 dark:text-white">{l.name}</div>
                      <div className="text-2xs tabular text-slate-500 dark:text-slate-400 mt-0.5">{l.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-right tabular text-sm text-slate-700 dark:text-slate-300">{l.ordered}</td>
                    <td className="px-4 py-3 text-right tabular text-sm font-semibold text-success">{l.received}</td>
                    <td className={cn("px-4 py-3 text-right tabular text-sm font-semibold", l.damaged > 0 ? "text-danger" : "text-slate-300")}>{l.damaged || "—"}</td>
                    <td className="px-4 py-3 tabular text-xs text-slate-500 dark:text-slate-400">{l.batch}</td>
                    <td className="px-4 py-3 text-right tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(l.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-4 border-t border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900/40 text-right">
              <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">Total Value</div>
              <div className="tabular text-xl font-bold text-navy-900 dark:text-white">{formatMoney(grn.totalValue)}</div>
            </div>
          </Card>

          {grn.status === "POSTED" && (
            <Card className="bg-success/5 border-success/30">
              <CardBody>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-success flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-success-dark dark:text-success-light">GRN Posted Successfully</h4>
                    <p className="text-sm text-success-dark/80 dark:text-success-light/80 mt-1">
                      Stock has been received into <span className="font-bold">{grn.location}</span>. Journal entry posted automatically:
                    </p>
                    <div className="mt-3 p-3 bg-white/50 dark:bg-navy-800/50 rounded-lg text-xs font-mono">
                      <div>DR &nbsp;Inventory &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{formatMoney(grn.totalValue)}</div>
                      <div>CR &nbsp;GR/IR (Goods Received Not Invoiced) {formatMoney(grn.totalValue)}</div>
                    </div>
                    <Link href="/accounting/journal-entries" className="text-xs text-success-dark dark:text-success-light hover:underline font-medium mt-2 inline-flex items-center gap-1">
                      View Journal Entry →
                    </Link>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Supplier</h3>
              <div className="flex items-center gap-3">
                <Avatar initials={grn.supplierInitials} size="md" />
                <div>
                  <div className="font-semibold text-navy-900 dark:text-white">{grn.supplierName}</div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Receipt Details</h3>
              <dl className="space-y-2.5 text-sm">
                <Meta label="GRN Date" value={formatDate(grn.receiptDate)} />
                <Meta label="PO Reference" value={<Link href={`/purchases/orders/${grn.poId}`} className="text-brand-yellow hover:underline tabular">{grn.poNo}</Link>} />
                <Meta label="Delivery Note" value={<span className="tabular">{grn.deliveryNoteNo}</span>} />
                <Meta label="Vehicle" value={<span className="tabular">{grn.vehicleNo}</span>} />
                <Meta label="Location" value={grn.location} />
                <Meta label="Received By" value={grn.receivedBy} />
              </dl>
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmPost}
        onOpenChange={setConfirmPost}
        title="Post this GRN?"
        description="Stock will be increased and a journal entry will be auto-posted (DR Inventory / CR GR-IR). This cannot be undone."
        variant="info"
        confirmLabel="Yes, post GRN"
        onConfirm={() => { toast.success("GRN posted", { description: `${grn.unitsAccepted} units added to ${grn.location}.` }); setConfirmPost(false); }}
      />

      <ConfirmDialog
        open={confirmReject}
        onOpenChange={setConfirmReject}
        title="Reject this GRN?"
        variant="danger"
        confirmLabel="Reject"
        requireReason
        reasonLabel="Rejection reason"
        onConfirm={(r) => { toast.success("GRN rejected", { description: `Reason: ${r}` }); setConfirmReject(false); }}
      />
    </>
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
