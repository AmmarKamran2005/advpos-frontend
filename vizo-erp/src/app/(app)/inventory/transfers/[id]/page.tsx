"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, ArrowRight, AlertCircle, CheckCircle2, Truck, Package, Clock,
  Send, MoreHorizontal, Printer, Calendar, X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Status = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "IN_TRANSIT" | "RECEIVED" | "REJECTED";
type Transfer = {
  id: number;
  transferNo: string;
  date: string;
  fromWh: string;
  toWh: string;
  itemCount: number;
  totalUnits: number;
  status: Status;
  initiatedBy: string;
  notes?: string;
};

const TRANSFERS: Transfer[] = [
  { id: 1, transferNo: "TRF-26-0014", date: "2026-04-30", fromWh: "Karachi Main",       toWh: "Lahore Distribution", itemCount: 8, totalUnits: 240, status: "IN_TRANSIT",       initiatedBy: "Hassan Raza", notes: "Urgent stock for Lahore launch event" },
  { id: 2, transferNo: "TRF-26-0013", date: "2026-04-29", fromWh: "Karachi Main",       toWh: "Islamabad Hub",       itemCount: 5, totalUnits: 150, status: "RECEIVED",         initiatedBy: "Bilal Ahmed" },
  { id: 3, transferNo: "TRF-26-0012", date: "2026-04-29", fromWh: "Karachi Main",       toWh: "Lahore Distribution", itemCount: 4, totalUnits: 100, status: "RECEIVED",         initiatedBy: "Hassan Raza" },
  { id: 4, transferNo: "TRF-26-0008", date: "2026-04-28", fromWh: "Lahore Distribution", toWh: "Islamabad Hub",       itemCount: 3, totalUnits: 60,  status: "APPROVED",         initiatedBy: "Sara Khan" },
  { id: 5, transferNo: "TRF-26-0011", date: "2026-04-25", fromWh: "Karachi Main",       toWh: "Lahore Distribution", itemCount: 6, totalUnits: 180, status: "PENDING_APPROVAL", initiatedBy: "Hassan Raza" },
  { id: 6, transferNo: "TRF-26-0010", date: "2026-04-24", fromWh: "Karachi Main",       toWh: "Islamabad Hub",       itemCount: 2, totalUnits: 50,  status: "REJECTED",         initiatedBy: "Hassan Raza", notes: "Rejected — destination over capacity" },
];

const SAMPLE_ITEMS = [
  { id: 1, sku: "VZ-TIT-T9-BLK",  name: "VIZO Titan T9 Wireless Earbuds — Black", qtySent: 100, qtyReceived: 100, unitCost: 580 },
  { id: 2, sku: "VZ-VLT-65W-PD",  name: "VIZO VOLT 65W GaN Type-C Charger",       qtySent: 80,  qtyReceived: 80,  unitCost: 1480 },
  { id: 3, sku: "VZ-VR-TC-1.5M",  name: "VIZO VR Type-C Data Cable 1.5m",         qtySent: 60,  qtyReceived: 60,  unitCost: 95 },
];

const STATE_FLOW: Status[] = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "IN_TRANSIT", "RECEIVED"];
const STATUS_COLOR: Record<Status, "muted" | "warning" | "info" | "success" | "danger"> = {
  DRAFT: "muted", PENDING_APPROVAL: "warning", APPROVED: "info",
  IN_TRANSIT: "warning", RECEIVED: "success", REJECTED: "danger",
};

export default function TransferDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "1", 10);
  const t = TRANSFERS.find((x) => x.id === id);

  const [status, setStatus] = React.useState<Status>(t?.status ?? "DRAFT");
  const [submitConfirm, setSubmitConfirm] = React.useState(false);
  const [approveConfirm, setApproveConfirm] = React.useState(false);
  const [shipConfirm, setShipConfirm] = React.useState(false);
  const [receiveOpen, setReceiveOpen] = React.useState(false);
  const [rejectConfirm, setRejectConfirm] = React.useState(false);
  const [cancelConfirm, setCancelConfirm] = React.useState(false);

  // For receive dialog: per-line received qty
  const [receivedQty, setReceivedQty] = React.useState<Record<number, number>>(
    Object.fromEntries(SAMPLE_ITEMS.map((i) => [i.id, i.qtySent]))
  );

  if (!t) {
    return <EmptyState icon={AlertCircle} title="Transfer not found" action={<Button asChild><Link href="/inventory/transfers">Back</Link></Button>} />;
  }

  const stateIdx = STATE_FLOW.indexOf(status);
  const totalSent = SAMPLE_ITEMS.reduce((s, i) => s + i.qtySent, 0);
  const totalReceived = Object.values(receivedQty).reduce((a, b) => a + Number(b), 0);
  const discrepancy = totalSent - totalReceived;

  function performAction(next: Status, msg: string, desc?: string) {
    setStatus(next);
    toast.success(msg, { description: desc });
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory" }, { label: "Transfers", href: "/inventory/transfers" }, { label: t.transferNo }]}
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{t.transferNo}</span>
            <StatusPill variant={STATUS_COLOR[status]}>{status.replace("_", " ")}</StatusPill>
          </div>
        }
        subtitle={`${t.fromWh} → ${t.toWh} · Initiated by ${t.initiatedBy} on ${formatDate(t.date)}`}
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/inventory/transfers"><ArrowLeft />Back</Link></Button>
            <Button variant="ghost" className="gap-1.5" onClick={() => toast.info("Printing transfer doc…")}><Printer /><span className="hidden sm:inline">Print</span></Button>

            {status === "DRAFT" && (
              <>
                <Button variant="ghost" className="text-danger" onClick={() => setCancelConfirm(true)}>Cancel</Button>
                <Button variant="accent" className="gap-1.5" onClick={() => setSubmitConfirm(true)}><Send />Submit for Approval</Button>
              </>
            )}
            {status === "PENDING_APPROVAL" && (
              <>
                <Button variant="ghost" className="text-danger" onClick={() => setRejectConfirm(true)}>Reject</Button>
                <Button variant="accent" className="gap-1.5" onClick={() => setApproveConfirm(true)}><CheckCircle2 />Approve</Button>
              </>
            )}
            {status === "APPROVED" && (
              <Button variant="accent" className="gap-1.5" onClick={() => setShipConfirm(true)}><Truck />Ship</Button>
            )}
            {status === "IN_TRANSIT" && (
              <Button variant="accent" className="gap-1.5" onClick={() => setReceiveOpen(true)}><Package />Receive</Button>
            )}
          </>
        }
      />

      {/* Pipeline */}
      {status !== "REJECTED" && (
        <Card className="mb-6">
          <CardBody>
            <div className="flex items-center justify-between gap-2">
              {STATE_FLOW.map((s, i) => {
                const passed = i <= stateIdx;
                const current = i === stateIdx;
                return (
                  <React.Fragment key={s}>
                    <div className="flex flex-col items-center gap-1.5 flex-1">
                      <div className={cn("size-9 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                        current ? "bg-brand-yellow text-navy-900 ring-4 ring-brand-yellow/20"
                        : passed ? "bg-success text-white"
                        : "bg-slate-200 dark:bg-navy-700 text-slate-500"
                      )}>
                        {passed && !current ? <CheckCircle2 className="size-4" /> : i + 1}
                      </div>
                      <div className={cn("text-2xs font-semibold uppercase tracking-wider text-center", passed ? "text-navy-900 dark:text-white" : "text-slate-400")}>
                        {s.replace("_", " ")}
                      </div>
                    </div>
                    {i < STATE_FLOW.length - 1 && <div className={cn("flex-1 h-0.5 -mt-6", i < stateIdx ? "bg-success" : "bg-slate-200 dark:bg-navy-700")} />}
                  </React.Fragment>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {status === "REJECTED" && (
        <Card className="bg-danger/5 border-danger/30 mb-6">
          <CardBody>
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-danger flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-danger-dark dark:text-danger-light">Transfer rejected</h4>
                <p className="text-sm text-danger-dark/80 dark:text-danger-light/80 mt-1">
                  {t.notes ?? "This transfer was rejected during approval."}
                </p>
              </div>
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
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.itemCount} products · {totalSent} units</p>
              </div>
              {(status === "RECEIVED" || status === "IN_TRANSIT") && discrepancy !== 0 && (
                <Badge variant={discrepancy > 0 ? "danger" : "warning"}>
                  {discrepancy > 0 ? `${discrepancy} units short` : `${Math.abs(discrepancy)} units extra`}
                </Badge>
              )}
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-navy-700/50 text-left">
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2">Product</th>
                  <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Qty Sent</th>
                  {(status === "RECEIVED") && <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Qty Received</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                {SAMPLE_ITEMS.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-navy-900 dark:text-white">{item.name}</div>
                      <div className="text-2xs tabular text-slate-500 dark:text-slate-400 mt-0.5">{item.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-right tabular text-sm font-semibold text-navy-900 dark:text-white">{item.qtySent}</td>
                    {status === "RECEIVED" && <td className="px-4 py-3 text-right tabular text-sm font-semibold text-success">{item.qtyReceived}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {(status === "IN_TRANSIT" || status === "RECEIVED") && (
            <Card className="bg-info/5 border-info/30">
              <CardBody>
                <h4 className="text-sm font-semibold text-info-dark dark:text-info-light mb-2">Accounting Postings</h4>
                <div className="text-xs font-mono text-info-dark/80 dark:text-info-light/80 space-y-1">
                  {status === "IN_TRANSIT" && (
                    <>
                      <div>📦 On Ship:</div>
                      <div className="pl-4">DR Goods-in-Transit  · CR Inventory ({t.fromWh})</div>
                    </>
                  )}
                  {status === "RECEIVED" && (
                    <>
                      <div>✅ On Receive:</div>
                      <div className="pl-4">DR Inventory ({t.toWh})  · CR Goods-in-Transit</div>
                      {discrepancy > 0 && <div className="pl-4 text-danger">DR Shrinkage Expense  · CR Goods-in-Transit (for {discrepancy} units short)</div>}
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
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Route</h3>
              <div className="text-sm">
                <div className="font-semibold text-navy-900 dark:text-white">{t.fromWh}</div>
                <div className="my-2 ml-2"><ArrowRight className="size-4 text-brand-yellow rotate-90" /></div>
                <div className="font-semibold text-navy-900 dark:text-white">{t.toWh}</div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Details</h3>
              <dl className="space-y-2.5 text-sm">
                <Meta label="Transfer #" value={<span className="tabular">{t.transferNo}</span>} />
                <Meta label="Date" value={formatDate(t.date)} />
                <Meta label="Items" value={`${t.itemCount} products · ${totalSent} units`} />
                <Meta label="Initiated by" value={t.initiatedBy} />
              </dl>
              {t.notes && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-navy-700">
                  <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Notes</div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5">{t.notes}</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Action confirmations */}
      <ConfirmDialog open={submitConfirm} onOpenChange={setSubmitConfirm}
        title="Submit for approval?"
        description="The transfer will move to PENDING_APPROVAL. Location manager will be notified."
        variant="info" confirmLabel="Submit"
        onConfirm={() => { performAction("PENDING_APPROVAL", "Submitted for approval"); setSubmitConfirm(false); }} />

      <ConfirmDialog open={approveConfirm} onOpenChange={setApproveConfirm}
        title="Approve this transfer?"
        description="Stock will be reserved at the source location. The location team can then ship."
        variant="info" confirmLabel="Approve"
        onConfirm={() => { performAction("APPROVED", "Transfer approved", "Stock reserved at source"); setApproveConfirm(false); }} />

      <ConfirmDialog open={rejectConfirm} onOpenChange={setRejectConfirm}
        title="Reject this transfer?"
        variant="danger" confirmLabel="Reject" requireReason
        onConfirm={(r) => { performAction("REJECTED", "Transfer rejected", `Reason: ${r}`); setRejectConfirm(false); }} />

      <ConfirmDialog open={cancelConfirm} onOpenChange={setCancelConfirm}
        title="Cancel this draft?"
        variant="danger" confirmLabel="Yes, cancel"
        onConfirm={() => { toast.success("Draft cancelled"); setCancelConfirm(false); }} />

      <ConfirmDialog open={shipConfirm} onOpenChange={setShipConfirm}
        title="Mark as shipped?"
        description="Stock will be removed from the source location and moved to Goods-in-Transit. A journal entry will be posted automatically."
        variant="info" confirmLabel="Ship now"
        onConfirm={() => {
          performAction("IN_TRANSIT", "Transfer shipped", `${totalSent} units en route to ${t.toWh}`);
          setShipConfirm(false);
        }} />

      {/* Receive dialog with per-line discrepancy capture */}
      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent size="xl">
          <DialogHeader>
            <DialogTitle>Receive transfer at {t.toWh}</DialogTitle>
            <DialogDescription>Confirm received quantities. Any discrepancy is logged as Shrinkage Expense automatically.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-2">
              {SAMPLE_ITEMS.map((item) => {
                const got = receivedQty[item.id] ?? item.qtySent;
                const diff = got - item.qtySent;
                return (
                  <div key={item.id} className="grid grid-cols-12 gap-3 items-center p-3 border border-slate-200 dark:border-navy-700 rounded-lg">
                    <div className="col-span-6">
                      <div className="text-sm font-medium text-navy-900 dark:text-white">{item.name}</div>
                      <div className="text-2xs tabular text-slate-500 dark:text-slate-400">{item.sku}</div>
                    </div>
                    <div className="col-span-2 text-center">
                      <div className="text-2xs uppercase text-slate-500">Sent</div>
                      <div className="tabular text-sm font-bold text-navy-900 dark:text-white">{item.qtySent}</div>
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`r-${item.id}`} className="text-2xs">Received</Label>
                      <Input id={`r-${item.id}`} type="number" min={0} value={got}
                        onChange={(e) => setReceivedQty((cur) => ({ ...cur, [item.id]: +e.target.value }))}
                        className="mt-1 text-right tabular" />
                    </div>
                    <div className="col-span-2 text-right">
                      <div className="text-2xs uppercase text-slate-500">Δ</div>
                      <div className={cn("tabular text-sm font-bold", diff < 0 ? "text-danger" : diff > 0 ? "text-warning" : "text-success")}>
                        {diff > 0 ? "+" : ""}{diff}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {discrepancy !== 0 && (
              <div className="mt-4 p-3 bg-warning/5 border border-warning/30 rounded-lg flex items-start gap-2 text-xs text-warning-dark dark:text-warning-light">
                <AlertCircle className="size-3.5 flex-shrink-0 mt-0.5" />
                <span><strong>{Math.abs(discrepancy)} units {discrepancy > 0 ? "short" : "extra"}.</strong> A shrinkage / overage adjustment will be auto-posted.</span>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReceiveOpen(false)}><X />Cancel</Button>
            <Button variant="accent" onClick={() => {
              performAction("RECEIVED", "Transfer received", `${totalReceived} units added to ${t.toWh}`);
              setReceiveOpen(false);
            }}><Package />Confirm Receipt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
