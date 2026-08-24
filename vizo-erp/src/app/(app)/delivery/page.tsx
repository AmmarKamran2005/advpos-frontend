"use client";

import * as React from "react";
import {
  Send, Truck, Banknote, PackageCheck, Search, ExternalLink, Copy, Info,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/badge";
import { SelectNative } from "@/components/ui/select-native";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatCard } from "@/components/widgets/stat-card";
import { toast } from "@/components/ui/toaster";
import axios from "axios";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { couriers, getCourier } from "@/data/settings";

/* GET /delivery -> { inFlight, overdue, pendingCodTotal, items }.

   These are the real "DeliveryStatus".StatusKey values. The mock knew six;
   the database has eight -- it also carries NOT_DISPATCHED (nothing booked
   yet) and AWAITING (sent, nobody has confirmed). Missing them meant two
   states rendered with no colour at all. */
type DeliveryStatus =
  | "NOT_DISPATCHED" | "BOOKED" | "AWAITING" | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY" | "DELIVERED" | "FAILED" | "RETURNED_TO_SENDER";

const DELIVERY_STATUS_VARIANT: Record<DeliveryStatus, "success" | "warning" | "danger" | "info" | "muted"> = {
  NOT_DISPATCHED: "muted",
  BOOKED: "muted",
  AWAITING: "warning",
  IN_TRANSIT: "info",
  OUT_FOR_DELIVERY: "warning",
  DELIVERED: "success",
  FAILED: "danger",
  RETURNED_TO_SENDER: "danger",
};

type Delivery = {
  id: number;
  deliveryNo: string;
  orderId: number;
  orderNo: string;
  invoiceId: number | null;
  invoiceNo: string | null;
  customerId: number;
  customerName: string;
  customerInitials: string;
  customerPhone: string | null;
  destination: string;
  channelId: number;
  channel: string;
  channelName: string;
  confirmedByRoleId: number;
  confirmedByRole: string;
  remindAfterDays: number;
  requiresBilty: boolean;
  courierId: number | null;
  courierName: string | null;
  trackingNo: string | null;
  trackingUrlTemplate: string | null;
  bookedDate: string;
  expectedDate: string | null;
  deliveredDate: string | null;
  status: DeliveryStatus;
  statusName: string;
  isOpen: boolean;
  parcels: number;
  weightKg: number;
  codAmount: number;
  codSettled: boolean;
  bookingCharge: number;
  remindersSent: number;
  confirmedBy: string | null;
  notes: string | null;
  daysInFlight: number;
  isOverdue: boolean;
  needsReminder: boolean;
};

type DeliveryResponse = {
  inFlight: number;
  overdue: number;
  pendingCodTotal: number;
  items: Delivery[];
};

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

import { formatMoney, formatCompact, formatDate } from "@/lib/format";
import { statusLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: { value: DeliveryStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "BOOKED", label: "Booked" },
  { value: "IN_TRANSIT", label: "On the Way" },
  { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "FAILED", label: "Failed" },
  { value: "RETURNED_TO_SENDER", label: "Returned" },
];

export default function DeliveryPage() {
  const [deliveries, setDeliveries] = React.useState<Delivery[]>([]);
  const [summary, setSummary] = React.useState({ inFlight: 0, overdue: 0, pendingCodTotal: 0 });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<DeliveryStatus | "all">("all");
  const [courierId, setCourierId] = React.useState<number | "all">("all");

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<DeliveryResponse>(`${API_BASE_URL}/delivery`, {
        headers: authHeader(),
      });
      setDeliveries(res.data.items);
      setError(null);
      setSummary({
        inFlight: res.data.inFlight,
        overdue: res.data.overdue,
        pendingCodTotal: res.data.pendingCodTotal,
      });
    } catch (e) {
      setError(apiMessage(e, "Could not load the deliveries."));
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

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return deliveries.filter((d) => {
      if (status !== "all" && d.status !== status) return false;
      if (courierId !== "all" && d.courierId !== courierId) return false;
      if (!q) return true;
      return (
        d.deliveryNo.toLowerCase().includes(q) ||
        (d.invoiceNo ?? "").toLowerCase().includes(q) ||
        d.customerName.toLowerCase().includes(q) ||
        (d.trackingNo ?? "").toLowerCase().includes(q)
      );
    });
  }, [deliveries, query, status, courierId]);

  const inFlight = summary.inFlight;
  const pendingCod = summary.pendingCodTotal;
  const deliveredThisWeek = deliveries.filter((d) => d.status === "DELIVERED").length;
  const problems = deliveries.filter(
    (d) => d.status === "FAILED" || d.status === "RETURNED_TO_SENDER"
  ).length;

  function copyTracking(d: Delivery) {
    navigator.clipboard.writeText(d.trackingNo ?? "").then(
      () => toast.success("Tracking number copied", { description: d.trackingNo }),
      () => toast.error("Could not copy")
    );
  }

  const columns: Column<Delivery>[] = [
    {
      key: "deliveryNo",
      header: "Delivery",
      sortable: true,
      cell: (d) => (
        <div>
          <div className="tabular text-sm font-semibold text-navy-900 dark:text-white">
            {d.deliveryNo}
          </div>
          <div className="tabular text-2xs text-slate-500 dark:text-slate-400">
            {d.invoiceNo}
          </div>
        </div>
      ),
    },
    {
      key: "customerName",
      header: "Customer",
      sortable: true,
      cell: (d) => (
        <div className="flex items-center gap-2.5">
          <Avatar initials={d.customerInitials} size="sm" />
          <div className="min-w-0">
            <div className="text-sm font-medium text-navy-900 dark:text-white truncate">
              {d.customerName}
            </div>
            <div className="text-2xs text-slate-500 dark:text-slate-400 truncate">
              {d.destination}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "courierId",
      header: "Courier",
      cell: (d) => {
        const c = d.courierId === null ? null : getCourier(d.courierId);
        return (
          <div>
            <div className="text-sm text-navy-900 dark:text-white">{c?.shortName ?? "—"}</div>
            {d.trackingNo !== "—" ? (
              <button
                type="button"
                onClick={() => copyTracking(d)}
                className="tabular text-2xs text-slate-500 dark:text-slate-400 hover:text-brand-yellow inline-flex items-center gap-1 group"
              >
                {d.trackingNo}
                <Copy className="size-2.5 opacity-0 group-hover:opacity-100" />
              </button>
            ) : (
              <span className="text-2xs text-slate-400">no tracking</span>
            )}
          </div>
        );
      },
    },
    {
      key: "parcels",
      header: "Parcels",
      align: "right",
      cell: (d) => (
        <div className="text-right">
          <div className="tabular text-sm text-navy-900 dark:text-white">{d.parcels}</div>
          <div className="tabular text-2xs text-slate-500 dark:text-slate-400">{d.weightKg} kg</div>
        </div>
      ),
    },
    {
      key: "codAmount",
      header: "COD",
      align: "right",
      sortable: true,
      cell: (d) =>
        d.codAmount === 0 ? (
          <span className="text-2xs text-slate-400">already paid</span>
        ) : (
          <div className="text-right">
            <div className="tabular text-sm font-semibold text-navy-900 dark:text-white">
              {formatMoney(d.codAmount)}
            </div>
            <div
              className={cn(
                "text-2xs font-medium",
                d.codSettled ? "text-success" : "text-warning"
              )}
            >
              {d.codSettled ? "settled" : "with courier"}
            </div>
          </div>
        ),
    },
    {
      key: "bookedDate",
      header: "Booked",
      sortable: true,
      cell: (d) => (
        <div>
          <div className="tabular text-xs text-slate-700 dark:text-slate-200">
            {formatDate(d.bookedDate)}
          </div>
          <div className="tabular text-2xs text-slate-500 dark:text-slate-400">
            {d.deliveredDate ? `del. ${formatDate(d.deliveredDate)}` : (d.expectedDate ? `exp. ${formatDate(d.expectedDate)}` : "no ETA")}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (d) => (
        <StatusPill variant={DELIVERY_STATUS_VARIANT[d.status]}>
          {statusLabel(d.status)}
        </StatusPill>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Daily Work" }, { label: "Delivery" }]}
        title="Delivery"
        subtitle="Consignments handed to courier companies, and the cash they owe back."
        actions={
          <Button
            variant="accent"
            size="md"
            className="gap-1.5"
            onClick={() =>
              toast.info("Book a delivery", {
                description: "Pick an invoice, choose a courier, enter the tracking number.",
              })
            }
          >
            <Send />
            <span>Book Delivery</span>
          </Button>
        }
      />

      {error && (
        <Card className="p-4 mb-6 border-danger/40">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{error}</div>
            <Button variant="secondary" size="sm" onClick={() => void load()}>Try again</Button>
          </div>
        </Card>
      )}


      <Card className="mb-4 border-info/30 bg-info/5">
        <CardBody className="flex items-start gap-3 py-3">
          <Info className="size-4 text-info flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-navy-900 dark:text-white">
              Draft screen — needs your confirmation.
            </span>{" "}
            Built on the usual courier flow: book a consignment, track it, and
            reconcile cash-on-delivery when the courier settles. Tell us how you
            actually work and this gets reshaped around it.
          </p>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <StatCard
          label="On the way"
          value={String(inFlight)}
          icon={Truck}
          iconBg="info"
          footer={<span className="text-xs text-slate-500">consignments not yet delivered</span>}
        />
        <StatCard
          label="COD with couriers"
          value={formatCompact(pendingCod)}
          icon={Banknote}
          iconBg="warning"
          footer={<span className="text-xs text-slate-500">collected, not settled to us</span>}
        />
        <StatCard
          label="Delivered"
          value={String(deliveredThisWeek)}
          icon={PackageCheck}
          iconBg="success"
          footer={<span className="text-xs text-slate-500">this period</span>}
        />
        <StatCard
          label="Need attention"
          value={String(problems)}
          icon={ExternalLink}
          iconBg="danger"
          footer={<span className="text-xs text-slate-500">failed or returned</span>}
        />
      </div>

      <Card className="mb-4">
        <CardBody className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Delivery no., invoice, customer or tracking number…"
              className="pl-9"
            />
          </div>
          <SelectNative
            value={status}
            onChange={(e) => setStatus(e.target.value as DeliveryStatus | "all")}
            className="sm:w-48"
            aria-label="Filter by status"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </SelectNative>
          <SelectNative
            value={String(courierId)}
            onChange={(e) =>
              setCourierId(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            className="sm:w-44"
            aria-label="Filter by courier"
          >
            <option value="all">All couriers</option>
            {couriers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </SelectNative>
        </CardBody>
      </Card>

      <Card>
        <DataTable columns={columns} data={rows} pageSize={12} />
      </Card>
    </>
  );
}
