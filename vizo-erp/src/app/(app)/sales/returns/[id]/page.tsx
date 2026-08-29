"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft, AlertCircle, CheckCircle2, Printer, AlertTriangle, RotateCcw,
  Calendar, FileText, RefreshCw, Loader2, XCircle, Clock, ShieldCheck, Undo2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatDate, formatRelative } from "@/lib/format";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/labels";

/* GET /sales/returns/{id} -- the header, the real returned lines with what the
   original invoice sold, who decided what and why, and the activity trail.
   This screen used to render two hard-coded lines called SAMPLE_RETURN_LINES
   whichever return you opened, and Approve/Reject only produced a toast. */
type ReturnLine = {
  id: number; lineNo: number; productId: number; name: string; sku: string;
  qty: number; rate: number; condition: string; conditionName: string;
  isResalable: boolean; restockLocation: string | null; soldQty: number;
};

type Activity = {
  id: number; action: string; detail: string | null;
  at: string; severity: string; user: string;
};

type ReturnDetail = {
  id: number; returnNo: string;
  invoiceId: number; invoiceNo: string; invoiceDate: string; invoiceTotal: number;
  customerId: number; customerName: string; customerInitials: string; customerPhone: string | null;
  locationId: number; location: string;
  returnDate: string; reason: string;
  refundMethod: string; refundMethodName: string;
  status: string; statusName: string; createdBy: string;
  decisionReason: string | null; decidedAt: string | null; decidedBy: string | null;
  totalAmount: number; resalableQty: number; damagedQty: number;
  lines: ReturnLine[];
  activity: Activity[];
};

/* Real "ReturnStatus".StatusKey values: DRAFT, APPROVED, POSTED, REJECTED. */
const RETURN_STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "info" | "muted"> = {
  DRAFT: "muted", APPROVED: "info", POSTED: "success", REJECTED: "danger",
};

const ACTIVITY_LOOK: Record<string, { icon: typeof FileText; tone: "info" | "success" | "warning" | "danger" }> = {
  SALES_RETURN_CREATED: { icon: RotateCcw, tone: "info" },
  SALES_RETURN_APPROVED: { icon: CheckCircle2, tone: "info" },
  SALES_RETURN_POSTED: { icon: ShieldCheck, tone: "success" },
  SALES_RETURN_REJECTED: { icon: XCircle, tone: "danger" },
};

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

const humanAction = (a: string) => a.toLowerCase().replace(/_/g, " ");

export default function SalesReturnDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "", 10);

  const [r, setR] = React.useState<ReturnDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  /* Declared before any early return so the hook order never changes. */
  const [approveConfirm, setApproveConfirm] = React.useState(false);
  const [postConfirm, setPostConfirm] = React.useState(false);
  const [rejectConfirm, setRejectConfirm] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!Number.isFinite(id)) { setLoading(false); return; }
    try {
      const res = await axios.get<ReturnDetail>(`${API_BASE_URL}/sales/returns/${id}`, { headers: authHeader() });
      setR(res.data);
      setError(null);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        setR(null);
        setError(null);
      } else {
        setError(apiMessage(e, "Could not load this return."));
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  /* Every decision goes through here. The whole return is reloaded afterwards
     because a rejection also moves stock -- the screen has to show what the
     database now holds, not what the button implied. */
  async function decide(statusKey: string, reason?: string) {
    setBusy(true);
    try {
      const res = await axios.patch<{ message: string; unitsReversed: number }>(
        `${API_BASE_URL}/sales/returns/${id}/status`,
        { statusKey, reason: reason ?? null },
        { headers: authHeader() });
      toast.success("Return updated", { description: res.data.message });
      setApproveConfirm(false);
      setPostConfirm(false);
      setRejectConfirm(false);
      await load();
    } catch (e) {
      toast.error("Could not update the return", { description: apiMessage(e, "Please try again.") });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Could not load this return"
        description={error}
        action={<Button variant="accent" onClick={() => { setLoading(true); void load(); }}><RefreshCw />Try again</Button>}
      />
    );
  }

  if (!r) {
    return <EmptyState icon={AlertCircle} title="Return not found" action={<Button asChild><Link href="/sales/returns">Back</Link></Button>} />;
  }

  const isDraft = r.status === "DRAFT";
  const isApproved = r.status === "APPROVED";
  const isRejected = r.status === "REJECTED";
  const isPosted = r.status === "POSTED";

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Sales" }, { label: "Returns", href: "/sales/returns" }, { label: r.returnNo }]}
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <RotateCcw className="size-6 text-brand-yellow" />
            <span>{r.returnNo}</span>
            <StatusPill variant={RETURN_STATUS_VARIANT[r.status] ?? "muted"}>{statusLabel(r.status)}</StatusPill>
          </div>
        }
        subtitle={`${r.customerName} · ${formatDate(r.returnDate)} · against ${r.invoiceNo} · raised by ${r.createdBy}`}
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/sales/returns"><ArrowLeft />Back</Link></Button>
            <Button variant="ghost" className="gap-1.5"
              onClick={() => window.open(`${API_BASE_URL}/sales/invoices/${r.invoiceId}/pdf`, "_blank", "noopener,noreferrer")}>
              <Printer /><span className="hidden sm:inline">Original bill</span>
            </Button>

            {isDraft && (
              <>
                <Button variant="ghost" className="text-danger gap-1.5" onClick={() => setRejectConfirm(true)} disabled={busy}>
                  <XCircle />Reject
                </Button>
                <Button variant="accent" className="gap-1.5" onClick={() => setApproveConfirm(true)} disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 />}Approve
                </Button>
              </>
            )}

            {isApproved && (
              <>
                <Button variant="ghost" className="text-danger gap-1.5" onClick={() => setRejectConfirm(true)} disabled={busy}>
                  <XCircle />Reject
                </Button>
                <Button variant="accent" className="gap-1.5" onClick={() => setPostConfirm(true)} disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck />}Post
                </Button>
              </>
            )}

            {isPosted && (
              <Button variant="ghost" className="text-danger gap-1.5" onClick={() => setRejectConfirm(true)} disabled={busy}>
                <Undo2 />Reverse &amp; reject
              </Button>
            )}
          </>
        }
      />

      {/* The decision, once one has been made. */}
      {(isRejected || r.decisionReason) && (
        <Card className={cn("mb-6", isRejected ? "bg-danger/5 border-danger/30" : "bg-info/5 border-info/30")}>
          <CardBody>
            <div className="flex items-start gap-3">
              <div className={cn("size-10 rounded-lg flex items-center justify-center flex-shrink-0",
                isRejected ? "bg-danger/15" : "bg-info/15")}>
                {isRejected ? <XCircle className="size-5 text-danger" /> : <CheckCircle2 className="size-5 text-info" />}
              </div>
              <div className="flex-1">
                <h3 className={cn("text-base font-semibold",
                  isRejected ? "text-danger-dark dark:text-danger-light" : "text-info-dark dark:text-info-light")}>
                  {r.statusName}
                  {r.decidedBy && ` by ${r.decidedBy}`}
                </h3>
                {r.decisionReason && (
                  <p className={cn("text-sm mt-1",
                    isRejected ? "text-danger-dark/80 dark:text-danger-light/80" : "text-info-dark/80 dark:text-info-light/80")}>
                    {r.decisionReason}
                  </p>
                )}
                {r.decidedAt && (
                  <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1">
                    {formatDate(r.decidedAt)} · {formatRelative(r.decidedAt)}
                  </p>
                )}
                {isRejected && r.resalableQty > 0 && (
                  <p className="text-xs text-danger-dark/80 dark:text-danger-light/80 mt-2">
                    The resalable units on this return were taken back off the shelf when it was rejected.
                  </p>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Condition summary */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 bg-success/5 border-success/30">
              <div className="text-2xs uppercase font-semibold text-success-dark dark:text-success-light">Resalable</div>
              <div className="text-2xl tabular font-bold text-success mt-1">{r.resalableQty}</div>
              <div className="text-xs text-success-dark/70 dark:text-success-light/70 mt-0.5">
                {isRejected ? "Taken back off the shelf" : "Back in stock"}
              </div>
            </Card>
            <Card className="p-4 bg-danger/5 border-danger/30">
              <div className="text-2xs uppercase font-semibold text-danger-dark dark:text-danger-light">Damaged / lost</div>
              <div className="text-2xl tabular font-bold text-danger mt-1">{r.damagedQty}</div>
              <div className="text-xs text-danger-dark/70 dark:text-danger-light/70 mt-0.5">Written off, debit-note candidate</div>
            </Card>
          </div>

          {/* Returned items */}
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-navy-700">
              <h3 className="text-base font-semibold text-navy-900 dark:text-white">Returned Items</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{r.lines.length} lines coming back</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-navy-700/50 text-left">
                    <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2">Product</th>
                    <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Sold</th>
                    <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Returning</th>
                    <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2">Condition</th>
                    <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2">Restock to</th>
                    <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Refund</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                  {r.lines.map((l) => (
                    <tr key={l.id}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-navy-900 dark:text-white">{l.name}</div>
                        <div className="text-2xs tabular text-slate-500 dark:text-slate-400 mt-0.5">{l.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular text-sm text-slate-600 dark:text-slate-300">{l.soldQty}</td>
                      <td className="px-4 py-3 text-right tabular text-sm font-bold text-warning">{l.qty}</td>
                      <td className="px-4 py-3">
                        <Badge variant={l.isResalable ? "success" : l.condition === "DAMAGED" ? "danger" : "warning"}>
                          {l.conditionName}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                        {l.restockLocation ?? <span className="text-danger">— write-off —</span>}
                      </td>
                      <td className="px-4 py-3 text-right tabular text-sm font-semibold text-navy-900 dark:text-white">
                        {formatMoney(l.rate * l.qty)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 dark:bg-navy-900/40">
                    <td colSpan={5} className="px-4 py-3 text-right text-sm font-bold uppercase tracking-wider">Total refund</td>
                    <td className="px-4 py-3 text-right tabular text-base font-bold text-warning">{formatMoney(r.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {(isPosted || isApproved) && (
            <Card className="bg-info/5 border-info/30">
              <CardBody>
                <h4 className="text-sm font-semibold text-info-dark dark:text-info-light mb-2">Accounting posting</h4>
                <div className="text-xs font-mono text-info-dark/80 dark:text-info-light/80 space-y-1">
                  <div>DR Sales Returns &amp; Allowances · CR Accounts Receivable ({r.customerName}) — {formatMoney(r.totalAmount)}</div>
                  {r.resalableQty > 0 && <div>DR Inventory ({r.resalableQty} resalable units) · CR COGS</div>}
                  {r.damagedQty > 0 && <div>DR Inventory Write-off ({r.damagedQty} damaged) · CR COGS</div>}
                </div>
                <p className="text-2xs text-info-dark/70 dark:text-info-light/70 mt-2">
                  This is the entry the accountant will raise. Stock has already moved; the journal
                  is posted from Accounting once the refund is settled.
                </p>
              </CardBody>
            </Card>
          )}

          {/* Activity */}
          <Card>
            <CardBody>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">History</h3>
              {r.activity.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
                  Nothing recorded against this return yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {r.activity.map((a, i) => {
                    const look = ACTIVITY_LOOK[a.action] ?? { icon: Clock, tone: "info" as const };
                    const Icon = look.icon;
                    const isLast = i === r.activity.length - 1;
                    return (
                      <div key={a.id} className="flex gap-3">
                        <div className="relative flex-shrink-0">
                          <div className={cn("size-8 rounded-full flex items-center justify-center",
                            look.tone === "success" && "bg-success/10 text-success",
                            look.tone === "info" && "bg-info/10 text-info",
                            look.tone === "warning" && "bg-warning/10 text-warning",
                            look.tone === "danger" && "bg-danger/10 text-danger"
                          )}>
                            <Icon className="size-3.5" />
                          </div>
                          {!isLast && <div className="absolute top-8 left-1/2 -translate-x-1/2 w-px h-full bg-slate-200 dark:bg-navy-700" />}
                        </div>
                        <div className="flex-1 min-w-0 pb-4">
                          <div className="text-sm text-navy-900 dark:text-white">
                            <span className="font-semibold">{a.user}</span>{" "}
                            <span className="text-slate-600 dark:text-slate-300">{humanAction(a.action)}</span>
                          </div>
                          {a.detail && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{a.detail}</div>}
                          <div className="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">
                            {formatDate(a.at)} · {formatRelative(a.at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Customer</h3>
                <Link href={`/parties/${r.customerId}`} className="text-xs text-brand-yellow hover:underline font-medium">View profile</Link>
              </div>
              <div className="flex items-center gap-3">
                <Avatar initials={r.customerInitials} size="md" />
                <div className="min-w-0">
                  <div className="font-semibold text-navy-900 dark:text-white truncate">{r.customerName}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{r.customerPhone ?? r.location}</div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Details</h3>
              <dl className="space-y-2.5 text-sm">
                <Meta label="Original invoice" value={
                  <Link href={`/sales/invoices/${r.invoiceId}`} className="text-brand-yellow hover:underline tabular">{r.invoiceNo}</Link>
                } />
                <Meta label="Invoice total" value={<span className="tabular">{formatMoney(r.invoiceTotal)}</span>} />
                <Meta label="Return date" icon={Calendar} value={formatDate(r.returnDate)} />
                <Meta label="Refund method" value={<Badge variant="info">{r.refundMethodName}</Badge>} />
                <Meta label="Location" value={r.location} />
                <Meta label="Raised by" value={r.createdBy} />
              </dl>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-navy-700">
                <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
                  <FileText className="size-3" />Reason
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5">{r.reason}</p>
              </div>
            </CardBody>
          </Card>

          {r.damagedQty > 0 && (
            <Card className="bg-warning/5 border-warning/30">
              <CardBody>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="size-4 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-warning-dark dark:text-warning-light">Damaged stock present</h4>
                    <p className="text-xs text-warning-dark/80 dark:text-warning-light/80 mt-1">
                      {r.damagedQty} units are written off. If they arrived damaged from the supplier,
                      raise a claim so the cost is not carried here.
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={approveConfirm}
        onOpenChange={setApproveConfirm}
        title="Approve this return?"
        description={`${r.returnNo} will be marked approved and the refund of ${formatMoney(r.totalAmount)} via ${r.refundMethodName} can go ahead. The ${r.resalableQty} resalable units are already back in stock.`}
        variant="info"
        confirmLabel="Approve"
        loading={busy}
        onConfirm={(reason) => decide("APPROVED", reason)}
      />
      <ConfirmDialog
        open={postConfirm}
        onOpenChange={setPostConfirm}
        title="Post this return?"
        description={`${r.returnNo} will be marked posted. Accounting can then raise the reversing journal entry of ${formatMoney(r.totalAmount)}.`}
        variant="info"
        confirmLabel="Post"
        loading={busy}
        onConfirm={(reason) => decide("POSTED", reason)}
      />
      <ConfirmDialog
        open={rejectConfirm}
        onOpenChange={setRejectConfirm}
        title="Reject this return?"
        description={
          r.resalableQty > 0
            ? `${r.returnNo} will be rejected and the ${r.resalableQty} resalable units put back on the shelf when it was raised will be taken off again. No refund is due.`
            : `${r.returnNo} will be rejected and no refund is due.`
        }
        variant="danger"
        confirmLabel="Reject return"
        requireReason
        reasonLabel="Why is it being rejected?"
        reasonPlaceholder="e.g. Items had been used; not resalable and outside the 7-day window."
        loading={busy}
        onConfirm={(reason) => decide("REJECTED", reason)}
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
