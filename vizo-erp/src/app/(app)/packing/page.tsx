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
import { orders, orderLines, getStatusVariant, type Order } from "@/data/sales";
import { stockAt, stockSpread, toPackets } from "@/data/products";
import { getLocationByCode, defaultLocation } from "@/data/settings";
import { formatMoney } from "@/lib/format";
import { statusLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

/** Where the goods are picked from. Everything is packed out of one place. */
const PICK_FROM = "LOC-02";

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
  const queue = React.useMemo(
    () => orders.filter((o) => ["CONFIRMED", "PROCESSING"].includes(o.status)),
    []
  );

  const [selectedId, setSelectedId] = React.useState<number | null>(queue[0]?.id ?? null);
  const [picked, setPicked] = React.useState<Picked>({});
  const [search, setSearch] = React.useState("");
  const [confirming, setConfirming] = React.useState(false);

  const order = queue.find((o) => o.id === selectedId) ?? null;
  const lines = React.useMemo(() => (order ? orderLines(order) : []), [order]);

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
      next[l.productId] = Math.min(l.qty, stockAt(l.productId, PICK_FROM));
    }
    setPicked(next);
    toast.info("Picked everything the shelf could cover");
  }

  const linesWithState = lines.map((l) => {
    const onShelf = stockAt(l.productId, PICK_FROM);
    const got = picked[l.productId] ?? 0;
    return { ...l, onShelf, got, short: Math.max(0, l.qty - onShelf) };
  });

  const shortLines = linesWithState.filter((l) => l.short > 0);
  const allPicked =
    linesWithState.length > 0 &&
    linesWithState.every((l) => l.got >= Math.min(l.qty, l.onShelf) && l.got > 0);
  const fullyPicked = linesWithState.every((l) => l.got >= l.qty);

  const pickLocation = getLocationByCode(PICK_FROM);

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
            : `${shortLines.length} ${shortLines.length === 1 ? "line is" : "lines are"} not complete. The order moves to Dispatch with what you picked, and the balance stays outstanding.`
        }
        variant={fullyPicked ? "info" : "danger"}
        confirmLabel={fullyPicked ? "Yes, packed" : "Pack it short"}
        requireReason={!fullyPicked}
        reasonLabel="Why is it short?"
        onConfirm={(r) => {
          toast.success("Marked packed", {
            description: r ? `${order?.orderNo} — ${r}` : `${order?.orderNo} is ready to dispatch.`,
          });
          setConfirming(false);
          setPicked({});
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
  const elsewhere = line.short > 0 ? stockSpread(line.productId).filter((s) => s.code !== PICK_FROM) : [];
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
                  .map((s) => `${getLocationByCode(s.code)?.name ?? s.code}: ${s.qty}`)
                  .join(" · ")}
              </div>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
