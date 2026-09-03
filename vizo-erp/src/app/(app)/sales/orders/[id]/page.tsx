"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import {
  MoreHorizontal, AlertCircle, CheckCircle2,
  FileText, Clock, MapPin, Phone, AlertTriangle, ArrowRight, Printer,
  MessageCircle, Download, RefreshCw, ShieldCheck, XCircle, Loader2, User as UserIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { WhatsAppShareDialog } from "@/components/dialogs/whatsapp-share-dialog";
import { useSession, API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { openDocument, openDocumentWhenReady } from "@/lib/documents";
import { formatMoney, formatDate, formatNumber, formatRelative } from "@/lib/format";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/labels";
import {
  OrderChain, OrderWorkflowActions,
  type Workflow, type OrderPermissions,
} from "@/components/sales/order-workflow";

/* GET /sales/orders/{id} -- one call carries the header, the real line items,
   what has been paid, where the delivery got to, the invoice if one exists and
   the activity trail. The activity used to be a hard-coded array in this file
   that claimed "System emailed PO to supplier" on every order in the system. */
type OrderLine = {
  id: number; lineNo: number; productId: number; name: string; sku: string;
  packing: number; qty: number; rate: number;
  discountPercent: number; taxPercent: number; lineTotal: number;
};

type Activity = {
  id: number; action: string; entityType: string; detail: string | null;
  at: string; severity: string; user: string;
};

type OrderDetail = {
  id: number; orderNo: string;
  customerId: number; customerName: string; customerInitials: string;
  customerCode: string; customerPhone: string | null; customerAltPhone: string | null;
  customerAddress: string | null; customerType: string; city: string;
  creditLimit: number; creditDays: number; holdPolicy: string;
  locationId: number; location: string; salesPerson: string | null;
  orderDate: string; deliveryDate: string | null;
  status: string; statusName: string;
  subtotal: number; discount: number; tax: number; total: number;
  methodId: number; paymentMethod: string; paymentMethodName: string;
  creditHoldReason: string | null; notes: string | null;
  createdBy: string; createdAt: string;
  invoiceId: number | null; invoiceNo: string | null;
  invoicePdfUrl: string | null; invoiceShareUrl: string | null;
  paidAmount: number; balance: number; paymentStatus: string; outstanding: number;
  channel: string | null; carrier: string | null; trackingNo: string | null;
  deliveryState: string | null; dispatchedOn: string | null; deliveredOn: string | null;
  lines: OrderLine[];
  activity: Activity[];
};

/* The chain used to be a six-entry array right here, listing a PACKED status
   the workflow does not have and missing the four it does. It now comes from
   GET /sales/orders/{id}/workflow, which is the only place the chain is
   written down. See components/sales/order-workflow.tsx. */

const ORDER_STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "info" | "muted"> = {
  DRAFT: "muted", SUBMITTED: "info", CREDIT_HOLD: "warning", CONFIRMED: "info",
  PROCESSING: "info", PACKED: "info", DISPATCHED: "info", INVOICED: "success",
  DELIVERED: "success", CANCELLED: "danger", RETURNED: "warning",
  TO_ORDER_DEPT: "info", AT_ORDER_DEPT: "info", PACKAGING: "info",
  DECLINED: "danger",
};

/** What each activity row should look like. Unknown actions still render. */
const ACTIVITY_LOOK: Record<string, { icon: typeof FileText; tone: "info" | "success" | "warning" | "danger" }> = {
  ORDER_CREATED: { icon: FileText, tone: "info" },
  ORDER_DRAFTED: { icon: FileText, tone: "info" },
  ORDER_CREATED_ON_HOLD: { icon: AlertTriangle, tone: "warning" },
  CREDIT_HOLD_OVERRIDDEN: { icon: ShieldCheck, tone: "warning" },
  ORDER_STATUS_CHANGED: { icon: ArrowRight, tone: "info" },
  ORDER_CANCELLED: { icon: XCircle, tone: "danger" },
  ORDER_INVOICED: { icon: FileText, tone: "success" },
  INVOICE_CREATED: { icon: FileText, tone: "success" },
  INVOICE_PDF_BUILT: { icon: Download, tone: "info" },
  COUNTER_SALE: { icon: CheckCircle2, tone: "success" },
};

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

/** Turns ORDER_STATUS_CHANGED into "order status changed". */
const humanAction = (a: string) => a.toLowerCase().replace(/_/g, " ");

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "", 10);
  const { can } = useSession();

  const [order, setOrder] = React.useState<OrderDetail | null>(null);
  const [workflow, setWorkflow] = React.useState<Workflow | null>(null);
  const [perms, setPerms] = React.useState<OrderPermissions | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  /* Declared before any early return so the hook order never changes. */
  const [override, setOverride] = React.useState(false);
  const [cancel, setCancel] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!Number.isFinite(id)) { setLoading(false); return; }
    try {
      /* Three calls, in parallel, because the header cannot be drawn until it
         knows all three -- what the order is, where it can go, and what this
         person is allowed to do to it. Sequentially that is three round trips
         before anything appears. */
      const [res, wf, mine] = await Promise.all([
        axios.get<OrderDetail>(`${API_BASE_URL}/sales/orders/${id}`, { headers: authHeader() }),
        axios.get<Workflow>(`${API_BASE_URL}/sales/orders/${id}/workflow`, { headers: authHeader() }),
        axios.get<OrderPermissions>(`${API_BASE_URL}/sales/orders/${id}/my-permissions`, { headers: authHeader() }),
      ]);
      setOrder(res.data);
      setWorkflow(wf.data);
      setPerms(mine.data);
      setError(null);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        setOrder(null);
        setError(null);
      } else {
        setError(apiMessage(e, "Could not load this order."));
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

  /* One helper for every button that moves the order along. Each reloads the
     whole order afterwards rather than patching state locally: the status
     change can pull the invoice, the paid figure and the activity trail with
     it, and a screen that only updates the pill lies about the rest. */
  const setStatus = React.useCallback(async (statusKey: string, reason?: string) => {
    setBusy(true);
    try {
      const res = await axios.patch<{ message: string }>(
        `${API_BASE_URL}/sales/orders/${id}/status`,
        { statusKey, reason: reason ?? null },
        { headers: authHeader() });
      toast.success("Order updated", { description: res.data.message });
      await load();
    } catch (e) {
      toast.error("Could not update the order", { description: apiMessage(e, "Please try again.") });
    } finally {
      setBusy(false);
    }
  }, [id, load]);

  async function raiseInvoice() {
    setBusy(true);
    try {
      const res = await axios.post<{ invoiceNo: string; message: string }>(
        `${API_BASE_URL}/sales/orders/${id}/invoice`, {}, { headers: authHeader() });
      toast.success(`Invoice ${res.data.invoiceNo} raised`, { description: res.data.message });
      await load();
    } catch (e) {
      toast.error("Invoice not raised", { description: apiMessage(e, "Please try again.") });
    } finally {
      setBusy(false);
    }
  }

  async function overrideHold(reason?: string) {
    setBusy(true);
    try {
      const res = await axios.post<{ message: string }>(
        `${API_BASE_URL}/sales/credit-holds/${id}/override`,
        { reason: reason ?? "", raiseInvoice: true },
        { headers: authHeader() });
      toast.success("Credit hold released", { description: res.data.message });
      setOverride(false);
      await load();
    } catch (e) {
      toast.error("Could not release the hold", { description: apiMessage(e, "Please try again.") });
    } finally {
      setBusy(false);
    }
  }

  /* The bill's own file in the Cloudinary store -- the same one the customer
     was sent. window.open carries no Authorization header, so this has to be
     the Cloudinary URL rather than an API route. */
  async function openBill(attachment = false) {
    if (!order?.invoiceId) return;
    if (order.invoicePdfUrl) {
      openDocument(order.invoicePdfUrl, attachment);
      return;
    }
    const opened = await openDocumentWhenReady(async () => {
      const res = await axios.post<{ pdfUrl: string | null }>(
        `${API_BASE_URL}/sales/invoices/${order.invoiceId}/pdf`, {}, { headers: authHeader() });
      await load();
      return res.data.pdfUrl;
    }, attachment);
    if (!opened) {
      console.log(opened);
      toast.error("Could not open the bill", { description: "Try again in a moment." });
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Could not load this order"
        description={error}
        action={<Button variant="accent" onClick={() => { setLoading(true); void load(); }}><RefreshCw />Try again</Button>}
      />
    );
  }

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
  const runsTheFloor = can("orders.approve");
  const units = order.lines.reduce((s, l) => s + l.qty, 0);
  const phone = order.customerPhone ?? order.customerAltPhone ?? "";

  /* What comes next is the server's answer now, not a ladder of ifs here --
     see OrderWorkflowActions. */

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Sales" },
          { label: "Orders", href: "/sales/orders" },
          { label: order.orderNo },
        ]}
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{order.orderNo}</span>
            <StatusPill variant={ORDER_STATUS_VARIANT[order.status] ?? "muted"}>{statusLabel(order.status)}</StatusPill>
          </div>
        }
        subtitle={`Created ${formatDate(order.orderDate)} by ${order.createdBy}${order.salesPerson ? ` · rep ${order.salesPerson}` : ""} · ${order.location}`}
        actions={
          <>
            <Button variant="ghost" size="md" className="gap-1.5" onClick={() => void openBill(false)} disabled={!order.invoiceId}>
              <Printer />
              <span className="hidden sm:inline">Print bill</span>
            </Button>

            {isCreditHold && runsTheFloor ? (
              <Button variant="accent" size="md" className="gap-1.5" onClick={() => setOverride(true)} disabled={busy}>
                <ShieldCheck />Release hold
              </Button>
            ) : (
              /* Every other case -- the next step, the free-choice dropdown,
                 edit, delete, and the rep's application for permission. */
              <OrderWorkflowActions
                orderId={order.id}
                orderNo={order.orderNo}
                workflow={workflow}
                permissions={perms}
                busy={busy}
                onChanged={load}
              />
            )}

            {!order.invoiceId && !isCreditHold && order.status === "CONFIRMED" && (
              <Button variant="ghost" size="md" className="gap-1.5" onClick={raiseInvoice} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <FileText />}
                <span className="hidden sm:inline">Raise invoice</span>
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="More actions"><MoreHorizontal /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Order actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setShareOpen(true)}><MessageCircle />Share on WhatsApp</DropdownMenuItem>
                {order.invoiceId && (
                  <>
                    <DropdownMenuItem onClick={() => void openBill(true)}><Download />Download bill</DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/sales/invoices/${order.invoiceId}`}><FileText />Open invoice {order.invoiceNo}</Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link href={`/parties/${order.customerId}`}><UserIcon />Customer profile</Link>
                </DropdownMenuItem>
                {order.status !== "CANCELLED" && !order.invoiceId && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem danger onClick={() => setCancel(true)}><XCircle />Cancel order</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {/* Credit hold */}
      {isCreditHold && (
        <Card className="mb-6 bg-warning/5 border-warning/30">
          <CardBody>
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-lg bg-warning/15 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="size-5 text-warning" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-warning-dark dark:text-warning-light">On credit hold</h3>
                <p className="text-sm text-warning-dark/80 dark:text-warning-light/80 mt-1">
                  {order.creditHoldReason ?? "This order takes the customer past their credit limit."}
                </p>
                <p className="text-xs text-warning-dark/70 dark:text-warning-light/70 mt-1.5 tabular">
                  Outstanding {formatMoney(order.outstanding)} · limit {formatMoney(order.creditLimit)} · this order {formatMoney(order.total)}
                </p>
                {runsTheFloor && (
                  <div className="mt-3 flex items-center gap-2">
                    <Button variant="accent" size="sm" onClick={() => setOverride(true)} disabled={busy}>Release with a reason</Button>
                    <Button variant="ghost" size="sm" onClick={() => setCancel(true)} disabled={busy}>Cancel order</Button>
                  </div>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* The nine steps, drawn from the server's own chain. */}
      {workflow && workflow.step !== null && (
        <Card className="mb-6">
          <CardBody>
            <OrderChain workflow={workflow} />
          </CardBody>
        </Card>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items + Totals */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-navy-700 flex items-center justify-between">
              <h3 className="text-base font-semibold text-navy-900 dark:text-white">Order Items</h3>
              <Badge variant="muted">{order.lines.length} items · {formatNumber(units)} units</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-navy-700/50 text-left">
                    <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2">Product</th>
                    <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Qty</th>
                    <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Rate</th>
                    <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Disc%</th>
                    <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Tax%</th>
                    <th className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                  {order.lines.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-navy-900 dark:text-white">{item.name}</div>
                        <div className="text-2xs tabular text-slate-500 dark:text-slate-400 mt-0.5">{item.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular text-sm text-navy-900 dark:text-white">{item.qty}</td>
                      <td className="px-4 py-3 text-right tabular text-sm text-slate-700 dark:text-slate-300">{formatMoney(item.rate)}</td>
                      <td className="px-4 py-3 text-right tabular text-xs text-slate-500 dark:text-slate-400">{item.discountPercent}%</td>
                      <td className="px-4 py-3 text-right tabular text-xs text-slate-500 dark:text-slate-400">{item.taxPercent}%</td>
                      <td className="px-4 py-3 text-right tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900/40">
              <div className="ml-auto max-w-xs space-y-1.5">
                <Row label="Subtotal" value={formatMoney(order.subtotal)} />
                {order.discount > 0 && <Row label="Discount" value={`- ${formatMoney(order.discount)}`} />}
                <Row label="Sales tax" value={formatMoney(order.tax)} />
                <div className="border-t border-slate-200 dark:border-navy-700 pt-2 mt-2">
                  <Row label="Total" value={formatMoney(order.total)} bold />
                </div>
              </div>
            </div>
          </Card>

          {order.notes && (
            <Card>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-1.5">Notes</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">{order.notes}</p>
              </CardBody>
            </Card>
          )}

          {/* Activity — real rows off ActivityLog */}
          <Card>
            <CardBody>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">History</h3>
              <Tabs defaultValue="activity">
                <TabsList>
                  <TabsTrigger value="activity">Activity ({order.activity.length})</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>
                <TabsContent value="activity">
                  {order.activity.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
                      Nothing has happened to this order yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {order.activity.map((a, i) => {
                        const look = ACTIVITY_LOOK[a.action] ?? { icon: Clock, tone: "info" as const };
                        const Icon = look.icon;
                        const isLast = i === order.activity.length - 1;
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
                </TabsContent>
                <TabsContent value="documents">
                  {order.invoiceId ? (
                    <div className="flex items-center gap-3 p-3 border border-slate-200 dark:border-navy-700 rounded-lg">
                      <FileText className="size-5 text-info" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-navy-900 dark:text-white">{order.invoiceNo}.pdf</div>
                        <div className="text-2xs text-slate-500 dark:text-slate-400">
                          Sale invoice · {order.invoicePdfUrl ? "archived to the document store" : "generated on request"}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => void openBill(false)}><Download />Open</Button>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
                      No documents yet. The bill appears here once the order is invoiced.
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment */}
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Payment</h3>
              <dl className="space-y-2.5 text-sm">
                <Meta label="Method" value={order.paymentMethodName} />
                <Meta label="Invoice" value={
                  order.invoiceId
                    ? <Link href={`/sales/invoices/${order.invoiceId}`} className="text-brand-yellow hover:underline tabular">{order.invoiceNo}</Link>
                    : <span className="text-slate-400">Not raised</span>
                } />
                <Meta label="Order value" value={<span className="tabular">{formatMoney(order.total)}</span>} />
                <Meta label="Received" value={<span className="tabular text-success">{formatMoney(order.paidAmount)}</span>} />
                <Meta label="Balance" value={
                  <span className={cn("tabular font-semibold", order.balance > 0 ? "text-danger" : "text-success")}>
                    {formatMoney(order.balance)}
                  </span>
                } />
                <Meta label="Status" value={
                  <Badge variant={order.paymentStatus === "PAID" ? "success" : order.paymentStatus === "PARTIAL" ? "warning" : "muted"}>
                    {order.paymentStatus}
                  </Badge>
                } />
              </dl>
            </CardBody>
          </Card>

          {/* Delivery */}
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Delivery</h3>
              {order.deliveryState ? (
                <dl className="space-y-2.5 text-sm">
                  <Meta label="State" value={<Badge variant="info">{statusLabel(order.deliveryState)}</Badge>} />
                  {order.channel && <Meta label="Channel" value={statusLabel(order.channel)} />}
                  {order.carrier && <Meta label="Carrier" value={order.carrier} />}
                  {order.trackingNo && <Meta label="Tracking" value={<span className="tabular">{order.trackingNo}</span>} />}
                  {order.dispatchedOn && <Meta label="Dispatched" value={formatDate(order.dispatchedOn)} />}
                  {order.deliveredOn && <Meta label="Delivered" value={formatDate(order.deliveredOn)} />}
                </dl>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Nothing booked yet. {order.deliveryDate ? `Wanted by ${formatDate(order.deliveryDate)}.` : ""}
                </p>
              )}
            </CardBody>
          </Card>

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
                  <div className="text-xs text-slate-500 dark:text-slate-400">{order.customerCode} · {order.customerType}</div>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                {phone && (
                  <div className="inline-flex items-center gap-1.5">
                    <Phone className="size-3 text-slate-400" />{phone}
                  </div>
                )}
                <div className="flex items-start gap-1.5">
                  <MapPin className="size-3 text-slate-400 mt-0.5 shrink-0" />
                  <span>{[order.customerAddress, order.city].filter(Boolean).join(", ")}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-navy-700 space-y-2 text-sm">
                <Row label="Credit limit" value={order.creditLimit > 0 ? formatMoney(order.creditLimit) : "No limit"} />
                <Row label="Outstanding" value={formatMoney(order.outstanding)} valueClass={order.outstanding > 0 ? "text-warning" : undefined} />
              </div>
            </CardBody>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Button variant="secondary" size="md" className="w-full justify-start gap-2" onClick={() => void openBill(false)} disabled={!order.invoiceId}>
                  <Printer />Print bill
                </Button>
                <Button variant="secondary" size="md" className="w-full justify-start gap-2" onClick={() => void openBill(true)} disabled={!order.invoiceId}>
                  <Download />Download bill
                </Button>
                <Button variant="secondary" size="md" className="w-full justify-start gap-2" onClick={() => setShareOpen(true)}>
                  <MessageCircle />Share on WhatsApp
                </Button>
              </div>
              {!order.invoiceId && (
                <p className="text-2xs text-slate-500 dark:text-slate-400 mt-2.5">
                  The bill becomes available once this order is invoiced.
                </p>
              )}
            </CardBody>
          </Card>

          {/* Meta */}
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Order Details</h3>
              <dl className="space-y-2.5 text-sm">
                <Meta label="Location" value={order.location} />
                <Meta label="Sales rep" value={order.salesPerson ?? "—"} />
                <Meta label="Order date" value={formatDate(order.orderDate)} />
                <Meta label="Delivery date" value={order.deliveryDate ? formatDate(order.deliveryDate) : "—"} />
                <Meta label="Raised by" value={order.createdBy} />
              </dl>
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={override}
        onOpenChange={setOverride}
        title="Release this credit hold?"
        description={
          <span>
            {order.orderNo} is held because <strong>{order.customerName}</strong> is over their credit limit.
            Releasing it confirms the order and raises the invoice. The reason is written to the audit trail
            against your name.
          </span>
        }
        variant="warning"
        confirmLabel="Release and invoice"
        requireReason
        reasonLabel="Why is this being released?"
        reasonPlaceholder="e.g. Cheque received, clears Monday. Owner approved on call."
        loading={busy}
        onConfirm={(r) => overrideHold(r)}
      />
      <ConfirmDialog
        open={cancel}
        onOpenChange={setCancel}
        title="Cancel this order?"
        description={`${order.orderNo} will be marked cancelled. An order that has already been invoiced cannot be cancelled — raise a sales return instead.`}
        variant="danger"
        confirmLabel="Yes, cancel order"
        requireReason
        reasonLabel="Cancellation reason"
        loading={busy}
        onConfirm={async (r) => { await setStatus("CANCELLED", r); setCancel(false); }}
      />
      <WhatsAppShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        docNo={order.invoiceNo ?? order.orderNo}
        docLabel={order.invoiceNo ? "Invoice" : "Order"}
        customerName={order.customerName}
        customerPhone={phone}
        total={order.total}
        balance={order.balance}
        billLink={order.invoiceId ? (order.invoiceShareUrl ?? order.invoicePdfUrl) : null}
        note={order.invoiceNo ? undefined : `Order status: ${statusLabel(order.status)}`}
      />
    </>
  );
}

function Row({ label, value, bold, valueClass }: { label: string; value: string; bold?: boolean; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-6 text-sm">
      <span className={cn("text-slate-600 dark:text-slate-300", bold && "font-bold text-navy-900 dark:text-white")}>{label}</span>
      <span className={cn("tabular text-navy-900 dark:text-white", bold && "font-bold text-base", valueClass)}>{value}</span>
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
