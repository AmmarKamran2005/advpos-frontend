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
import {
  deliveries, deliveriesInFlight, pendingCodTotal,
  DELIVERY_STATUS_VARIANT, type Delivery, type DeliveryStatus,
} from "@/data/delivery";
import { couriers, getCourier } from "@/data/settings";
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
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<DeliveryStatus | "all">("all");
  const [courierId, setCourierId] = React.useState<number | "all">("all");

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return deliveries.filter((d) => {
      if (status !== "all" && d.status !== status) return false;
      if (courierId !== "all" && d.courierId !== courierId) return false;
      if (!q) return true;
      return (
        d.deliveryNo.toLowerCase().includes(q) ||
        d.invoiceNo.toLowerCase().includes(q) ||
        d.customerName.toLowerCase().includes(q) ||
        d.trackingNo.toLowerCase().includes(q)
      );
    });
  }, [query, status, courierId]);

  const inFlight = deliveriesInFlight().length;
  const pendingCod = pendingCodTotal();
  const deliveredThisWeek = deliveries.filter((d) => d.status === "DELIVERED").length;
  const problems = deliveries.filter(
    (d) => d.status === "FAILED" || d.status === "RETURNED_TO_SENDER"
  ).length;

  function copyTracking(d: Delivery) {
    navigator.clipboard.writeText(d.trackingNo).then(
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
        const c = getCourier(d.courierId);
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
            {d.deliveredDate ? `del. ${formatDate(d.deliveredDate)}` : `exp. ${formatDate(d.expectedDate)}`}
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
