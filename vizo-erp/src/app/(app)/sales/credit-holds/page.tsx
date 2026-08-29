"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import {
  AlertTriangle, ShieldCheck, X, Eye, AlertCircle, MessageCircle,
  RefreshCw, Loader2, Users, Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { WhatsAppShareDialog } from "@/components/dialogs/whatsapp-share-dialog";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatDate } from "@/lib/format";
import { prettyPhone } from "@/lib/whatsapp";
import { reminderMessage } from "@/lib/whatsapp";

/* GET /sales/credit-holds -- the queue of orders parked over their limit.
   Accountant and owner only; a sales rep must not see, let alone clear,
   this list. `outstanding` is the customer ledger balance from POSTED
   entries, and `customerPhone` is here so Remind dials the buyer's real
   number rather than one typed from memory. */
type Hold = {
  id: number; orderNo: string; customerId: number; customerName: string;
  customerCode: string; customerInitials: string;
  customerPhone: string | null; customerAltPhone: string | null; city: string;
  creditLimit: number; creditDays: number; holdPolicy: string;
  orderDate: string; total: number; reason: string | null;
  salesPerson: string | null; itemCount: number;
  outstanding: number; paidAmount: number; overBy: number;
};

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function CreditHoldsPage() {
  const [holds, setHolds] = React.useState<Hold[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [override, setOverride] = React.useState<Hold | null>(null);
  const [cancel, setCancel] = React.useState<Hold | null>(null);
  const [remind, setRemind] = React.useState<Hold | null>(null);
  const [company, setCompany] = React.useState<string | undefined>(undefined);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<Hold[]>(`${API_BASE_URL}/sales/credit-holds`, {
        headers: authHeader(),
      });
      setHolds(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the credit-hold queue."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  /* The trading name for the reminder sign-off, off the Company row. Failing
     to get it is not worth an error on this screen -- the message falls back
     to "VIZO". */
  React.useEffect(() => {
    void axios
      .get<{ company: { name: string } | null }>(`${API_BASE_URL}/sales/lookups`, { headers: authHeader() })
      .then((r) => setCompany(r.data.company?.name))
      .catch(() => undefined);
  }, []);

  async function releaseHold(hold: Hold, reason?: string) {
    setBusy(true);
    try {
      const res = await axios.post<{ message: string }>(
        `${API_BASE_URL}/sales/credit-holds/${hold.id}/override`,
        { reason: reason ?? "", raiseInvoice: true },
        { headers: authHeader() });
      toast.success("Credit hold released", { description: res.data.message });
      setOverride(null);
      await load();
    } catch (e) {
      toast.error("Could not release the hold", { description: apiMessage(e, "Please try again.") });
    } finally {
      setBusy(false);
    }
  }

  async function cancelOrder(hold: Hold, reason?: string) {
    setBusy(true);
    try {
      const res = await axios.patch<{ message: string }>(
        `${API_BASE_URL}/sales/orders/${hold.id}/status`,
        { statusKey: "CANCELLED", reason: reason ?? null },
        { headers: authHeader() });
      toast.success("Order cancelled", { description: res.data.message });
      setCancel(null);
      await load();
    } catch (e) {
      toast.error("Could not cancel the order", { description: apiMessage(e, "Please try again.") });
    } finally {
      setBusy(false);
    }
  }

  const totalHeld = holds.reduce((s, h) => s + h.total, 0);
  const customers = new Set(holds.map((h) => h.customerId)).size;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Sales" }, { label: "Limit Alerts" }]}
        title="Credit Holds Queue"
        subtitle={
          loading
            ? "Loading the queue…"
            : `${holds.length} order${holds.length === 1 ? "" : "s"} awaiting a credit decision`
        }
        actions={
          <Button variant="ghost" size="md" className="gap-1.5" onClick={() => { setLoading(true); void load(); }}>
            <RefreshCw className="size-4" />Refresh
          </Button>
        }
      />

      {error && (
        <Card className="p-4 mb-6 border-danger/40">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{error}</div>
            <Button variant="secondary" size="sm" onClick={() => { setLoading(true); void load(); }}>Try again</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 bg-warning/5 border-warning/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-warning-dark dark:text-warning-light">Pending action</div>
              <div className="text-2xl tabular font-bold text-warning mt-1">{holds.length}</div>
            </div>
            <AlertTriangle className="size-5 text-warning" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Total value held</div>
              <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{formatMoney(totalHeld)}</div>
            </div>
            <Wallet className="size-5 text-slate-300 dark:text-navy-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Affected customers</div>
              <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{customers}</div>
            </div>
            <Users className="size-5 text-slate-300 dark:text-navy-600" />
          </div>
        </Card>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : holds.length === 0 ? (
          <Card>
            <CardBody>
              <div className="text-center py-12 text-slate-400">
                <ShieldCheck className="size-12 mx-auto mb-3 text-success" />
                <h3 className="text-base font-semibold text-navy-900 dark:text-white">No credit holds</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Every order is within its customer&rsquo;s limit.</p>
              </div>
            </CardBody>
          </Card>
        ) : (
          holds.map((o) => {
            const phone = o.customerPhone ?? o.customerAltPhone ?? "";
            return (
              <Card key={o.id} className="border-warning/30 bg-warning/[0.02]">
                <CardBody>
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Avatar initials={o.customerInitials} size="lg" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/sales/orders/${o.id}`} className="text-base font-semibold text-navy-900 dark:text-white hover:text-brand-yellow-700 dark:hover:text-brand-yellow">
                            {o.orderNo}
                          </Link>
                          <Badge variant="warning">LIMIT CROSS</Badge>
                          <Badge variant="muted">{o.holdPolicy}</Badge>
                        </div>
                        <div className="text-sm text-slate-700 dark:text-slate-200 mt-0.5">
                          {o.customerName}
                          <span className="text-slate-500 dark:text-slate-400"> · {o.customerCode}</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {o.city} · NET {o.creditDays} · {o.salesPerson ?? "no rep"} · {formatDate(o.orderDate)} · {o.itemCount} items
                          {phone && ` · ${prettyPhone(phone)}`}
                        </div>
                        {o.reason && (
                          <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-warning-dark dark:text-warning-light bg-warning/10 px-2.5 py-1 rounded">
                            <AlertTriangle className="size-3" />
                            {o.reason}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Order value</div>
                      <div className="text-xl tabular font-bold text-navy-900 dark:text-white">{formatMoney(o.total)}</div>
                      <div className="text-2xs tabular text-slate-500 dark:text-slate-400 mt-0.5">
                        owes {formatMoney(o.outstanding)} of {formatMoney(o.creditLimit)}
                      </div>
                      {o.overBy > 0 && (
                        <div className="text-2xs tabular text-danger font-semibold">over by {formatMoney(o.overBy)}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      <Button variant="secondary" size="md" className="gap-1.5" onClick={() => setRemind(o)}>
                        <MessageCircle />Remind
                      </Button>
                      <Button variant="ghost" size="md" asChild>
                        <Link href={`/sales/orders/${o.id}`}><Eye />Review</Link>
                      </Button>
                      <Button variant="ghost" size="md" className="gap-1.5 text-danger" onClick={() => setCancel(o)} disabled={busy}>
                        <X />Cancel
                      </Button>
                      <Button variant="accent" size="md" className="gap-1.5" onClick={() => setOverride(o)} disabled={busy}>
                        {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck />}Override
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })
        )}
      </div>

      {override && (
        <ConfirmDialog
          open={!!override}
          onOpenChange={(o) => !o && setOverride(null)}
          title="Override this credit limit?"
          description={
            <span>
              {override.orderNo} takes <strong>{override.customerName}</strong> to{" "}
              <span className="tabular font-semibold">{formatMoney(override.outstanding + override.total)}</span>{" "}
              against a limit of <span className="tabular font-semibold">{formatMoney(override.creditLimit)}</span>.
              Releasing it confirms the order and raises the invoice. Your name and this reason go on
              the audit trail.
            </span>
          }
          variant="warning"
          confirmLabel="Override and invoice"
          requireReason
          reasonLabel="Why is this being released?"
          reasonPlaceholder="e.g. Cheque received, clears Monday. Owner approved on call."
          loading={busy}
          onConfirm={(r) => releaseHold(override, r)}
        />
      )}

      {cancel && (
        <ConfirmDialog
          open={!!cancel}
          onOpenChange={(o) => !o && setCancel(null)}
          title="Cancel this order?"
          description={`${cancel.orderNo} for ${cancel.customerName} will be marked cancelled. Nothing has been invoiced, so nothing needs reversing.`}
          variant="danger"
          confirmLabel="Yes, cancel order"
          requireReason
          reasonLabel="Cancellation reason"
          reasonPlaceholder="e.g. Customer will not clear the balance; order withdrawn."
          loading={busy}
          onConfirm={(r) => cancelOrder(cancel, r)}
        />
      )}

      {/* Remind: the buyer's own number and a message that already says what is
          owed, which order is stuck behind it and what happens next. Nothing is
          sent until the operator presses Send inside WhatsApp. */}
      {remind && (
        <WhatsAppShareDialog
          open={!!remind}
          onOpenChange={(o) => !o && setRemind(null)}
          title="Send a payment reminder"
          docNo={remind.orderNo}
          docLabel="Order"
          customerName={remind.customerName}
          customerPhone={remind.customerPhone ?? remind.customerAltPhone ?? ""}
          total={remind.total}
          balance={remind.outstanding}
          companyName={company}
          message={reminderMessage({
            customerName: remind.customerName,
            outstanding: remind.outstanding,
            creditLimit: remind.creditLimit,
            orderNo: remind.orderNo,
            orderTotal: remind.total,
            creditDays: remind.creditDays,
            companyName: company,
          })}
        />
      )}
    </>
  );
}
