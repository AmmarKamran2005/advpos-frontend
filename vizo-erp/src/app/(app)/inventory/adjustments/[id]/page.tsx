"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, AlertCircle, Lock, RotateCcw, Printer, Calendar, Building2, FileText, Package, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/labels";

const ADJUSTMENTS = [
  { id: 1, adjustmentNo: "ADJ-26-0034", date: "2026-04-28", location: "LOC-01", reason: "Physical count discrepancy", reasonNotes: "Q2 cycle count revealed shortage in earbuds bin", itemCount: 3, netImpact: -8,  netValue: -4640, status: "Posted", user: "Hassan Raza" },
  { id: 2, adjustmentNo: "ADJ-26-0012", date: "2026-04-25", location: "LOC-03", reason: "Damaged in handling",         reasonNotes: "Earbuds dropped during palletization", itemCount: 2, netImpact: -5, netValue: -2900,  status: "Posted", user: "Sara Khan" },
  { id: 3, adjustmentNo: "ADJ-26-0033", date: "2026-04-24", location: "LOC-01", reason: "Found extra stock",            reasonNotes: "Misplaced carton found in receiving area", itemCount: 1, netImpact: 4, netValue: 2320,    status: "Posted", user: "Hassan Raza" },
  { id: 4, adjustmentNo: "ADJ-26-0008", date: "2026-04-22", location: "LOC-02", reason: "Expired stock write-off",      reasonNotes: "Old batch beyond shelf life", itemCount: 4, netImpact: -12, netValue: -6960, status: "Posted", user: "Bilal Ahmed" },
  { id: 5, adjustmentNo: "ADJ-26-0035", date: "2026-04-30", location: "LOC-01", reason: "Stock count adjustment",       reasonNotes: "Pending review", itemCount: 2, netImpact: 0, netValue: 0,   status: "Draft",  user: "Hassan Raza" },
];

const SAMPLE_LINES = [
  { id: 1, sku: "VZ-TIT-T9-BLK", name: "VIZO Titan T9 Wireless Earbuds — Black", currentQty: 248, newQty: 244, delta: -4, unitCost: 580 },
  { id: 2, sku: "VZ-VR-TC-1.5M", name: "VIZO VR Type-C Data Cable 1.5m",         currentQty: 1840, newQty: 1838, delta: -2, unitCost: 95 },
  { id: 3, sku: "VZ-VLT-65W-PD", name: "VIZO VOLT 65W GaN Type-C Charger",       currentQty: 410, newQty: 408, delta: -2, unitCost: 1480 },
];

export default function AdjustmentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "1", 10);
  const adj = ADJUSTMENTS.find((a) => a.id === id);
  const [reverseConfirm, setReverseConfirm] = React.useState(false);

  if (!adj) {
    return <EmptyState icon={AlertCircle} title="Adjustment not found" action={<Button asChild><Link href="/inventory/adjustments">Back</Link></Button>} />;
  }

  const isPosted = adj.status === "Posted";

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory" }, { label: "Adjustments", href: "/inventory/adjustments" }, { label: adj.adjustmentNo }]}
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{adj.adjustmentNo}</span>
            <StatusPill variant={isPosted ? "success" : "muted"}>{statusLabel(adj.status)}</StatusPill>
            <Badge variant={adj.netImpact > 0 ? "success" : adj.netImpact < 0 ? "danger" : "muted"}>
              Net {adj.netImpact > 0 ? "+" : ""}{adj.netImpact} units
            </Badge>
          </div>
        }
        subtitle={`${formatDate(adj.date)} · ${adj.location}`}
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/inventory/adjustments"><ArrowLeft />Back</Link></Button>
            <Button variant="ghost" className="gap-1.5" onClick={() => toast.info("Printing…")}><Printer />Print</Button>
            {isPosted && (
              <Button variant="danger" className="gap-1.5" onClick={() => setReverseConfirm(true)}>
                <RotateCcw />Reverse
              </Button>
            )}
          </>
        }
      />

      {isPosted && (
        <Card className="bg-success/5 border-success/30 mb-6">
          <CardBody className="py-3">
            <div className="flex items-center gap-2 text-sm text-success-dark dark:text-success-light">
              <Lock className="size-4" />
              <span><strong>Posted adjustments are immutable.</strong> To correct, post a reversing adjustment.</span>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-navy-700">
              <h3 className="text-base font-semibold text-navy-900 dark:text-white">Adjusted Items</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{adj.itemCount} products · Net value impact: {formatMoney(adj.netValue)}</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-navy-700/50 text-left">
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2">Product</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Old Qty</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">New Qty</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Δ Delta</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Value Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                {SAMPLE_LINES.map((l) => {
                  const valueImpact = l.delta * l.unitCost;
                  return (
                    <tr key={l.id}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-navy-900 dark:text-white">{l.name}</div>
                        <div className="text-2xs tabular text-slate-500 dark:text-slate-400 mt-0.5">{l.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular text-sm text-slate-600 dark:text-slate-300">{l.currentQty}</td>
                      <td className="px-4 py-3 text-right tabular text-sm font-semibold text-navy-900 dark:text-white">{l.newQty}</td>
                      <td className={cn("px-4 py-3 text-right tabular text-sm font-bold inline-flex items-center justify-end gap-1 w-full",
                        l.delta > 0 ? "text-success" : l.delta < 0 ? "text-danger" : "text-slate-500"
                      )}>
                        {l.delta > 0 ? <ArrowDownToLine className="size-3" /> : l.delta < 0 ? <ArrowUpFromLine className="size-3" /> : null}
                        {l.delta > 0 ? "+" : ""}{l.delta}
                      </td>
                      <td className={cn("px-4 py-3 text-right tabular text-sm font-semibold", valueImpact < 0 ? "text-danger" : valueImpact > 0 ? "text-success" : "text-slate-500")}>
                        {valueImpact < 0 ? "(" : ""}{formatMoney(Math.abs(valueImpact))}{valueImpact < 0 ? ")" : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {isPosted && (
            <Card>
              <CardBody>
                <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-3">Linked Journal Entry</h3>
                <Link href="/accounting/journal-entries/8" className="block p-3 border border-slate-200 dark:border-navy-700 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="tabular text-sm font-semibold text-navy-900 dark:text-white">JE-26-1043</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{adj.reason} — {adj.location}</div>
                    </div>
                    <Badge variant="success">POSTED</Badge>
                  </div>
                </Link>
                <div className="mt-3 p-3 bg-slate-50 dark:bg-navy-900 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-300">
                  {adj.netImpact < 0 ? (
                    <>
                      <div>DR  Inventory Adjustment Loss  {formatMoney(Math.abs(adj.netValue))}</div>
                      <div>CR  Inventory                  {formatMoney(Math.abs(adj.netValue))}</div>
                    </>
                  ) : (
                    <>
                      <div>DR  Inventory                  {formatMoney(adj.netValue)}</div>
                      <div>CR  Inventory Adjustment Gain  {formatMoney(adj.netValue)}</div>
                    </>
                  )}
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Details</h3>
              <dl className="space-y-2.5 text-sm">
                <Meta label="Date" icon={Calendar} value={formatDate(adj.date)} />
                <Meta label="Location" icon={Building2} value={adj.location} />
                <Meta label="Reason" icon={FileText} value={<Badge variant="muted">{adj.reason}</Badge>} />
                <Meta label="Items" icon={Package} value={`${adj.itemCount} products`} />
                <Meta label="Posted by" value={adj.user} />
              </dl>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-navy-700">
                <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Reason notes</div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5">{adj.reasonNotes}</p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={reverseConfirm}
        onOpenChange={setReverseConfirm}
        title="Reverse this adjustment?"
        description="A new reversing adjustment will be posted with opposite quantities. The original entry remains in the audit trail."
        variant="danger"
        confirmLabel="Yes, reverse"
        requireReason
        reasonLabel="Reason for reversal"
        onConfirm={(r) => { toast.success("Reversing adjustment posted", { description: `Reason: ${r}` }); setReverseConfirm(false); }}
      />
    </>
  );
}

function Meta({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: typeof Calendar }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
        {Icon && <Icon className="size-3.5 text-slate-400" />}
        {label}
      </dt>
      <dd className="text-sm font-medium text-navy-900 dark:text-white">{value}</dd>
    </div>
  );
}
