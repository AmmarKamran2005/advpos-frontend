"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, AlertCircle, Send, Check, X, RotateCcw, PackageX,
  Clock, User, Truck, BellRing, Printer,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill, Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/dialogs";
import { SelectNative } from "@/components/ui/select-native";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import {
  getClaim, claims, CLAIM_STAGE_VARIANT, CLAIM_STAGE_LABEL, OUTCOME_LABEL,
  type ClaimStage,
} from "@/data/claims";
import { parties } from "@/data/parties";
import { claimPolicy, getLocationByCode } from "@/data/settings";
import { TODAY } from "@/data/reminders";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** The road a claim travels, for the progress strip. */
const FLOW: ClaimStage[] = ["RECEIVED", "SENT", "REPLACED"];

function daysSince(iso: string | null) {
  if (!iso) return 0;
  return Math.round((new Date(TODAY).getTime() - new Date(iso).getTime()) / 86400000);
}

export default function ClaimDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "1", 10);
  const claim = getClaim(id);

  const [sending, setSending] = React.useState(false);
  const [rejecting, setRejecting] = React.useState(false);
  const [supplierId, setSupplierId] = React.useState("");

  if (!claim) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Claim not found"
        action={<Button variant="accent" asChild><Link href="/claims">Back to Claims</Link></Button>}
      />
    );
  }

  const suppliers = parties.filter((p) => p.type === "SUPPLIER" || p.type === "BOTH");
  const claimLocation = getLocationByCode("LOC-04");
  const value = claim.qty * claim.unitCost;

  const shelfAge = daysSince(claim.receivedOn);
  const supplierAge = daysSince(claim.sentOn);
  const overdue =
    (claim.stage === "RECEIVED" && shelfAge >= claimPolicy.remindUnsentAfterDays) ||
    (claim.stage === "SENT" && supplierAge >= claimPolicy.remindSupplierAfterDays);

  const stageIndex = FLOW.indexOf(claim.stage);
  const settled = ["REPLACED", "CREDITED", "REJECTED", "WRITTEN_OFF"].includes(claim.stage);

  /* Same item claimed before? Worth knowing — it may be the line, not the piece. */
  const sameItem = claims.filter((c) => c.productId === claim.productId && c.id !== claim.id);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Daily Work" },
          { label: "Claims", href: "/claims" },
          { label: claim.claimNo },
        ]}
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{claim.claimNo}</span>
            <StatusPill variant={CLAIM_STAGE_VARIANT[claim.stage]}>
              {CLAIM_STAGE_LABEL[claim.stage]}
            </StatusPill>
          </div>
        }
        subtitle={`Received ${formatDate(claim.receivedOn)} by ${claim.receivedBy}`}
        actions={
          <>
            <Button variant="ghost" size="md" className="gap-1.5" asChild>
              <Link href="/claims"><ArrowLeft /> Back</Link>
            </Button>
            <Button variant="ghost" size="md" className="gap-1.5"
              onClick={() => toast.info("Printing claim slip…")}>
              <Printer /><span className="hidden sm:inline">Print</span>
            </Button>
            {claim.stage === "RECEIVED" && (
              <Button variant="accent" size="md" className="gap-1.5" onClick={() => setSending(true)}>
                <Send /> Send to Supplier
              </Button>
            )}
          </>
        }
      />

      {overdue && (
        <Card className="mb-5 border-warning/40 bg-warning/5">
          <CardBody className="flex items-start gap-3 py-3">
            <BellRing className="size-4 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 dark:text-slate-200">
              {claim.stage === "RECEIVED" ? (
                <>
                  These pieces have been on the claim shelf{" "}
                  <span className="font-semibold">{shelfAge} days</span> without going to a
                  supplier. Money is sitting still.
                </>
              ) : (
                <>
                  <span className="font-semibold">{claim.supplierName}</span> has had this{" "}
                  <span className="font-semibold">{supplierAge} days</span> with no decision.
                  Asked {claim.remindersSent} times already.
                </>
              )}
            </p>
          </CardBody>
        </Card>
      )}

      {/* Progress */}
      <Card className="mb-5">
        <CardBody>
          <div className="flex items-center gap-2">
            {FLOW.map((stage, i) => {
              const done = stageIndex >= i || settled;
              const isRefused =
                i === 2 && (claim.stage === "REJECTED" || claim.stage === "WRITTEN_OFF");
              return (
                <React.Fragment key={stage}>
                  <div className="flex flex-col items-center gap-1.5 flex-1">
                    <div
                      className={cn(
                        "size-8 rounded-full flex items-center justify-center text-xs font-bold",
                        isRefused
                          ? "bg-danger text-white"
                          : done
                            ? "bg-success text-white"
                            : "bg-slate-100 dark:bg-navy-800 text-slate-400"
                      )}
                    >
                      {isRefused ? <X className="size-4" /> : done ? <Check className="size-4" /> : i + 1}
                    </div>
                    <span
                      className={cn(
                        "text-2xs font-medium text-center",
                        done ? "text-navy-900 dark:text-white" : "text-slate-400"
                      )}
                    >
                      {i === 2 && isRefused ? "Refused" : CLAIM_STAGE_LABEL[stage]}
                    </span>
                  </div>
                  {i < FLOW.length - 1 && (
                    <div
                      className={cn(
                        "h-0.5 flex-1 rounded",
                        stageIndex > i || settled ? "bg-success" : "bg-slate-100 dark:bg-navy-800"
                      )}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* What came back */}
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">
                What came back
              </h3>
              <div className="flex items-start gap-4">
                <div className="size-12 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <PackageX className="size-6 text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold text-navy-900 dark:text-white">
                    {claim.qty} × {claim.productName}
                  </div>
                  <div className="tabular text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {claim.sku}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <Badge variant="warning">{claim.reasonLabel}</Badge>
                    <Badge variant="muted">{OUTCOME_LABEL[claim.customerOutcome]}</Badge>
                    {claim.originalOrderNo && (
                      <Badge variant="info">from {claim.originalOrderNo}</Badge>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="tabular text-lg font-bold text-navy-900 dark:text-white">
                    {formatMoney(value)}
                  </div>
                  <div className="text-2xs text-slate-500 dark:text-slate-400">
                    at {formatMoney(claim.unitCost)} each
                  </div>
                </div>
              </div>

              {claim.note && (
                <p className="mt-4 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-navy-900 rounded-md p-3">
                  <span className="font-semibold">Shop said:</span> {claim.note}
                </p>
              )}
            </CardBody>
          </Card>

          {/* Settle */}
          {claim.stage === "SENT" && (
            <Card>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-1">
                  What did {claim.supplierName} decide?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Sent {formatDate(claim.sentOn!)} · {supplierAge} days ago
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="accent" size="md" className="gap-1.5"
                    onClick={() => toast.success("Marked replaced", { description: `${claim.qty} fresh pieces back into stock.` })}>
                    <Check /> Replaced
                  </Button>
                  <Button variant="secondary" size="md" className="gap-1.5"
                    onClick={() => toast.success("Marked credited", { description: `${formatMoney(value)} credit against the supplier account.` })}>
                    <RotateCcw /> Gave credit
                  </Button>
                  <Button variant="ghost" size="md" className="text-danger gap-1.5"
                    onClick={() => setRejecting(true)}>
                    <X /> Refused
                  </Button>
                  <Button variant="ghost" size="md"
                    onClick={() => toast.info("Reminder sent", { description: claim.supplierName })}>
                    Chase again
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Same item history */}
          {sameItem.length > 0 && (
            <Card>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white">
                  This item has come back before
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">
                  {sameItem.length} other {sameItem.length === 1 ? "claim" : "claims"} on the same code.
                  If this keeps happening, the problem is the line, not the piece.
                </p>
                <div className="space-y-2">
                  {sameItem.slice(0, 5).map((c) => (
                    <Link
                      key={c.id}
                      href={`/claims/${c.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-800"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-navy-900 dark:text-white">
                          {c.qty} pcs · {c.customerName}
                        </div>
                        <div className="tabular text-2xs text-slate-500 dark:text-slate-400">
                          {c.claimNo} · {formatDate(c.receivedOn)}
                        </div>
                      </div>
                      <Badge variant="muted">{c.reasonLabel}</Badge>
                      <StatusPill variant={CLAIM_STAGE_VARIANT[c.stage]}>
                        {CLAIM_STAGE_LABEL[c.stage]}
                      </StatusPill>
                    </Link>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Meta */}
        <div className="space-y-6">
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Customer</h3>
              <div className="flex items-center gap-3">
                <Avatar initials={claim.customerInitials} size="lg" />
                <div className="min-w-0">
                  <Link
                    href={`/parties/${claim.customerId}`}
                    className="font-semibold text-navy-900 dark:text-white truncate hover:text-brand-yellow"
                  >
                    {claim.customerName}
                  </Link>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {OUTCOME_LABEL[claim.customerOutcome]}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Where it is</h3>
              <dl className="space-y-2 text-xs">
                <Row icon={PackageX} label="Sitting in" value={claimLocation?.name ?? "Claim Stock"} />
                <Row icon={User} label="Received by" value={claim.receivedBy} />
                <Row icon={Clock} label="On shelf" value={`${shelfAge} days`} />
                {claim.supplierId && (
                  <Row icon={Truck} label="Supplier" value={claim.supplierName} />
                )}
                {claim.sentOn && (
                  <Row icon={Send} label="Sent" value={formatDate(claim.sentOn)} />
                )}
                {claim.settledOn && (
                  <Row icon={Check} label="Settled" value={formatDate(claim.settledOn)} />
                )}
              </dl>

              {claim.supplierNote && (
                <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-navy-900 rounded-md p-2.5">
                  <span className="font-semibold">Supplier said:</span> {claim.supplierNote}
                </p>
              )}
            </CardBody>
          </Card>

          {claim.stage === "WRITTEN_OFF" && (
            <Card className="border-danger/30 bg-danger/5">
              <CardBody>
                <h3 className="text-sm font-semibold text-danger">Written off</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  {formatMoney(value)} posted to {claimPolicy.writeOffAccount}.
                </p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* Send to supplier */}
      <ConfirmDialog
        open={sending}
        onOpenChange={setSending}
        title="Send this claim to the supplier?"
        description={
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {claim.qty} × {claim.productName} — {formatMoney(value)} at cost.
            </p>
            <div>
              <Label htmlFor="claim-supplier">Which supplier?</Label>
              <SelectNative
                id="claim-supplier"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="mt-1.5"
              >
                <option value="">— Pick a supplier —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.displayName}</option>
                ))}
              </SelectNative>
            </div>
          </div>
        }
        variant="info"
        confirmLabel="Send to supplier"
        onConfirm={() => {
          const s = suppliers.find((x) => x.id === Number(supplierId));
          toast.success("Claim sent", {
            description: s
              ? `${claim.claimNo} is now with ${s.displayName}. You will be reminded after ${claimPolicy.remindSupplierAfterDays} days.`
              : claim.claimNo,
          });
          setSending(false);
        }}
      />

      <ConfirmDialog
        open={rejecting}
        onOpenChange={setRejecting}
        title="Supplier refused this claim?"
        description={`${formatMoney(value)} will be written off to ${claimPolicy.writeOffAccount}.`}
        variant="danger"
        confirmLabel="Yes, write it off"
        requireReason
        reasonLabel="What reason did they give?"
        onConfirm={(r) => {
          toast.success("Written off", { description: `Reason: ${r}` });
          setRejecting(false);
        }}
      />
    </>
  );
}

function Row({
  icon: Icon, label, value,
}: {
  icon: typeof Clock; label: string; value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-3 text-slate-400 flex-shrink-0" />
      <dt className="text-slate-500 dark:text-slate-400 w-24 flex-shrink-0">{label}</dt>
      <dd className="text-slate-700 dark:text-slate-200 truncate">{value}</dd>
    </div>
  );
}
