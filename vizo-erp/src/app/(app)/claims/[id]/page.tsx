"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft, AlertCircle, Send, Check, X, RotateCcw, PackageX,
  Clock, User, Truck, BellRing, RefreshCw, Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill, Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/dialogs";
import { SelectNative } from "@/components/ui/select-native";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /claims/{id}.
   ClaimStage keys are RECEIVED / SENT / REPLACED / CREDITED / REJECTED /
   WRITTEN_OFF -- there is no WITH_SUPPLIER and no SETTLED, whatever the old
   mock implied. */
type ClaimStage = "RECEIVED" | "SENT" | "REPLACED" | "CREDITED" | "REJECTED" | "WRITTEN_OFF";

type Claim = {
  id: number;
  claimNo: string;
  customerId: number;
  customerName: string;
  customerInitials: string;
  customerCode: string | null;
  customerPhone: string | null;
  receivedOn: string;
  receivedBy: string;
  productId: number;
  productName: string;
  sku: string;
  qty: number;
  unitCost: number;
  value: number;
  reasonId: number;
  reason: string;
  reasonLabel: string;
  usuallyAccepted: boolean;
  note: string | null;
  originalOrderNo: string | null;
  outcomeId: number;
  customerOutcome: string;
  customerOutcomeLabel: string;
  stageId: number;
  stage: ClaimStage;
  stageLabel: string;
  isOpen: boolean;
  supplierId: number | null;
  supplierName: string | null;
  sentOn: string | null;
  settledOn: string | null;
  supplierNote: string | null;
  remindersSent: number;
  daysWithSupplier: number | null;
};

type ClaimListItem = Pick<Claim,
  "id" | "claimNo" | "productId" | "qty" | "customerName" | "receivedOn" | "reasonLabel" | "stage" | "stageLabel">;
type ClaimList = { openCount: number; openValue: number; totalValue: number; items: ClaimListItem[] };

/* GET /claims/lookups. `policy` is the "claim" group out of AppSetting, served
   here because /admin/settings is SuperAdmin-only and the order desk works
   claims too. */
type Lookups = {
  stages: { id: number; key: ClaimStage; name: string; isOpen: boolean }[];
  suppliers: { id: number; code: string; name: string }[];
  policy: {
    windowDays: number;
    remindSupplierAfterDays: number;
    remindEveryHours: number;
    remindUnsentAfterDays: number;
    replaceUpfront: boolean;
    writeOffAccount: string;
  };
};

const STAGE_VARIANT: Record<ClaimStage, "info" | "warning" | "success" | "danger" | "muted"> = {
  RECEIVED: "warning",
  SENT: "info",
  REPLACED: "success",
  CREDITED: "success",
  REJECTED: "danger",
  WRITTEN_OFF: "muted",
};

/** The road a claim travels, for the progress strip. */
const FLOW: ClaimStage[] = ["RECEIVED", "SENT", "REPLACED"];
const FLOW_LABEL: Record<string, string> = {
  RECEIVED: "In claim stock",
  SENT: "With supplier",
  REPLACED: "Settled",
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

function daysSince(iso: string | null) {
  if (!iso) return 0;
  return Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
}

export default function ClaimDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);

  const [claim, setClaim] = React.useState<Claim | null>(null);
  const [siblings, setSiblings] = React.useState<ClaimListItem[]>([]);
  const [lookups, setLookups] = React.useState<Lookups | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notFound, setNotFound] = React.useState(false);

  const [sending, setSending] = React.useState(false);
  const [rejecting, setRejecting] = React.useState(false);
  const [supplierId, setSupplierId] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    try {
      const [c, lk, list] = await Promise.all([
        axios.get<Claim>(`${API_BASE_URL}/claims/${id}`, { headers: authHeader() }),
        axios.get<Lookups>(`${API_BASE_URL}/claims/lookups`, { headers: authHeader() }),
        axios.get<ClaimList>(`${API_BASE_URL}/claims`, { headers: authHeader() }),
      ]);
      setClaim(c.data);
      setLookups(lk.data);
      /* "This item has come back before" — every other claim on the same
         product, straight off the list the API already returns. */
      setSiblings(list.data.items.filter((x) => x.productId === c.data.productId && x.id !== c.data.id));
      setNotFound(false);
      setError(null);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) setNotFound(true);
      else setError(apiMessage(e, "Could not load this claim."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. */
    void load();
  }, [load]);

  async function sendToSupplier() {
    if (!claim) return;
    if (!supplierId) { toast.error("Pick a supplier first."); return; }
    setBusy("send");
    try {
      const res = await axios.post<{ message: string }>(
        `${API_BASE_URL}/claims/${claim.id}/send`,
        { supplierId: Number(supplierId) },
        { headers: authHeader() }
      );
      await load();
      setSending(false);
      setSupplierId("");
      toast.success("Claim sent", { description: res.data.message });
    } catch (e) {
      toast.error("Claim not sent", { description: apiMessage(e, "Please try again.") });
    } finally {
      setBusy(null);
    }
  }

  /** One call for every supplier verdict; only the stage key differs. */
  async function settle(stageKey: ClaimStage, note?: string) {
    if (!claim) return;
    setBusy(stageKey);
    try {
      const res = await axios.post<{ message: string }>(
        `${API_BASE_URL}/claims/${claim.id}/settle`,
        { stageKey, note: note ?? null },
        { headers: authHeader() }
      );
      await load();
      setRejecting(false);
      toast.success("Claim updated", { description: res.data.message });
    } catch (e) {
      toast.error("Claim not updated", { description: apiMessage(e, "Please try again.") });
    } finally {
      setBusy(null);
    }
  }

  async function chase() {
    if (!claim) return;
    setBusy("remind");
    try {
      const res = await axios.post<{ message: string }>(
        `${API_BASE_URL}/claims/${claim.id}/remind`,
        {},
        { headers: authHeader() }
      );
      await load();
      toast.success("Chase recorded", { description: res.data.message });
    } catch (e) {
      toast.error("Could not record the chase", { description: apiMessage(e, "Please try again.") });
    } finally {
      setBusy(null);
    }
  }

  /* ── loading / not found / error ─────────────────────────────────── */

  if (loading) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Daily Work" }, { label: "Claims", href: "/claims" }]} title="Loading…" />
        <Skeleton className="h-20 mb-5" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><Skeleton className="h-48" /></div>
          <Skeleton className="h-48" />
        </div>
      </>
    );
  }

  if (notFound) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Claim not found"
        description={`No claim with id ${id}.`}
        action={<Button variant="accent" asChild><Link href="/claims">Back to Claims</Link></Button>}
      />
    );
  }

  if (error || !claim || !lookups) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Daily Work" }, { label: "Claims", href: "/claims" }]} title="Claim" />
        <Card>
          <CardBody className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-navy-900 dark:text-white">{error}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                The API must be running on {API_BASE_URL}.
              </div>
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setLoading(true); void load(); }}>
              <RefreshCw className="size-4" /> Try again
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  /* ── derived ─────────────────────────────────────────────────────── */

  const policy = lookups.policy;
  const shelfAge = daysSince(claim.receivedOn);
  const supplierAge = claim.daysWithSupplier ?? daysSince(claim.sentOn);
  const overdue =
    (claim.stage === "RECEIVED" && shelfAge >= policy.remindUnsentAfterDays) ||
    (claim.stage === "SENT" && supplierAge >= policy.remindSupplierAfterDays);

  const stageIndex = FLOW.indexOf(claim.stage);
  const settled = ["REPLACED", "CREDITED", "REJECTED", "WRITTEN_OFF"].includes(claim.stage);

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
            <StatusPill variant={STAGE_VARIANT[claim.stage]}>{claim.stageLabel}</StatusPill>
          </div>
        }
        subtitle={`Received ${formatDate(claim.receivedOn)} by ${claim.receivedBy}`}
        actions={
          <>
            <Button variant="ghost" size="md" className="gap-1.5" asChild>
              <Link href="/claims"><ArrowLeft /> Back</Link>
            </Button>
            <Button variant="ghost" size="md" className="gap-1.5" onClick={() => void load()}>
              <RefreshCw className="size-4" /><span className="hidden sm:inline">Refresh</span>
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
              const isRefused = i === 2 && (claim.stage === "REJECTED" || claim.stage === "WRITTEN_OFF");
              return (
                <React.Fragment key={stage}>
                  <div className="flex flex-col items-center gap-1.5 flex-1">
                    <div className={cn(
                      "size-8 rounded-full flex items-center justify-center text-xs font-bold",
                      isRefused ? "bg-danger text-white" : done ? "bg-success text-white" : "bg-slate-100 dark:bg-navy-800 text-slate-400"
                    )}>
                      {isRefused ? <X className="size-4" /> : done ? <Check className="size-4" /> : i + 1}
                    </div>
                    <span className={cn("text-2xs font-medium text-center", done ? "text-navy-900 dark:text-white" : "text-slate-400")}>
                      {i === 2 && isRefused ? "Refused" : FLOW_LABEL[stage]}
                    </span>
                  </div>
                  {i < FLOW.length - 1 && (
                    <div className={cn("h-0.5 flex-1 rounded", stageIndex > i || settled ? "bg-success" : "bg-slate-100 dark:bg-navy-800")} />
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
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">What came back</h3>
              <div className="flex items-start gap-4">
                <div className="size-12 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <PackageX className="size-6 text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/inventory/products/${claim.productId}`} className="text-base font-semibold text-navy-900 dark:text-white hover:text-brand-yellow">
                    {claim.qty} × {claim.productName}
                  </Link>
                  <div className="tabular text-xs text-slate-500 dark:text-slate-400 mt-0.5">{claim.sku}</div>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <Badge variant="warning">{claim.reasonLabel}</Badge>
                    <Badge variant="muted">{claim.customerOutcomeLabel}</Badge>
                    {claim.originalOrderNo && <Badge variant="info">from {claim.originalOrderNo}</Badge>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="tabular text-lg font-bold text-navy-900 dark:text-white">{formatMoney(claim.value)}</div>
                  <div className="text-2xs text-slate-500 dark:text-slate-400">at {formatMoney(claim.unitCost)} each</div>
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
                  Sent {claim.sentOn ? formatDate(claim.sentOn) : "—"} · {supplierAge} days ago
                  {claim.remindersSent > 0 && ` · chased ${claim.remindersSent}×`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="accent" size="md" className="gap-1.5"
                    disabled={busy !== null} onClick={() => void settle("REPLACED")}>
                    {busy === "REPLACED" ? <Loader2 className="size-4 animate-spin" /> : <Check />} Replaced
                  </Button>
                  <Button variant="secondary" size="md" className="gap-1.5"
                    disabled={busy !== null} onClick={() => void settle("CREDITED")}>
                    {busy === "CREDITED" ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw />} Gave credit
                  </Button>
                  <Button variant="ghost" size="md" className="text-danger gap-1.5"
                    disabled={busy !== null} onClick={() => setRejecting(true)}>
                    <X /> Refused
                  </Button>
                  <Button variant="ghost" size="md" className="gap-1.5"
                    disabled={busy !== null} onClick={() => void chase()}>
                    {busy === "remind" ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />} Chase again
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Same item history */}
          {siblings.length > 0 && (
            <Card>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white">This item has come back before</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">
                  {siblings.length} other {siblings.length === 1 ? "claim" : "claims"} on the same code.
                  If this keeps happening, the problem is the line, not the piece.
                </p>
                <div className="space-y-2">
                  {siblings.slice(0, 5).map((c) => (
                    <Link key={c.id} href={`/claims/${c.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-800">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-navy-900 dark:text-white">{c.qty} pcs · {c.customerName}</div>
                        <div className="tabular text-2xs text-slate-500 dark:text-slate-400">
                          {c.claimNo} · {formatDate(c.receivedOn)}
                        </div>
                      </div>
                      <Badge variant="muted">{c.reasonLabel}</Badge>
                      <StatusPill variant={STAGE_VARIANT[c.stage]}>{c.stageLabel}</StatusPill>
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
                  <Link href={`/parties/${claim.customerId}`}
                    className="font-semibold text-navy-900 dark:text-white truncate hover:text-brand-yellow">
                    {claim.customerName}
                  </Link>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{claim.customerOutcomeLabel}</div>
                  {claim.customerPhone && (
                    <div className="tabular text-2xs text-slate-500 dark:text-slate-400 mt-0.5">{claim.customerPhone}</div>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Where it is</h3>
              <dl className="space-y-2 text-xs">
                <Row icon={PackageX} label="Sitting in" value="Claim Stock" />
                <Row icon={User} label="Received by" value={claim.receivedBy} />
                <Row icon={Clock} label="On shelf" value={`${shelfAge} days`} />
                {claim.supplierName && <Row icon={Truck} label="Supplier" value={claim.supplierName} />}
                {claim.sentOn && <Row icon={Send} label="Sent" value={formatDate(claim.sentOn)} />}
                {claim.settledOn && <Row icon={Check} label="Settled" value={formatDate(claim.settledOn)} />}
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
                  {formatMoney(claim.value)} posted to {policy.writeOffAccount}.
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
              {claim.qty} × {claim.productName} — {formatMoney(claim.value)} at cost.
            </p>
            <div>
              <Label htmlFor="claim-supplier">Which supplier?</Label>
              <SelectNative id="claim-supplier" value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)} className="mt-1.5">
                <option value="">— Pick a supplier —</option>
                {lookups.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </SelectNative>
            </div>
          </div>
        }
        variant="info"
        confirmLabel={busy === "send" ? "Sending…" : "Send to supplier"}
        onConfirm={() => { void sendToSupplier(); }}
      />

      <ConfirmDialog
        open={rejecting}
        onOpenChange={setRejecting}
        title="Supplier refused this claim?"
        description={`${formatMoney(claim.value)} will be written off to ${policy.writeOffAccount}.`}
        variant="danger"
        confirmLabel={busy === "WRITTEN_OFF" ? "Writing off…" : "Yes, write it off"}
        requireReason
        reasonLabel="What reason did they give?"
        onConfirm={(r) => { void settle("WRITTEN_OFF", r); }}
      />
    </>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-3 text-slate-400 flex-shrink-0" />
      <dt className="text-slate-500 dark:text-slate-400 w-24 flex-shrink-0">{label}</dt>
      <dd className="text-slate-700 dark:text-slate-200 truncate">{value}</dd>
    </div>
  );
}
