"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Download, Search, Send, Check, Truck, ChevronRight , Loader2} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";
import { useSession } from "@/components/providers/session-provider";
import { downloadXlsx, exportError } from "@/lib/export";
import axios from "axios";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { getChannel, type ChannelKey } from "@/data/settings";

/* GET /sales/orders -> { total, page, pageSize, items }.

   The status and delivery-state maps used to live in @/data/sales. Importing
   that module from a client component shipped the whole 300-line mock order
   array into the bundle for the sake of two lookup tables, so they are inlined
   here -- see AGENTS.md rule 5.

   The delivery keys are the REAL "DeliveryStatus".StatusKey values from the
   database, which are not the ones the mock used: there is no ON_THE_WAY, and
   there are three separate in-flight states plus two failure states. */
type OrderStatus =
  | "DRAFT" | "SUBMITTED" | "CREDIT_HOLD" | "CONFIRMED" | "PROCESSING"
  | "PACKED" | "DISPATCHED" | "INVOICED" | "DELIVERED" | "CANCELLED" | "RETURNED";

type DeliveryState =
  | "NOT_DISPATCHED" | "BOOKED" | "AWAITING" | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY" | "DELIVERED" | "FAILED" | "RETURNED_TO_SENDER";

type Variant = "success" | "warning" | "danger" | "info" | "muted";

const STATUS_VARIANT: Record<OrderStatus, Variant> = {
  DRAFT:       "muted",
  SUBMITTED:   "info",
  CREDIT_HOLD: "danger",
  CONFIRMED:   "info",
  PROCESSING:  "warning",
  PACKED:      "warning",
  DISPATCHED:  "info",
  INVOICED:    "info",
  DELIVERED:   "success",
  CANCELLED:   "muted",
  RETURNED:    "danger",
};

const DELIVERY_STATE_VARIANT: Record<DeliveryState, Variant> = {
  NOT_DISPATCHED:     "muted",
  BOOKED:             "warning",
  AWAITING:           "warning",
  IN_TRANSIT:         "info",
  OUT_FOR_DELIVERY:   "info",
  DELIVERED:          "success",
  FAILED:             "danger",
  RETURNED_TO_SENDER: "danger",
};

function getStatusVariant(s: OrderStatus): Variant {
  return STATUS_VARIANT[s] ?? "muted";
}

type Order = {
  id: number;
  orderNo: string;
  customerId: number;
  customerName: string;
  customerInitials: string;
  customerType: string;
  city: string;
  location: string;
  locationCode: string;
  salesPerson: string | null;
  orderDate: string;
  deliveryDate: string | null;
  status: OrderStatus;
  statusName: string;
  itemCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  paidAmount: number;
  paymentStatus: "UNPAID" | "PARTIAL" | "PAID";
  creditHoldReason: string | null;
  notes: string | null;
  invoiceId: number | null;
  invoiceNo: string | null;
  channel: ChannelKey | null;
  carrier: string | null;
  trackingNo: string | null;
  deliveryState: DeliveryState | null;
  dispatchedOn: string | null;
  deliveredOn: string | null;
};

type OrderPage = { total: number; page: number; pageSize: number; items: Order[] };

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}
import { formatMoney, formatDate } from "@/lib/format";
import { statusLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

/** The stages a rep actually thinks in, not every enum value. */
const TABS = [
  { key: "ALL",       label: "All",        match: () => true },
  { key: "DRAFT",     label: "Draft",      match: (o: Order) => o.status === "DRAFT" },
  { key: "SENT",      label: "Sent",       match: (o: Order) => ["SUBMITTED", "CREDIT_HOLD"].includes(o.status) },
  { key: "PREPARING", label: "Preparing",  match: (o: Order) => ["CONFIRMED", "PROCESSING", "PACKED"].includes(o.status) },
  { key: "OUT",       label: "On the way", match: (o: Order) =>
      ["BOOKED", "AWAITING", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(o.deliveryState ?? "") },
  { key: "DELIVERED", label: "Delivered",  match: (o: Order) => o.deliveryState === "DELIVERED" },
  { key: "CLOSED",    label: "Closed",     match: (o: Order) => ["CANCELLED", "RETURNED"].includes(o.status) },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function OrdersPage() {
  const { can, user } = useSession();
  /* The shell does not mount this until the session has resolved, so user
     is set. An early `return null` here would sit above the hooks below
     and change the hook count between renders. */
  const me = user!;


  const isRep = !can("orders.approve");

  const [all, setAll] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<OrderPage>(`${API_BASE_URL}/sales/orders`, {
        params: { pageSize: 200 },
        headers: authHeader(),
      });
      setAll(res.data.items);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the order list."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. Disabled here rather
       than globally so the rule still catches the cases worth fixing. */
    void load();
  }, [load]);

  /* A rep sees only their own orders. This is a convenience filter, not a
     security boundary -- the API is the boundary. */
  const scope = React.useMemo(
    () => (isRep ? all.filter((o) => o.salesPerson === me.fullName) : all),
    [all, isRep, me.fullName]
  );

  const [search, setSearch] = React.useState("");
  const [tab, setTab] = React.useState<TabKey>("ALL");

  const rows = React.useMemo(() => {
    const matcher = TABS.find((t) => t.key === tab)!.match;
    const q = search.trim().toLowerCase();
    return scope.filter((o) => {
      if (!matcher(o)) return false;
      if (!q) return true;
      return (
        o.orderNo.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        (o.trackingNo ?? "").toLowerCase().includes(q)
      );
    });
  }, [scope, search, tab]);

  /* The Export button used to be a toast. The API builds the workbook from the
     same list query this screen ran, so the file is what is on the page. */
  const [exporting, setExporting] = React.useState(false);

  async function exportXlsx() {
    setExporting(true);
    try {
      await downloadXlsx("sales/orders/export", { q: search || undefined, status: status || undefined }, "sales-orders.xlsx");
      toast.success("Export ready", { description: "Orders downloaded as a spreadsheet." });
    } catch (e) {
      toast.error("Could not export", { description: await exportError(e) });
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Sales" }, { label: "Orders" }]}
        title="Orders"
        subtitle={isRep ? "Your orders and where each one has reached" : "Every customer order"}
        actions={
          <>
            <Button variant="ghost" size="md" className="gap-1.5" onClick={exportXlsx} disabled={exporting}>
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download />}
              <span className="hidden sm:inline">{exporting ? "Exporting…" : "Export"}</span>
            </Button>
            <Button variant="accent" size="md" className="gap-1.5" asChild>
              <Link href="/sales/orders/new"><Plus /> New Order</Link>
            </Button>
          </>
        }
      />

      {/* Stage tabs */}
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        {TABS.map((t) => {
          const count = scope.filter(t.match).length;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                tab === t.key
                  ? "bg-navy-900 text-brand-yellow dark:bg-navy-800"
                  : "bg-white dark:bg-navy-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-navy-700 hover:border-slate-300"
              )}
            >
              {t.label} <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      <Card className="mb-4">
        <CardBody>
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Order number, customer, or tracking number…"
              className="pl-9"
            />
          </div>
        </CardBody>
      </Card>

      {error && (
        <Card className="p-4 mb-4 border-danger/40">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{error}</div>
            <Button variant="secondary" size="sm" onClick={() => void load()}>Try again</Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={Search}
            title="Nothing here"
            description="No orders match this filter."
            action={
              <Button variant="accent" asChild>
                <Link href="/sales/orders/new"><Plus /> New Order</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((o) => <OrderCard key={o.id} order={o} />)}
        </div>
      )}
    </>
  );
}

function OrderCard({ order }: { order: Order }) {
  const channel = order.channel ? getChannel(order.channel) : null;
  const balance = order.total - order.paidAmount;
  const paidPct = order.total > 0 ? Math.round((order.paidAmount / order.total) * 100) : 0;

  return (
    <Card className="hover:border-brand-yellow/40 transition-colors">
      <CardBody className="py-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Who + which */}
          <Link href={`/sales/orders/${order.id}`} className="flex items-center gap-3 flex-1 min-w-0 group">
            <Avatar initials={order.customerInitials} size="md" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-navy-900 dark:text-white truncate group-hover:text-brand-yellow transition-colors">
                {order.customerName}
              </div>
              <div className="tabular text-2xs text-slate-500 dark:text-slate-400">
                {order.orderNo} · {formatDate(order.orderDate)} · {order.city}
              </div>
            </div>
          </Link>

          {/* Where it has reached */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <StatusPill variant={getStatusVariant(order.status)}>
              {statusLabel(order.status)}
            </StatusPill>
            {order.deliveryState && order.deliveryState !== "NOT_DISPATCHED" && (
              <StatusPill variant={DELIVERY_STATE_VARIANT[order.deliveryState]}>
                {statusLabel(order.deliveryState)}
              </StatusPill>
            )}
            {channel && order.deliveryState && order.deliveryState !== "NOT_DISPATCHED" && (
              <span className="text-2xs text-slate-500 dark:text-slate-400">
                {order.carrier}
                {order.trackingNo !== "—" && <span className="tabular"> · {order.trackingNo}</span>}
              </span>
            )}
          </div>

          {/* Money */}
          <div className="flex items-center gap-4 lg:w-56 lg:justify-end">
            <div className="text-right">
              <div className="tabular text-sm font-bold text-navy-900 dark:text-white">
                {formatMoney(order.total)}
              </div>
              <div
                className={cn(
                  "tabular text-2xs font-medium",
                  balance === 0
                    ? "text-success"
                    : order.paidAmount > 0
                      ? "text-warning"
                      : "text-slate-400"
                )}
              >
                {balance === 0
                  ? "Paid"
                  : order.paidAmount > 0
                    ? `${paidPct}% paid · ${formatMoney(balance)} left`
                    : "Unpaid"}
              </div>
            </div>
            <QuickAction order={order} />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

/** One button that does the obvious next thing for this order. */
function QuickAction({ order }: { order: Order }) {
  if (order.status === "DRAFT") {
    return (
      <Button variant="accent" size="sm" className="gap-1 flex-shrink-0"
        onClick={() => toast.success("Sent to Order Department", { description: order.orderNo })}>
        <Send /> Send
      </Button>
    );
  }

  /* The mock had one ON_THE_WAY state; the database splits it into BOOKED /
     AWAITING / IN_TRANSIT / OUT_FOR_DELIVERY, so "still out there" is a set. */
  const inFlight =
    order.deliveryState !== null &&
    ["BOOKED", "AWAITING", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(order.deliveryState);

  if (order.channel === "local" && inFlight) {
    return (
      <Button variant="accent" size="sm" className="gap-1 flex-shrink-0"
        onClick={() => toast.success("Marked delivered", { description: order.orderNo })}>
        <Check /> Delivered
      </Button>
    );
  }

  if (inFlight) {
    return (
      <Button variant="secondary" size="sm" className="gap-1 flex-shrink-0" asChild>
        <Link href={`/sales/orders/${order.id}`}><Truck /> Track</Link>
      </Button>
    );
  }

  return (
    <Button variant="ghost" size="icon-sm" className="flex-shrink-0" asChild>
      <Link href={`/sales/orders/${order.id}`} aria-label="Open order"><ChevronRight /></Link>
    </Button>
  );
}
