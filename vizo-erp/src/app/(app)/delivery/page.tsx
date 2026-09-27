"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Send, Truck, Banknote, PackageCheck, Search, AlertTriangle, Copy, AlertCircle, ChevronRight,
} from "lucide-react";
import axios from "axios";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/badge";
import { SelectNative } from "@/components/ui/select-native";
import { DataTable, type Column } from "@/components/ui/data-table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter,
} from "@/components/ui/sheet";
import { StatCard } from "@/components/widgets/stat-card";
import { toast } from "@/components/ui/toaster";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { ConfirmDeliveryDialog } from "@/components/delivery/confirm-delivery-dialog";
import { SettleCodDialog } from "@/components/delivery/settle-cod-dialog";
import { BookDelivery } from "@/components/delivery/book-delivery";
import {
  apiMessage, type Delivery, type DeliveryResponse, type DeliveryStatus,
} from "@/components/delivery/delivery-types";
import { formatMoney, formatCompact, formatDate, formatDateTime } from "@/lib/format";
import { statusLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

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

/* GET /delivery/lookups -> couriers. Only the fields this screen renders. */
type Courier = { id: number; name: string; shortName: string };

const STATUS_FILTERS: { value: DeliveryStatus | "all" | "settle"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "BOOKED", label: "Booked" },
  { value: "AWAITING", label: "Sent — unconfirmed" },
  { value: "IN_TRANSIT", label: "On the Way" },
  { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "FAILED", label: "Failed" },
  { value: "RETURNED_TO_SENDER", label: "Returned" },
];

/** The valid values of ?status=, so a stray query string cannot set the filter to nonsense. */
const STATUS_KEYS = new Set<string>([
  "NOT_DISPATCHED", "BOOKED", "AWAITING", "IN_TRANSIT",
  "OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RETURNED_TO_SENDER",
]);

/* Who a route's confirmation belongs to, in words (DeliveryChannel.ConfirmedByRole). */
const ROLE_NAME: Record<string, string> = {
  sales: "salesperson",
  "order-dept": "Order Department",
  accountant: "accountant",
  "super-admin": "Super Admin",
};
const roleName = (key: string) => ROLE_NAME[key] ?? key;

/* Phones get a card list instead of the table; this many at a time. */
const PHONE_PAGE = 20;

/**
 * useSearchParams() bails out of prerendering unless it is under a
 * Suspense boundary -- same reason app/login/page.tsx wraps itself the same way.
 */
export default function DeliveryPage() {
  return (
    <React.Suspense fallback={<div className="p-6"><Skeleton className="h-64" /></div>}>
      <DeliveryScreen />
    </React.Suspense>
  );
}

/**
 * Deliveries: booked, on the way, delivered -- and the cash couriers owe back.
 *
 * WHAT CHANGED ON 27 SEP (round E):
 *   · "Book Delivery" opens the booking form /dispatch uses (it was a toast);
 *   · every row can be marked delivered by the role that owns its channel,
 *     with the date and who received it (POST /delivery/{id}/confirm);
 *   · COD is settled here by the Super Admin or the accountant, through the
 *     books (POST /delivery/{id}/settle-cod);
 *   · the cards are counted by the API, not from whatever rows were loaded;
 *   · the "Draft screen — needs your confirmation" banner is gone;
 *   · the order desk sees no money: no COD figures, only whether cash is due.
 *
 * `?open=<id>` opens one delivery's detail -- what the notification links
 * (/delivery/<id>) land on, through app/(app)/delivery/[id]/page.tsx.
 */
function DeliveryScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [data, setData] = React.useState<DeliveryResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [couriers, setCouriers] = React.useState<Courier[]>([]);
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<DeliveryStatus | "all" | "settle">(() => {
    const fromUrl = searchParams.get("status");
    return fromUrl && STATUS_KEYS.has(fromUrl) ? (fromUrl as DeliveryStatus) : "all";
  });
  const [courierId, setCourierId] = React.useState<number | "all">("all");
  const [phoneShown, setPhoneShown] = React.useState(PHONE_PAGE);

  const [detailId, setDetailId] = React.useState<number | null>(() => Number(searchParams.get("open")) || null);
  const [confirming, setConfirming] = React.useState<Delivery | null>(null);
  const [settling, setSettling] = React.useState<Delivery | null>(null);
  const [booking, setBooking] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      /* The courier list is a lookup, not part of the delivery payload, so
         both reads go out together. */
      const [res, lookups] = await Promise.all([
        axios.get<DeliveryResponse>(`${API_BASE_URL}/delivery`, { headers: authHeader() }),
        axios.get<{ couriers: Courier[] }>(`${API_BASE_URL}/delivery/lookups`, { headers: authHeader() }),
      ]);
      setData(res.data);
      setCouriers(lookups.data.couriers);
      setError(null);
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

  const deliveries = React.useMemo(() => data?.items ?? [], [data]);
  const moneyHidden = data?.moneyHidden ?? true;

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return deliveries.filter((d) => {
      if (status === "settle" && !d.canSettleCod) return false;
      if (status !== "all" && status !== "settle" && d.status !== status) return false;
      if (courierId !== "all" && d.courierId !== courierId) return false;
      if (!q) return true;
      return (
        d.deliveryNo.toLowerCase().includes(q) ||
        d.orderNo.toLowerCase().includes(q) ||
        (d.invoiceNo ?? "").toLowerCase().includes(q) ||
        d.customerName.toLowerCase().includes(q) ||
        (d.trackingNo ?? "").toLowerCase().includes(q)
      );
    });
  }, [deliveries, query, status, courierId]);

  const detail = detailId === null ? null : deliveries.find((d) => d.id === detailId) ?? null;

  function openDetail(id: number | null) {
    setDetailId(id);
    /* Keep the URL in step, so a refresh or a shared link reopens the same one. */
    const p = new URLSearchParams(searchParams.toString());
    if (id === null) p.delete("open"); else p.set("open", String(id));
    router.replace(`/delivery${p.toString() ? `?${p}` : ""}`, { scroll: false });
  }

  function copyTracking(d: Delivery) {
    if (!d.trackingNo) return;
    navigator.clipboard.writeText(d.trackingNo).then(
      () => toast.success("Tracking number copied", { description: d.trackingNo ?? undefined }),
      () => toast.error("Could not copy")
    );
  }

  /* Render helpers, not components: a component declared inside another is a
     new type on every render (react-hooks/static-components). */
  function actions(d: Delivery, compact?: boolean) {
    return (
      <div className={cn("flex gap-1.5", compact ? "flex-wrap" : "justify-end")}>
        {d.canConfirm && (
          <Button size="sm" variant="accent" className="gap-1" onClick={(e) => { e.stopPropagation(); setConfirming(d); }}>
            <PackageCheck className="size-3.5" /> Mark delivered
          </Button>
        )}
        {d.canSettleCod && (
          <Button size="sm" variant="secondary" className="gap-1" onClick={(e) => { e.stopPropagation(); setSettling(d); }}>
            <Banknote className="size-3.5" /> Settle COD
          </Button>
        )}
      </div>
    );
  }

  function codCell(d: Delivery) {
    if (moneyHidden) {
      return d.collectsCash
        ? <span className="text-2xs font-medium text-warning">collect cash</span>
        : <span className="text-2xs text-slate-400">nothing to collect</span>;
    }
    if (d.codAmount === 0) return <span className="text-2xs text-slate-400">nothing to collect</span>;
    return (
      <div className="text-right">
        <div className="tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(d.codAmount)}</div>
        <div className={cn("text-2xs font-medium", d.codSettled ? "text-success" : "text-warning")}>
          {d.codSettled ? "settled" : d.deliveredDate ? "with courier" : "at the door"}
        </div>
      </div>
    );
  }

  const columns: Column<Delivery>[] = [
    {
      key: "deliveryNo",
      header: "Delivery",
      sortable: true,
      cell: (d) => (
        <button type="button" onClick={() => openDetail(d.id)} className="text-left group">
          <div className="tabular text-sm font-semibold text-navy-900 dark:text-white group-hover:text-brand-yellow">
            {d.deliveryNo}
          </div>
          <div className="tabular text-2xs text-slate-500 dark:text-slate-400">{d.orderNo}{d.invoiceNo ? ` · ${d.invoiceNo}` : ""}</div>
        </button>
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
            <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{d.customerName}</div>
            <div className="text-2xs text-slate-500 dark:text-slate-400 truncate">{d.destination}</div>
          </div>
        </div>
      ),
    },
    {
      key: "courierId",
      header: "Courier",
      cell: (d) => (
        <div>
          <div className="text-sm text-navy-900 dark:text-white">
            {couriers.find((x) => x.id === d.courierId)?.shortName ?? d.courierName ?? d.channelName}
          </div>
          {d.trackingNo ? (
            <button type="button" onClick={() => copyTracking(d)}
              className="tabular text-2xs text-slate-500 dark:text-slate-400 hover:text-brand-yellow inline-flex items-center gap-1 group">
              {d.trackingNo}
              <Copy className="size-2.5 opacity-0 group-hover:opacity-100" />
            </button>
          ) : (
            <span className="text-2xs text-slate-400">no tracking</span>
          )}
        </div>
      ),
    },
    {
      key: "codAmount",
      header: "COD",
      align: "right",
      sortable: !moneyHidden,
      cell: (d) => codCell(d),
    },
    {
      key: "bookedDate",
      header: "Booked",
      sortable: true,
      cell: (d) => (
        <div>
          <div className="tabular text-xs text-slate-700 dark:text-slate-200">{formatDate(d.bookedDate)}</div>
          <div className={cn("tabular text-2xs", d.isOverdue ? "text-danger font-medium" : "text-slate-500 dark:text-slate-400")}>
            {d.deliveredDate ? `del. ${formatDate(d.deliveredDate)}` : (d.expectedDate ? `exp. ${formatDate(d.expectedDate)}` : "no ETA")}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (d) => (
        <StatusPill variant={DELIVERY_STATUS_VARIANT[d.status]}>{statusLabel(d.status)}</StatusPill>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (d) => actions(d),
    },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Daily Work" }, { label: "Delivery" }]}
        title="Delivery"
        subtitle="Consignments with couriers, who received them, and the cash couriers owe back."
        actions={
          data?.mayBook ? (
            <Button variant="accent" size="md" className="gap-1.5" onClick={() => setBooking(true)}>
              <Send />
              <span>Book Delivery</span>
            </Button>
          ) : undefined
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

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-5">
        <StatCard
          label="On the way"
          value={loading ? "…" : String(data?.inFlight ?? 0)}
          icon={Truck}
          iconBg="info"
          footer={<span className="text-xs text-slate-500">{data?.overdue ? `${data.overdue} past their date` : "not yet delivered"}</span>}
        />
        {moneyHidden ? (
          <StatCard
            label="To confirm"
            value={loading ? "…" : String(deliveries.filter((d) => d.canConfirm).length)}
            icon={PackageCheck}
            iconBg="warning"
            footer={<span className="text-xs text-slate-500">yours to mark delivered</span>}
          />
        ) : (
          <StatCard
            label="COD not yet settled"
            value={loading ? "…" : formatCompact(data?.pendingCodTotal ?? 0)}
            icon={Banknote}
            iconBg="warning"
            footer={<span className="text-xs text-slate-500">{data?.awaitingSettlement ?? 0} delivered, awaiting settlement</span>}
          />
        )}
        <StatCard
          label="Delivered"
          value={loading ? "…" : String(data?.deliveredThisMonth ?? 0)}
          icon={PackageCheck}
          iconBg="success"
          footer={<span className="text-xs text-slate-500">in {data?.periodLabel ?? "this month"}</span>}
        />
        <StatCard
          label="Need attention"
          value={loading ? "…" : String(data?.needAttention ?? 0)}
          icon={AlertTriangle}
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
              onChange={(e) => { setQuery(e.target.value); setPhoneShown(PHONE_PAGE); }}
              placeholder="Delivery, order, invoice, customer or tracking…"
              className="pl-9"
            />
          </div>
          <SelectNative
            value={status}
            onChange={(e) => { setStatus(e.target.value as DeliveryStatus | "all" | "settle"); setPhoneShown(PHONE_PAGE); }}
            className="sm:w-48"
            aria-label="Filter by status"
          >
            {STATUS_FILTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            {data?.mayHandleCod && <option value="settle">COD to settle</option>}
          </SelectNative>
          <SelectNative
            value={String(courierId)}
            onChange={(e) => setCourierId(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="sm:w-44"
            aria-label="Filter by courier"
          >
            <option value="all">All couriers</option>
            {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SelectNative>
        </CardBody>
      </Card>

      {/* Desktop: the table. */}
      <Card className="hidden md:block">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : (
          <DataTable columns={columns} data={rows} pageSize={12} />
        )}
      </Card>

      {/* Phones: one card per delivery, the buttons within thumb's reach. */}
      <div className="md:hidden space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : rows.length === 0 ? (
          <Card><CardBody className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">No deliveries match.</CardBody></Card>
        ) : (
          <>
            {rows.slice(0, phoneShown).map((d) => (
              <Card key={d.id}>
                <CardBody className="py-3 space-y-2">
                  <button type="button" onClick={() => openDetail(d.id)} className="w-full text-left flex items-start gap-3">
                    <Avatar initials={d.customerInitials} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-navy-900 dark:text-white truncate">{d.customerName}</span>
                        <StatusPill variant={DELIVERY_STATUS_VARIANT[d.status]}>{statusLabel(d.status)}</StatusPill>
                      </div>
                      <div className="tabular text-2xs text-slate-500 dark:text-slate-400 truncate">
                        {d.deliveryNo} · {d.orderNo} · {d.courierName ?? d.channelName}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className={cn("tabular text-2xs", d.isOverdue ? "text-danger font-medium" : "text-slate-500 dark:text-slate-400")}>
                          {d.deliveredDate ? `Delivered ${formatDate(d.deliveredDate)}` : `Booked ${formatDate(d.bookedDate)}`}
                        </span>
                        {codCell(d)}
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-slate-300 shrink-0 mt-1" />
                  </button>
                  {(d.canConfirm || d.canSettleCod) && actions(d, true)}
                </CardBody>
              </Card>
            ))}
            {rows.length > phoneShown && (
              <Button variant="secondary" className="w-full" onClick={() => setPhoneShown((n) => n + PHONE_PAGE)}>
                Show more ({rows.length - phoneShown} left)
              </Button>
            )}
          </>
        )}
      </div>

      {detail && (
        <DeliveryDetail
          d={detail}
          moneyHidden={moneyHidden}
          onClose={() => openDetail(null)}
          onConfirm={() => setConfirming(detail)}
          onSettle={() => setSettling(detail)}
        />
      )}

      {confirming && (
        <ConfirmDeliveryDialog
          delivery={confirming}
          open
          onOpenChange={(v) => !v && setConfirming(null)}
          onDone={() => { setConfirming(null); void load(); }}
        />
      )}

      {settling && (
        <SettleCodDialog
          delivery={settling}
          open
          onOpenChange={(v) => !v && setSettling(null)}
          onDone={() => { setSettling(null); void load(); }}
        />
      )}

      {booking && (
        <BookDelivery
          open
          onOpenChange={setBooking}
          onBooked={(id) => { void load().then(() => { if (id) openDetail(id); }); }}
        />
      )}
    </>
  );
}

/** One delivery, everything about it, and the two buttons. */
function DeliveryDetail({
  d, moneyHidden, onClose, onConfirm, onSettle,
}: {
  d: Delivery;
  moneyHidden: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onSettle: () => void;
}) {
  const trackingUrl = d.trackingNo && d.trackingUrlTemplate
    ? d.trackingUrlTemplate.replace("{tracking}", encodeURIComponent(d.trackingNo)).replace("{0}", encodeURIComponent(d.trackingNo))
    : null;

  const row = (label: string, children: React.ReactNode) => (
    <div className="flex justify-between gap-4 py-2 border-b border-slate-100 dark:border-navy-700 last:border-0">
      <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
      <span className="text-sm text-navy-900 dark:text-white text-right min-w-0 break-words">{children}</span>
    </div>
  );

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" width="md">
        <SheetHeader>
          <SheetTitle>{d.deliveryNo}</SheetTitle>
          <SheetDescription>{d.customerName} · {d.destination}</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div className="flex items-center gap-2 mb-4">
            <StatusPill variant={DELIVERY_STATUS_VARIANT[d.status]}>{statusLabel(d.status)}</StatusPill>
            {d.isOverdue && <span className="text-2xs font-medium text-danger">past its expected date</span>}
          </div>

          <div className="mb-5">
            {row("Order", <><Link className="hover:text-brand-yellow" href={`/sales/orders/${d.orderId}`}>{d.orderNo}</Link></>)}
            {d.invoiceNo && row("Invoice", <>{d.invoiceNo}</>)}
            {d.salesPerson && row("Salesperson", <>{d.salesPerson}</>)}
            {d.customerPhone && row("Customer phone", <><a href={`tel:${d.customerPhone}`}>{d.customerPhone}</a></>)}
            {row("Route", <>{d.channelName}</>)}
            {row("Carrier", <>{d.courierName ?? "—"}</>)}
            {row("Tracking / bilty",
              d.trackingNo ? (trackingUrl ? <a className="hover:text-brand-yellow underline" href={trackingUrl} target="_blank" rel="noreferrer">{d.trackingNo}</a> : d.trackingNo) : "—")}
            {row("Parcels", <>{d.parcels} · {d.weightKg} kg</>)}
            {row("Booked", <>{formatDate(d.bookedDate)}</>)}
            {row("Expected", <>{d.expectedDate ? formatDate(d.expectedDate) : "—"}</>)}
            {row("Confirmed by", <>{roleName(d.confirmedByRole)}</>)}
          </div>

          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Arrival</h4>
          <div className="mb-5">
            {d.deliveredDate ? (
              <>
                {row("Delivered on", <>{formatDate(d.deliveredDate)}</>)}
                {row("Received by", <>{d.receivedBy ?? "not recorded"}</>)}
                {row("Confirmed by", <>{d.confirmedBy ?? "—"}{d.confirmedAt ? ` · ${formatDateTime(d.confirmedAt)}` : ""}</>)}
              </>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-2">
                Not delivered yet{d.canConfirm ? "." : ` — the ${roleName(d.confirmedByRole)} confirms this route.`}
              </p>
            )}
          </div>

          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Cash on delivery</h4>
          <div className="mb-5">
            {moneyHidden ? (
              <p className="text-sm text-slate-600 dark:text-slate-300 py-2">
                {d.collectsCash ? "Cash is collected at the door." : "Nothing to collect at the door."}
              </p>
            ) : d.codAmount === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-2">Nothing to collect — on credit or already paid.</p>
            ) : (
              <>
                {row("COD", <>{formatMoney(d.codAmount)}</>)}
                {row("State", <>{d.codSettled ? "Settled" : d.deliveredDate ? "With the courier" : "Not collected yet"}</>)}
                {d.codSettledOn && row("Settled on", <>{formatDate(d.codSettledOn)}</>)}
                {d.codReceiptNo && row("Receipt", <>{d.codReceiptNo}{d.codVoucherNo ? ` · ${d.codVoucherNo}` : ""}</>)}
                {d.codFee > 0 && row("Courier's fee", <>{formatMoney(d.codFee)}</>)}
                {d.bookingCharge > 0 && row("Booking charge", <>{formatMoney(d.bookingCharge)}</>)}
              </>
            )}
          </div>

          {d.notes && (
            <>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Notes</h4>
              <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{d.notes}</p>
            </>
          )}
        </SheetBody>
        {(d.canConfirm || d.canSettleCod) && (
          <SheetFooter>
            {d.canSettleCod && (
              <Button variant="secondary" className="gap-1.5" onClick={onSettle}><Banknote className="size-4" /> Settle COD</Button>
            )}
            {d.canConfirm && (
              <Button variant="accent" className="gap-1.5" onClick={onConfirm}><PackageCheck className="size-4" /> Mark delivered</Button>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
