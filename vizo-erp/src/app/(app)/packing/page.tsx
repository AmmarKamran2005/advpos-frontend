"use client";

import * as React from "react";
import Link from "next/link";
import {
  PackageCheck, Check, AlertTriangle, ArrowLeftRight, Search, Package,
  ChevronRight, Minus, Plus, Boxes,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill, Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/dialogs";
import { toast } from "@/components/ui/toaster";
import axios from "axios";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/* GET /packing -> { waiting, late, blocked, items }.

   The API returns each order WITH its lines and, on every line, the
   quantity on hand AT THAT ORDER'S OWN LOCATION. The mock read stock from a
   hardcoded "LOC-02", which was wrong the moment an order belonged to a
   different warehouse -- the bench would show stock it did not have.

   POST /packing/{id}/pack does the real work: it re-checks every line
   server-side, refuses the whole order if any line is short, takes the
   stock off the shelf and writes a StockMovement row for each one. */
type PackLine = {
  productId: number;
  sku: string;
  name: string;
  packing: number;
  qty: number;
  onHand: number;
};

type ShortLine = { sku: string; name: string; qty: number; onHand: number; short_: number };

type PackOrder = {
  id: number;
  orderNo: string;
  customerId: number;
  customerName: string;
  customerInitials: string;
  city: string;
  locationId: number;
  location: string;
  orderDate: string;
  deliveryDate: string | null;
  status: "CONFIRMED" | "PROCESSING";
  statusName: string;
  total: number;
  itemCount: number;
  totalUnits: number;
  salesPerson: string | null;
  lines: PackLine[];
  waitingDays: number;
  isLate: boolean;
  canPack: boolean;
  shortLines: ShortLine[];
};

type PackingResponse = {
  waiting: number;
  late: number;
  blocked: number;
  items: PackOrder[];
};

type Order = PackOrder;

const getStatusVariant = (s: string) =>
  s === "PROCESSING" ? "warning" : ("info" as "success" | "warning" | "danger" | "info" | "muted");

const toPackets = (qty: number, packing: number) =>
  packing > 0 ? { packets: Math.floor(qty / packing), loose: qty % packing } : { packets: 0, loose: qty };

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

import { formatMoney } from "@/lib/format";
import { statusLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";


type Picked = Record<number, number>;

/**
 * The picking bench. Queue on the left, the order being packed on the right.
 *
 * The one thing this screen has to get right is the short line: when the shelf
 * cannot cover a line, say so on the line itself and offer the fix — pull it
 * from whichever location does have it — rather than letting someone pack a
 * box that is quietly incomplete.
 */
export default function PackingPage() {
  const [queue, setQueue] = React.useState<PackOrder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [picked, setPicked] = React.useState<Picked>({});
  const [search, setSearch] = React.useState("");
  const [confirming, setConfirming] = React.useState(false);
  const [packing, setPacking] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<PackingResponse>(`${API_BASE_URL}/packing`, {
        headers: authHeader(),
      });
      setQueue(res.data.items);
      setError(null);
      /* Keep whatever was open if it is still in the queue, otherwise fall
         back to the first row -- packing an order removes it, and the bench
         should not be left staring at a blank pane. */
      setSelectedId((current) =>
        current !== null && res.data.items.some((o) => o.id === current)
          ? current
          : res.data.items[0]?.id ?? null
      );
    } catch (e) {
      setError(apiMessage(e, "Could not load the packing queue."));
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

  const order = queue.find((o) => o.id === selectedId) ?? null;
  const lines = React.useMemo(() => order?.lines ?? [], [order]);

  /* The server re-checks every line and refuses the whole order if any of
     them is short, so a race with another packer cannot half-empty a shelf. */
  const packOrder = React.useCallback(async () => {
    if (!order) return;
    setPacking(true);
    try {
      const res = await axios.post<{ message: string }>(
        `${API_BASE_URL}/packing/${order.id}/pack`,
        {},
        { headers: authHeader() }
      );
      toast.success(res.data.message);
      setPicked({});
      await load();
    } catch (e) {
      toast.error(apiMessage(e, "Could not pack this order."));
    } finally {
      setPacking(false);
      setConfirming(false);
    }
  }, [order, load]);

  const filteredQueue = queue.filter((o) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return o.orderNo.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q);
  });

  function selectOrder(id: number) {
    setSelectedId(id);
    setPicked({});
  }

  function setQty(productId: number, qty: number, max: number) {
    setPicked((prev) => ({ ...prev, [productId]: Math.max(0, Math.min(qty, max)) }));
  }

  function pickAll() {
    if (!order) return;
    const next: Picked = {};
    for (const l of lines) {
      next[l.productId] = Math.min(l.qty, l.onHand);
    }
    setPicked(next);
    toast.info("Picked everything the shelf could cover");
  }

  const linesWithState = lines.map((l) => {
    const onShelf = l.onHand;
    const got = picked[l.productId] ?? 0;
    return { ...l, onShelf, got, short: Math.max(0, l.qty - onShelf) };
  });

  const shortLines = linesWithState.filter((l) => l.short > 0);
  const allPicked =
    linesWithState.length > 0 &&
    linesWithState.every((l) => l.got >= Math.min(l.qty, l.onShelf) && l.got > 0);
  const fullyPicked = linesWithState.every((l) => l.got >= l.qty);

  /* Each order is picked from its own location, which the API already
     resolved -- there is no single warehouse any more. */
  const pickLocation = order ? { name: order.location } : null;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Daily Work" }, { label: "Packing" }]}
        title="Packing"
        subtitle={`Picking from ${pickLocation?.name ?? "the order department"}`}
        actions={
          <Button variant="ghost" size="md" className="gap-1.5" asChild>
            <Link href="/dispatch"><PackageCheck /> Go to Dispatch</Link>
          </Button>
        }
      />

      {queue.length === 0 ? (
        <Card>
          <EmptyState
            icon={PackageCheck}
            title="Nothing to pack"
            description="Every confirmed order has been packed."
            action={<Button variant="accent" asChild><Link href="/sales/orders">See all orders</Link></Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Queue */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Order or customer…"
                className="pl-9"
              />
            </div>

            <div className="space-y-2">
              {filteredQueue.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => selectOrder(o.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border-2 transition-colors",
                    o.id === selectedId
                      ? "border-brand-yellow bg-brand-yellow/5"
                      : "border-slate-200 dark:border-navy-700 hover:border-slate-300 dark:hover:border-navy-600"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar initials={o.customerInitials} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-navy-900 dark:text-white truncate">
                        {o.customerName}
                      </div>
                      <div className="tabular text-2xs text-slate-500 dark:text-slate-400">
                        {o.orderNo} · {o.itemCount} lines
                      </div>
                    </div>
                    <StatusPill variant={getStatusVariant(o.status)}>
                      {statusLabel(o.status)}
                    </StatusPill>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Pick list */}
          <div className="lg:col-span-2">
            {!order ? (
              <Card>
                <EmptyState icon={Package} title="Pick an order from the queue" />
              </Card>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardBody className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar initials={order.customerInitials} size="lg" />
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-navy-900 dark:text-white truncate">
                          {order.customerName}
                        </div>
                        <div className="tabular text-xs text-slate-500 dark:text-slate-400">
                          {order.orderNo} · {order.city} · {formatMoney(order.total)}
                        </div>
                      </div>
                    </div>
                    <Button variant="secondary" size="md" className="gap-1.5" onClick={pickAll}>
                      <Check /> Pick all available
                    </Button>
                    <Button
                      variant="accent"
                      size="md"
                      className="gap-1.5"
                      disabled={!allPicked}
                      onClick={() => setConfirming(true)}
                    >
                      <PackageCheck /> Mark Packed
                    </Button>
                  </CardBody>
                </Card>

                {shortLines.length > 0 && (
                  <Card className="border-warning/40 bg-warning/5">
                    <CardBody className="flex items-start gap-3 py-3">
                      <AlertTriangle className="size-4 text-warning flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-700 dark:text-slate-200">
                          <span className="font-semibold">
                            {shortLines.length} {shortLines.length === 1 ? "line is" : "lines are"} short
                          </span>{" "}
                          on this shelf. Pull the balance in from another location, or pack what
                          you have and the rest stays on the order.
                        </p>
                      </div>
                      <Button variant="secondary" size="sm" className="gap-1 flex-shrink-0" asChild>
                        <Link href="/inventory/transfers/new"><ArrowLeftRight /> Move stock</Link>
                      </Button>
                    </CardBody>
                  </Card>
                )}

                <Card>
                  <CardBody className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-navy-700 text-left">
                            <th className="px-4 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-400">Item</th>
                            <th className="px-4 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-400 text-right w-24">Ordered</th>
                            <th className="px-4 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-400 text-right w-24">On shelf</th>
                            <th className="px-4 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-400 text-center w-40">Picked</th>
                            <th className="px-4 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-400 w-44">Short</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-navy-800">
                          {linesWithState.map((l) => (
                            <PickRow
                              key={l.productId}
                              line={l}
                              onChange={(v) => setQty(l.productId, v, l.qty)}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardBody>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={fullyPicked ? "Mark this order packed?" : "Pack it short?"}
        description={
          fullyPicked
            ? `${order?.orderNo} moves to Dispatch, ready for a delivery route.`
            : `${shortLines.length} ${shortLines.length === 1 ? "line is" : "lines are"} short. Packing is all-or-nothing on the server, so this will be refused until the shelf can cover every line.`
        }
        variant={fullyPicked ? "info" : "danger"}
        confirmLabel={packing ? "Packing…" : "Yes, packed"}
        /* The real call. It takes the stock off the shelf, writes a
           StockMovement per line and moves the order to PACKED -- or refuses
           the whole thing and lists which lines are short. */
        onConfirm={() => {
          void packOrder();
        }}
      />
    </>
  );
}

function PickRow({
  line, onChange,
}: {
  line: { productId: number; name: string; sku: string; qty: number; packing: number; onShelf: number; got: number; short: number };
  onChange: (qty: number) => void;
}) {
  const packs = toPackets(line.got, line.packing);
  /* Where else the shortfall could be pulled from needs a per-product
     stock-spread call; GET /inventory/products/{id} returns it. Not wired
     up here yet, so the line shows the shortfall without guessing. */
  const elsewhere: { code: string; name: string; qty: number }[] = [];
  const done = line.got >= line.qty;

  return (
    <tr className={cn("hover:bg-slate-50 dark:hover:bg-navy-800/50", done && "bg-success/5")}>
      <td className="px-4 py-2.5">
        <div className="text-sm font-medium text-navy-900 dark:text-white">{line.name}</div>
        <div className="tabular text-2xs text-slate-500 dark:text-slate-400">
          {line.sku}
          {line.packing > 1 && ` · ${line.packing}/packet`}
        </div>
      </td>
      <td className="px-4 py-2.5 text-right tabular text-sm font-semibold text-navy-900 dark:text-white">
        {line.qty}
      </td>
      <td
        className={cn(
          "px-4 py-2.5 text-right tabular text-sm",
          line.onShelf < line.qty ? "text-warning font-semibold" : "text-slate-600 dark:text-slate-300"
        )}
      >
        {line.onShelf}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center justify-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="One less"
            onClick={() => onChange(line.got - 1)}>
            <Minus />
          </Button>
          <Input
            type="number"
            min={0}
            max={line.qty}
            value={line.got}
            onChange={(e) => onChange(Number(e.target.value))}
            className="h-8 w-16 text-center tabular"
            aria-label={`Picked quantity for ${line.name}`}
          />
          <Button variant="ghost" size="icon-sm" aria-label="One more"
            onClick={() => onChange(line.got + 1)}>
            <Plus />
          </Button>
        </div>
        {line.packing > 1 && line.got > 0 && (
          <div className="text-2xs text-slate-500 dark:text-slate-400 text-center mt-1 tabular">
            <Boxes className="inline size-3 mr-0.5" />
            {packs.packets} pkt{packs.loose > 0 && ` + ${packs.loose}`}
          </div>
        )}
      </td>
      <td className="px-4 py-2.5">
        {line.short === 0 ? (
          <span className="text-2xs text-success">covered</span>
        ) : (
          <div>
            <Badge variant="warning">{line.short} short</Badge>
            {elsewhere.length > 0 && (
              <div className="text-2xs text-slate-500 dark:text-slate-400 mt-1">
                {elsewhere
                  .map((s) => `${s.name || s.code}: ${s.qty}`)
                  .join(" · ")}
              </div>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
